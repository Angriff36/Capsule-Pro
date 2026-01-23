import React from 'react';
import {
  Document
  Page
  View
  Text
  StyleSheet
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
    padding: 30
    fontSize: 10
    fontFamily: 'Helvetica'
  }
  header: {
    marginBottom: 20
    borderBottom: '2pt solid #1e3a5f'
    paddingBottom: 15
  }
  title: {
    fontSize: 24
    fontWeight: 'bold'
    color: '#1e3a5f'
    marginBottom: 5
  }
  subtitle: {
    fontSize: 12
    color: '#666'
    marginBottom: 10
  }
  eventInfo: {
    fontSize: 11
    marginBottom: 2
  }
  section: {
    marginBottom: 20
  }
  sectionTitle: {
    fontSize: 14
    fontWeight: 'bold'
    color: '#1e3a5f'
    marginBottom: 10
    borderBottom: '1pt solid #ccc'
    paddingBottom: 5
  }
  taskTable: {
    width: '100%'
    marginBottom: 15
  }
  tableHeader: {
    backgroundColor: '#1e3a5f'
    color: '#fff'
    fontSize: 9
    fontWeight: 'bold'
    padding: 5
    textAlign: 'left'
  }
  tableRow: {
    padding: 5
    fontSize: 9
    borderBottom: '0.5pt solid #eee'
  }
  tableRowCritical: {
    backgroundColor: '#fff5f5'
  }
  tableRowCompleted: {
    backgroundColor: '#f5f9ff'
    color: '#999'
  }
  statusBadge: {
    padding: '2 6'
    borderRadius: 2
    fontSize: 8
    fontWeight: 'bold'
    textTransform: 'uppercase'
  }
  statusNotStarted: {
    backgroundColor: '#e5e7eb'
    color: '#374151'
  }
  statusInProgress: {
    backgroundColor: '#dbeafe'
    color: '#1d4ed8'
  }
  statusCompleted: {
    backgroundColor: '#d1fae5'
    color: '#047857'
  }
  statusDelayed: {
    backgroundColor: '#fef3c7'
    color: '#b45309'
  }
  statusBlocked: {
    backgroundColor: '#fee2e2'
    color: '#dc2626'
  }
  priorityBadge: {
    padding: '2 6'
    borderRadius: 2
    fontSize: 8
    fontWeight: 'bold'
    textTransform: 'uppercase'
    marginRight: 5
  }
  priorityLow: {
    backgroundColor: '#e0f2fe'
    color: '#0284c7'
  }
  priorityMedium: {
    backgroundColor: '#fef3c7'
    color: '#d97706'
  }
  priorityHigh: {
    backgroundColor: '#fed7aa'
    color: '#ea580c'
  }
  priorityCritical: {
    backgroundColor: '#fecaca'
    color: '#dc2626'
  }
  progress: {
    width: 60
    height: 6
    backgroundColor: '#e5e7eb'
    borderRadius: 3
    overflow: 'hidden'
  }
  progressBar: {
    height: '100%'
    backgroundColor: '#10b981'
  }
  staffSection: {
    marginTop: 15
  }
  staffCard: {
    marginBottom: 8
    padding: 8
    border: '0.5pt solid #e5e7eb'
    borderRadius: 4
  }
  staffName: {
    fontSize: 11
    fontWeight: 'bold'
    marginBottom: 3
  }
  staffRole: {
    fontSize: 9
    color: '#666'
  }
  footer: {
    marginTop: 30
    paddingTop: 15
    borderTop: '1pt solid #ccc'
    fontSize: 8
    color: '#999'
    textAlign: 'center'
  }
  metadata: {
    fontSize: 7
    color: '#999'
    marginTop: 5
  }
  notes: {
    fontSize: 9
    color: '#666'
    fontStyle: 'italic'
  }
  timeCell: {
    width: '15%'
  }
  titleCell: {
    width: '30%'
  }
  statusCell: {
    width: '12%'
  }
  priorityCell: {
    width: '10%'
  }
  assigneeCell: {
    width: '18%'
  }
  progressCell: {
    width: '15%'
  }
});

interface BattleBoardPDFProps {
  data: BattleBoardPDFData;
}

/**
 * Battle Board PDF Template
 *
 * Generates a professional PDF document for event Battle Boards including:
 * - Event details and metadata
 * - Timeline tasks with status, priority, and progress
 * - Staff assignments and roster
 * - Critical path highlighting
 */
