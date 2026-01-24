Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractPDF = void 0;
const renderer_1 = require("@react-pdf/renderer");
const styles = renderer_1.StyleSheet.create({
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
const ContractPDF = ({ data }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  const formatDateTime = (date) => {
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
  const getStatusStyle = (status) => {
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
  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  const isExpired = data.contract.expiresAt
    ? new Date(data.contract.expiresAt) < new Date()
    : false;
  return (
    <renderer_1.Document>
      <renderer_1.Page size="LETTER" style={styles.page}>
        {/* Header */}
        <renderer_1.View style={styles.header}>
          <renderer_1.Text style={styles.title}>Event Contract</renderer_1.Text>
          <renderer_1.Text style={styles.contractId}>
            {data.contract.title}
          </renderer_1.Text>
          <renderer_1.View
            style={[styles.statusBadge, getStatusStyle(data.contract.status)]}
          >
            <renderer_1.Text>
              {formatStatus(data.contract.status)}
            </renderer_1.Text>
          </renderer_1.View>
          <renderer_1.Text
            style={{ marginTop: 10, fontSize: 9, color: "#666" }}
          >
            Created: {formatDate(data.contract.createdAt)}
          </renderer_1.Text>
        </renderer_1.View>

        {/* Parties Section */}
        <renderer_1.View style={styles.partiesSection}>
          <renderer_1.Text style={styles.partyTitle}>
            Event Details
          </renderer_1.Text>
          <renderer_1.View style={styles.infoRow}>
            <renderer_1.Text style={styles.infoLabel}>
              Event Name:
            </renderer_1.Text>
            <renderer_1.Text style={styles.infoValue}>
              {data.event.name}
            </renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={styles.infoRow}>
            <renderer_1.Text style={styles.infoLabel}>
              Event Date:
            </renderer_1.Text>
            <renderer_1.Text style={styles.infoValue}>
              {formatDate(data.event.date)}
            </renderer_1.Text>
          </renderer_1.View>
          {data.event.venue && (
            <renderer_1.View style={styles.infoRow}>
              <renderer_1.Text style={styles.infoLabel}>Venue:</renderer_1.Text>
              <renderer_1.Text style={styles.infoValue}>
                {data.event.venue}
              </renderer_1.Text>
            </renderer_1.View>
          )}
        </renderer_1.View>

        {/* Client Information */}
        {data.client && (
          <renderer_1.View style={styles.section}>
            <renderer_1.Text style={styles.sectionTitle}>
              Client Information
            </renderer_1.Text>
            <renderer_1.View style={styles.partiesSection}>
              <renderer_1.View style={styles.infoRow}>
                <renderer_1.Text style={styles.infoLabel}>
                  Client Name:
                </renderer_1.Text>
                <renderer_1.Text style={styles.infoValue}>
                  {data.client.name}
                </renderer_1.Text>
              </renderer_1.View>
              {data.client.email && (
                <renderer_1.View style={styles.infoRow}>
                  <renderer_1.Text style={styles.infoLabel}>
                    Email:
                  </renderer_1.Text>
                  <renderer_1.Text style={styles.infoValue}>
                    {data.client.email}
                  </renderer_1.Text>
                </renderer_1.View>
              )}
              {data.client.phone && (
                <renderer_1.View style={styles.infoRow}>
                  <renderer_1.Text style={styles.infoLabel}>
                    Phone:
                  </renderer_1.Text>
                  <renderer_1.Text style={styles.infoValue}>
                    {data.client.phone}
                  </renderer_1.Text>
                </renderer_1.View>
              )}
              {data.client.address && (
                <renderer_1.View style={styles.infoRow}>
                  <renderer_1.Text style={styles.infoLabel}>
                    Address:
                  </renderer_1.Text>
                  <renderer_1.Text style={styles.infoValue}>
                    {data.client.address}
                  </renderer_1.Text>
                </renderer_1.View>
              )}
            </renderer_1.View>
          </renderer_1.View>
        )}

        {/* Terms and Conditions */}
        {data.terms && data.terms.length > 0 && (
          <renderer_1.View style={[styles.section, styles.termsSection]}>
            <renderer_1.Text style={styles.sectionTitle}>
              Terms and Conditions
            </renderer_1.Text>
            {data.terms.map((term, index) => (
              <renderer_1.View key={index} style={styles.termItem}>
                <renderer_1.Text style={styles.termNumber}>
                  {index + 1}.
                </renderer_1.Text>
                <renderer_1.Text style={styles.termText}>
                  {term}
                </renderer_1.Text>
              </renderer_1.View>
            ))}
          </renderer_1.View>
        )}

        {/* Notes */}
        {data.contract.notes && (
          <renderer_1.View style={styles.notes}>
            <renderer_1.Text style={styles.notesTitle}>
              Additional Notes
            </renderer_1.Text>
            <renderer_1.Text style={styles.notesText}>
              {data.contract.notes}
            </renderer_1.Text>
          </renderer_1.View>
        )}

        {/* Signatures */}
        <renderer_1.View style={styles.signaturesSection}>
          <renderer_1.Text style={styles.sectionTitle}>
            Signatures
          </renderer_1.Text>
          {data.signatures.length > 0 ? (
            data.signatures.map((signature) => (
              <renderer_1.View key={signature.id} style={styles.signatureCard}>
                <renderer_1.Text style={styles.signatureLabel}>
                  Signer Name
                </renderer_1.Text>
                <renderer_1.Text style={styles.signatureValue}>
                  {signature.signerName}
                </renderer_1.Text>
                <renderer_1.Text style={styles.signatureLabel}>
                  Email
                </renderer_1.Text>
                <renderer_1.Text style={styles.signatureValue}>
                  {signature.signerEmail}
                </renderer_1.Text>
                <renderer_1.Text style={styles.signatureDate}>
                  Signed: {formatDateTime(signature.signedAt)}
                </renderer_1.Text>
              </renderer_1.View>
            ))
          ) : (
            <renderer_1.Text
              style={{ fontSize: 9, color: "#999", fontStyle: "italic" }}
            >
              No signatures yet
            </renderer_1.Text>
          )}
        </renderer_1.View>

        {/* Expiry Notice */}
        {data.contract.expiresAt && isExpired && (
          <renderer_1.View style={styles.expiryNotice}>
            <renderer_1.Text style={styles.expiryText}>
              ⚠ This contract expired on {formatDate(data.contract.expiresAt)}
            </renderer_1.Text>
          </renderer_1.View>
        )}

        {data.contract.expiresAt && !isExpired && (
          <renderer_1.View style={styles.section}>
            <renderer_1.Text style={styles.infoLabel}>
              Valid Until:
            </renderer_1.Text>
            <renderer_1.Text style={styles.infoValue}>
              {formatDate(data.contract.expiresAt)}
            </renderer_1.Text>
          </renderer_1.View>
        )}

        {/* Footer */}
        <renderer_1.View style={styles.footer}>
          <renderer_1.Text>
            Generated on {formatDate(data.metadata.generatedAt)} by{" "}
            {data.metadata.generatedBy}
          </renderer_1.Text>
          <renderer_1.Text style={styles.metadata}>
            Version: {data.metadata.version} • Contract ID: {data.contract.id}
          </renderer_1.Text>
        </renderer_1.View>
      </renderer_1.Page>
    </renderer_1.Document>
  );
};
exports.ContractPDF = ContractPDF;
