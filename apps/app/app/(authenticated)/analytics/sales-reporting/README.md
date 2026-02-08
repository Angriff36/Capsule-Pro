# Sales Reporting (PDF Engine)

This is a separate sales reporting implementation using the **@capsule-pro/sales-reporting** package, created for comparison with the existing `/analytics/sales` module.

## Overview

### Location
- **New Implementation**: `/analytics/sales-reporting` (this module)
- **Existing Implementation**: `/analytics/sales`

### Key Differences

| Feature | Sales Reporting (PDF Engine) | Analytics/Sales (Existing) |
|---------|------------------------------|----------------------------|
| **PDF Generation** | PDFKit (server-side vector graphics) | @react-pdf/renderer (React components) |
| **Charts in PDF** | ✅ Vector bar, line, and funnel charts | ❌ Text-only reports |
| **File Processing** | Server-side with Node.js Buffer | Client-side with xlsx library |
| **Data Source** | CSV/XLSX file upload | CSV/XLSX file upload |
| **Report Types** | Weekly, Monthly, Quarterly | Weekly, Monthly, Quarterly, Annual |
| **Bundle Size** | Smaller (server-only) | Larger (client-side xlsx + recharts) |
| **Framework** | Framework-agnostic package | React-specific |
| **Production Quality** | Professional layout with charts | Basic text-based reports |

## Architecture

### Sales Reporting (This Module)

```
User uploads CSV/XLSX
       ↓
API Route (/api/sales-reporting/generate)
       ↓
@capsule-pro/sales-reporting package
  - Parses CSV/XLSX with papaparse/xlsx
  - Calculates metrics (deterministic)
  - Renders vector charts with PDFKit
  - Generates PDF buffer
       ↓
Returns PDF for download
```

### File Structure

```
packages/sales-reporting/              # The core package
  src/
    parsers/                           # CSV and XLSX parsing
    calculators/                       # Metric calculations
    charts/                            # Chart rendering (bar, line, funnel)
    pdf/                               # PDF document generation
    utils/                             # Date and formatting utilities
  examples/
    sample-data.csv                    # Sample sales data

apps/app/
  app/api/sales-reporting/generate/   # API route
  app/(authenticated)/analytics/
    sales-reporting/                   # UI page
```

## Features

### Report Types

#### Weekly Report (1 page)
- Revenue by event type (bar chart)
- Leads received, proposals sent, events closed
- Closing ratio
- Lost opportunities breakdown
- Top 3 pending deals table

#### Monthly Report (Multi-page)
- Total revenue vs previous month and year-over-year
- Average event value
- Lead source breakdown (bar chart)
- Sales funnel visualization (funnel chart)
- Win/loss trends
- Pipeline forecast (60 & 90 day)

#### Quarterly Report (Multi-page)
- Customer segment analysis
- Average sales cycle length
- Pricing trends (line chart)
- Referral performance by source
- Data-driven recommendations
- Next quarter revenue goals

### CSV Data Format

The package accepts flexible CSV column naming. Example columns:

```csv
date,event_name,event_type,client_name,lead_source,status,proposal_date,close_date,revenue,event_date
2024-01-03,Johnson Wedding Reception,Wedding,Sarah Johnson,Referral,won,2024-01-04,2024-01-10,18500,2024-06-15
```

**Required Fields:**
- Date field (event date or created date)
- Status (won, lost, pending, proposal_sent)
- Revenue/amount/total (numeric)
- Event type or service style
- Client/event name

**Optional Fields:**
- Lead source
- Proposal date
- Close date
- Salesperson
- Guest count
- Budget

## Usage

1. **Navigate to**: `http://127.0.0.1:2221/analytics/sales-reporting`

2. **Download sample data**: Click "Sample Data" button to get example CSV

3. **Upload your files**: Select one or more CSV or XLSX files

4. **Configure report**:
   - Select report type (Weekly/Monthly/Quarterly)
   - Set date range
   - Optionally add company name

5. **Generate**: Click "Generate PDF Report" and the PDF will download automatically

## Technical Details

### Package: @capsule-pro/sales-reporting

**Location**: `packages/sales-reporting/`

**Dependencies**:
- `pdfkit` - PDF generation with vector graphics
- `papaparse` - CSV parsing
- `xlsx` - Excel file parsing

**Build**: TypeScript compiled to JavaScript

**API**:
```typescript
import { generateSalesReport } from '@capsule-pro/sales-reporting';

const pdfBuffer = await generateSalesReport({
  files: [
    { name: 'sales.csv', data: buffer, type: 'csv' }
  ],
  config: {
    reportType: 'monthly',
    dateRange: { start: '2024-01-01', end: '2024-01-31' },
    companyName: 'Capsule Catering Co.'
  }
});
```

## Comparison Summary

### When to Use Sales Reporting (PDF Engine)

✅ **Use this when:**
- You need professional PDFs with charts and tables
- You want smaller client bundle size
- You need framework-agnostic reporting
- You want server-side processing
- You need production-quality executive reports

### When to Use Analytics/Sales (Existing)

✅ **Use this when:**
- You need interactive browser-based charts
- You want to explore data before generating reports
- You need the additional annual report type
- You prefer client-side processing
- You want real-time data visualization

## Development

### Building the Package

```bash
cd packages/sales-reporting
npm run build
```

### Running Example

```bash
cd packages/sales-reporting
npm run example
```

This generates sample weekly, monthly, and quarterly reports in the `examples/` folder.

### Testing the Integration

1. Start the dev server: `pnpm dev`
2. Navigate to `/analytics/sales-reporting`
3. Download sample data
4. Upload the CSV file
5. Select "Monthly" report type
6. Set date range: 2024-01-01 to 2024-03-31
7. Click "Generate PDF Report"

## Future Enhancements

Potential improvements for the PDF engine:

- [ ] Email delivery option
- [ ] Scheduled report generation
- [ ] Custom branding (logos, colors)
- [ ] Additional chart types (pie, area)
- [ ] Multi-language support
- [ ] Report template customization
- [ ] Direct database integration
- [ ] Comparison to budget targets
- [ ] Predictive forecasting

## Notes

This implementation demonstrates the **@capsule-pro/sales-reporting** package as a standalone, production-ready solution that can be:
- Integrated into any Node.js backend
- Deployed as a serverless function
- Used in other apps beyond Capsule Pro
- Extended with custom metrics and layouts

The existing `/analytics/sales` module provides a different approach with interactive browser-based visualization, while this module focuses on generating polished, executive-quality PDF reports.
