import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font
} from '@react-pdf/renderer';
import type { BattleBoardPDFData } from '../types';

// Register font (optional - uses default Helvetica if not registered)
// Font.register({
//   family: 'Inter'
//   src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
// });

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 20,
    borderBottom: '2pt solid #1e3a5f',
    paddingBottom: 15
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10
  },
  eventInfo: {
    fontSize: 11,
    marginBottom: 2
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 10,
    borderBottom: '1pt solid #ccc',
    paddingBottom: 5
  },
  taskTable: {
    width: '100%',
    marginBottom: 15
  },
  tableHeader: {
    backgroundColor: '#1e3a5f',
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    padding: 5,
    textAlign: 'left'
  },
  tableRow: {
    padding: 5,
    fontSize: 9,
    borderBottom: '0.5pt solid #eee'
  },
  tableRowCritical: {
    backgroundColor: '#fff5f5'
  },
  tableRowCompleted: {
    backgroundColor: '#f5f9ff',
    color: '#999'
  },
  statusBadge: {
    padding: '2 6',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  statusPending: {
    backgroundColor: '#fff3cd',
    color: '#856404'
  },
  statusInProgress: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460'
  },
  statusCompleted: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#999'
  }
});

type BattleBoardPDFProps = {
  data: BattleBoardPDFData;
};

export const BattleBoardPDF: React.FC<BattleBoardPDFProps> = ({ data }) => {
  const { event, tasks, summary } = data;

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'in_progress':
        return styles.statusInProgress;
      case 'completed':
        return styles.statusCompleted;
      default:
        return styles.statusPending;
    }
  };

  const getRowStyle = (task: any) => {
    if (task.status === 'completed') return styles.tableRowCompleted;
    if (task.isCritical) return styles.tableRowCritical;
    return styles.tableRow;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Battle Board</Text>
          <Text style={styles.subtitle}>{event.name}</Text>
          <Text style={styles.eventInfo}>
            Date: {new Date(event.startDate).toLocaleDateString()} |
            Location: {event.location || 'TBD'}
          </Text>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.taskTable}>
            <View style={styles.tableHeader}>
              <Text>Total Tasks</Text>
            </View>
            <View style={styles.tableRow}>
              <Text>{summary.totalTasks}</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text>Completed</Text>
            </View>
            <View style={styles.tableRow}>
              <Text>{summary.completedTasks}</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text>Pending</Text>
            </View>
            <View style={styles.tableRow}>
              <Text>{summary.pendingTasks}</Text>
            </View>
          </View>
        </View>

        {/* Tasks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          {tasks.map((task, index) => (
            <View key={task.id || index} style={styles.taskTable}>
              <View style={[styles.tableHeader, getRowStyle(task)]}>
                <Text>{task.title}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text>Assigned To: {task.assignedTo || 'Unassigned'}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text>Due: {task.dueDate ? new Date(task.dueDate).toLocaleString() : 'TBD'}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text>Status: </Text>
                <Text style={[styles.statusBadge, getStatusBadgeStyle(task.status)]}>
                  {task.status.replace('_', ' ')}
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

        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {new Date().toLocaleString()}
        </Text>
      </Page>
    </Document>
  );
};
