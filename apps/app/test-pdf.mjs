// Test the PDF extraction directly
import { extractPdfText } from '@repo/event-parser/dist/parsers/pdf-extractor.js';
import { readFileSync } from 'fs';

const pdfBuffer = readFileSync('C:/projects/capsule-pro/e2e/Pre-Event-Review.pdf');
console.log('Testing PDF extraction...');
console.log('Input type:', pdfBuffer.constructor.name);
console.log('Input length:', pdfBuffer.length);

const result = await extractPdfText(pdfBuffer);
console.log('Result:', {
  lineCount: result.lines.length,
  pageCount: result.pageCount,
  errors: result.errors,
  firstLines: result.lines.slice(0, 10)
});
