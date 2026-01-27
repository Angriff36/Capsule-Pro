import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type React from "react";
import type { ContractPDFData } from "../types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
    borderBottom: "2pt solid #1e3a5f",
    paddingBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 5,
  },
  contractId: {
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
  statusSigned: {
    backgroundColor: "#d1fae5",
    color: "#047857",
  },
  statusExpired: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
  },
  statusCancelled: {
    backgroundColor: "#fef3c7",
    color: "#b45309",
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 10,
    borderBottom: "1pt solid #ccc",
    paddingBottom: 5,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    width: "30%",
    fontSize: 9,
    color: "#666",
  },
  infoValue: {
    width: "70%",
    fontSize: 10,
  },
  partiesSection: {
    backgroundColor: "#f9fafb",
    padding: 15,
    borderRadius: 4,
    marginBottom: 20,
  },
  partyTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1e3a5f",
  },
  termsSection: {
    marginBottom: 20,
  },
  termItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 15,
  },
  termNumber: {
    fontSize: 9,
    color: "#1e3a5f",
    marginRight: 8,
    fontWeight: "bold",
  },
  termText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.5,
  },
  signaturesSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: "2pt solid #1e3a5f",
  },
  signatureCard: {
    marginBottom: 15,
    padding: 12,
    border: "0.5pt solid #e5e7eb",
    borderRadius: 4,
  },
  signatureLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 3,
  },
  signatureValue: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
  },
  signatureDate: {
    fontSize: 8,
    color: "#999",
  },
  notes: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#fef9e7",
    borderLeft: "3pt solid #f59e0b",
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
  expiryNotice: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#fee2e2",
    borderLeft: "3pt solid #dc2626",
  },
  expiryText: {
    fontSize: 9,
    color: "#dc2626",
  },
});

type ContractPDFProps = {
  data: ContractPDFData;
};

/**
 * Contract PDF Template
 *
 * Generates a professional PDF document for event contracts including:
 * - Contract details and status
 * - Client information
 * - Event details
 * - Terms and conditions
 * - Signatures
 * - Expiration information
 */
export const ContractPDF: React.FC<ContractPDFProps> = ({ data }) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    return (
      d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }) +
      " at " +
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "draft":
        return styles.statusDraft;
      case "pending":
        return styles.statusPending;
      case "signed":
        return styles.statusSigned;
      case "expired":
        return styles.statusExpired;
      case "cancelled":
        return styles.statusCancelled;
      default:
        return styles.statusDraft;
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const isExpired = data.contract.expiresAt
    ? new Date(data.contract.expiresAt) < new Date()
    : false;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Event Contract</Text>
          <Text style={styles.contractId}>{data.contract.title}</Text>
          <View
            style={[styles.statusBadge, getStatusStyle(data.contract.status)]}
          >
            <Text>{formatStatus(data.contract.status)}</Text>
          </View>
          <Text style={{ marginTop: 10, fontSize: 9, color: "#666" }}>
            Created: {formatDate(data.contract.createdAt)}
          </Text>
        </View>

        {/* Parties Section */}
        <View style={styles.partiesSection}>
          <Text style={styles.partyTitle}>Event Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Event Name:</Text>
            <Text style={styles.infoValue}>{data.event.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Event Date:</Text>
            <Text style={styles.infoValue}>{formatDate(data.event.date)}</Text>
          </View>
          {data.event.venue && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Venue:</Text>
              <Text style={styles.infoValue}>{data.event.venue}</Text>
            </View>
          )}
        </View>

        {/* Client Information */}
        {data.client && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <View style={styles.partiesSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Client Name:</Text>
                <Text style={styles.infoValue}>{data.client.name}</Text>
              </View>
              {data.client.email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{data.client.email}</Text>
                </View>
              )}
              {data.client.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{data.client.phone}</Text>
                </View>
              )}
              {data.client.address && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>{data.client.address}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Terms and Conditions */}
        {data.terms && data.terms.length > 0 && (
          <View style={[styles.section, styles.termsSection]}>
            <Text style={styles.sectionTitle}>Terms and Conditions</Text>
            {data.terms.map((term, index) => (
              <View key={index} style={styles.termItem}>
                <Text style={styles.termNumber}>{index + 1}.</Text>
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {data.contract.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Additional Notes</Text>
            <Text style={styles.notesText}>{data.contract.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signaturesSection}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          {data.signatures.length > 0 ? (
            data.signatures.map((signature) => (
              <View key={signature.id} style={styles.signatureCard}>
                <Text style={styles.signatureLabel}>Signer Name</Text>
                <Text style={styles.signatureValue}>
                  {signature.signerName}
                </Text>
                <Text style={styles.signatureLabel}>Email</Text>
                <Text style={styles.signatureValue}>
                  {signature.signerEmail}
                </Text>
                <Text style={styles.signatureDate}>
                  Signed: {formatDateTime(signature.signedAt)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 9, color: "#999", fontStyle: "italic" }}>
              No signatures yet
            </Text>
          )}
        </View>

        {/* Expiry Notice */}
        {data.contract.expiresAt && isExpired && (
          <View style={styles.expiryNotice}>
            <Text style={styles.expiryText}>
              ⚠ This contract expired on {formatDate(data.contract.expiresAt)}
            </Text>
          </View>
        )}

        {data.contract.expiresAt && !isExpired && (
          <View style={styles.section}>
            <Text style={styles.infoLabel}>Valid Until:</Text>
            <Text style={styles.infoValue}>
              {formatDate(data.contract.expiresAt)}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Generated on {formatDate(data.metadata.generatedAt)} by{" "}
            {data.metadata.generatedBy}
          </Text>
          <Text style={styles.metadata}>
            Version: {data.metadata.version} • Contract ID: {data.contract.id}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
