import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type React from "react";
import type { ProposalPDFData } from "../types";

// Default colors when no branding is specified
const defaultColors = {
  primary: "#1e3a5f",
  secondary: "#4b5563",
  accent: "#3b82f6",
};

// Helper to create styles with branding colors
const createStyles = (branding?: ProposalPDFData["branding"]) => {
  const primaryColor = branding?.primaryColor || defaultColors.primary;
  const _secondaryColor = branding?.secondaryColor || defaultColors.secondary;
  const fontFamily = branding?.fontFamily || "Helvetica";

  return StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily,
    },
    header: {
      marginBottom: 30,
      borderBottom: `2pt solid ${primaryColor}`,
      paddingBottom: 15,
    },
    logoContainer: {
      marginBottom: 15,
      height: 50,
    },
    logo: {
      height: 50,
      maxWidth: 200,
      objectFit: "contain",
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 5,
    },
    proposalNumber: {
      fontSize: 12,
      color: "#666",
      marginBottom: 15,
    },
    statusBadge: {
      padding: "4 8",
      borderRadius: 3,
      fontSize: 9,
      fontWeight: "bold",
      textTransform: "uppercase",
      alignSelf: "flex-start",
    },
    statusDraft: {
      backgroundColor: "#e5e7eb",
      color: "#374151",
    },
    statusPending: {
      backgroundColor: "#dbeafe",
      color: "#1d4ed8",
    },
    statusAccepted: {
      backgroundColor: "#d1fae5",
      color: "#047857",
    },
    statusRejected: {
      backgroundColor: "#fee2e2",
      color: "#dc2626",
    },
    statusExpired: {
      backgroundColor: "#fef3c7",
      color: "#b45309",
    },
    section: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: primaryColor,
      marginBottom: 10,
      borderBottom: "1pt solid #ccc",
      paddingBottom: 5,
    },
    clientInfo: {
      marginBottom: 15,
    },
    clientLabel: {
      fontSize: 9,
      color: "#666",
      marginBottom: 2,
    },
    clientValue: {
      fontSize: 11,
      marginBottom: 8,
    },
    eventInfo: {
      backgroundColor: "#f9fafb",
      padding: 12,
      borderRadius: 4,
      marginBottom: 20,
    },
    lineItem: {
      flexDirection: "row",
      padding: "10 0",
      borderBottom: "0.5pt solid #e5e7eb",
    },
    lineItemHeader: {
      fontWeight: "bold",
      backgroundColor: primaryColor,
      color: "#fff",
      padding: "8 0",
    },
    itemName: {
      flex: 3,
      fontSize: 10,
    },
    itemDescription: {
      flex: 3,
      fontSize: 9,
      color: "#666",
    },
    itemQuantity: {
      flex: 1,
      fontSize: 10,
      textAlign: "center",
    },
    itemUnitPrice: {
      flex: 1,
      fontSize: 10,
      textAlign: "right",
    },
    itemTotalPrice: {
      flex: 1,
      fontSize: 10,
      textAlign: "right",
      fontWeight: "bold",
    },
    totalSection: {
      marginTop: 20,
      alignItems: "flex-end",
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "40%",
      marginBottom: 5,
    },
    totalLabel: {
      fontSize: 10,
      color: "#666",
    },
    totalValue: {
      fontSize: 10,
    },
    grandTotal: {
      borderTop: "1pt solid #000",
      paddingTop: 10,
      marginTop: 10,
    },
    grandTotalLabel: {
      fontSize: 12,
      fontWeight: "bold",
      color: primaryColor,
    },
    grandTotalValue: {
      fontSize: 14,
      fontWeight: "bold",
      color: primaryColor,
    },
    notes: {
      marginTop: 20,
      padding: 15,
      backgroundColor: "#fef9e7",
      borderLeft: `3pt solid ${branding?.accentColor || "#f59e0b"}`,
    },
    notesTitle: {
      fontSize: 11,
      fontWeight: "bold",
      marginBottom: 5,
    },
    notesText: {
      fontSize: 9,
      lineHeight: 1.6,
    },
    footer: {
      marginTop: 30,
      paddingTop: 15,
      borderTop: "1pt solid #ccc",
      fontSize: 8,
      color: "#999",
      textAlign: "center",
    },
    metadata: {
      fontSize: 7,
      color: "#999",
      marginTop: 5,
    },
  });
};

interface ProposalPDFProps {
  data: ProposalPDFData;
}

/**
 * Proposal PDF Template
 *
 * Generates a professional PDF document for client proposals including:
 * - Proposal details and status
 * - Client/lead information
 * - Event details (if applicable)
 * - Line items with pricing
 * - Totals breakdown
 * - Terms and notes
 * - Custom branding (logo, colors, fonts)
 */
