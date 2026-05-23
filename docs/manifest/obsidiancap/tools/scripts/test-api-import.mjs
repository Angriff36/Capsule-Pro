import { readFileSync } from 'fs';

const pdfBuffer = readFileSync('e2e/rdfview_aspx_3.pdf');
const csvBuffer = readFileSync('e2e/Khosravi Wedding Time & Attendance.csv');

const form = new FormData();
form.append('files', new Blob([pdfBuffer], { type: 'application/pdf' }), 'rdfview_aspx_3.pdf');
form.append('files', new Blob([csvBuffer], { type: 'text/csv' }), 'Khosravi Wedding Time & Attendance.csv');

console.log('Posting to API...');

try {
  const response = await fetch('http://127.0.0.1:2221/api/events/documents/parse?generateBattleBoard=true&generateChecklist=true', {
    method: 'POST',
    body: form,
  });

  console.log('Response status:', response.status);
  const data = await response.json();

  console.log('\n=== API Response ===');
  console.log(JSON.stringify(data, null, 2));

  if (data.data) {
    console.log('\n=== Summary ===');
    console.log('Documents:', data.data.documents?.length || 0);
    console.log('Errors:', data.data.errors?.length || 0);
    if (data.data.errors?.length > 0) {
      console.log('\nErrors:');
      data.data.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }
    if (data.data.mergedEvent) {
      console.log('\nMerged Event:');
      console.log('  Client:', data.data.mergedEvent.client);
      console.log('  Event #:', data.data.mergedEvent.number);
      console.log('  Date:', data.data.mergedEvent.date);
      console.log('  Headcount:', data.data.mergedEvent.headcount);
    }
  }
} catch (err) {
  console.error('Request failed:', err.message);
  console.error(err.stack);
}
