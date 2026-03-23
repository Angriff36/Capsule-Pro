import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type React from "react";

// Types for prep list data
interface PrepListIngredient {
  ingredientId: string;
  ingredientName: string;
  scaledQuantity: number;
  scaledUnit: string;
  category?: string;
  isOptional: boolean;
  preparationNotes?: string;
  allergens: string[];
  dietarySubstitutions: string[];
}

interface PrepListTask {
  id: string;
  name: string;
  dueDate: Date;
  status: string;
  priority: number;
}

interface StationPrepList {
  stationId: string;
  stationName: string;
  totalIngredients: number;
  estimatedTime: number;
  color: string;
  ingredients: PrepListIngredient[];
  tasks: PrepListTask[];
}

interface PrepListPDFData {
  event: {
    id: string;
    title: string;
    eventDate: Date;
    guestCount: number;
  };
  prepList: {
    eventId: string;
    eventTitle: string;
    eventDate: Date;
    guestCount: number;
    batchMultiplier: number;
    totalIngredients: number;
    totalEstimatedTime: number;
    stationLists: StationPrepList[];
  };
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    version: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 15,
    borderBottom: "2pt solid #1e3a5f",
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    color: "#666",
    marginBottom: 8,
  },
  headerInfo: {
    fontSize: 10,
    marginBottom: 2,
    color: "#444",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  stationSection: {
    marginBottom: 15,
    border: "1pt solid #ddd",
    borderRadius: 4,
    overflow: "hidden",
  },
  stationHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderBottom: "1pt solid #ddd",
  },
  stationName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginLeft: 8,
  },
  stationMeta: {
    fontSize: 9,
    color: "#666",
    marginLeft: 10,
  },
  ingredientsList: {
    padding: 8,
  },
  ingredientRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #eee",
    padding: "4 0",
    fontSize: 9,
  },
  colCheckbox: {
    width: "4%",
  },
  colQuantity: {
    width: "12%",
    textAlign: "right",
    paddingRight: 5,
  },
  colUnit: {
    width: "10%",
  },
  colIngredient: {
    width: "40%",
  },
  colNotes: {
    width: "34%",
    color: "#666",
    fontStyle: "italic",
  },
  checkbox: {
    width: 10,
    height: 10,
    border: "1pt solid #ccc",
    borderRadius: 2,
  },
  taskSection: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#fefce8",
    borderRadius: 4,
  },
  taskTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#854d0e",
    marginBottom: 5,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    fontSize: 8,
  },
  taskPriority: {
    padding: "2 4",
    borderRadius: 2,
    marginRight: 5,
    fontSize: 7,
    fontWeight: "bold",
  },
  priorityHigh: {
    backgroundColor: "#fecaca",
    color: "#991b1b",
  },
  priorityNormal: {
    backgroundColor: "#e5e7eb",
    color: "#374151",
  },
  allergenBadge: {
    padding: "1 3",
    borderRadius: 2,
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontSize: 7,
    marginLeft: 3,
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
    fontSize: 9,
  },
  summaryValue: {
    color: "#1e3a5f",
    fontWeight: "bold",
    fontSize: 9,
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

interface PrepListPDFProps {
  data: PrepListPDFData;
}

const STATION_COLORS: Record<string, string> = {
  "hot-line": "#ef4444",
  "cold-prep": "#3b82f6",
  bakery: "#f59e0b",
  "prep-station": "#10b981",
  garnish: "#8b5cf6",
};

export const PrepListPDF: React.FC<PrepListPDFProps> = ({ data }) => {
  const { prepList, metadata } = data;

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStationColor = (stationId: string): string => {
    return STATION_COLORS[stationId] || "#6b7280";
  };

  const renderIngredient = (ingredient: PrepListIngredient, index: number) => (
    <View key={`${ingredient.ingredientId}-${index}`} style={styles.ingredientRow}>
      <View style={styles.colCheckbox}>
        <View style={styles.checkbox} />
      </View>
      <View style={styles.colQuantity}>
        <Text>{ingredient.scaledQuantity.toFixed(ingredient.scaledQuantity % 1 === 0 ? 0 : 2)}</Text>
      </View>
      <View style={styles.colUnit}>
        <Text>{ingredient.scaledUnit}</Text>
      </View>
      <View style={styles.colIngredient}>
        <Text>
          {ingredient.ingredientName}
          {ingredient.isOptional && " (opt)"}
        </Text>
        {ingredient.allergens.length > 0 && (
          <Text style={styles.allergenBadge}>
            {ingredient.allergens.join(", ")}
          </Text>
        )}
      </View>
      <View style={styles.colNotes}>
        <Text>{ingredient.preparationNotes || ""}</Text>
      </View>
    </View>
  );

  const renderTasks = (tasks: PrepListTask[]) => {
    if (tasks.length === 0) return null;
    
    return (
      <View style={styles.taskSection}>
        <Text style={styles.taskTitle}>Production Tasks</Text>
        {tasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={styles.checkbox} />
            <Text
              style={[
                styles.taskPriority,
                task.priority === 1 ? styles.priorityHigh : styles.priorityNormal,
              ]}
            >
              {task.priority === 1 ? "HIGH" : "NORM"}
            </Text>
            <Text>
              {task.name} - Due {formatDate(task.dueDate)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderStation = (station: StationPrepList) => (
    <View key={station.stationId} style={styles.stationSection}>
      <View style={styles.stationHeader}>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            backgroundColor: getStationColor(station.stationId),
          }}
        />
        <Text style={styles.stationName}>{station.stationName}</Text>
        <Text style={styles.stationMeta}>
          {station.totalIngredients} items | {station.estimatedTime}h est.
        </Text>
      </View>
      
      <View style={styles.ingredientsList}>
        {station.ingredients.map((ing, idx) => renderIngredient(ing, idx))}
      </View>
      
      {renderTasks(station.tasks)}
    </View>
  );

  // Group stations into pages (roughly 3-4 stations per page)
  const stationsPerPage = 3;
  const pages: StationPrepList[][] = [];
  for (let i = 0; i < prepList.stationLists.length; i += stationsPerPage) {
    pages.push(prepList.stationLists.slice(i, i + stationsPerPage));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <Document>
      {pages.map((pageStations, pageIndex) => (
        <Page key={pageIndex} size="LETTER" style={styles.page}>
          {/* Header - only on first page */}
          {pageIndex === 0 && (
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Prep List</Text>
                <Text style={styles.subtitle}>
                  {prepList.eventTitle}
                </Text>
              </View>
              <View style={styles.headerRow}>
                <Text style={styles.headerInfo}>
                  Event Date: {formatDate(prepList.eventDate)}
                </Text>
                <Text style={styles.headerInfo}>
                  {prepList.guestCount} guests | {prepList.batchMultiplier}x batch
                </Text>
              </View>
            </View>
          )}

          {/* Stations */}
          {pageStations.map((station) => renderStation(station))}

          {/* Summary - only on last page */}
          {pageIndex === pages.length - 1 && (
            <View style={styles.summaryBox}>
              <View style={{ flexDirection: "column", gap: 5 }}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Stations:</Text>
                  <Text style={styles.summaryValue}>
                    {prepList.stationLists.length}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Ingredients:</Text>
                  <Text style={styles.summaryValue}>
                    {prepList.totalIngredients}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Est. Prep Time:</Text>
                  <Text style={styles.summaryValue}>
                    {prepList.totalEstimatedTime} hours
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Footer */}
          <Text style={styles.footer}>
            Generated on {new Date(metadata.generatedAt).toLocaleString()} by{" "}
            {metadata.generatedBy} | Version {metadata.version}
          </Text>
          <Text style={styles.pageNumber}>
            Page {pageIndex + 1} of {pages.length}
          </Text>
        </Page>
      ))}
    </Document>
  );
};
