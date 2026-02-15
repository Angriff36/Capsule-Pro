import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type React from "react";
import type { PackingListPDFData } from "../types";

type PackingListItem = PackingListPDFData["items"][number];

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2pt solid #1e3a5f",
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  headerInfo: {
    fontSize: 11,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  headerLabel: {
    fontWeight: "bold",
    color: "#333",
  },
  headerValue: {
    color: "#666",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 10,
    borderBottom: "1pt solid #ccc",
    paddingBottom: 5,
  },
  locationBox: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  locationLabel: {
    fontWeight: "bold",
    fontSize: 9,
    color: "#666",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  locationName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 3,
  },
  locationAddress: {
    fontSize: 9,
    color: "#666",
  },
  itemTable: {
    width: "100%",
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #eee",
    padding: "6 4",
    fontSize: 9,
  },
  tableHeader: {
    backgroundColor: "#1e3a5f",
    color: "#fff",
    fontWeight: "bold",
    padding: "6 4",
    fontSize: 9,
  },
  colCheckbox: {
    width: "5%",
  },
  colItemNumber: {
    width: "12%",
  },
  colItemName: {
    width: "28%",
  },
  colQuantity: {
    width: "10%",
    textAlign: "center",
  },
  colUnit: {
    width: "8%",
    textAlign: "center",
  },
  colLotNumber: {
    width: "12%",
  },
  colExpiration: {
    width: "10%",
  },
  colCondition: {
    width: "8%",
  },
  colCost: {
    width: "12%",
    textAlign: "right",
  },
  colReceived: {
    width: "7%",
    textAlign: "center",
  },
  checkbox: {
    width: 12,
    height: 12,
    border: "1pt solid #ccc",
    borderRadius: 2,
  },
  receivedCheck: {
    backgroundColor: "#1e3a5f",
  },
  summaryBox: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  summaryLabel: {
    fontWeight: "bold",
    marginRight: 10,
    color: "#333",
  },
  summaryValue: {
    color: "#1e3a5f",
    fontWeight: "bold",
  },
  statusBadge: {
    padding: "3 8",
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  statusDraft: {
    backgroundColor: "#e5e7eb",
    color: "#374151",
  },
  statusScheduled: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },
  statusInTransit: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  statusDelivered: {
    backgroundColor: "#d1fae5",
    color: "#047857",
  },
  trackingBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 4,
    border: "1pt solid #bfdbfe",
  },
  trackingLabel: {
    fontSize: 9,
    color: "#1e40af",
    marginBottom: 3,
  },
  trackingNumber: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e40af",
  },
  notesBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#fef9c3",
    borderRadius: 4,
    border: "1pt solid #fde047",
  },
  notesLabel: {
    fontSize: 9,
    color: "#854d0e",
    marginBottom: 3,
  },
  notesText: {
    fontSize: 9,
    color: "#713f12",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
    borderTop: "1pt solid #eee",
    paddingTop: 10,
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    right: 30,
    fontSize: 8,
    color: "#999",
  },
});

interface PackingListPDFProps {
  data: PackingListPDFData;
}

