import * as fs from 'fs';
import * as path from 'path';
import { generateSalesReport, ReportInput } from '../src/index';

async function main() {
  const csvPath = path.join(__dirname, 'sample-data.csv');
  const csvData = fs.readFileSync(csvPath);

  const reports: Array<{ type: 'weekly' | 'monthly' | 'quarterly'; start: string; end: string; filename: string }> = [
    {
      type: 'weekly',
      start: '2024-03-01',
      end: '2024-03-07',
      filename: 'weekly-report.pdf',
    },
    {
      type: 'monthly',
      start: '2024-03-01',
      end: '2024-03-31',
      filename: 'monthly-report.pdf',
    },
    {
      type: 'quarterly',
      start: '2024-01-01',
      end: '2024-03-31',
      filename: 'quarterly-report.pdf',
    },
  ];

  for (const report of reports) {
    const input: ReportInput = {
      files: [
        {
          name: 'sample-data.csv',
          data: csvData,
          type: 'csv',
        },
      ],
      config: {
        reportType: report.type,
        dateRange: {
          start: report.start,
          end: report.end,
        },
        companyName: 'Capsule Catering Co.',
      },
    };

    console.log(`Generating ${report.type} report...`);
    const pdf = await generateSalesReport(input);
    const outPath = path.join(__dirname, report.filename);
    fs.writeFileSync(outPath, pdf);
    console.log(`  -> ${outPath} (${(pdf.length / 1024).toFixed(1)} KB)`);
  }

  console.log('\nAll reports generated successfully.');
}

main().catch(err => {
  console.error('Error generating reports:', err);
  process.exit(1);
});
