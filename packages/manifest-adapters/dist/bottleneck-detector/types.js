/**
 * Operational Bottleneck Detector Types
 *
 * Defines the data structures for detecting operational bottlenecks
 * and generating AI-powered improvement suggestions.
 */
/**
 * Bottleneck severity levels
 */
export var BottleneckSeverity;
(function (BottleneckSeverity) {
    BottleneckSeverity["Low"] = "low";
    BottleneckSeverity["Medium"] = "medium";
    BottleneckSeverity["High"] = "high";
    BottleneckSeverity["Critical"] = "critical";
})(BottleneckSeverity || (BottleneckSeverity = {}));
/**
 * Bottleneck categories
 */
export var BottleneckCategory;
(function (BottleneckCategory) {
    BottleneckCategory["Throughput"] = "throughput";
    BottleneckCategory["Capacity"] = "capacity";
    BottleneckCategory["Efficiency"] = "efficiency";
    BottleneckCategory["Quality"] = "quality";
    BottleneckCategory["Resource"] = "resource";
    BottleneckCategory["Process"] = "process";
})(BottleneckCategory || (BottleneckCategory = {}));
/**
 * Bottleneck types for specific operational areas
 */
export var BottleneckType;
(function (BottleneckType) {
    // Kitchen bottlenecks
    BottleneckType["StationOverload"] = "station_overload";
    BottleneckType["PrepTaskBacklog"] = "prep_task_backlog";
    BottleneckType["RecipeComplexity"] = "recipe_complexity";
    BottleneckType["StaffUnderutilization"] = "staff_underutilization";
    BottleneckType["EquipmentUnderutilization"] = "equipment_underutilization";
    // Inventory bottlenecks
    BottleneckType["StockoutRisk"] = "stockout_risk";
    BottleneckType["Overstock"] = "overstock";
    BottleneckType["SlowTurnover"] = "slow_turnover";
    BottleneckType["SupplierDelay"] = "supplier_delay";
    // Scheduling bottlenecks
    BottleneckType["DoubleBooking"] = "double_booking";
    BottleneckType["InsufficientStaff"] = "insufficient_staff";
    BottleneckType["OvertimeSpike"] = "overtime_spike";
    BottleneckType["ShiftGap"] = "shift_gap";
    // Event bottlenecks
    BottleneckType["LeadTimeOverflow"] = "lead_time_overflow";
    BottleneckType["VenueConstraint"] = "venue_constraint";
    BottleneckType["BudgetOverrun"] = "budget_overrun";
    // General operational
    BottleneckType["ProcessDelay"] = "process_delay";
    BottleneckType["CommunicationGap"] = "communication_gap";
    BottleneckType["ApprovalBlockage"] = "approval_blockage";
})(BottleneckType || (BottleneckType = {}));
/**
 * Improvement suggestion type
 */
export var SuggestionType;
(function (SuggestionType) {
    SuggestionType["ProcessChange"] = "process_change";
    SuggestionType["ResourceReallocation"] = "resource_reallocation";
    SuggestionType["CapacityExpansion"] = "capacity_expansion";
    SuggestionType["TechnologyAdoption"] = "technology_adoption";
    SuggestionType["Training"] = "training";
    SuggestionType["SchedulingAdjustment"] = "scheduling_adjustment";
    SuggestionType["PolicyChange"] = "policy_change";
    SuggestionType["Automation"] = "automation";
})(SuggestionType || (SuggestionType = {}));
/**
 * Priority for suggestions
 */
export var SuggestionPriority;
(function (SuggestionPriority) {
    SuggestionPriority["Low"] = "low";
    SuggestionPriority["Medium"] = "medium";
    SuggestionPriority["High"] = "high";
    SuggestionPriority["Urgent"] = "urgent";
})(SuggestionPriority || (SuggestionPriority = {}));
