"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NewKitchenTaskPage;
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const actions_1 = require("../actions");
const PRIORITIES = [
  { value: "1", label: "Urgent", description: "Highest priority, do first" },
  { value: "2", label: "High", description: "Important, do soon" },
  { value: "3", label: "Medium", description: "Normal priority" },
  { value: "5", label: "Low", description: "Can wait" },
  { value: "10", label: "Backlog", description: "When time permits" },
];
function NewKitchenTaskPage() {
  const router = (0, navigation_1.useRouter)();
  const [isPending, startTransition] = (0, react_1.useTransition)();
  const handleSubmit = async (formData) => {
    startTransition(async () => {
      try {
        const task = await (0, actions_1.createKitchenTask)(formData);
        router.push("/kitchen");
        router.refresh();
      } catch (error) {
        console.error("Failed to create task:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to create task. Please try again."
        );
      }
    });
  };
  return (
    <div className="container mx-auto max-w-2xl py-8">
      <button_1.Button
        className="mb-6"
        onClick={() => router.back()}
        variant="ghost"
      >
        <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4" />
        Back to Production Board
      </button_1.Button>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Create New Kitchen Task</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label_1.Label htmlFor="title">Task Title *</label_1.Label>
              <input_1.Input
                id="title"
                name="title"
                placeholder="e.g., Chop onions for service"
                required
              />
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="summary">Summary / Notes</label_1.Label>
              <input_1.Input
                id="summary"
                name="summary"
                placeholder="Additional details about this task"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label_1.Label htmlFor="priority">Priority</label_1.Label>
                <select_1.Select defaultValue="5" name="priority">
                  <select_1.SelectTrigger>
                    <select_1.SelectValue placeholder="Select priority" />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    {PRIORITIES.map((p) => (
                      <select_1.SelectItem key={p.value} value={p.value}>
                        <div>
                          <div className="font-medium">{p.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.description}
                          </div>
                        </div>
                      </select_1.SelectItem>
                    ))}
                  </select_1.SelectContent>
                </select_1.Select>
              </div>

              <div className="space-y-2">
                <label_1.Label htmlFor="dueDate">Due Date / Time</label_1.Label>
                <input_1.Input
                  id="dueDate"
                  name="dueDate"
                  type="datetime-local"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button_1.Button disabled={isPending} type="submit">
                {isPending ? "Creating..." : "Create Task"}
              </button_1.Button>
              <button_1.Button
                onClick={() => router.back()}
                type="button"
                variant="outline"
              >
                Cancel
              </button_1.Button>
            </div>
          </form>
        </card_1.CardContent>
      </card_1.Card>
    </div>
  );
}
