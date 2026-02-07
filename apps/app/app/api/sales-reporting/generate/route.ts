import { generateSalesReport, type ReportConfig } from '@capsule-pro/sales-reporting';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API route for generating sales report PDFs using the @capsule-pro/sales-reporting package.
 * Accepts CSV/XLSX files and a report configuration, returns a PDF buffer.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();

    // Extract report configuration
    const configJson = formData.get('config');
    if (!configJson || typeof configJson !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid config parameter' },
        { status: 400 }
      );
    }

    const config: ReportConfig = JSON.parse(configJson);

    // Extract uploaded files
    const files = formData.getAll('files');
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Convert uploaded files to the format expected by the sales-reporting package
    const fileInputs = await Promise.all(
      files.map(async (file) => {
        if (!(file instanceof File)) {
          throw new Error('Invalid file upload');
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determine file type from extension
        const type = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
          ? 'xlsx' as const
          : 'csv' as const;

        return {
          name: file.name,
          data: buffer,
          type,
        };
      })
    );

    // Generate the PDF using the sales-reporting package
    const pdfBuffer = await generateSalesReport({
      files: fileInputs,
      config,
    });

    // Return the PDF as a downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sales-report-${config.reportType}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Sales report generation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate sales report',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
