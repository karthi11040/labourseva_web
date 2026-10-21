const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testAspectStamp() {
  const pdfPath = path.join(process.cwd(), 'public', 'assets', 'uploads', 'services', 'doc_696296cd4f4f8.pdf');
  const imgPath = path.join(process.cwd(), 'public', 'assets', 'uploads', 'signatures', 'district_523_6991e28d9ee4d.png');
  const pdfBytes = fs.readFileSync(pdfPath);
  const imgBytes = fs.readFileSync(imgPath);

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();

  // Test with coordinates from Image 1:
  // In Image 1, the box was placed below Line 2 (around posY = 0.86, posX = 0.55, widthPercent = 0.4)
  const posX = 0.55;
  const posY = 0.86;
  const widthPercent = 0.4;

  const stampBoxWidth = width * widthPercent;
  const stampBoxHeight = stampBoxWidth * (1.2 / 3);

  const centerX = width * posX;
  const centerYFromTop = height * posY;
  const centerY = height - centerYFromTop;

  const stampBoxX = Math.max(0, Math.min(width - stampBoxWidth, centerX - stampBoxWidth / 2));
  const stampBoxY = Math.max(0, Math.min(height - stampBoxHeight, centerY - stampBoxHeight / 2));

  const embeddedImg = await pdfDoc.embedPng(imgBytes);

  // Exact object-contain calculation with 4pt padding matching p-1 in CSS
  const padding = 4;
  const availWidth = Math.max(10, stampBoxWidth - padding * 2);
  const availHeight = Math.max(10, stampBoxHeight - padding * 2);

  const imgAspect = embeddedImg.width / embeddedImg.height;
  const boxAspect = availWidth / availHeight;

  let drawWidth = availWidth;
  let drawHeight = availHeight;

  if (imgAspect > boxAspect) {
    drawWidth = availWidth;
    drawHeight = availWidth / imgAspect;
  } else {
    drawHeight = availHeight;
    drawWidth = availHeight * imgAspect;
  }

  const drawX = stampBoxX + (stampBoxWidth - drawWidth) / 2;
  const drawY = stampBoxY + (stampBoxHeight - drawHeight) / 2;

  console.log('Stamp Box:', { stampBoxX, stampBoxY, stampBoxWidth, stampBoxHeight });
  console.log('Drawn Image (object-contain):', { drawX, drawY, drawWidth, drawHeight });

  page.drawImage(embeddedImg, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  });

  const out = await pdfDoc.save();
  fs.writeFileSync('./scripts/output_contain_test.pdf', out);
  console.log('Saved ./scripts/output_contain_test.pdf successfully!');
}

testAspectStamp().catch(console.error);
