const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testStamp() {
  const pdfPath = path.join(process.cwd(), 'public', 'assets', 'uploads', 'services', 'doc_696296cd4f4f8.pdf');
  const imgPath = path.join(process.cwd(), 'public', 'assets', 'uploads', 'signatures', 'district_523_6991e28d9ee4d.png');
  const pdfBytes = fs.readFileSync(pdfPath);
  const imgBytes = fs.readFileSync(imgPath);

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();

  // What was posX, posY in DB?
  const posX = 0.72088534;
  const posY = 0.8108772;
  const widthPercent = 0.4;

  const stampWidth = Math.max(30, width * (widthPercent || 0.25));
  const stampHeight = stampWidth * (1.2 / 3);

  const centerX = width * posX;
  const centerYFromTop = height * posY;
  const centerY = height - centerYFromTop;

  const stampX = Math.max(0, Math.min(width - stampWidth, centerX - stampWidth / 2));
  const stampY = Math.max(0, Math.min(height - stampHeight, centerY - stampHeight / 2));

  console.log({
    width,
    height,
    stampWidth,
    stampHeight,
    centerX,
    centerYFromTop,
    centerY,
    stampX,
    stampY,
    stampTopFromTop: height - (stampY + stampHeight),
    stampBottomFromTop: height - stampY
  });

  const embeddedImg = await pdfDoc.embedPng(imgBytes);
  page.drawImage(embeddedImg, {
    x: stampX,
    y: stampY,
    width: stampWidth,
    height: stampHeight,
  });

  const outBytes = await pdfDoc.save();
  fs.writeFileSync('./scripts/output_test.pdf', outBytes);
  console.log('Saved to ./scripts/output_test.pdf');
}

testStamp().catch(console.error);
