import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import type { Task } from "../types";
import { priorityConfig } from "../types";

interface TaskCardProps {
  task: Task;
  type: "available" | "my-tasks";
  isLoading?: boolean;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onClaim?: (taskId: string) => void;
  onRelease?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  onStart?: (taskId: string) => void;
  onToggleSelect?: (taskId: string) => void;
  onLongPress?: (taskId: string) => void;
}

function formatDueStatus(
  dueDate: string | null
): { label: string; isOverdue: boolean; isUrgent: boolean } | null {
  if (!dueDate) {
    return null;
  }

  const now = new Date();
  const due = new Date(dueDate);
  const diffMins = Math.floor((due.getTime() - now.getTime()) / (1000 * 60));

  if (diffMins < -30) {
    return { label: "OVERDUE", isOverdue: true, isUrgent: true };
  }

  if (diffMins < 0) {
    return {
      label: `${Math.abs(diffMins)}m late`,
      isOverdue: false,
      isUrgent: true,
    };
  }

  if (diffMins < 60) {
    return { label: `Due ${diffMins}m`, isOverdue: false, isUrgent: true };
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 4) {
    return { label: `Due ${diffHours}h`, isOverdue: false, isUrgent: false };
  }

  return {
    label: due.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    isOverdue: false,
    isUrgent: false,
  };
}

function getDueStatusColors(dueStatus: {
  isOverdue: boolean;
  isUrgent: boolean;
}): { background: string; text: string } {
  if (dueStatus.isOverdue) {
    return { background: "#fce7f3", text: "#be185d" };
  }
  if (dueStatus.isUrgent) {
    return { background: "#fef3c7", text: "#b45309" };
  }
  return { background: "#f1f5f9", text: "#475569" };
}

export default function TaskCard({
  task,
  type,
  isLoading = false,
  isMultiSelectMode = false,
  isSelected = false,
  onClaim,
  onRelease,
  onComplete,
  onStart,
  onToggleSelect,
  onLongPress,
}: TaskCardProps) {
  const priority = priorityConfig[task.priority] || priorityConfig[5];
  const dueStatus = formatDueStatus(task.dueDate);
  const dueColors = dueStatus ? getDueStatusColors(dueStatus) : null;

  const handlePress = () => {
    if (isMultiSelectMode && onToggleSelect) {
      onToggleSelect(task.id);
    }
  };

  const handleLongPress = () => {
    if (type === "available" && !isMultiSelectMode && onLongPress) {
      onLongPress(task.id);
    }
  };

  const renderAvailableActions = () => {
    if (isMultiSelectMode) {
      return null;
    }

    if (task.isAvailable && onClaim) {
      return (
        <TouchableOpacity
          style={[styles.claimButton, isLoading && styles.buttonDisabled]}
          onPress={() => onClaim(task.id)}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.claimButtonText}>CLAIM TASK</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderMyTasksActions = () => {
    if (isMultiSelectMode) {
      return null;
    }

    return (
      <View style={styles.actionsRow}>
        {onRelease && (
          <TouchableOpacity
            style={[styles.releaseButton, isLoading && styles.buttonDisabled]}
            onPress={() => onRelease(task.id)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.releaseButtonText}>RELEASE</Text>
          </TouchableOpacity>
        )}

        {task.status === "pending" && onStart && (
          <TouchableOpacity
            style={[styles.startButton, isLoading && styles.buttonDisabled]}
            onPress={() => onStart(task.id)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.startButtonText}>START</Text>
          </TouchableOpacity>
        )}

        {task.status === "in_progress" && onComplete && (
          <TouchableOpacity
            style={[styles.completeButton, isLoading && styles.buttonDisabled]}
            onPress={() => onComplete(task.id)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.completeButtonText}>DONE</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const cardStyle = [
    styles.card,
    dueStatus?.isUrgent && styles.cardUrgent,
    dueStatus?.isOverdue && styles.cardOverdue,
    isSelected && styles.cardSelected,
  ];

  return (
    <Pressable
      style={cardStyle}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      {/* Multi-select checkbox indicator */}
      {isMultiSelectMode && (
        <View style={styles.checkboxRow}>
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Select task</Text>
        </View>
      )}

      {/* Priority and Due Status Row */}
      <View style={styles.headerRow}>
        <View style={[styles.priorityBadge, { backgroundColor: priority.color }]}>
          <Text style={styles.priorityText}>{priority.label}</Text>
        </View>

        {dueStatus && dueColors && (
          <View style={[styles.dueBadge, { backgroundColor: dueColors.background }]}>
            <Text style={[styles.dueText, { color: dueColors.text }]}>
              {dueStatus.label}
            </Text>
          </View>
        )}
      </View>

      {/* Task Title */}
      <Text style={styles.title} numberOfLines={2}>
        {task.title}
      </Text>

      {/* Task Summary */}
      {task.summary && (
        <Text style={styles.summary} numberOfLines={2}>
          {task.summary}
        </Text>
      )}

      {/* Tags/Station */}
      {task.tags && task.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {task.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {task.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{task.tags.length - 3}</Text>
          )}
        </View>
      )}

      {/* Claimed by others indicator */}
      {type === "available" && task.isClaimedByOthers && task.claims.length > 0 && (
        <View style={styles.claimedByRow}>
          <Text style={styles.claimedByText}>
            Claimed by {task.claims[0].user?.firstName || "Someone"}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {type === "available" && renderAvailableActions()}
      {type === "my-tasks" && renderMyTasksActions()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardUrgent: {
    borderColor: "#fda4af",
  },
  cardOverdue: {
    backgroundColor: "#fff1f2",
    borderColor: "#fda4af",
  },
  cardSelected: {
    borderColor: "#2563eb",
    borderWidth: 2,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  checkboxMark: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  dueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  dueText: {
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  summary: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  moreTagsText: {
    fontSize: 12,
    color: "#94a3b8",
    alignSelf: "center",
  },
  claimedByRow: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  claimedByText: {
    fontSize: 12,
    color: "#64748b",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  claimButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  claimButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  releaseButton: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  releaseButtonText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "700",
  },
  startButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  completeButton: {
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  completeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