export const ProposalPDF: React.FC<ProposalPDFProps> = ({ data }) => {
  const styles = createStyles(data.branding);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "draft":
        return styles.statusDraft;
      case "pending":
        return styles.statusPending;
      case "accepted":
        return styles.statusAccepted;
      case "rejected":
        return styles.statusRejected;
      case "expired":
        return styles.statusExpired;
      default:
        return styles.statusDraft;
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {/* Logo */}
          {data.branding?.logoUrl && (
            <View style={styles.logoContainer}>
              <Image src={data.branding.logoUrl} style={styles.logo} />
            </View>
          )}
          <Text style={styles.title}>Proposal</Text>
          <Text style={styles.proposalNumber}>
            #{data.proposal.proposalNumber}
          </Text>
          <View
            style={[styles.statusBadge, getStatusStyle(data.proposal.status)]}
          >
            <Text>{formatStatus(data.proposal.status)}</Text>
          </View>
          <Text style={{ marginTop: 10, fontSize: 9, color: "#666" }}>
            Valid until: {formatDate(data.proposal.validUntil)}
          </Text>
        </View>

        {/* Client/Lead Information */}
        {(data.client || data.lead) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            {data.client && (
              <View style={styles.clientInfo}>
                <Text style={styles.clientLabel}>Client Name</Text>
                <Text style={styles.clientValue}>{data.client.name}</Text>
                {data.client.email && (
                  <>
                    <Text style={styles.clientLabel}>Email</Text>
                    <Text style={styles.clientValue}>{data.client.email}</Text>
                  </>
                )}
                {data.client.phone && (
                  <>
                    <Text style={styles.clientLabel}>Phone</Text>
                    <Text style={styles.clientValue}>{data.client.phone}</Text>
                  </>
                )}
                {data.client.address && (
                  <>
                    <Text style={styles.clientLabel}>Address</Text>
                    <Text style={styles.clientValue}>
                      {data.client.address}
                    </Text>
                  </>
                )}
              </View>
            )}
            {data.lead && (
              <View style={styles.clientInfo}>
                <Text style={styles.clientLabel}>Lead Name</Text>
                <Text style={styles.clientValue}>{data.lead.name}</Text>
                {data.lead.email && (
                  <>
                    <Text style={styles.clientLabel}>Email</Text>
                    <Text style={styles.clientValue}>{data.lead.email}</Text>
                  </>
                )}
                {data.lead.phone && (
                  <>
                    <Text style={styles.clientLabel}>Phone</Text>
                    <Text style={styles.clientValue}>{data.lead.phone}</Text>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Event Information */}
        {data.event && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            <View style={styles.eventInfo}>
              <Text style={styles.clientLabel}>Event Name</Text>
              <Text style={styles.clientValue}>{data.event.name}</Text>
              <Text style={styles.clientLabel}>Date</Text>
              <Text style={styles.clientValue}>
                {formatDate(data.event.date)}
              </Text>
              <Text style={styles.clientLabel}>Guest Count</Text>
              <Text style={styles.clientValue}>
                {data.event.guestCount} guests
              </Text>
              {data.event.venue && (
                <>
                  <Text style={styles.clientLabel}>Venue</Text>
                  <Text style={styles.clientValue}>{data.event.venue}</Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proposal Items</Text>

          {/* Header */}
          <View style={[styles.lineItem, styles.lineItemHeader]}>
            <Text style={[styles.itemName, { color: "#fff" }]}>Item</Text>
            <Text style={[styles.itemQuantity, { color: "#fff" }]}>Qty</Text>
            <Text style={[styles.itemUnitPrice, { color: "#fff" }]}>
              Unit Price
            </Text>
            <Text style={[styles.itemTotalPrice, { color: "#fff" }]}>
              Total
            </Text>
          </View>

          {/* Items */}
          {data.lineItems.map((item) => (
            <View key={item.id} style={styles.lineItem}>
              <View style={styles.itemName}>
                <Text>{item.name}</Text>
                {item.description && (
                  <Text style={{ fontSize: 8, color: "#666" }}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Text style={styles.itemQuantity}>{item.quantity}</Text>
              <Text style={styles.itemUnitPrice}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={styles.itemTotalPrice}>
                {formatCurrency(item.totalPrice)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.proposal.subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.proposal.taxAmount)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(data.proposal.total)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {data.proposal.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{data.proposal.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Generated on {formatDate(data.metadata.generatedAt)} by{" "}
            {data.metadata.generatedBy}
          </Text>
          <Text style={styles.metadata}>
            Version: {data.metadata.version} • Valid until:{" "}
            {formatDate(data.proposal.validUntil)}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
