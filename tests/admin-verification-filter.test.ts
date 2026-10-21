import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { createAdminSession, adminSessionCookieName } from "../src/lib/admin-session";
import { GET as getVerificationRequests } from "../src/app/api/verification/requests/route";

test("admin verification type tabs return disjoint Users, Customers, and Retailers lists", async (t) => {
  const original = (prisma as any).$queryRawUnsafe;
  (prisma as any).$queryRawUnsafe = async (query: string) => {
    if (query.includes("FROM guests")) return [{ id: 1, name: "Guest fixture", phone: "9000000001", verification_status: "Pending" }];
    if (query.includes("FROM retail_users")) return [{ id: 2, name: "Retailer fixture", shop_name: "Test Shop", phone: "9000000002", status: "Pending" }];
    if (query.includes("FROM distributors")) return [{ id: 3, name: "Distributor fixture", phone: "9000000003", verification_status: "Pending" }];
    if (query.includes("FROM pending_registrations")) return [
      { id: 4, account_type: "retailer", full_name: "Pending retailer fixture", phone: "9000000004" },
      { id: 5, account_type: "distributor", full_name: "Pending distributor fixture", phone: "9000000005" },
    ];
    if (query.includes("FROM customers")) return [{ id: 6, full_name: "Customer fixture", phone: "9000000006", verification_status: "Pending" }];
    if (query.includes("FROM users")) return [{ id: 7, full_name: "Platform user fixture", phone: "9000000007", status: "pending", is_approved: 0 }];
    return [];
  };
  t.after(() => { (prisma as any).$queryRawUnsafe = original; });

  const adminCookie = `${adminSessionCookieName}=${createAdminSession()}`;
  async function getTypes(userType: string) {
    const response = await getVerificationRequests(new Request(
      `http://localhost/api/verification/requests?userType=${userType}&status=all`,
      { headers: { cookie: adminCookie } },
    ));
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    return (data.requests as Array<{ userType: string }>).map((request) => request.userType);
  }

  const users = await getTypes("user");
  const customers = await getTypes("customer");
  const retailers = await getTypes("retailer");

  assert.ok(users.length > 0);
  assert.ok(users.every((type) => ["user", "guest", "distributor"].includes(type)), `Users contained: ${users}`);
  assert.ok(customers.length > 0);
  assert.ok(customers.every((type) => type === "customer"), `Customers contained: ${customers}`);
  assert.ok(retailers.length > 0);
  assert.ok(retailers.every((type) => type === "retailer"), `Retailers contained: ${retailers}`);
});
