async function runTests() {
  const baseUrl = "http://localhost:3001";
  console.log("=== Testing Admin Requests Integration ===");

  // 1. Fetch All Unified Requests
  console.log("\n[Test 1] Fetch All Unified Requests:");
  const res1 = await fetch(`${baseUrl}/api/admin/guest-requests`);
  const data1 = await res1.json();
  console.log(`- Status: ${data1.ok}, Total: ${data1.totalRecords}, Records returned: ${data1.records.length}`);
  console.log(`- Metrics:`, data1.stats);
  if (!data1.ok || data1.records.length === 0) throw new Error("Failed to fetch all requests");

  // 2. Fetch Customer Requests
  console.log("\n[Test 2] Filter by CUSTOMER:");
  const res2 = await fetch(`${baseUrl}/api/admin/guest-requests?requestor_type=CUSTOMER`);
  const data2 = await res2.json();
  console.log(`- Records returned: ${data2.records.length}`);
  const nonCust = data2.records.filter(r => r.requestorType !== "CUSTOMER");
  if (nonCust.length > 0) throw new Error("Found non-customer records in customer filter");
  console.log(`- All ${data2.records.length} records verified as CUSTOMER!`);

  // 3. Filter by RETAILER
  console.log("\n[Test 3] Filter by RETAILER:");
  const res3 = await fetch(`${baseUrl}/api/admin/guest-requests?requestor_type=RETAILER`);
  const data3 = await res3.json();
  console.log(`- Records returned: ${data3.records.length}`);
  const nonRet = data3.records.filter(r => r.requestorType !== "RETAILER");
  if (nonRet.length > 0) throw new Error("Found non-retailer records in retailer filter");
  console.log(`- All ${data3.records.length} records verified as RETAILER!`);

  // 4. Filter by GUEST
  console.log("\n[Test 4] Filter by GUEST:");
  const res4 = await fetch(`${baseUrl}/api/admin/guest-requests?requestor_type=GUEST`);
  const data4 = await res4.json();
  console.log(`- Records returned: ${data4.records.length}`);
  const nonGuest = data4.records.filter(r => r.requestorType !== "GUEST");
  if (nonGuest.length > 0) throw new Error("Found non-guest records in guest filter");
  console.log(`- All ${data4.records.length} records verified as GUEST!`);

  // 5. Filter by E_SERVICE
  console.log("\n[Test 5] Filter by E_SERVICE category:");
  const res5 = await fetch(`${baseUrl}/api/admin/guest-requests?service_category=E_SERVICE`);
  const data5 = await res5.json();
  console.log(`- Records returned: ${data5.records.length}`);
  const nonEs = data5.records.filter(r => r.serviceCategory !== "E_SERVICE");
  if (nonEs.length > 0) throw new Error("Found non-E-service records in E-service filter");
  console.log(`- All ${data5.records.length} records verified as E_SERVICE!`);

  // 6. Search functionality
  console.log("\n[Test 6] Search for 'Muthukumar':");
  const res6 = await fetch(`${baseUrl}/api/admin/guest-requests?search=Muthukumar`);
  const data6 = await res6.json();
  console.log(`- Found ${data6.records.length} record(s):`, data6.records.map(r => `${r.referenceNo} - ${r.applicantName}`));
  if (data6.records.length === 0) throw new Error("Search for Muthukumar returned 0 records");

  // 7. Request Counts API
  console.log("\n[Test 7] Request Counts API:");
  const res7 = await fetch(`${baseUrl}/api/admin/request-counts`);
  const data7 = await res7.json();
  console.log(`- Request counts:`, data7);

  console.log("\n>>> ALL INTEGRATION TESTS PASSED 100% SUCCESSFULLY! <<<");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
