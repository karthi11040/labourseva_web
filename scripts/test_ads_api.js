const http = require('http');

async function testFetch(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Testing GET /api/ads...');
  try {
    const res1 = await testFetch('/api/ads?placement=HOME_SLIDER');
    console.log('GET /api/ads response status:', res1.status);
    console.log('Manual Ads:', res1.body.manualAds?.length);
    console.log('Sample Ad:', res1.body.manualAds?.[0]);
  } catch (err) {
    console.log('Dev server not on port 3000 or error:', err.message);
  }

  try {
    const res2 = await testFetch('/api/admin/ads');
    console.log('GET /api/admin/ads response status:', res2.status);
    console.log('AdSense Units:', res2.body.googleAdSense?.units?.length);
  } catch (err) {
    console.log('Dev server error:', err.message);
  }
}

main();
