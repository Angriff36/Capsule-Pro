"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CohortAnalysis = CohortAnalysis;
const card_1 = require("@repo/design-system/components/ui/card");
const utils_1 = require("@repo/design-system/lib/utils");
function getRetentionColor(value) {
  if (value >= 80) return "bg-emerald-500/90";
  if (value >= 60) return "bg-emerald-400/80";
  if (value >= 40) return "bg-emerald-300/70";
  if (value >= 20) return "bg-amber-300/60";
  if (value > 0) return "bg-amber-200/50";
  return "bg-muted/50";
}
function CohortAnalysis({ data, className }) {
  const months = [
    "M0",
    "M1",
    "M2",
    "M3",
    "M4",
    "M5",
    "M6",
    "M7",
    "M8",
    "M9",
    "M10",
    "M11",
  ];
  return (
    <card_1.Card className={(0, utils_1.cn)("", className)}>
      <card_1.CardHeader>
        <card_1.CardTitle>Cohort Analysis</card_1.CardTitle>
        <card_1.CardDescription>
          Client retention by acquisition month
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left font-medium text-muted-foreground pb-2 pr-4">
                  Cohort
                </th>
                {months.map((month) => (
                  <th
                    className="text-center font-medium text-muted-foreground pb-2 px-1"
                    key={month}
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.cohort}>
                  <td className="text-left font-medium py-1 pr-4">
                    {new Date(`${row.cohort}-01`).toLocaleDateString("en-US", {
                      month: "short",
                      year: "2-digit",
                    })}
                  </td>
                  {months.map((_, index) => {
                    const value = row[`month${index}`];
                    return (
                      <td className="py-1 px-0.5" key={index}>
                        <div
                          className={(0, utils_1.cn)(
                            "h-8 w-full rounded text-center text-xs flex items-center justify-center text-white font-medium",
                            getRetentionColor(value)
                          )}
                        >
                          {value > 0 ? `${value.toFixed(0)}%` : "-"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-emerald-500/90" />
            <span>80%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-emerald-300/70" />
            <span>40-79%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-amber-200/50" />
            <span>&lt;40%</span>
          </div>
        </div>
      </card_1.CardContent>
    </card_1.Card>
  );
}
