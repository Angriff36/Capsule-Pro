import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";

const KitchenPage = () => (
  <div className="rounded-3xl bg-slate-50 p-6 text-slate-900 shadow-sm">
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Production Board</h1>
            <p className="text-sm text-slate-500">
              Nov 15, 2023 · Lunch Service
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-full bg-white p-1 shadow-sm">
              {["All Stations", "Hot Line", "Cold Prep", "Bakery"].map(
                (item) => (
                  <button
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item === "All Stations"
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                    key={item}
                    type="button"
                  >
                    {item}
                  </button>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                className="h-9 w-60 rounded-full border-slate-200 bg-white"
                placeholder="Search dishes, tickets..."
              />
              <Button className="h-9 rounded-full" variant="outline">
                View
              </Button>
              <Button className="h-9 rounded-full bg-blue-600 text-white hover:bg-blue-700">
                Add Ticket
              </Button>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Order Queue</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                4
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">Tech Summit Lunch</div>
                  <div className="text-xs text-slate-500">
                    #ORD-2094 · Table 12
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-semibold text-slate-700">12:00 PM</div>
                  Due in 45m
                </div>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {["20x Grilled Salmon", "5x Vegan Risotto", "25x Caesar Salad"].map(
                  (item) => (
                    <div className="flex items-center gap-2" key={item}>
                      <span className="h-4 w-4 rounded border border-slate-300" />
                      {item}
                    </div>
                  )
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-red-500">
                  High Priority
                </span>
                <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-orange-500">
                  Dairy-Free Options
                </span>
              </div>
              <div className="mt-3 text-xs text-slate-400">Queued 5m ago</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    Miller Wedding Tasting
                  </div>
                  <div className="text-xs text-slate-500">
                    #EVT-8821 · Private A
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-semibold text-slate-700">14:00 PM</div>
                  Due in 2h 45m
                </div>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {["4x Filet Mignon", "4x Lobster Bisque"].map((item) => (
                  <div className="flex items-center gap-2" key={item}>
                    <span className="h-4 w-4 rounded border border-slate-300" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-1 text-purple-500">
                  VIP Client
                </span>
              </div>
              <div className="mt-3 text-xs text-slate-400">Scheduled</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Prep Station</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                2
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">Staff Meal</div>
                  <div className="text-xs text-slate-500">
                    #INT-004 · Cafeteria
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-semibold text-slate-700">11:30 AM</div>
                  Due in 15m
                </div>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {["40x Taco Shells", "10lb Ground Beef"].map((item) => (
                  <div className="flex items-center gap-2" key={item}>
                    <span className="h-4 w-4 rounded border border-slate-300" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-slate-500">
                  Internal
                </span>
              </div>
              <div className="mt-3 text-xs text-orange-500">15m remaining</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Hot Line</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                2
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">Tech Summit</div>
                  <div className="text-xs text-slate-500">
                    #ORD-2092 · Table 9
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-semibold text-slate-700">11:45 AM</div>
                  Due in 10m
                </div>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {["12x NY Strip", "12x Mashed Potatoes", "12x Asparagus"].map(
                  (item) => (
                    <div className="flex items-center gap-2" key={item}>
                      <span className="h-4 w-4 rounded border border-slate-300" />
                      {item}
                    </div>
                  )
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-red-500">
                  Expedite
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-slate-500">
                  Plating Next
                </span>
              </div>
              <div className="mt-3 text-xs text-red-500">Overdue</div>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Kitchen Alerts
          </div>
          <div className="mt-3 space-y-2 text-sm text-red-500">
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              Low Stock: Truffle Oil is below par level (2 bottles left).
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              System: Ticket Printer #2 (Cold Station) is offline.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Station Status
          </div>
          <div className="mt-2 text-xs text-slate-400">
            12 clocked in · 3 on break
          </div>
          <div className="mt-4 space-y-3">
            {[
              {
                name: "Jane Director",
                role: "Exec Chef / Expediter",
                status: "Checking #ORD-2092",
                online: true,
              },
              {
                name: "Marcus Lee",
                role: "Sous Chef / Hot Line",
                status: "Grilling Steaks",
                online: false,
              },
              {
                name: "Ana Gomez",
                role: "Garde Manger",
                status: "Plating Salads",
                online: false,
              },
            ].map((person) => (
              <div className="flex items-center gap-3" key={person.name}>
                <div className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{person.name}</div>
                  <div className="text-xs text-slate-500">{person.role}</div>
                  <div className="text-xs text-blue-500">{person.status}</div>
                </div>
                <span
                  className={`h-2 w-2 rounded-full ${
                    person.online ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Shift Metrics
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>On Time Rate</span>
              <span className="font-semibold text-slate-800">94%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg Ticket Time</span>
              <span className="font-semibold text-slate-800">14m 20s</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Items 86'd</span>
              <span className="font-semibold text-slate-800">2</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Last updated: Just now
          </div>
        </div>
      </aside>
    </div>
  </div>
);

export default KitchenPage;
