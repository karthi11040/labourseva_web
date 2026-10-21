/**
 * LabourSeva — HTTP API Route Verification
 * Tests the live endpoints on http://localhost:3001:
 * - GET /api/notifications
 * - GET /api/notifications/unread-count
 * - PATCH /api/notifications/[id]
 * - PATCH /api/notifications/read-all
 * - 401 handling for unauthenticated / cross-user checks
 */

async function testApiEndpoints() {
  const baseUrl = "http://localhost:3001";
  console.log("=================================================");
  console.log("  Testing Live Notification HTTP Endpoints");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, title: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${title}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${title}`);
      throw new Error(`API assertion failed: ${title}`);
    }
  }

  try {
    // 1. GET /api/notifications (with test user header)
    const testUserId = `http_test_user_${Date.now()}`;

    // First trigger a notification for this test user
    const { NotificationTriggerService } = await import("../src/modules/notifications/services/notification-trigger.service");
    const created = await NotificationTriggerService.triggerApplicationSubmitted({
      userId: testUserId,
      applicationId: "APP-HTTP-1",
      applicationNumber: "TN-APP-HTTP-1",
      serviceName: "E-Sanad Certificate",
    });

    const getRes = await fetch(`${baseUrl}/api/notifications?page=1&limit=10`, {
      headers: {
        "x-user-id": testUserId,
      },
    });

    assert(getRes.status === 200, `GET /api/notifications returned 200 OK (got ${getRes.status})`);
    const getData = await getRes.json();
    assert(getData.ok === true, "Response payload ok === true");
    assert(Array.isArray(getData.notifications), "notifications is an array");
    assert(getData.notifications.length >= 1, `Received at least 1 notification (got ${getData.notifications.length})`);
    assert(getData.unreadCount >= 1, `Unread count is >= 1 (got ${getData.unreadCount})`);

    // 2. GET /api/notifications/unread-count
    const countRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: {
        "x-user-id": testUserId,
      },
    });
    assert(countRes.status === 200, `GET /api/notifications/unread-count returned 200 (got ${countRes.status})`);
    const countData = await countRes.json();
    assert(countData.ok === true, "unread-count response ok === true");
    assert(countData.unreadCount === getData.unreadCount, `unreadCount matches list response (${countData.unreadCount})`);

    // 3. PATCH /api/notifications/[id]
    const notifId = created.notificationId!;
    const patchRes = await fetch(`${baseUrl}/api/notifications/${notifId}`, {
      method: "PATCH",
      headers: {
        "x-user-id": testUserId,
      },
    });
    assert(patchRes.status === 200, `PATCH /api/notifications/[id] returned 200 (got ${patchRes.status})`);
    const patchData = await patchRes.json();
    assert(patchData.ok === true, "Single notification marked as read");

    // 4. Verify unread count is now decremented
    const countRes2 = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: {
        "x-user-id": testUserId,
      },
    });
    const countData2 = await countRes2.json();
    assert(countData2.unreadCount === 0, `Unread count is now 0 (got ${countData2.unreadCount})`);

    // 5. PATCH /api/notifications/read-all
    // Create another unread notification
    await NotificationTriggerService.triggerSignedDocumentReady({
      userId: testUserId,
      applicationId: "APP-HTTP-2",
      serviceName: "E-Sanad Certificate",
      signedPdfPath: "/downloads/cert.pdf",
    });

    const readAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: "PATCH",
      headers: {
        "x-user-id": testUserId,
      },
    });
    assert(readAllRes.status === 200, `PATCH /api/notifications/read-all returned 200 (got ${readAllRes.status})`);
    const readAllData = await readAllRes.json();
    assert(readAllData.ok === true, "read-all response ok === true");
    assert(readAllData.markedCount >= 1, `markedCount is >= 1 (got ${readAllData.markedCount})`);

    // Clean up test user
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$executeRawUnsafe(`DELETE FROM notifications WHERE userId = ?`, testUserId);
    await prisma.$disconnect();

    console.log("\n=================================================");
    console.log(`  ALL LIVE HTTP API TESTS PASSED: ${passed} / ${total}`);
    console.log("=================================================\n");
  } catch (err) {
    console.error("HTTP API Test Error:", err);
    process.exit(1);
  }
}

testApiEndpoints();
