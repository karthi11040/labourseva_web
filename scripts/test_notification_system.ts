/**
 * LabourSeva — Automated Test Suite for Modular Notification System
 * Validates:
 * 1. Single event creation
 * 2. Idempotency & duplicate suppression (simulated webhook/retries)
 * 3. User isolation & unauthorized access prevention
 * 4. Single mark-as-read state & unread count
 * 5. Batch mark-all-as-read isolation
 * 6. All 11 event triggers lifecycle
 * 7. Query pagination & filters
 */
import { NotificationRepository } from "../src/modules/notifications/repositories/notification.repository";
import { NotificationService } from "../src/modules/notifications/services/notification.service";
import { NotificationTriggerService } from "../src/modules/notifications/services/notification-trigger.service";
import { NOTIFICATION_TEMPLATES } from "../src/modules/notifications/templates/notification.templates";
import { prisma } from "../src/lib/prisma";

async function runTestSuite() {
  console.log("=================================================");
  console.log("  LabourSeva Notification System — Test Suite");
  console.log("=================================================\n");

  const runId = Date.now();
  const testUserA = `test_user_a_${runId}`;
  const testUserB = `test_user_b_${runId}`;
  const testStaff = `test_staff_${runId}`;
  const testAppNum = `TN-APP-${runId}`;

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, title: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${title}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${title}`);
      throw new Error(`Assertion failed: ${title}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Creation of a single notification
    // -------------------------------------------------------------------------
    console.log("--- 1. Single Event Notification Creation ---");
    const res1 = await NotificationTriggerService.triggerApplicationSubmitted({
      userId: testUserA,
      applicationId: `APP-${runId}`,
      applicationNumber: testAppNum,
      serviceName: "Building Construction Registration",
      type: "DOCUMENT_SERVICE",
    });

    assert(res1.inAppSaved === true, "Notification successfully created and saved to database");
    assert(Boolean(res1.notificationId), "Returned notification ID");
    assert(res1.alreadyExisted !== true, "Identified as new (not pre-existing)");

    // -------------------------------------------------------------------------
    // TEST 2: Idempotency (Simulating repeated webhook / API retry)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Idempotency & Duplicate Suppression ---");
    const resDuplicate = await NotificationTriggerService.triggerApplicationSubmitted({
      userId: testUserA,
      applicationId: `APP-${runId}`,
      applicationNumber: testAppNum,
      serviceName: "Building Construction Registration",
      type: "DOCUMENT_SERVICE",
    });

    assert(resDuplicate.alreadyExisted === true, "Duplicate eventKey detected; creation skipped");
    assert(resDuplicate.notificationId === res1.notificationId, "Returned same existing notification ID");

    // Verify DB count has exactly 1 row for this event
    const countRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND eventKey = ?`,
      testUserA,
      `evt_app_sub_${testAppNum}`
    );
    const rowCount = Number(countRows[0]?.count || 0);
    assert(rowCount === 1, `Database contains exactly 1 row for eventKey (got ${rowCount})`);

    // -------------------------------------------------------------------------
    // TEST 3: User Isolation & Cross-User Security
    // -------------------------------------------------------------------------
    console.log("\n--- 3. User Isolation & Security ---");
    // Create notification for User B
    const resUserB = await NotificationTriggerService.triggerServicePaymentSuccess({
      userId: testUserB,
      orderId: "ORD-999",
      paymentId: "PAY-999",
      amount: 150,
      serviceName: "Safety Clearance",
      applicationId: "APP-B-001",
    });

    // Query notifications for User A - User B's notification must NOT appear
    const userAList = await NotificationService.getNotifications({ userId: testUserA });
    const hasUserBNotification = userAList.notifications.some((n) => n.id === resUserB.notificationId);
    assert(!hasUserBNotification, "User A cannot see User B's notifications");

    // User A attempts to mark User B's notification as read
    const unauthorizedMark = await NotificationService.markAsRead(resUserB.notificationId!, testUserA);
    assert(unauthorizedMark === false, "User A cannot mark User B's notification as read (Cross-user blocked)");

    // Verify User B's notification is still unread
    const userBList = await NotificationService.getNotifications({ userId: testUserB });
    const targetB = userBList.notifications.find((n) => n.id === resUserB.notificationId);
    assert(targetB?.isRead === false, "User B's notification remained unread after unauthorized attempt");

    // -------------------------------------------------------------------------
    // TEST 4: Single Mark-as-Read & Unread Count Sync
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Mark As Read & Unread Count Synchronization ---");
    const unreadBefore = await NotificationService.getUnreadCount(testUserA);
    assert(unreadBefore >= 1, `User A initial unread count is >= 1 (got ${unreadBefore})`);

    const markSuccess = await NotificationService.markAsRead(res1.notificationId!, testUserA);
    assert(markSuccess === true, "Owner successfully marked notification as read");

    const unreadAfter = await NotificationService.getUnreadCount(testUserA);
    assert(unreadAfter === unreadBefore - 1, `Unread count decremented accurately (${unreadBefore} -> ${unreadAfter})`);

    // -------------------------------------------------------------------------
    // TEST 5: Mark-All-As-Read Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Mark All As Read Isolation ---");
    // Create 2 unread notifications for User A
    await NotificationTriggerService.triggerAccountApproved({
      userId: testUserA,
      name: "Ramasamy",
    });
    await NotificationTriggerService.triggerSignedDocumentReady({
      userId: testUserA,
      applicationId: "DOC-99",
      serviceName: "Welfare Certificate",
      signedPdfPath: "/docs/signed.pdf",
    });

    const unreadUserABefore = await NotificationService.getUnreadCount(testUserA);
    const unreadUserBBefore = await NotificationService.getUnreadCount(testUserB);
    assert(unreadUserABefore >= 2, `User A has ${unreadUserABefore} unread notifications`);
    assert(unreadUserBBefore >= 1, `User B has ${unreadUserBBefore} unread notifications`);

    // User A marks all as read
    const markedCount = await NotificationService.markAllAsRead(testUserA);
    assert(markedCount >= 2, `Mark-all-as-read updated ${markedCount} records for User A`);

    const unreadUserAAfter = await NotificationService.getUnreadCount(testUserA);
    assert(unreadUserAAfter === 0, "User A unread count is now 0");

    // User B's unread count must NOT be affected
    const unreadUserBAfter = await NotificationService.getUnreadCount(testUserB);
    assert(unreadUserBAfter === unreadUserBBefore, `User B's unread count remained untouched (${unreadUserBAfter})`);

    // -------------------------------------------------------------------------
    // TEST 6: All 11 Core Event Triggers Verification
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Verifying All 11 Core Business Event Triggers ---");

    // 1. Account approved
    const t1 = await NotificationTriggerService.triggerAccountApproved({
      userId: testUserA,
      name: "Murugan",
    });
    assert(t1.inAppSaved === true, "1. Account approved trigger");

    // 2. Account rejected
    const t2 = await NotificationTriggerService.triggerAccountRejected({
      userId: testUserA,
      name: "Murugan",
      reason: "Invalid Aadhaar document scan",
    });
    assert(t2.inAppSaved === true, "2. Account rejected trigger");

    // 3. Service payment successful
    const t3 = await NotificationTriggerService.triggerServicePaymentSuccess({
      userId: testUserA,
      orderId: "ORD-003",
      paymentId: "PAY-003",
      amount: 250,
      serviceName: "Maternity Assistance Scheme",
      applicationId: "APP-003",
    });
    assert(t3.inAppSaved === true, "3. Service payment successful trigger");

    // 4. E-service payment successful
    const t4 = await NotificationTriggerService.triggerEServicePaymentSuccess({
      userId: testUserA,
      applicationId: "ES-004",
      applicationNumber: "TN-ES-004",
      receiptNo: "TN-RCP-ES-004",
      amount: 60,
    });
    assert(t4.inAppSaved === true, "4. E-service payment successful trigger");

    // 5. Application submitted
    const t5 = await NotificationTriggerService.triggerApplicationSubmitted({
      userId: testUserA,
      applicationId: "APP-005",
      serviceName: "Pension Claim Scheme",
    });
    assert(t5.inAppSaved === true, "5. Application submitted trigger");

    // 6. Application approved
    const t6 = await NotificationTriggerService.triggerApplicationApproved({
      userId: testUserA,
      applicationId: "APP-006",
      serviceName: "Pension Claim Scheme",
    });
    assert(t6.inAppSaved === true, "6. Application approved trigger");

    // 7. Application rejected
    const t7 = await NotificationTriggerService.triggerApplicationRejected({
      userId: testUserA,
      applicationId: "APP-007",
      serviceName: "Marriage Assistance Scheme",
      reason: "Age criteria not met",
    });
    assert(t7.inAppSaved === true, "7. Application rejected trigger");

    // 8. Additional information requested
    const t8 = await NotificationTriggerService.triggerAdditionalInfoRequested({
      userId: testUserA,
      applicationId: "APP-008",
      notes: "Please provide employer passbook seal",
    });
    assert(t8.inAppSaved === true, "8. Additional info requested trigger");

    // 9. Signed document ready
    const t9 = await NotificationTriggerService.triggerSignedDocumentReady({
      userId: testUserA,
      applicationId: "APP-009",
      serviceName: "Registration Renewal",
      signedPdfPath: "/downloads/cert.pdf",
    });
    assert(t9.inAppSaved === true, "9. Signed document ready trigger");

    // 10. Refund processed
    const t10 = await NotificationTriggerService.triggerRefundProcessed({
      userId: testUserA,
      applicationId: "REF-010",
      amount: 250,
    });
    assert(t10.inAppSaved === true, "10. Refund processed trigger");

    // 11. New application assigned to staff
    const t11 = await NotificationTriggerService.triggerStaffApplicationAssigned({
      staffUserId: testStaff,
      applicationId: "APP-011",
      serviceName: "Education Assistance",
    });
    assert(t11.inAppSaved === true, "11. Staff application assigned trigger");

    // -------------------------------------------------------------------------
    // TEST 7: Pagination and Filtering
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Query Pagination and Filtering ---");
    const paged = await NotificationService.getNotifications({
      userId: testUserA,
      page: 1,
      limit: 5,
      filter: "ALL",
    });

    assert(paged.notifications.length === 5, "Pagination limit respected (5 items)");
    assert(paged.hasMore === true, "hasMore flag accurately indicates further pages");
    assert(paged.totalCount >= 10, `totalCount reflects full record count (got ${paged.totalCount})`);

    // Clean up test data
    console.log("\n--- Cleaning up test records ---");
    await prisma.$executeRawUnsafe(
      `DELETE FROM notifications WHERE userId IN (?, ?, ?)`,
      testUserA,
      testUserB,
      testStaff
    );
    console.log("  [CLEANUP] Test records purged from database.");

    console.log("\n=================================================");
    console.log(`  ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions`);
    console.log("=================================================\n");
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
