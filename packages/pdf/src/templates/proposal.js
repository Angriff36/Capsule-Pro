Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalPDF = void 0;
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
    color: "#1e3a5f",
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
    backgroundColor: "#1e3a5f",
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
    color: "#1e3a5f",
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a5f",
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
});
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
 */
const ProposalPDF = ({ data }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };
  const getStatusStyle = (status) => {
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
  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  return (
    <renderer_1.Document>
      <renderer_1.Page size="LETTER" style={styles.page}>
        {/* Header */}
        <renderer_1.View style={styles.header}>
          <renderer_1.Text style={styles.title}>Proposal</renderer_1.Text>
          <renderer_1.Text style={styles.proposalNumber}>
            #{data.proposal.proposalNumber}
          </renderer_1.Text>
          <renderer_1.View
            style={[styles.statusBadge, getStatusStyle(data.proposal.status)]}
          >
            <renderer_1.Text>
              {formatStatus(data.proposal.status)}
            </renderer_1.Text>
          </renderer_1.View>
          <renderer_1.Text
            style={{ marginTop: 10, fontSize: 9, color: "#666" }}
          >
            Valid until: {formatDate(data.proposal.validUntil)}
          </renderer_1.Text>
        </renderer_1.View>

        {/* Client/Lead Information */}
        {(data.client || data.lead) && (
          <renderer_1.View style={styles.section}>
            <renderer_1.Text style={styles.sectionTitle}>
              Client Information
            </renderer_1.Text>
            {data.client && (
              <renderer_1.View style={styles.clientInfo}>
                <renderer_1.Text style={styles.clientLabel}>
                  Client Name
                </renderer_1.Text>
                <renderer_1.Text style={styles.clientValue}>
                  {data.client.name}
                </renderer_1.Text>
                {data.client.email && (
                  <>
                    <renderer_1.Text style={styles.clientLabel}>
                      Email
                    </renderer_1.Text>
                    <renderer_1.Text style={styles.clientValue}>
                      {data.client.email}
                    </renderer_1.Text>
                  </>
                )}
                {data.client.phone && (
                  <>
                    <renderer_1.Text style={styles.clientLabel}>
                      Phone
                    </renderer_1.Text>
                    <renderer_1.Text style={styles.clientValue}>
                      {data.client.phone}
                    </renderer_1.Text>
                  </>
                )}
                {data.client.address && (
                  <>
                    <renderer_1.Text style={styles.clientLabel}>
                      Address
                    </renderer_1.Text>
                    <renderer_1.Text style={styles.clientValue}>
                      {data.client.address}
                    </renderer_1.Text>
                  </>
                )}
              </renderer_1.View>
            )}
            {data.lead && (
              <renderer_1.View style={styles.clientInfo}>
                <renderer_1.Text style={styles.clientLabel}>
                  Lead Name
                </renderer_1.Text>
                <renderer_1.Text style={styles.clientValue}>
                  {data.lead.name}
                </renderer_1.Text>
                {data.lead.email && (
                  <>
                    <renderer_1.Text style={styles.clientLabel}>
                      Email
                    </renderer_1.Text>
                    <renderer_1.Text style={styles.clientValue}>
                      {data.lead.email}
                    </renderer_1.Text>
                  </>
                )}
                {data.lead.phone && (
                  <>
                    <renderer_1.Text style={styles.clientLabel}>
                      Phone
                    </renderer_1.Text>
                    <renderer_1.Text style={styles.clientValue}>
                      {data.lead.phone}
                    </renderer_1.Text>
                  </>
                )}
              </renderer_1.View>
            )}
          </renderer_1.View>
        )}

        {/* Event Information */}
        {data.event && (
          <renderer_1.View style={styles.section}>
            <renderer_1.Text style={styles.sectionTitle}>
              Event Details
            </renderer_1.Text>
            <renderer_1.View style={styles.eventInfo}>
              <renderer_1.Text style={styles.clientLabel}>
                Event Name
              </renderer_1.Text>
              <renderer_1.Text style={styles.clientValue}>
                {data.event.name}
              </renderer_1.Text>
              <renderer_1.Text style={styles.clientLabel}>Date</renderer_1.Text>
              <renderer_1.Text style={styles.clientValue}>
                {formatDate(data.event.date)}
              </renderer_1.Text>
              <renderer_1.Text style={styles.clientLabel}>
                Guest Count
              </renderer_1.Text>
              <renderer_1.Text style={styles.clientValue}>
                {data.event.guestCount} guests
              </renderer_1.Text>
              {data.event.venue && (
                <>
                  <renderer_1.Text style={styles.clientLabel}>
                    Venue
                  </renderer_1.Text>
                  <renderer_1.Text style={styles.clientValue}>
                    {data.event.venue}
                  </renderer_1.Text>
                </>
              )}
            </renderer_1.View>
          </renderer_1.View>
        )}

        {/* Line Items */}
        <renderer_1.View style={styles.section}>
          <renderer_1.Text style={styles.sectionTitle}>
            Proposal Items
          </renderer_1.Text>

          {/* Header */}
          <renderer_1.View style={[styles.lineItem, styles.lineItemHeader]}>
            <renderer_1.Text style={[styles.itemName, { color: "#fff" }]}>
              Item
            </renderer_1.Text>
            <renderer_1.Text style={[styles.itemQuantity, { color: "#fff" }]}>
              Qty
            </renderer_1.Text>
            <renderer_1.Text style={[styles.itemUnitPrice, { color: "#fff" }]}>
              Unit Price
            </renderer_1.Text>
            <renderer_1.Text style={[styles.itemTotalPrice, { color: "#fff" }]}>
              Total
            </renderer_1.Text>
          </renderer_1.View>

          {/* Items */}
          {data.lineItems.map((item) => (
            <renderer_1.View key={item.id} style={styles.lineItem}>
              <renderer_1.View style={styles.itemName}>
                <renderer_1.Text>{item.name}</renderer_1.Text>
                {item.description && (
                  <renderer_1.Text style={{ fontSize: 8, color: "#666" }}>
                    {item.description}
                  </renderer_1.Text>
                )}
              </renderer_1.View>
              <renderer_1.Text style={styles.itemQuantity}>
                {item.quantity}
              </renderer_1.Text>
              <renderer_1.Text style={styles.itemUnitPrice}>
                {formatCurrency(item.unitPrice)}
              </renderer_1.Text>
              <renderer_1.Text style={styles.itemTotalPrice}>
                {formatCurrency(item.totalPrice)}
              </renderer_1.Text>
            </renderer_1.View>
          ))}
        </renderer_1.View>

        {/* Totals */}
        <renderer_1.View style={styles.totalSection}>
          <renderer_1.View style={styles.totalRow}>
            <renderer_1.Text style={styles.totalLabel}>
              Subtotal
            </renderer_1.Text>
            <renderer_1.Text style={styles.totalValue}>
              {formatCurrency(data.proposal.subtotal)}
            </renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={styles.totalRow}>
            <renderer_1.Text style={styles.totalLabel}>Tax</renderer_1.Text>
            <renderer_1.Text style={styles.totalValue}>
              {formatCurrency(data.proposal.taxAmount)}
            </renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={[styles.totalRow, styles.grandTotal]}>
            <renderer_1.Text style={styles.grandTotalLabel}>
              Total
            </renderer_1.Text>
            <renderer_1.Text style={styles.grandTotalValue}>
              {formatCurrency(data.proposal.total)}
            </renderer_1.Text>
          </renderer_1.View>
        </renderer_1.View>

        {/* Notes */}
        {data.proposal.notes && (
          <renderer_1.View style={styles.notes}>
            <renderer_1.Text style={styles.notesTitle}>Notes</renderer_1.Text>
            <renderer_1.Text style={styles.notesText}>
              {data.proposal.notes}
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
            Version: {data.metadata.version} • Valid until:{" "}
            {formatDate(data.proposal.validUntil)}
          </renderer_1.Text>
        </renderer_1.View>
      </renderer_1.Page>
    </renderer_1.Document>
  );
};
exports.ProposalPDF = ProposalPDF;
