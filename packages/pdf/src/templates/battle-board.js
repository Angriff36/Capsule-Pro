Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleBoardPDF = void 0;
const renderer_1 = require("@react-pdf/renderer");
// Register font (optional - uses default Helvetica if not registered)
// Font.register({
//   family: 'Inter'
//   src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
// });
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
  taskTable: {
    width: "100%",
    marginBottom: 15,
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
  tableRowCritical: {
    backgroundColor: "#fff5f5",
  },
  tableRowCompleted: {
    backgroundColor: "#f5f9ff",
    color: "#999",
  },
  statusBadge: {
    padding: "2 6",
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  statusPending: {
    backgroundColor: "#fff3cd",
    color: "#856404",
  },
  statusInProgress: {
    backgroundColor: "#d1ecf1",
    color: "#0c5460",
  },
  statusCompleted: {
    backgroundColor: "#d4edda",
    color: "#155724",
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
const BattleBoardPDF = ({ data }) => {
  const { event, tasks, summary } = data;
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "pending":
        return styles.statusPending;
      case "in_progress":
        return styles.statusInProgress;
      case "completed":
        return styles.statusCompleted;
      default:
        return styles.statusPending;
    }
  };
  const getRowStyle = (task) => {
    if (task.status === "completed") return styles.tableRowCompleted;
    if (task.isCritical) return styles.tableRowCritical;
    return styles.tableRow;
  };
  return (
    <renderer_1.Document>
      <renderer_1.Page size="A4" style={styles.page}>
        {/* Header */}
        <renderer_1.View style={styles.header}>
          <renderer_1.Text style={styles.title}>Battle Board</renderer_1.Text>
          <renderer_1.Text style={styles.subtitle}>
            {event.name}
          </renderer_1.Text>
          <renderer_1.Text style={styles.eventInfo}>
            Date: {new Date(event.date).toLocaleDateString()} | Location:{" "}
            {event.venue || event.address || "TBD"}
          </renderer_1.Text>
        </renderer_1.View>

        {/* Summary Section */}
        <renderer_1.View style={styles.section}>
          <renderer_1.Text style={styles.sectionTitle}>Summary</renderer_1.Text>
          <renderer_1.View style={styles.taskTable}>
            <renderer_1.View style={styles.tableHeader}>
              <renderer_1.Text>Total Tasks</renderer_1.Text>
            </renderer_1.View>
            <renderer_1.View style={styles.tableRow}>
              <renderer_1.Text>{summary.totalTasks}</renderer_1.Text>
            </renderer_1.View>
            <renderer_1.View style={styles.tableHeader}>
              <renderer_1.Text>Completed</renderer_1.Text>
            </renderer_1.View>
            <renderer_1.View style={styles.tableRow}>
              <renderer_1.Text>{summary.completedTasks}</renderer_1.Text>
            </renderer_1.View>
            <renderer_1.View style={styles.tableHeader}>
              <renderer_1.Text>Pending</renderer_1.Text>
            </renderer_1.View>
            <renderer_1.View style={styles.tableRow}>
              <renderer_1.Text>{summary.pendingTasks}</renderer_1.Text>
            </renderer_1.View>
          </renderer_1.View>
        </renderer_1.View>

        {/* Tasks Section */}
        <renderer_1.View style={styles.section}>
          <renderer_1.Text style={styles.sectionTitle}>Tasks</renderer_1.Text>
          {tasks.map((task, index) => (
            <renderer_1.View key={task.id || index} style={styles.taskTable}>
              <renderer_1.View style={[styles.tableHeader, getRowStyle(task)]}>
                <renderer_1.Text>{task.title}</renderer_1.Text>
              </renderer_1.View>
              <renderer_1.View style={styles.tableRow}>
                <renderer_1.Text>
                  Assigned To: {task.assignee || "Unassigned"}
                </renderer_1.Text>
              </renderer_1.View>
              <renderer_1.View style={styles.tableRow}>
                <renderer_1.Text>
                  Due:{" "}
                  {task.endTime
                    ? new Date(task.endTime).toLocaleString()
                    : "TBD"}
                </renderer_1.Text>
              </renderer_1.View>
              <renderer_1.View style={styles.tableRow}>
                <renderer_1.Text>Status: </renderer_1.Text>
                <renderer_1.Text
                  style={[styles.statusBadge, getStatusBadgeStyle(task.status)]}
                >
                  {task.status.replace("_", " ")}
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

        {/* Footer */}
        <renderer_1.Text style={styles.footer}>
          Generated on {new Date().toLocaleString()}
        </renderer_1.Text>
      </renderer_1.Page>
    </renderer_1.Document>
  );
};
exports.BattleBoardPDF = BattleBoardPDF;
