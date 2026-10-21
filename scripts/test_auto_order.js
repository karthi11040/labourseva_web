const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log("=== Testing Auto Order and Reordering ===");

  // 1. Create a banner with isAutoOrder: true
  const res1 = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/promotions',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    type: 'MANUAL',
    title: 'Auto Order Test Ad 1',
    image: '/uploads/ads/test1.png',
    placement: 'HOME_SLIDER',
    isAutoOrder: true,
    status: 'ACTIVE'
  });
  console.log("1. Create with isAutoOrder: true ->", res1.status, res1.data);

  // 2. Create another banner with isAutoOrder: true
  const res2 = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/promotions',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    type: 'MANUAL',
    title: 'Auto Order Test Ad 2',
    image: '/uploads/ads/test2.png',
    placement: 'HOME_SLIDER',
    isAutoOrder: true,
    status: 'ACTIVE'
  });
  console.log("2. Create second ad with isAutoOrder: true ->", res2.status, res2.data);

  // 3. Create a banner with custom sortOrder
  const res3 = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/promotions',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    type: 'MANUAL',
    title: 'Custom Order Test Ad 3',
    image: '/uploads/ads/test3.png',
    placement: 'HOME_SLIDER',
    isAutoOrder: false,
    sortOrder: 99,
    status: 'ACTIVE'
  });
  console.log("3. Create ad with custom sortOrder (99) ->", res3.status, res3.data);

  // 4. Fetch list to get their IDs and check orders
  const listRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/promotions',
    method: 'GET'
  });
  const createdAds = (listRes.data.manualAds || []).filter(a => a.title.includes('Test Ad'));
  console.log("4. Fetch list:", createdAds.map(a => ({ id: a.id, title: a.title, sortOrder: a.sortOrder })));

  if (createdAds.length >= 2) {
    // 5. Test Swap (Reorder)
    const adA = createdAds[0];
    const adB = createdAds[1];
    const swapRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/admin/promotions',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, {
      type: 'REORDER_SWAP',
      id1: adA.id,
      order1: adB.sortOrder,
      id2: adB.id,
      order2: adA.sortOrder
    });
    console.log("5. Swap sort orders ->", swapRes.status, swapRes.data);
  }

  // 6. Test AUTO_RESEQUENCE
  const reseqRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/promotions',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, {
    type: 'AUTO_RESEQUENCE',
    placement: 'HOME_SLIDER'
  });
  console.log("6. Auto-resequence ->", reseqRes.status, reseqRes.data);

  // 7. Cleanup created test ads
  for (const ad of createdAds) {
    await request({
      hostname: 'localhost',
      port: 3001,
      path: `/api/admin/promotions?id=${ad.id}&type=MANUAL`,
      method: 'DELETE'
    });
  }
  console.log("7. Cleaned up test ads successfully.");
}

runTests().catch(console.error);
