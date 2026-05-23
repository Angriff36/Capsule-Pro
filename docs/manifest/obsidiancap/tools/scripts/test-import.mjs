/**
 * Test the full event import flow programmatically
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testImportFlow() {
  console.log('=== Event Import End-to-End Test ===\n');

  // Read test files
  const pdfPath = path.join(__dirname, 'e2e/rdfview_aspx_3.pdf');
  const csvPath = path.join(__dirname, 'e2e/Khosravi Wedding Time & Attendance.csv');

  console.log('1. Reading test files...');
  const pdfContent = readFileSync(pdfPath);
  const csvContent = readFileSync(csvPath);
  console.log(`   PDF size: ${pdfContent.length} bytes`);
  console.log(`   CSV size: ${csvContent.length} bytes`);

  // Create form data
  console.log('\n2. Creating form data...');
  const formData = new FormData();

  // Create Blob for PDF
  const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
  formData.append('files', pdfBlob, 'rdfview_aspx_3.pdf');

  // Create Blob for CSV
  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
  formData.append('files', csvBlob, 'Khosravi Wedding Time & Attendance.csv');

  console.log('\n3. Calling /api/events/documents/parse...');
  const startTime = Date.now();

  try {
    const response = await fetch('http://127.0.0.1:2221/api/events/documents/parse?generateChecklist=true&generateBattleBoard=true', {
      method: 'POST',
      body: formData,
      headers: {
        // Clerk auth cookie would go here - using unauthenticated for now
      }
    });

    const duration = Date.now() - startTime;
    console.log(`   Response time: ${duration}ms`);
    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`\n❌ Error response:`);
      console.log(errorText);
      return;
    }

    const result = await response.json();
    console.log('\n✅ Import successful!');

    // Parse the result
    const data = result.data;

    console.log('\n--- Documents Processed ---');
    console.log(`Documents: ${data.documents?.length || 0}`);
    data.documents?.forEach((doc: any) => {
      console.log(`  - ${doc.fileName}: ${doc.detectedFormat} (${doc.confidence}% confidence)`);
      if (doc.errors?.length > 0) {
        console.log(`    Errors: ${doc.errors.join(', ')}`);
      }
    });

    console.log('\n--- Extracted Event Data ---');
    if (data.mergedEvent) {
      console.log(`  Client: ${data.mergedEvent.client || 'N/A'}`);
      console.log(`  Event #: ${data.mergedEvent.number || 'N/A'}`);
      console.log(`  Date: ${data.mergedEvent.date || 'N/A'}`);
      console.log(`  Head Count: ${data.mergedEvent.headCount || data.mergedEvent.headcount || 'N/A'}`);
    } else {
      console.log('  ⚠️ No merged event data');
    }

    console.log('\n--- Staff Roster ---');
    console.log(`  Staff shifts: ${data.mergedStaff?.length || 0}`);

    console.log('\n--- Generated Artifacts ---');
    console.log(`  Battle Board ID: ${data.battleBoardId || 'NOT CREATED'}`);
    console.log(`  Checklist ID: ${data.checklistId || 'NOT CREATED'}`);

    if (data.battleBoard) {
      console.log(`  Battle Board Auto-fill: ${data.battleBoard.autoFillScore}%`);
    }

    if (data.checklist) {
      console.log(`  Checklist Progress: ${data.checklist.autoFilledCount}/${data.checklist.totalQuestions} questions`);
    }

    console.log('\n--- Errors ---');
    if (data.errors?.length > 0) {
      data.errors.forEach((err: string) => console.log(`  - ${err}`));
    } else {
      console.log('  No errors!');
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.log(`\n❌ Request failed:`);
    console.log(error);
  }
}

testImportFlow();
