/**
 * Direct PDF extraction test
 */
import { readFileSync } from 'fs';
import { extractPdfText } from './packages/event-parser/dist/parsers/pdf-extractor.js';

const pdfBuffer = readFileSync('e2e/rdfview_aspx_3.pdf');

console.log('Testing PDF extraction...');
console.log(`PDF buffer size: ${pdfBuffer.length} bytes\n`);

try {
  const result = await extractPdfText(pdfBuffer);

  console.log('PDF Extraction Result:');
  console.log(`  Pages: ${result.pageCount}`);
  console.log(`  Lines extracted: ${result.lines.length}`);
  console.log(`  Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  if (result.lines.length > 0) {
    console.log('\nFirst 10 lines:');
    result.lines.slice(0, 10).forEach((line, i) => console.log(`  ${i + 1}. ${line}`));
  }

  console.log('\n✅ PDF extraction completed!');
} catch (err) {
  console.error('❌ PDF extraction failed:', err.message);
  console.error(err.stack);
}