export const PackingListPDF: React.FC<PackingListPDFProps> = ({ data }) => {
  const { shipment, fromLocation, toLocation, items, summary } = data;

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "draft":
        return styles.statusDraft;
      case "scheduled":
        return styles.statusScheduled;
      case "in_transit":
        return styles.statusInTransit;
      case "delivered":
        return styles.statusDelivered;
      default:
        return styles.statusDraft;
    }
  };

  const formatCurrency = (amount: number | string | undefined): string => {
    if (typeof amount === "string") {
      amount = Number.parseFloat(amount);
    }
    if (typeof amount !== "number" || Number.isNaN(amount)) {
      return "$0.00";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) {
      return "N/A";
    }
    return new Date(date).toLocaleDateString();
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Packing List</Text>
            <Text
              style={[styles.statusBadge, getStatusBadgeStyle(shipment.status)]}
            >
              {shipment.status.replace("_", " ").toUpperCase()}
            </Text>
          </View>
          <Text style={styles.subtitle}>
            Shipment #{shipment.shipmentNumber}
          </Text>
          <View style={styles.headerRow}>
            <Text style={styles.headerInfo}>
              Scheduled: {formatDate(shipment.scheduledDate)}
            </Text>
            {shipment.shippedDate && (
              <Text style={styles.headerInfo}>
                Shipped: {formatDate(shipment.shippedDate)}
              </Text>
            )}
          </View>
          {shipment.estimatedDeliveryDate && (
            <Text style={styles.headerInfo}>
              Est. Delivery: {formatDate(shipment.estimatedDeliveryDate)}
            </Text>
          )}
        </View>

        {/* Tracking Information */}
        {(shipment.carrier || shipment.trackingNumber) && (
          <View style={styles.trackingBox}>
            {shipment.carrier && (
              <>
                <Text style={styles.trackingLabel}>Carrier:</Text>
                <Text style={styles.trackingNumber}>{shipment.carrier}</Text>
              </>
            )}
            {shipment.trackingNumber && (
              <>
                <Text style={styles.trackingLabel}>Tracking Number:</Text>
                <Text style={styles.trackingNumber}>
                  {shipment.trackingNumber}
                </Text>
              </>
            )}
            {shipment.shippingMethod && (
              <>
                <Text style={styles.trackingLabel}>Service:</Text>
                <Text style={styles.trackingNumber}>
                  {shipment.shippingMethod}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Locations */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {fromLocation && (
              <View style={[styles.locationBox, { flex: 1 }]}>
                <Text style={styles.locationLabel}>Ship From</Text>
                <Text style={styles.locationName}>{fromLocation.name}</Text>
                {fromLocation.address && (
                  <Text style={styles.locationAddress}>
                    {fromLocation.address}
                  </Text>
                )}
                {fromLocation.city && fromLocation.state && (
                  <Text style={styles.locationAddress}>
                    {fromLocation.city}, {fromLocation.state}{" "}
                    {fromLocation.zipCode || ""}
                  </Text>
                )}
              </View>
            )}
            {toLocation && (
              <View style={[styles.locationBox, { flex: 1 }]}>
                <Text style={styles.locationLabel}>Ship To</Text>
                <Text style={styles.locationName}>{toLocation.name}</Text>
                {toLocation.address && (
                  <Text style={styles.locationAddress}>
                    {toLocation.address}
                  </Text>
                )}
                {toLocation.city && toLocation.state && (
                  <Text style={styles.locationAddress}>
                    {toLocation.city}, {toLocation.state}{" "}
                    {toLocation.zipCode || ""}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {/* Table Header */}
          <View style={styles.tableRow}>
            <View style={styles.colCheckbox}>
              <Text style={styles.tableHeader}>Packed</Text>
            </View>
            <View style={styles.colItemNumber}>
              <Text style={styles.tableHeader}>Item #</Text>
            </View>
            <View style={styles.colItemName}>
              <Text style={styles.tableHeader}>Item Name</Text>
            </View>
            <View style={styles.colQuantity}>
              <Text style={styles.tableHeader}>Qty</Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={styles.tableHeader}>Unit</Text>
            </View>
            <View style={styles.colLotNumber}>
              <Text style={styles.tableHeader}>Lot #</Text>
            </View>
            <View style={styles.colExpiration}>
              <Text style={styles.tableHeader}>Expires</Text>
            </View>
            <View style={styles.colCondition}>
              <Text style={styles.tableHeader}>Cond</Text>
            </View>
            <View style={styles.colCost}>
              <Text style={styles.tableHeader}>Cost</Text>
            </View>
            <View style={styles.colReceived}>
              <Text style={styles.tableHeader}>Recv</Text>
            </View>
          </View>

          {/* Table Rows */}
          {items.map((item, index) => (
            <View key={item.id || index} style={styles.tableRow}>
              <View style={styles.colCheckbox}>
                <View
                  style={[
                    styles.checkbox,
                    ...(item.quantityReceived &&
                    item.quantityReceived >= item.quantityShipped
                      ? [styles.receivedCheck]
                      : []),
                  ]}
                />
              </View>
              <View style={styles.colItemNumber}>
                <Text>{item.itemNumber || "-"}</Text>
              </View>
              <View style={styles.colItemName}>
                <Text>{item.itemName}</Text>
                {item.notes && (
                  <Text style={{ fontSize: 7, color: "#666" }}>
                    {item.notes}
                  </Text>
                )}
              </View>
              <View style={styles.colQuantity}>
                <Text>{item.quantityShipped}</Text>
              </View>
              <View style={styles.colUnit}>
                <Text>{item.unit || "-"}</Text>
              </View>
              <View style={styles.colLotNumber}>
                <Text>{item.lotNumber || "-"}</Text>
              </View>
              <View style={styles.colExpiration}>
                <Text>
                  {item.expirationDate ? formatDate(item.expirationDate) : "-"}
                </Text>
              </View>
              <View style={styles.colCondition}>
                <Text>
                  {item.condition ? item.condition.substring(0, 3) : "-"}
                </Text>
              </View>
              <View style={styles.colCost}>
                <Text>
                  {item.totalCost ? formatCurrency(item.totalCost) : "-"}
                </Text>
              </View>
              <View style={styles.colReceived}>
                <Text>{item.quantityReceived ?? "-"}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={{ flexDirection: "column", gap: 5 }}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Items:</Text>
              <Text style={styles.summaryValue}>{items.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Quantity:</Text>
              <Text style={styles.summaryValue}>
                {items.reduce((sum, item) => sum + item.quantityShipped, 0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Value:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.totalValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {shipment.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes / Special Handling:</Text>
            <Text style={styles.notesText}>{shipment.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {new Date(data.metadata.generatedAt).toLocaleString()} by{" "}
          {data.metadata.generatedBy} | Version {data.metadata.version}
        </Text>
        <Text style={styles.pageNumber}>Page 1 of 1</Text>
      </Page>
    </Document>
  );
};
