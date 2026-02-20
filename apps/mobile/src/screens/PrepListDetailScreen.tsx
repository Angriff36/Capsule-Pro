import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useState, useCallback } from "react";
import { usePrepListDetail } from "../api/queries";
import {
  useMarkPrepItemComplete,
  useUpdatePrepItemNotes,
} from "../api/mutations";
import PrepListItem from "../components/PrepListItem";
import ErrorState from "../components/ErrorState";
import type { PrepListItem as PrepListItemType, PrepListDetailParams } from "../types";

type FilterType = "incomplete" | "all" | "complete";

interface Props {
  route: {
    params: PrepListDetailParams;
  };
}

export default function PrepListDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [filter, setFilter] = useState<FilterType>("incomplete");
  const [refreshing, setRefreshing] = useState(false);

  // Note modal state
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PrepListItemType | null>(
    null
  );
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // API hooks
  const {
    data: prepList,
    isLoading,
    error,
    refetch,
  } = usePrepListDetail(id);

  const markCompleteMutation = useMarkPrepItemComplete();
  const updateNotesMutation = useUpdatePrepItemNotes();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleToggleComplete = useCallback(
    (item: PrepListItemType) => {
      markCompleteMutation.mutate({
        itemId: item.id,
        completed: !item.completed,
      });
    },
    [markCompleteMutation]
  );

  const handleAddNote = useCallback((item: PrepListItemType) => {
    setSelectedItem(item);
    setNoteText(item.notes || "");
    setNoteModalVisible(true);
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!selectedItem || !noteText.trim()) {
      setNoteModalVisible(false);
      setSelectedItem(null);
      setNoteText("");
      return;
    }

    setIsSavingNote(true);
    updateNotesMutation.mutate(
      { itemId: selectedItem.id, notes: noteText.trim() },
      {
        onSuccess: () => {
          setIsSavingNote(false);
          setNoteModalVisible(false);
          setSelectedItem(null);
          setNoteText("");
        },
        onError: () => {
          setIsSavingNote(false);
        },
      }
    );
  }, [selectedItem, noteText, updateNotesMutation]);

  const handleCloseNoteModal = useCallback(() => {
    setNoteModalVisible(false);
    setSelectedItem(null);
    setNoteText("");
  }, []);

  // Filter items
  const filteredItems = prepList?.items?.filter((item) => {
    if (filter === "incomplete") {
      return !item.completed;
    }
    if (filter === "complete") {
      return item.completed;
    }
    return true;
  });

  // Loading state
  if (isLoading && !prepList) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading prep list...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load prep list"}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header info */}
      <View style={styles.headerInfo}>
        <Text style={styles.prepListName}>{prepList?.name || "Prep List"}</Text>
        {prepList?.event && (
          <Text style={styles.eventName}>{prepList.event.name}</Text>
        )}
        {prepList && (
          <Text style={styles.progressText}>
            {prepList.completedCount}/{prepList.totalCount} complete
          </Text>
        )}
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, filter === "incomplete" && styles.filterButtonActive]}
          onPress={() => setFilter("incomplete")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === "incomplete" && styles.filterButtonTextActive,
            ]}
          >
            Incomplete
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === "all" && styles.filterButtonActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === "all" && styles.filterButtonTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === "complete" && styles.filterButtonActive]}
          onPress={() => setFilter("complete")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === "complete" && styles.filterButtonTextActive,
            ]}
          >
            Done
          </Text>
        </TouchableOpacity>
      </View>

      {/* Swipe hint */}
      <Text style={styles.swipeHint}>← Swipe left to complete, right for notes →</Text>

      {/* Items list */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PrepListItem
            item={item}
            onToggleComplete={handleToggleComplete}
            onAddNote={handleAddNote}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {filter === "incomplete" ? "✅" : "📝"}
            </Text>
            <Text style={styles.emptyTitle}>
              {filter === "incomplete"
                ? "All items complete!"
                : "No items to display"}
            </Text>
          </View>
        }
      />

      {/* Note Modal */}
      <Modal
        visible={noteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseNoteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Note</Text>
            {selectedItem && (
              <Text style={styles.modalSubtitle}>{selectedItem.name}</Text>
            )}
            <TextInput
              style={styles.noteInput}
              placeholder="Enter prep notes or flag an issue..."
              placeholderTextColor="#94a3b8"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCloseNoteModal}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveNote}
                disabled={isSavingNote}
              >
                <Text style={styles.modalButtonSaveText}>
                  {isSavingNote ? "Saving..." : "Save Note"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  headerInfo: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  prepListName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  eventName: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  progressText: {
    fontSize: 14,
    color: "#10b981",
    fontWeight: "500",
    marginTop: 4,
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#2563eb",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  swipeHint: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f1f5f9",
  },
  modalButtonSave: {
    backgroundColor: "#2563eb",
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});
