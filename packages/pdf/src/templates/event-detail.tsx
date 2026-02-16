import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type React from "react";

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
  eventInfo: {
    fontSize: 11,
    marginBottom: 2,
  },
  label: {
    fontWeight: "bold",
    color: "#333",
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
  table: {
    width: "100%",
    marginBottom: 10,
  },
  tableHeader: {
    backgroundColor: "#1e3a5f",
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    padding: 5,
    textAlign: "left",
  },
  tableRow: {
    padding: 5,
    fontSize: 9,
    borderBottom: "0.5pt solid #eee",
  },
  statusBadge: {
    padding: "2 6",
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  statusConfirmed: {
    backgroundColor: "#d4edda",
    color: "#155724",
  },
  statusDraft: {
    backgroundColor: "#fff3cd",
    color: "#856404",
  },
  statusPending: {
    backgroundColor: "#d1ecf1",
    color: "#0c5460",
  },
  priorityBadge: {
    padding: "2 6",
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
  },
  priorityHigh: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
  },
  priorityMedium: {
    backgroundColor: "#fff3cd",
    color: "#856404",
  },
  priorityLow: {
    backgroundColor: "#d4edda",
    color: "#155724",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  infoLabel: {
    fontWeight: "bold",
    width: "30%",
    color: "#333",
  },
  infoValue: {
    width: "70%",
    color: "#555",
  },
  notesSection: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: "#555",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  tag: {
    backgroundColor: "#e9ecef",
    color: "#495057",
    padding: "2 8",
    borderRadius: 3,
    fontSize: 8,
    marginRight: 5,
    marginBottom: 3,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
});

interface EventDetailPDFProps {
  data: {
    event: {
      id: string;
      name: string;
      date: Date | string;
      type: string;
      status: string;
      guestCount: number;
      venue: string | null;
      address: string | null;
      budget: number | null;
      notes: string | null;
      tags: string[];
    };
    dishes?: Array<{
      name: string;
      servings: number;
      instructions: string | null;
    }>;
    tasks?: Array<{
      title: string;
      assignee: string | null;
      startTime: string;
      endTime: string;
      status: string;
      priority: string;
      notes: string | null;
    }>;
    guests?: Array<{
      name: string;
      dietaryRestrictions: string | null;
      mealChoice: string | null;
      tableNumber: string | null;
    }>;
    staff?: Array<{
      name: string;
      role: string | null;
      assignments: number;
    }>;
    metadata: {
      generatedAt: Date;
      generatedBy: string;
      version: string;
    };
  };
}

export const EventDetailPDF: React.FC<EventDetailPDFProps> = ({ data }) => {
  const { event, dishes, tasks, guests, staff, metadata } = data;

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return styles.statusConfirmed;
      case "draft":
        return styles.statusDraft;
      case "pending":
        return styles.statusPending;
      default:
        return styles.statusDraft;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
      case "urgent":
        return styles.priorityHigh;
      case "medium":
        return styles.priorityMedium;
      case "low":
        return styles.priorityLow;
      default:
        return styles.priorityMedium;
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Event Details</Text>
          <Text style={styles.subtitle}>{event.name}</Text>
          <Text style={styles.eventInfo}>
            <Text style={styles.label}>Date:</Text> {formatDate(event.date)} |{" "}
            <Text style={styles.label}>Type:</Text> {event.type}
          </Text>
          <Text style={styles.eventInfo}>
            Status:{" "}
            <Text style={[styles.statusBadge, getStatusStyle(event.status)]}>
              {event.status.replace("_", " ")}
            </Text>
          </Text>
        </View>

        {/* Event Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Event ID:</Text>
            <Text style={styles.infoValue}>{event.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Guest Count:</Text>
            <Text style={styles.infoValue}>{event.guestCount}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Venue:</Text>
            <Text style={styles.infoValue}>{event.venue || "TBD"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{event.address || "TBD"}</Text>
          </View>
          {event.budget && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Budget:</Text>
              <Text style={styles.infoValue}>
                ${Number(event.budget).toLocaleString()}
              </Text>
            </View>
          )}
          {event.tags && event.tags.length > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tags:</Text>
              <View style={styles.tagsContainer}>
                {event.tags.map((tag, index) => (
                  <Text key={index} style={styles.tag}>
                    {tag}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        {event.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesSection}>
              <Text style={styles.notesText}>{event.notes}</Text>
            </View>
          </View>
        )}

        {/* Menu / Dishes */}
        {dishes && dishes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Menu</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text>Dish</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text>Servings</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text>Instructions</Text>
              </View>
              {dishes.map((dish, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text>{dish.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Timeline Tasks */}
        {tasks && tasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline Tasks</Text>
            {tasks.map((task, index) => (
              <View key={index} style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text>{task.title}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text>Assigned To: {task.assignee || "Unassigned"}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text>
                    Time: {formatTime(task.startTime)} -{" "}
                    {formatTime(task.endTime)}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text>
                    Status:{" "}
                    <Text
                      style={[styles.statusBadge, getStatusStyle(task.status)]}
                    >
                      {task.status.replace("_", " ")}
                    </Text>
                    {" | "}
                    Priority:{" "}
                    <Text
                      style={[
                        styles.priorityBadge,
                        getPriorityStyle(task.priority),
                      ]}
                    >
                      {task.priority}
                    </Text>
                  </Text>
                </View>
                {task.notes && (
                  <View style={styles.tableRow}>
                    <Text>Notes: {task.notes}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Guest List */}
        {guests && guests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guest List</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text>Guest</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text>Dietary</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text>Meal</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text>Table</Text>
              </View>
              {guests.map((guest, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text>{guest.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Staff Assignments */}
        {staff && staff.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff Assignments</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text>Staff Member</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text>Role</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text>Tasks</Text>
              </View>
              {staff.map((member, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text>{member.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {new Date().toLocaleString()} by {metadata.generatedBy}
        </Text>
      </Page>
    </Document>
  );
};
