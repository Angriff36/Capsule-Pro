import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface ReportSummary {
  title: string;
  windowLabel: string;
  kpis: Array<{ label: string; value: string; subtext?: string }>;
  highlights?: string[];
}

const pdfStyles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 16,
  },
  section: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 8,
  },
  kpiRow: {
    display: "flex",
    flexDirection: "row" as const,
    justifyContent: "space-between",
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 10,
    color: "#374151",
  },
  kpiValue: {
    fontSize: 11,
    fontWeight: 600,
  },
  kpiSub: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
  },
  listItem: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 3,
  },
});

export function SalesReportDocument({
  summary: reportSummary,
}: {
  summary: ReportSummary;
}) {
  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>{reportSummary.title}</Text>
        <Text style={pdfStyles.subtitle}>{reportSummary.windowLabel}</Text>
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Key Metrics</Text>
          {reportSummary.kpis.map((kpi) => (
            <View key={kpi.label}>
              <View style={pdfStyles.kpiRow}>
                <Text style={pdfStyles.kpiLabel}>{kpi.label}</Text>
                <Text style={pdfStyles.kpiValue}>{kpi.value}</Text>
              </View>
              {kpi.subtext ? (
                <Text style={pdfStyles.kpiSub}>{kpi.subtext}</Text>
              ) : null}
            </View>
          ))}
        </View>
        {reportSummary.highlights && reportSummary.highlights.length > 0 ? (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Highlights</Text>
            {reportSummary.highlights.map((item, index) => (
              <Text key={`${item}-${index}`} style={pdfStyles.listItem}>
                - {item}
              </Text>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
