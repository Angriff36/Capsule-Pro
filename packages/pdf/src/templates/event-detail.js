Object.defineProperty(exports, "__esModule", { value: true });
exports.EventDetailPDF = void 0;
const renderer_1 = require("@react-pdf/renderer");
const styles = renderer_1.StyleSheet.create({
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
const EventDetailPDF = ({ data }) => {
  const { event, dishes, tasks, guests, staff, metadata } = data;
  const getStatusStyle = (status) => {
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
  const getPriorityStyle = (priority) => {
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
  const formatDate = (date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString();
  };
  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  return (
    <renderer_1.Document>
      <renderer_1.Page size="A4" style={styles.page}>
        {/* Header */}
        <renderer_1.View style={styles.header}>
          <renderer_1.Text style={styles.title}>Event Details</renderer_1.Text>
          <renderer_1.Text style={styles.subtitle}>
            {event.name}
          </renderer_1.Text>
          <renderer_1.Text style={styles.eventInfo}>
            <renderer_1.Text style={styles.label}>Date:</renderer_1.Text>{" "}
            {formatDate(event.date)} |{" "}
            <renderer_1.Text style={styles.label}>Type:</renderer_1.Text>{" "}
            {event.type}
          </renderer_1.Text>
          <renderer_1.Text style={styles.eventInfo}>
            Status:{" "}
            <renderer_1.Text
              style={[styles.statusBadge, getStatusStyle(event.status)]}
            >
              {event.status.replace("_", " ")}
            </renderer_1.Text>
          </renderer_1.Text>
        </renderer_1.View>

        {/* Event Information */}
        <renderer_1.View style={styles.section}>
          <renderer_1.Text style={styles.sectionTitle}>
            Event Information
          </renderer_1.Text>

          <renderer_1.View style={styles.infoRow}>
            <renderer_1.Text style={styles.infoLabel}>
              Event ID:
            </renderer_1.Text>
            <renderer_1.Text style={styles.infoValue}>
              {event.id}
            </renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={styles.infoRow}>
            <renderer_1.Text style={styles.infoLabel}>
              Guest Count:
            </renderer_1.Text>
            <renderer_1.Text style={styles.infoValue}>
              {event.guestCount}
            </renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={styles.infoRow}>
            <renderer_1.Text style={styles.infoLabel}>Venue:</renderer_1.Text>
            <renderer_1.Text style={styles.infoValue}>
              {event.venue || "TBD"}
            </renderer_1.Text>
          </renderer_1.View>
          <renderer_1.View style={styles.infoRow}>
            <renderer_1.Text style={styles.infoLabel}>Address:</renderer_1.Text>
            <renderer_1.Text style={styles.infoValue}>
              {event.address || "TBD"}
            </renderer_1.Text>
          </renderer_1.View>
          {event.budget && (
            <renderer_1.View style={styles.infoRow}>
              <renderer_1.Text style={styles.infoLabel}>
                Budget:
              </renderer_1.Text>
              <renderer_1.Text style={styles.infoValue}>
                ${Number(event.budget).toLocaleString()}
              </renderer_1.Text>
            </renderer_1.View>
          )}
          {event.tags && event.tags.length > 0 && (
            <renderer_1.View style={styles.infoRow}>
              <renderer_1.Text style={styles.infoLabel}>Tags:</renderer_1.Text>
              <renderer_1.View style={styles.tagsContainer}>
                {event.tags.map((tag, index) => (
                  <renderer_1.Text key={index} style={styles.tag}>
                    {tag}
                  </renderer_1.Text>
                ))}
              </renderer_1.View>
            </renderer_1.View>
          )}
        </renderer_1.View>

        {/* Notes */}
        {event.notes && (
          <renderer_1.View style={styles.section}>
            <renderer_1.Text style={styles.sectionTitle}>Notes</renderer_1.Text>
            <renderer_1.View style={styles.notesSection}>
              <renderer_1.Text style={styles.notesText}>
                {event.notes}
              </renderer_1.Text>
            </renderer_1.View>
          </renderer_1.View>
        )}

        {/* Menu / Dishes */}
        {dishes && dishes.length > 0 && (
          <renderer_1.View style={styles.section}>
            <renderer_1.Text style={styles.sectionTitle}>Menu</renderer_1.Text>
            <renderer_1.View style={styles.table}>
              <renderer_1.View style={styles.tableHeader}>
                <renderer_1.Text>Dish</renderer_1.Text>
              </renderer_1.View>
              <renderer_1.View style={styles.tableHeader}>
                <renderer_1.Text>Servings</renderer_1.Text>
              </renderer_1.View>
              <renderer_1.View style={styles.tableHeader}>
                <renderer_1.Text>Instructions</renderer_1.Text>
              </renderer_1.View>
              {dishes.map((dish, index) => (
                <renderer_1.View key={index} style={styles.tableRow}>
                  <renderer_1.Text>{dish.name}</renderer_1.Text>
                </renderer_1.View>
              ))}
            </renderer_1.View>
          </renderer_1.View>
        )}

        {/* Timeline Tasks */}
        {tasks && tasks.length > 0 && (
          <renderer_1.View style={styles.section}>
            <renderer_1.Text style={styles.sectionTitle}>
              Timeline Tasks
            </renderer_1.Text>
            {tasks.map((task, index) => (
              <renderer_1.View key={index} style={styles.table}>
                <renderer_1.View style={styles.tableHeader}>
                  <renderer_1.Text>{task.title}</renderer_1.Text>
                </renderer_1.View>
                <renderer_1.View style={styles.tableRow}>
                  <renderer_1.Text>
                    Assigned To: {task.assignee || "Unassigned"}
                  </renderer_1.Text>
                </renderer_1.View>
                <renderer_1.View style={styles.tableRow}>
                  <renderer_1.Text>
                    Time: {formatTime(task.startTime)} -{" "}
                    {formatTime(task.endTime)}
                  </renderer_1.Text>
                </renderer_1.View>
                <renderer_1.View style={styles.tableRow}>
                  <renderer_1.Text>
                    Status:{" "}
                    <renderer_1.Text
                      style={[styles.statusBadge, getStatusStyle(task.status)]}
                    >
                      {task.status.replace("_", " ")}
                    </renderer_1.Text>
                    {" | "}
                    Priority:{" "}
                    <renderer_1.Text
                      style={[
                        styles.priorityBadge,
                        getPriorityStyle(task.priority),
                      ]}
                    >
                      {task.priority}
                    </renderer_1.Text>
                  </renderer_1.Text>
                </renderer_1.View>
                {task.notes && (
                  <renderer_1.View style={styles.tableRow}>
                    <renderer_1.Text>Notes: {task.notes}</renderer_1.Text>
                  </renderer_1.View>
                )}
              </renderer_1.View>
            ))}
          </renderer_1.View>
        )}

        {/* Guest List */}
        {guests && guests.length > 0 && (
          <renderer_1.View style={styles.section}>
            <renderer_1.Text style={styles.sectionTitle}>
              Guest List
            </renderer_1.Text>
            <renderer_1.View style={styles.table}>
              <renderer_1.View style={styles.tableHeader}>
                <renderer_1.Text>Guest</renderer_1.Text>
              </renderer_1.View>
              <renderer_1.View style={styles.tableHeader}>
                <renderer_1.Text>Dietary</renderer_1.Text>
              </renderer_1.View>
              <renderer_1.View style={styles.tableHeader}>
                <renderer_1.Text>Meal</renderer_1.Text>
              </renderer_1.View>
              <renderer_1.View style={styles.tableHeader}>
                <renderer_1.Text>Table</renderer_1.Text>
              </renderer_1.View>
              {guests.map((guest, index) => (
                <renderer_1.View key={index} style={styles.tableRow}>
                  <renderer_1.Text>{guest.name}</renderer_1.Text>
                </renderer_1.View>
              ))}
            </renderer_1.View>
          </renderer_1.View>
        )}

        {/* Staff Assignments */}
        {staff && staff.length > 0 && (
          <renderer_1.View style={styles.section}>
            <renderer_1.Text style={styles.sectionTitle}>
              Staff Assignments
            </renderer_1.Text>
            <renderer_1.View style={styles.table}>
              <renderer_1.View style={styles.tableHeader}>
                <renderer_1.Text>Staff Member</renderer_1.Text>
              </renderer_1.View>
              <renderer_1.View style={styles.tableHeader}>
                <renderer_1.Text>Role</renderer_1.Text>
              </renderer_1.View>
              <renderer_1.View style={styles.tableHeader}>
                <renderer_1.Text>Tasks</renderer_1.Text>
              </renderer_1.View>
              {staff.map((member, index) => (
                <renderer_1.View key={index} style={styles.tableRow}>
                  <renderer_1.Text>{member.name}</renderer_1.Text>
                </renderer_1.View>
              ))}
            </renderer_1.View>
          </renderer_1.View>
        )}

        {/* Footer */}
        <renderer_1.Text style={styles.footer}>
          Generated on {new Date().toLocaleString()} by {metadata.generatedBy}
        </renderer_1.Text>
      </renderer_1.Page>
    </renderer_1.Document>
  );
};
exports.EventDetailPDF = EventDetailPDF;
