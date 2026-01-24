"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeePerformanceDashboard = EmployeePerformanceDashboard;
const card_1 = require("@repo/design-system/components/ui/card");
const react_1 = require("react");
function EmployeePerformanceDashboard({ employeeId }) {
  const [metrics, setMetrics] = (0, react_1.useState)(null);
  const [summary, setSummary] = (0, react_1.useState)(null);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [selectedPeriod, setSelectedPeriod] = (0, react_1.useState)("3m");
  (0, react_1.useEffect)(() => {
    async function loadData() {
      try {
        setLoading(true);
        if (employeeId) {
          const response = await fetch(
            `/api/analytics/staff/employees/${employeeId}?period=${selectedPeriod}`
          );
          const data = await response.json();
          setMetrics(data);
        } else {
          const response = await fetch(
            `/api/analytics/staff/summary?period=${selectedPeriod}`
          );
          const data = await response.json();
          setSummary(data);
        }
      } catch (error) {
        console.error("Failed to load employee performance data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [employeeId, selectedPeriod]);
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <card_1.Card key={i}>
            <card_1.CardHeader>
              <div className="h-4 w-24 animate-pulse bg-muted rounded" />
              <div className="h-3 w-16 mt-2 animate-pulse bg-muted rounded" />
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="h-8 w-full animate-pulse bg-muted rounded mt-2" />
            </card_1.CardContent>
          </card_1.Card>
        ))}
      </div>
    );
  }
  if (employeeId && metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {metrics.firstName} {metrics.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {metrics.role} • Hired: {metrics.hireDate.toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-sm font-medium">
                Task Completion Rate
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">
                {metrics.taskCompletionRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.completedTasks} of {metrics.totalTasks} tasks
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-sm font-medium">
                Quality Score
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div
                className={`text-2xl font-bold ${
                  metrics.qualityScore >= 80
                    ? "text-green-600"
                    : metrics.qualityScore >= 60
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {metrics.qualityScore.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Rework rate: {metrics.reworkRate.toFixed(1)}%
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-sm font-medium">
                Efficiency Score
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div
                className={`text-2xl font-bold ${
                  metrics.efficiencyScore >= 80
                    ? "text-green-600"
                    : metrics.efficiencyScore >= 60
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {metrics.efficiencyScore.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.tasksPerHour.toFixed(1)} tasks/hour
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-sm font-medium">
                Punctuality Rate
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div
                className={`text-2xl font-bold ${
                  metrics.punctualityRate >= 95
                    ? "text-green-600"
                    : metrics.punctualityRate >= 90
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {metrics.punctualityRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Attendance: {metrics.attendanceRate.toFixed(1)}%
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Task Performance</card_1.CardTitle>
              <card_1.CardDescription>
                Task completion and quality metrics
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Task Completion</span>
                    <span className="font-medium">
                      {metrics.taskCompletionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        metrics.taskCompletionRate >= 80
                          ? "bg-green-500"
                          : metrics.taskCompletionRate >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${metrics.taskCompletionRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span>On-Time Delivery</span>
                    <span className="font-medium">
                      {metrics.onTimeTaskRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        metrics.onTimeTaskRate >= 80
                          ? "bg-green-500"
                          : metrics.onTimeTaskRate >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${metrics.onTimeTaskRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span>Quality Score</span>
                    <span className="font-medium">
                      {metrics.qualityScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        metrics.qualityScore >= 80
                          ? "bg-green-500"
                          : metrics.qualityScore >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${metrics.qualityScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span>Efficiency Score</span>
                    <span className="font-medium">
                      {metrics.efficiencyScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        metrics.efficiencyScore >= 80
                          ? "bg-green-500"
                          : metrics.efficiencyScore >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${metrics.efficiencyScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Attendance & Punctuality</card_1.CardTitle>
              <card_1.CardDescription>
                Work schedule adherence and reliability
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Attendance Rate</span>
                    <span className="font-medium">
                      {metrics.attendanceRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        metrics.attendanceRate >= 95
                          ? "bg-green-500"
                          : metrics.attendanceRate >= 90
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${metrics.attendanceRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span>Punctuality Rate</span>
                    <span className="font-medium">
                      {metrics.punctualityRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        metrics.punctualityRate >= 95
                          ? "bg-green-500"
                          : metrics.punctualityRate >= 90
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${metrics.punctualityRate}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Total Shifts
                      </div>
                      <div className="text-lg font-bold">
                        {metrics.totalShifts}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Avg Hours/Week
                      </div>
                      <div className="text-lg font-bold">
                        {metrics.averageHoursPerWeek.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Activity Summary</card_1.CardTitle>
            <card_1.CardDescription>
              Overall work activity and contributions
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Total Tasks</div>
                <div className="text-2xl font-bold">{metrics.totalTasks}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Completed Tasks
                </div>
                <div className="text-2xl font-bold">
                  {metrics.completedTasks}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Total Hours Worked
                </div>
                <div className="text-2xl font-bold">
                  {metrics.totalHoursWorked.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Avg Task Duration
                </div>
                <div className="text-2xl font-bold">
                  {metrics.averageTaskDuration.toFixed(1)}h
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 mt-4 pt-4 border-t">
              <div>
                <div className="text-xs text-muted-foreground">
                  Client Interactions
                </div>
                <div className="text-2xl font-bold">
                  {metrics.clientInteractions}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  Event Participation
                </div>
                <div className="text-2xl font-bold">
                  {metrics.eventParticipation}
                </div>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Employee Performance Dashboard</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="period-select">
            Period:
          </label>
          <select
            className="rounded border border-input bg-background px-3 py-2 text-sm"
            id="period-select"
            onChange={(e) => setSelectedPeriod(e.target.value)}
            value={selectedPeriod}
          >
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
          </select>
        </div>
      </div>

      {summary && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="text-sm font-medium">
                  Total Employees
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="text-2xl font-bold">
                  {summary.totalEmployees}
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="text-sm font-medium">
                  Avg Task Completion
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="text-2xl font-bold">
                  {summary.averageTaskCompletionRate.toFixed(1)}%
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="text-sm font-medium">
                  Avg Quality Score
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="text-2xl font-bold">
                  {summary.averageQualityScore.toFixed(1)}
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="text-sm font-medium">
                  Avg Efficiency Score
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="text-2xl font-bold">
                  {summary.averageEfficiencyScore.toFixed(1)}
                </div>
              </card_1.CardContent>
            </card_1.Card>
          </div>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Top Performers</card_1.CardTitle>
              <card_1.CardDescription>
                Employees with the highest performance scores by category
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="space-y-3">
                {summary.topPerformers.map((performer) => (
                  <div
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    key={performer.employeeId}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                        {performer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{performer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {performer.category}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        {performer.score.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  </div>
                ))}
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <div className="grid gap-4 md:grid-cols-2">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Metrics by Role</card_1.CardTitle>
                <card_1.CardDescription>
                  Performance breakdown by employee role
                </card_1.CardDescription>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left font-medium">Role</th>
                        <th className="py-2 text-right font-medium">
                          Employees
                        </th>
                        <th className="py-2 text-right font-medium">
                          Completion %
                        </th>
                        <th className="py-2 text-right font-medium">Quality</th>
                        <th className="py-2 text-right font-medium">
                          Efficiency
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.metricsByRole.map((roleMetrics) => (
                        <tr
                          className="border-b hover:bg-muted/50"
                          key={roleMetrics.role}
                        >
                          <td className="py-2">{roleMetrics.role}</td>
                          <td className="py-2 text-right">
                            {roleMetrics.employeeCount}
                          </td>
                          <td className="py-2 text-right">
                            {roleMetrics.avgTaskCompletionRate.toFixed(1)}%
                          </td>
                          <td
                            className={`py-2 text-right font-medium ${
                              roleMetrics.avgQualityScore >= 80
                                ? "text-green-600"
                                : roleMetrics.avgQualityScore >= 60
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {roleMetrics.avgQualityScore.toFixed(1)}
                          </td>
                          <td
                            className={`py-2 text-right font-medium ${
                              roleMetrics.avgEfficiencyScore >= 80
                                ? "text-green-600"
                                : roleMetrics.avgEfficiencyScore >= 60
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {roleMetrics.avgEfficiencyScore.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Performance Trends</card_1.CardTitle>
                <card_1.CardDescription>
                  Monthly performance metrics over time
                </card_1.CardDescription>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-2">
                  {summary.monthlyTrends.map((trend, index) => (
                    <div
                      className="flex items-center gap-2 text-sm"
                      key={trend.month}
                    >
                      <div className="w-16 text-xs text-muted-foreground">
                        {new Date(`${trend.month}-01`).toLocaleDateString(
                          "en-US",
                          { month: "short" }
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-1">
                          <div className="w-24 text-xs">Completion:</div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{
                                width: `${Math.min(trend.avgTaskCompletionRate, 100)}%`,
                              }}
                            />
                          </div>
                          <div className="w-10 text-right text-xs">
                            {trend.avgTaskCompletionRate.toFixed(0)}%
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-24 text-xs">Quality:</div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all"
                              style={{
                                width: `${Math.min(trend.avgQualityScore, 100)}%`,
                              }}
                            />
                          </div>
                          <div className="w-10 text-right text-xs">
                            {trend.avgQualityScore.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </card_1.CardContent>
            </card_1.Card>
          </div>
        </>
      )}
    </div>
  );
}
