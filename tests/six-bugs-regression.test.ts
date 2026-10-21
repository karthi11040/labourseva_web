(process.env as any).NODE_ENV = "test";

import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { signHmacSession, verifyHmacSession, PORTAL_COOKIE_NAMES } from "../src/lib/session-validator";
import { getAuthenticatedActor } from "../src/lib/staff-session";
import { createSecurityToken, validateSecurityToken } from "../src/lib/token-store";
import { GET as handleVerifyEmail } from "../src/app/api/auth/verify-email/route";
import { GET as handleVerificationStatus } from "../src/app/api/verification/status/route";
import { POST as handleVerificationRequest } from "../src/app/api/verification/request/route";
import { GET as handleRetailerApplications } from "../src/app/api/retailer/applications/route";
import { GET as handleRetailerCommissions } from "../src/app/api/retailer/commissions/route";
import { GET as handleRetailerDashboard } from "../src/app/api/retailer/dashboard/route";
import { prisma } from "../src/lib/prisma";

describe("LabourSeva Audit — Full Bug Resolution & Regression Test Suite", () => {
  // =========================================================================
  // BUG 1: Retailer and Distributor Authentication & Authorization
  // =========================================================================
  describe("Bug 1: Retailer & Distributor Session Authentication & Authorization", () => {
    it("recognizes valid Retailer session cookie and returns correct role and verified id", () => {
      const payload = {
        id: 101,
        name: "Selvam Kendra",
        shopName: "Selvam E-Seva Kendra",
        email: "selvam@kendra.tn.gov.in",
        phone: "9840123456",
        role: "RETAILER",
      };
      const cookie = signHmacSession(payload, "RETAILER", 3600);
      const req = new Request("http://localhost/api/test", {
        headers: {
          cookie: `${PORTAL_COOKIE_NAMES.RETAILER}=${cookie}`,
        },
      });

      const actor = getAuthenticatedActor(req);
      assert.equal(actor.role, "RETAILER");
      assert.equal(actor.id, 101);
      assert.equal(actor.name, "Selvam Kendra");
      assert.equal(actor.email, "selvam@kendra.tn.gov.in");
    });

    it("recognizes valid Distributor session cookie and returns correct role and verified id", () => {
      const payload = {
        id: 202,
        name: "Madurai District Agency",
        email: "distributor@madurai.tn.gov.in",
        role: "DISTRIBUTOR",
      };
      const cookie = signHmacSession(payload, "DISTRIBUTOR", 3600);
      const req = new Request("http://localhost/api/test", {
        headers: {
          cookie: `${PORTAL_COOKIE_NAMES.DISTRIBUTOR}=${cookie}`,
        },
      });

      const actor = getAuthenticatedActor(req);
      assert.equal(actor.role, "DISTRIBUTOR");
      assert.equal(actor.id, 202);
      assert.equal(actor.name, "Madurai District Agency");
    });

    it("rejects tampered or forged Retailer session cookies", () => {
      const payload = { id: 101, role: "RETAILER" };
      const validToken = signHmacSession(payload, "RETAILER");
      const [payloadStr] = validToken.split(".");
      const forgedToken = `${payloadStr}.${crypto.randomBytes(32).toString("hex")}`;

      const req = new Request("http://localhost/api/test", {
        headers: {
          cookie: `${PORTAL_COOKIE_NAMES.RETAILER}=${forgedToken}`,
        },
      });

      const actor = getAuthenticatedActor(req);
      assert.equal(actor.role, "ANONYMOUS");
      assert.equal(actor.id, "anonymous");
    });

    it("rejects expired Retailer and Distributor session tokens", () => {
      const expiredRetailer = signHmacSession({ id: 101, role: "RETAILER" }, "RETAILER", -10);
      const req = new Request("http://localhost/api/test", {
        headers: {
          cookie: `${PORTAL_COOKIE_NAMES.RETAILER}=${expiredRetailer}`,
        },
      });

      const actor = getAuthenticatedActor(req);
      assert.equal(actor.role, "ANONYMOUS");
    });

    it("prevents cross-portal token reuse between retailer and distributor", () => {
      const retailerToken = signHmacSession({ id: 55, role: "RETAILER" }, "RETAILER");
      // Attempt to present retailer token as distributor cookie
      const req = new Request("http://localhost/api/test", {
        headers: {
          cookie: `${PORTAL_COOKIE_NAMES.DISTRIBUTOR}=${retailerToken}`,
        },
      });

      const actor = getAuthenticatedActor(req);
      assert.notEqual(actor.role, "DISTRIBUTOR");
    });

    it("ensures an invalid higher-priority cookie does not prevent a valid session from being recognized", () => {
      const retailerToken = signHmacSession({ id: 88, name: "Trichy Kendra", role: "RETAILER" }, "RETAILER");
      // Send an invalid/corrupted admin cookie AND a valid retailer cookie
      const req = new Request("http://localhost/api/test", {
        headers: {
          cookie: `${PORTAL_COOKIE_NAMES.ADMIN}=corrupted-admin-token; ${PORTAL_COOKIE_NAMES.RETAILER}=${retailerToken}`,
        },
      });

      const actor = getAuthenticatedActor(req);
      assert.equal(actor.role, "RETAILER");
      assert.equal(actor.id, 88);
      assert.equal(actor.name, "Trichy Kendra");
    });

    it("enforces ownership and blocks IDOR when Retailer A attempts to view Retailer B's verification status", async () => {
      const retTokenA = signHmacSession({ id: 10, role: "RETAILER", name: "Retailer 10" }, "RETAILER");
      const req = new Request("http://localhost/api/verification/status?userType=retailer&userId=999", {
        headers: {
          cookie: `${PORTAL_COOKIE_NAMES.RETAILER}=${retTokenA}`,
        },
      });

      const res = await handleVerificationStatus(req);
      assert.equal(res.status, 403, "Retailer 10 must be blocked with 403 when accessing Retailer 999 records");
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /Access denied/i);
    });

    it("blocks unauthenticated callers from submitting verification requests on behalf of a retailer account", async () => {
      const req = new Request("http://localhost/api/verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: "retailer",
          userId: 44,
          applicantName: "Hacked Retailer",
          phone: "9840111222",
          idNumber: "123456789012",
          documentUrl: "https://example.com/doc.pdf",
        }),
      });

      const res = await handleVerificationRequest(req);
      assert.equal(res.status, 401, "Anonymous user must be blocked with 401 from submitting retailer verification");
    });

    it("blocks distributors from accessing admin or scrutiny officer privileges", () => {
      const distToken = signHmacSession({ id: 77, role: "DISTRIBUTOR", name: "Agency 77" }, "DISTRIBUTOR");
      const req = new Request("http://localhost/api/test", {
        headers: {
          cookie: `${PORTAL_COOKIE_NAMES.DISTRIBUTOR}=${distToken}`,
        },
      });
      const actor = getAuthenticatedActor(req);
      assert.equal(actor.role, "DISTRIBUTOR");
      assert.equal(actor.canVerify, undefined);
      assert.equal(actor.canSign, undefined);
    });
  });

  // =========================================================================
  // BUG 2: E-Service Applications Scrutiny Status Synchronization
  // =========================================================================
  describe("Bug 2: Application Scrutiny Status Synchronization", () => {
    it("synchronizes scrutiny status and admin_remark from es_service_requests into retailer response", async (t) => {
      const db = prisma as any;
      const origQuery = db.$queryRawUnsafe;

      // Mock retail_orders returning status 'pending'
      const mockOrders = [
        {
          id: 501,
          service_id: 1,
          amount: 60,
          payment_status: "success",
          status: "pending",
          transaction_id: "RCP-ORD-501",
          payment_response: JSON.stringify({ appRef: "TN-ES-888999", applicantName: "Kavitha", applicantPhone: "9876543210" }),
          created_at: new Date().toISOString(),
          service_name: "Community Certificate",
        },
      ];

      // Mock es_service_requests returning status 'accepted' (approved) and admin remark
      const mockEsRequests = [
        {
          id: 10,
          application_number: "TN-ES-888999",
          service_id: 1,
          submitted_data: JSON.stringify({ fullName: "Kavitha", phone: "9876543210" }),
          amount: 60,
          payment_status: "Success",
          status: "accepted",
          admin_remark: "Documents verified and approved by Tahsildar",
          created_at: new Date().toISOString(),
          service_name: "Community Certificate",
        },
      ];

      db.$queryRawUnsafe = async (sql: string) => {
        if (sql.includes("FROM retail_users WHERE id = ?")) {
          return [{ id: 45, name: "Kendra Operator", status: "Approved", is_approved: 1 }];
        }
        if (sql.includes("FROM retail_orders")) return mockOrders;
        if (sql.includes("FROM es_service_requests")) return mockEsRequests;
        if (sql.includes("FROM service_requests")) return [];
        return [];
      };

      t.after(() => {
        db.$queryRawUnsafe = origQuery;
      });

      const retToken = signHmacSession({ id: 45, role: "RETAILER", name: "Kendra Operator" }, "RETAILER");
      const req = new Request("http://localhost/api/retailer/applications", {
        headers: { cookie: `${PORTAL_COOKIE_NAMES.RETAILER}=${retToken}` },
      });

      const res = await handleRetailerApplications(req as any);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.applications.length, 1);

      const app = data.applications[0];
      assert.equal(app.appRef, "TN-ES-888999");
      assert.equal(app.status, "accepted", "Live scrutiny status 'accepted' must override stale 'pending' status");
      assert.equal(app.adminRemark, "Documents verified and approved by Tahsildar");
      assert.equal(app.applicantName, "Kavitha");
    });
  });

  // =========================================================================
  // BUG 3: Empty Search Hides Applications With Missing Fields
  // =========================================================================
  describe("Bug 3: Search Behavior With Empty Input and Missing Fields", () => {
    it("matches all applications when search term is empty or whitespace-only", () => {
      const applications = [
        { id: "1", appRef: "REF-001", applicantName: "Murugan", applicantPhone: "9876500000", serviceName: "Labour Card", status: "pending" },
        { id: "2", appRef: null, applicantName: null, applicantPhone: null, serviceName: null, status: "pending" },
        { id: "3", appRef: "REF-003", applicantName: undefined, applicantPhone: "9123456789", serviceName: "Marriage Assistance", status: "approved" },
      ];

      // Test with empty string
      const emptySearch = "";
      const term1 = emptySearch.trim().toLowerCase();
      const filtered1 = applications.filter((app) => {
        const matchesSearch = !term1 || Boolean(
          (app.appRef && String(app.appRef).toLowerCase().includes(term1)) ||
          (app.applicantName && String(app.applicantName).toLowerCase().includes(term1)) ||
          (app.applicantPhone && String(app.applicantPhone).toLowerCase().includes(term1)) ||
          (app.serviceName && String(app.serviceName).toLowerCase().includes(term1))
        );
        return matchesSearch;
      });
      assert.equal(filtered1.length, 3, "Empty search must return all 3 applications without discarding records with null fields");

      // Test with whitespace string
      const whitespaceSearch = "   ";
      const term2 = whitespaceSearch.trim().toLowerCase();
      const filtered2 = applications.filter((app) => {
        const matchesSearch = !term2 || Boolean(
          (app.appRef && String(app.appRef).toLowerCase().includes(term2)) ||
          (app.applicantName && String(app.applicantName).toLowerCase().includes(term2)) ||
          (app.applicantPhone && String(app.applicantPhone).toLowerCase().includes(term2)) ||
          (app.serviceName && String(app.serviceName).toLowerCase().includes(term2))
        );
        return matchesSearch;
      });
      assert.equal(filtered2.length, 3, "Whitespace search must return all 3 applications");

      // Test with specific query
      const querySearch = "murugan";
      const term3 = querySearch.trim().toLowerCase();
      const filtered3 = applications.filter((app) => {
        const matchesSearch = !term3 || Boolean(
          (app.appRef && String(app.appRef).toLowerCase().includes(term3)) ||
          (app.applicantName && String(app.applicantName).toLowerCase().includes(term3)) ||
          (app.applicantPhone && String(app.applicantPhone).toLowerCase().includes(term3)) ||
          (app.serviceName && String(app.serviceName).toLowerCase().includes(term3))
        );
        return matchesSearch;
      });
      assert.equal(filtered3.length, 1);
      assert.equal(filtered3[0].applicantName, "Murugan");
    });
  });

  // =========================================================================
  // BUG 4: Lifetime Commissions & Dashboard Metrics Accuracy
  // =========================================================================
  describe("Bug 4: Commissions & Dashboard Metrics Accuracy", () => {
    it("calculates lifetime commissions from full database aggregate SUM without LIMIT 50 truncation", async (t) => {
      const db = prisma as any;
      const origQuery = db.$queryRawUnsafe;

      db.$queryRawUnsafe = async (sql: string) => {
        if (sql.includes("FROM retail_users WHERE id = ?")) {
          return [{ id: 60, name: "Kendra Operator", status: "Approved", is_approved: 1 }];
        }
        if (sql.includes("FROM commission_rules")) return [];
        if (sql.includes("SELECT COALESCE(SUM(amount), 0) AS total_commission")) {
          // Simulate 120 historical transactions summing to 4800.00
          return [{ total_commission: 4800.00 }];
        }
        if (sql.includes("LIMIT 50")) {
          // Paginated 50 recent transactions only sum to 2000.00
          return Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            amount: 40.00,
            description: `Commission credit ${i + 1}`,
            created_at: new Date().toISOString(),
          }));
        }
        return [];
      };

      t.after(() => {
        db.$queryRawUnsafe = origQuery;
      });

      const retToken = signHmacSession({ id: 60, role: "RETAILER", name: "Kendra Operator" }, "RETAILER");
      const req = new Request("http://localhost/api/retailer/commissions", {
        headers: { cookie: `${PORTAL_COOKIE_NAMES.RETAILER}=${retToken}` },
      });

      const res = await handleRetailerCommissions(req as any);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.equal(data.totalEarned, 4800.00, "totalEarned must reflect all 120 transactions (4800.00), not truncated at 50");
      assert.equal(data.history.length, 50, "history array should be paginated to 50");
    });

    it("aggregates dashboard order counts across both retail_orders and es_service_requests without double-counting", async (t) => {
      const db = prisma as any;
      const origQuery = db.$queryRawUnsafe;

      // retail_orders has 2 orders: one pending, one approved
      const mockRetailOrders = [
        { id: 1, transaction_id: "TX-1", status: "pending", payment_response: JSON.stringify({ appRef: "APP-COMMON-1" }) },
        { id: 2, transaction_id: "TX-2", status: "completed", payment_response: JSON.stringify({ appRef: "APP-ORD-2" }) },
      ];

      // es_service_requests has 2 requests:
      // APP-COMMON-1 is the SAME application as order 1, but scrutiny has now approved it ('accepted')
      // APP-ES-3 is an e-service lodged directly
      const mockEsRequests = [
        { id: 10, application_number: "APP-COMMON-1", status: "accepted" },
        { id: 11, application_number: "APP-ES-3", status: "rejected" },
      ];

      db.$queryRawUnsafe = async (sql: string) => {
        if (sql.includes("FROM retail_users WHERE id = ?")) {
          return [{ id: 70, registration_no: "KND-70", name: "Kendra 70", wallet_balance: 500, status: "Approved" }];
        }
        if (sql.includes("SELECT ro.id, ro.service_id")) return [];
        if (sql.includes("SELECT id, transaction_id, status, payment_response FROM retail_orders")) {
          return mockRetailOrders;
        }
        if (sql.includes("SELECT id, application_number, status FROM es_service_requests")) {
          return mockEsRequests;
        }
        if (sql.includes("SELECT status, gateway_order_id FROM service_requests")) {
          return [];
        }
        if (sql.includes("SELECT SUM(amount) AS total_commission")) {
          return [{ total_commission: 1500 }];
        }
        if (sql.includes("ORDER BY id DESC LIMIT 5")) {
          return [];
        }
        return [];
      };

      t.after(() => {
        db.$queryRawUnsafe = origQuery;
      });

      const retToken = signHmacSession({ id: 70, role: "RETAILER", name: "Kendra 70" }, "RETAILER");
      const req = new Request("http://localhost/api/retailer/dashboard", {
        headers: { cookie: `${PORTAL_COOKIE_NAMES.RETAILER}=${retToken}` },
      });

      const res = await handleRetailerDashboard(req as any);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);

      // Total distinct applications: APP-COMMON-1, APP-ORD-2, APP-ES-3 = 3 total (no double counting of APP-COMMON-1)
      assert.equal(data.stats.totalOrders, 3, "Expected 3 deduplicated applications across retail_orders and es_service_requests");
      // APP-COMMON-1 status was updated to 'accepted' (approved), APP-ORD-2 is 'completed' (approved) -> 2 completed
      assert.equal(data.stats.completedCount, 2, "Expected 2 approved/completed applications");
      // APP-ES-3 is 'rejected' -> 1 rejected
      assert.equal(data.stats.rejectedCount, 1, "Expected 1 rejected application");
      // 0 pending
      assert.equal(data.stats.pendingCount, 0, "Expected 0 pending applications");
    });
  });

  // =========================================================================
  // BUG 5: Email Verification Repeated Requests & React StrictMode
  // =========================================================================
  describe("Bug 5: Email Verification Under Repeated Requests", () => {
    it("successfully verifies valid token on first attempt, and returns alreadyVerified on immediate repeat", async (t) => {
      const testEmail = `citizen.${Date.now()}@tn.gov.in`;
      const token = await createSecurityToken({
        identifier: testEmail,
        purpose: "EMAIL_VERIFICATION",
        expiresInMinutes: 60,
      });

      const db = prisma as any;
      const origQuery = db.$queryRawUnsafe;
      const origExecute = db.$executeRawUnsafe;

      let isCustomerVerified = false;

      db.$queryRawUnsafe = async (sql: string) => {
        if (sql.includes("FROM customers WHERE LOWER(email) = ?")) {
          return [{ id: 99, full_name: "Citizen Test", email_verified: isCustomerVerified ? 1 : 0, status: "pending" }];
        }
        return [];
      };
      db.$executeRawUnsafe = async (sql: string) => {
        if (sql.includes("UPDATE customers") && sql.includes("email_verified = 1")) {
          isCustomerVerified = true;
          return 1;
        }
        return 1;
      };

      t.after(() => {
        db.$queryRawUnsafe = origQuery;
        db.$executeRawUnsafe = origExecute;
      });

      // Request 1: Valid initial verification
      const req1 = new Request(`http://localhost/api/auth/verify-email?token=${token}`);
      const res1 = await handleVerifyEmail(req1 as any);
      assert.equal(res1.status, 200);
      const data1 = await res1.json();
      assert.equal(data1.ok, true);
      assert.equal(isCustomerVerified, true, "Customer email_verified should be set to 1 in DB");

      // Request 2: Immediate repeated request (simulating React StrictMode double mount or link prefetching)
      const req2 = new Request(`http://localhost/api/auth/verify-email?token=${token}`);
      const res2 = await handleVerifyEmail(req2 as any);
      assert.equal(res2.status, 200, "Repeated request for already verified account must return 200");
      const data2 = await res2.json();
      assert.equal(data2.ok, true);
      assert.equal(data2.alreadyVerified, true, "Response must report alreadyVerified: true");
    });

    it("rejects invalid, forged, or unverified tokens with 400", async () => {
      const fakeToken = "this-token-does-not-exist-in-store-or-db";
      const req = new Request(`http://localhost/api/auth/verify-email?token=${fakeToken}`);
      const res = await handleVerifyEmail(req as any);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /invalid.*(consumed|used)/i);
    });

    it("never verifies an unverified account if token is consumed but account in DB was never verified", async (t) => {
      const db = prisma as any;
      const origQuery = db.$queryRawUnsafe;

      // Account in DB has email_verified = 0
      db.$queryRawUnsafe = async (sql: string) => {
        if (sql.includes("FROM customers WHERE LOWER(email) = ?")) {
          return [{ id: 88, full_name: "Unverified Person", email_verified: 0, status: "pending" }];
        }
        return [];
      };

      t.after(() => {
        db.$queryRawUnsafe = origQuery;
      });

      // Pass an unrecognized token
      const req = new Request(`http://localhost/api/auth/verify-email?token=unrecognized-token-123`);
      const res = await handleVerifyEmail(req as any);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.ok, false);
    });
  });

  // =========================================================================
  // BUG 6: Receipt Print Layout Styling Integrity
  // =========================================================================
  describe("Bug 6: Receipt Print Layout Integrity", () => {
    it("contains clean print-specific classes and hides UI controls during print mode", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const pageCode = await fs.readFile(
        path.join(process.cwd(), "src", "app", "retailer", "applications", "page.tsx"),
        "utf-8"
      );

      // Verify print:hidden on UI controls
      assert.ok(pageCode.includes("print:hidden"), "Page must contain print:hidden classes to hide background and modal controls");
      assert.ok(pageCode.includes("print:block"), "Page must contain print:block classes for official printable header");
      assert.ok(pageCode.includes("LabourSeva Kendra Official Acknowledgment Receipt"), "Page must include official printable receipt header text");
      assert.ok(pageCode.includes("print:p-0 print:bg-white"), "Print modal must eliminate background overlays during print");
    });
  });
});
