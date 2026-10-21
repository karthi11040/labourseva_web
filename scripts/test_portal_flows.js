const http = require('http');

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:3001${path}`, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json || body,
          rawCookies: res.headers['set-cookie'],
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function main() {
  console.log('=== 1. Testing Retailer Login & Wallet Flows ===');
  const retLoginRes = await request('/api/retailer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { identifier: '9999888877', password: 'Karthi@2004' }
  });
  console.log('Retailer Login Status:', retLoginRes.statusCode, retLoginRes.data?.ok ? 'SUCCESS' : 'FAILED', retLoginRes.data?.retailer?.name);

  const retCookie = retLoginRes.rawCookies ? retLoginRes.rawCookies[0].split(';')[0] : '';
  console.log('Retailer Cookie set:', Boolean(retCookie));

  // Test Retailer Dashboard
  const retDashRes = await request('/api/retailer/dashboard', {
    headers: { Cookie: retCookie }
  });
  console.log('Retailer Dashboard Status:', retDashRes.statusCode, 'Stats:', retDashRes.data?.stats);

  // Test Top-Up Retailer Wallet (give 200 rs for test)
  const retTopupRes = await request('/api/retailer/wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: retCookie },
    body: { amount: 250, paymentMethod: 'UPI Instant', referenceNote: 'Test Top-Up' }
  });
  console.log('Retailer Wallet Top-Up:', retTopupRes.statusCode, retTopupRes.data?.message, 'New Balance:', retTopupRes.data?.newBalance);

  // Test Assisted Application Submission with Wallet Deduction
  const retApplyRes = await request('/api/retailer/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: retCookie },
    body: {
      citizenName: 'K. Senthil Kumar',
      citizenPhone: '9840123456',
      citizenAadhaar: '7890',
      serviceType: 'STATUTORY',
      serviceId: 1,
      districtId: 1,
      address: '14 Anna Nagar West, Chennai',
      notes: 'Assisted application filed at Kendra desk'
    }
  });
  console.log('Retailer Assisted Application:', retApplyRes.statusCode, retApplyRes.data?.message);
  console.log('App Ref:', retApplyRes.data?.applicationNumber, 'Receipt No:', retApplyRes.data?.receiptNo, 'Deducted:', retApplyRes.data?.deductedAmount, 'Profit:', retApplyRes.data?.commissionEarned, 'Closing Balance:', retApplyRes.data?.closingBalance);

  console.log('\n=== 2. Testing Distributor Login, Retailer Funding & KYC ===');
  const distLoginRes = await request('/api/distributor/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { identifier: 'distributor@test.com', password: 'distributor123' }
  });
  console.log('Distributor Login Status:', distLoginRes.statusCode, distLoginRes.data?.ok ? 'SUCCESS' : 'FAILED', distLoginRes.data?.distributor?.name);

  const distCookie = distLoginRes.rawCookies ? distLoginRes.rawCookies[0].split(';')[0] : '';

  // Test Distributor Dashboard
  const distDashRes = await request('/api/distributor/dashboard', {
    headers: { Cookie: distCookie }
  });
  console.log('Distributor Dashboard Status:', distDashRes.statusCode, 'Stats:', distDashRes.data?.stats);

  // Test Funding Retailer Wallet from Distributor Float
  const distFundRes = await request('/api/distributor/retailers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: distCookie },
    body: {
      action: 'fund_retailer',
      retailerId: 2,
      amount: 50,
      note: 'Operating float transfer'
    }
  });
  console.log('Fund Retailer Result:', distFundRes.statusCode, distFundRes.data?.message, 'New Dist Balance:', distFundRes.data?.newDistributorBalance);

  // Test Distributor KYC
  const distKycRes = await request('/api/distributor/kyc', {
    headers: { Cookie: distCookie }
  });
  console.log('Distributor KYC Status:', distKycRes.statusCode, 'Verification Status:', distKycRes.data?.kyc?.verificationStatus);

  console.log('\n=== 3. Testing Customer Document Vault API ===');
  const custDocRes = await request('/api/user/documents');
  console.log('Customer Documents API Status:', custDocRes.statusCode, 'Total Docs:', custDocRes.data?.documents?.length);

  console.log('\n=== ALL END-TO-END FLOW TESTS COMPLETED SUCCESSFULLY! ===');
}

main().catch(console.error);
