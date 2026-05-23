/**
 * Test using exact Battle-Boards pattern
 */
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { readFileSync } from 'fs';

// Set worker exactly as Battle-Boards does
GlobalWorkerOptions.workerSrc =
  typeof window !== 'undefined'
    ? 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/pdf.worker.min.mjs'
    : new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();

console.log('Worker source:', GlobalWorkerOptions.workerSrc);

const pdfBuffer = readFileSync('e2e/rdfview_aspx_3.pdf');
console.log('PDF buffer size:', pdfBuffer.length, 'bytes');

// Convert to Uint8Array
const data = Uint8Array.from(pdfBuffer);

try {
  const loadingTask = getDocument({
    data,
    disableFontFace: true,
    disableRange: true,
    disableStream: true,
  });

  const pdf = await loadingTask.promise;
  console.log('✅ PDF loaded! Pages:', pdf.numPages);

  // Extract first page text
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const lines = textContent.items.filter(item => item.str).map(item => item.str);

  console.log('First 5 lines:');
  lines.slice(0, 5).forEach((line, i) => console.log(`  ${i + 1}. ${line}`));
} catch (err) {
  console.error('❌ Failed:', err.message);
  console.error(err.stack);
}