export const BattleBoardPDF: React.FC<BattleBoardPDFProps> = ({ data }) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long'
      year: 'numeric'
      month: 'long'
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit'
      minute: '2-digit'
      hour12: true
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'not_started':
        return styles.statusNotStarted;
      case 'in_progress':
        return styles.statusInProgress;
      case 'completed':
        return styles.statusCompleted;
      case 'delayed':
        return styles.statusDelayed;
      case 'blocked':
        return styles.statusBlocked;
      default:
        return styles.statusNotStarted;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'low':
        return styles.priorityLow;
      case 'medium':
        return styles.priorityMedium;
      case 'high':
        return styles.priorityHigh;
      case 'critical':
        return styles.priorityCritical;
      default:
        return styles.priorityMedium;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Battle Board</Text>
          <Text style={styles.subtitle}>{data.event.name}</Text>
          <Text style={styles.eventInfo}>
            Date: {formatDate(data.event.date)}
          </Text>
          {data.event.venue && (
            <Text style={styles.eventInfo}>
              Venue: {data.event.venue}
            </Text>
          )}
          {data.event.address && (
            <Text style={styles.eventInfo}>
              Address: {data.event.address}
            </Text>
          )}
          {data.event.clientName && (
            <Text style={styles.eventInfo}>
              Client: {data.event.clientName}
            </Text>
          )}
        </View>

        {/* Tasks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline Tasks</Text>

          {/* Tasks Table */}
          <View style={styles.taskTable}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableRow, styles.timeCell]}>Time</Text>
              <Text style={[styles.tableRow, styles.titleCell]}>Task</Text>
              <Text style={[styles.tableRow, styles.statusCell]}>Status</Text>
              <Text style={[styles.tableRow, styles.priorityCell]}>Priority</Text>
              <Text style={[styles.tableRow, styles.assigneeCell]}>Assignee</Text>
              <Text style={[styles.tableRow, styles.progressCell]}>Progress</Text>
            </View>

            {/* Table Rows */}
            {data.tasks.map((task) => (
              <View
                key={task.id}
                style={[
                  styles.tableRow
                  task.isOnCriticalPath && styles.tableRowCritical
                  task.status === 'completed' && styles.tableRowCompleted
                ]}
              >
                <Text style={[styles.tableRow, styles.timeCell]}>
                  {formatTime(task.startTime)} - {formatTime(task.endTime)}
                </Text>
                <View style={[styles.tableRow, styles.titleCell]}>
                  <Text style={{ fontWeight: task.isOnCriticalPath ? 'bold' : 'normal' }}>
                    {task.title}
                  </Text>
                  {task.isOnCriticalPath && (
                    <Text style={{ fontSize: 7, color: '#dc2626' }}> • Critical Path</Text>
                  )}
                  {task.description && (
                    <Text style={[styles.tableRow, styles.notes]}>
                      {task.description}
                    </Text>
                  )}
                </View>
                <View style={[styles.tableRow, styles.statusCell]}>
                  <View style={[styles.statusBadge, getStatusStyle(task.status)]}>
                    <Text>{formatStatus(task.status)}</Text>
                  </View>
                </View>
                <View style={[styles.tableRow, styles.priorityCell]}>
                  <View style={[styles.priorityBadge, getPriorityStyle(task.priority)]}>
                    <Text>{task.priority}</Text>
                  </View>
                </View>
                <Text style={[styles.tableRow, styles.assigneeCell]}>
                  {task.assignee || 'Unassigned'}
                </Text>
                <View style={[styles.tableRow, styles.progressCell]}>
                  <Text>{task.progress}%</Text>
                  <View style={styles.progress}>
                    <View style={[styles.progressBar, { width: `${task.progress}%` }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Staff Section */}
        {data.staff.length > 0 && (
          <View style={[styles.section, styles.staffSection]}>
            <Text style={styles.sectionTitle}>Staff Assignments</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {data.staff.map((staff) => (
                <View key={staff.id} style={styles.staffCard}>
                  <Text style={styles.staffName}>{staff.name}</Text>
                  {staff.role && (
                    <Text style={styles.staffRole}>{staff.role}</Text>
                  )}
                  <Text style={styles.staffRole}>
                    {staff.assignments} task{staff.assignments !== 1 ? 's' : ''} assigned
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Generated on {formatDate(data.metadata.generatedAt)} at{' '}
            {formatTime(data.metadata.generatedAt)}
          </Text>
          <Text style={styles.metadata}>
            Generated by: {data.metadata.generatedBy} • Version: {data.metadata.version}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
