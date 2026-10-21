const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function main() {
  const filePath = path.join(process.cwd(), 'public', 'assets', 'uploads', 'services', 'doc_696296cd4f4f8.pdf');
  const buf = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(buf);
  const pages = pdfDoc.getPages();
  console.log('Total pages:', pages.length);
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const size = p.getSize();
    const rotation = p.getRotation();
    console.log(`Page ${i + 1}: size=(${size.width}, ${size.height}), rotation=${rotation.angle}`);
  }
}

main().catch(console.error);
