const http = require('http');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const payload = [
  '--' + boundary,
  'Content-Disposition: form-data; name="documentType"',
  '',
  'passportPhoto',
  '--' + boundary,
  'Content-Disposition: form-data; name="file"; filename="photo.png"',
  'Content-Type: image/png',
  '',
  'PNGFAKEBYTES123',
  '--' + boundary + '--',
  ''
].join('\r\n');

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/es-services/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('UPLOAD STATUS:', res.statusCode, 'DATA:', d));
});
req.write(payload);
req.end();
