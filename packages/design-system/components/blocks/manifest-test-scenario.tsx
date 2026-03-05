"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { TestResult, TestScenario } from "@repo/types/manifest-editor";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ManifestTestScenarioProps {
  entityName: string;
  commandName?: string;
  onRunTest: (scenario: TestScenario) => Promise<TestResult>;
  existingScenarios?: TestScenario[];
}

export function ManifestTestScenario({
  entityName,
  commandName,
  onRunTest,
  existingScenarios = [],
}: ManifestTestScenarioProps) {
  const [scenarios, setScenarios] = useState<TestScenario[]>(existingScenarios);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(
    new Map()
  );

  const [newScenario, setNewScenario] = useState<Partial<TestScenario>>({
    name: "",
    description: "",
    entityName,
    commandName,
    testData: "{}",
    expectedResults: {
      guardResults: [],
      constraintResults: [],
      policyDenial: false,
    },
  });

  const handleCreateScenario = () => {
    if (!newScenario.name) {
      toast.error("Scenario name is required");
      return;
    }

    try {
      const testData =
        typeof newScenario.testData === "string"
          ? JSON.parse(newScenario.testData)
          : newScenario.testData || {};

      const scenario: TestScenario = {
        name: newScenario.name,
        description: newScenario.description || "",
        entityName: newScenario.entityName || entityName,
        commandName: newScenario.commandName || commandName,
        testData,
        expectedResults: newScenario.expectedResults || {
          guardResults: [],
          constraintResults: [],
          policyDenial: false,
        },
      };

      setScenarios((prev) => [...prev, scenario]);
      setNewScenario({
        name: "",
        description: "",
        entityName,
        commandName,
        testData: "{}",
        expectedResults: {
          guardResults: [],
          constraintResults: [],
          policyDenial: false,
        },
      });
      setIsCreateOpen(false);
      toast.success("Test scenario created");
    } catch (err) {
      toast.error("Invalid JSON in test data");
    }
  };

  const handleDeleteScenario = (name: string) => {
    setScenarios((prev) => prev.filter((s) => s.name !== name));
    setTestResults((prev) => {
      const next = new Map(prev);
      next.delete(name);
      return next;
    });
    toast.success("Scenario deleted");
  };

  const handleRunTest = async (scenario: TestScenario) => {
    setRunningTests((prev) => new Set(prev).add(scenario.name));
    setTestResults((prev) =>
      new Map(prev).set(scenario.name, {} as TestResult)
    );

    try {
      const result = await onRunTest(scenario);
      setTestResults((prev) => new Map(prev).set(scenario.name, result));

      if (result.passed) {
        toast.success(`Test "${scenario.name}" passed`);
      } else {
        toast.error(`Test "${scenario.name}" failed`);
      }
    } catch (err) {
      toast.error(`Test "${scenario.name}" error: ${err}`);
      setTestResults((prev) =>
        new Map(prev).set(scenario.name, {
          scenarioName: scenario.name,
          passed: false,
          errors: [err instanceof Error ? err.message : "Unknown error"],
          results: {},
        })
      );
    } finally {
      setRunningTests((prev) => {
        const next = new Set(prev);
        next.delete(scenario.name);
        return next;
      });
    }
  };

  const handleRunAllTests = async () => {
    for (const scenario of scenarios) {
      await handleRunTest(scenario);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Test Scenarios
            </CardTitle>
            <CardDescription>
              Create and run test scenarios to verify guards and constraints
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={scenarios.length === 0}
              onClick={handleRunAllTests}
              size="sm"
              variant="outline"
            >
              <Play className="h-4 w-4 mr-1" />
              Run All
            </Button>
            <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Scenario
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Test Scenario</DialogTitle>
                  <DialogDescription>
                    Define test data and expected results for a test scenario
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="scenario-name">Scenario Name</Label>
                    <Input
                      id="scenario-name"
                      onChange={(e) =>
                        setNewScenario((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g., Valid event creation"
                      value={newScenario.name}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scenario-description">Description</Label>
                    <Textarea
                      id="scenario-description"
                      onChange={(e) =>
                        setNewScenario((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe what this scenario tests..."
                      value={newScenario.description}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="test-data">Test Data (JSON)</Label>
                    <Textarea
                      className="font-mono text-sm"
                      id="test-data"
                      onChange={(e) =>
                        setNewScenario((prev) => ({
                          ...prev,
                          testData: e.target.value,
                        }))
                      }
                      placeholder='{"status": "active", "guestCount": 100}'
                      value={
                        typeof newScenario.testData === "string"
                          ? newScenario.testData
                          : JSON.stringify(newScenario.testData, null, 2)
                      }
                    />
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Expected Results
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          checked={newScenario.expectedResults?.policyDenial}
                          onChange={(e) =>
                            setNewScenario((prev) => ({
                              ...prev,
                              expectedResults: {
                                ...prev.expectedResults!,
                                policyDenial: e.target.checked,
                              },
                            }))
                          }
                          type="checkbox"
                        />
                        <Label
                          className="cursor-pointer"
                          htmlFor="policy-denial"
                        >
                          Expect policy denial
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={() => setIsCreateOpen(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateScenario}>
                    Create Scenario
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {scenarios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No test scenarios defined yet.</p>
            <p className="text-xs mt-1">
              Create a scenario to test guards and constraints.
            </p>
          </div>
        ) : (
          scenarios.map((scenario) => {
            const result = testResults.get(scenario.name);
            const isRunning = runningTests.has(scenario.name);

            return (
              <TestScenarioCard
                key={scenario.name}
                onDelete={() => handleDeleteScenario(scenario.name)}
                onRun={() => handleRunTest(scenario)}
                result={result}
                running={isRunning}
                scenario={scenario}
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

interface TestScenarioCardProps {
  scenario: TestScenario;
  result?: TestResult;
  running: boolean;
  onRun: () => void;
  onDelete: () => void;
}

function TestScenarioCard({
  scenario,
  result,
  running,
  onRun,
  onDelete,
}: TestScenarioCardProps) {
  const hasResult = result && Object.keys(result.results || {}).length > 0;

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{scenario.name}</h4>
              {hasResult &&
                (result.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-destructive" />
                ))}
              {running && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>

            {scenario.description && (
              <p className="text-sm text-muted-foreground">
                {scenario.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 bg-muted rounded">
                {scenario.entityName}
              </span>
              {scenario.commandName && (
                <span className="text-xs px-2 py-1 bg-muted rounded">
                  {scenario.commandName}
                </span>
              )}
            </div>

            {/* Test Results */}
            {hasResult && (
              <div className="mt-3 space-y-2">
                <Separator />

                {result.results?.guards && result.results.guards.length > 0 && (
                  <div>
                    <span className="text-xs font-medium">Guards:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.results.guards.map((guard, i) => (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            guard.passed
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                          key={i}
                        >
                          Guard #{guard.index + 1}:{" "}
                          {guard.passed ? "Pass" : "Fail"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.results?.constraints &&
                  result.results.constraints.length > 0 && (
                    <div>
                      <span className="text-xs font-medium">Constraints:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.results.constraints.map((constraint) => (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              constraint.passed
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                            key={constraint.name}
                          >
                            {constraint.name}:{" "}
                            {constraint.passed ? "Pass" : "Fail"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {result.results?.policy && (
                  <div>
                    <span className="text-xs font-medium">Policy:</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ml-2 ${
                        result.results.policy.denied
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {result.results.policy.denied ? "Denied" : "Allowed"}
                    </span>
                  </div>
                )}

                {result.errors && result.errors.length > 0 && (
                  <Alert className="py-2" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {result.errors.join(", ")}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              disabled={running}
              onClick={onRun}
              size="sm"
              variant="outline"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              disabled={running}
              onClick={onDelete}
              size="sm"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
