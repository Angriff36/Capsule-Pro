"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type {
  EntityDetail,
  ExecutionHistoryEntry,
  ExecutionResult,
} from "@repo/types/manifest-editor";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  FileJson,
  Flame,
  History,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ManifestTestPlaygroundProps {
  entities: EntityListItem[];
  onLoadEntityDetail?: (entityName: string) => Promise<EntityDetail>;
  onExecuteCommand?: (
    entityName: string,
    commandName: string,
    testData: Record<string, unknown>,
    options?: { dryRun?: boolean; captureSnapshot?: boolean }
  ) => Promise<ExecutionResult>;
  onLoadHistory?: (entityName?: string) => Promise<ExecutionHistoryEntry[]>;
}

interface EntityListItem {
  name: string;
  displayName: string;
  commands: string[];
  constraints: string[];
  policies: string[];
}

export function ManifestTestPlayground({
  entities,
  onLoadEntityDetail,
  onExecuteCommand,
  onLoadHistory,
}: ManifestTestPlaygroundProps) {
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [selectedCommand, setSelectedCommand] = useState<string>("");
  const [entityDetail, setEntityDetail] = useState<EntityDetail | null>(null);
  const [testData, setTestData] = useState<string>("{}");
  const [testDataError, setTestDataError] = useState<string>("");
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [history, setHistory] = useState<ExecutionHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["output", "guards", "constraints"])
  );
  const [capturedSnapshots, setCapturedSnapshots] = useState<
    Array<{ id: string; timestamp: number; state: Record<string, unknown> }>
  >([]);

  // Load entity detail when entity is selected
  useEffect(() => {
    if (selectedEntity && onLoadEntityDetail) {
      setIsLoadingDetail(true);
      onLoadEntityDetail(selectedEntity)
        .then(setEntityDetail)
        .catch((err) => {
          console.error("Failed to load entity detail:", err);
          toast.error(`Failed to load ${selectedEntity} details`);
        })
        .finally(() => setIsLoadingDetail(false));
    } else {
      setEntityDetail(null);
    }
  }, [selectedEntity, onLoadEntityDetail]);

  // Load execution history
  useEffect(() => {
    if (showHistory && onLoadHistory) {
      onLoadHistory(selectedEntity || undefined)
        .then(setHistory)
        .catch((err) => {
          console.error("Failed to load history:", err);
        });
    }
  }, [showHistory, selectedEntity, onLoadHistory]);

  const selectedEntityCommands = entities.find(
    (e) => e.name === selectedEntity
  )?.commands;

  const selectedCommandDetail = entityDetail?.commands.find(
    (c: { name: string }) => c.name === selectedCommand
  );

  // Validate JSON input
  useEffect(() => {
    try {
      JSON.parse(testData);
      setTestDataError("");
    } catch {
      setTestDataError("Invalid JSON");
    }
  }, [testData]);

  const handleExecute = async () => {
    if (!(selectedEntity && selectedCommand) || testDataError) {
      toast.error("Please fix input errors before executing");
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const data = JSON.parse(testData) as Record<string, unknown>;
      const result = onExecuteCommand
        ? await onExecuteCommand(selectedEntity, selectedCommand, data, {
            dryRun: isDryRun,
            captureSnapshot: !isDryRun,
          })
        : await executeDefaultCommand(selectedEntity, selectedCommand, data);

      setExecutionResult(result);

      if (result.snapshot) {
        setCapturedSnapshots((prev) => [...prev, result.snapshot!]);
        toast.success(`Snapshot captured: ${result.snapshot.id}`);
      }

      if (result.success) {
        toast.success(`Command ${selectedCommand} executed successfully`);
      } else {
        toast.error(`Command ${selectedCommand} failed`);
      }

      // Refresh history after execution
      if (onLoadHistory) {
        const updatedHistory = await onLoadHistory(selectedEntity);
        setHistory(updatedHistory);
      }
    } catch (err) {
      toast.error(
        `Execution failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReplayFromHistory = async (entry: ExecutionHistoryEntry) => {
    setSelectedEntity(entry.entityName);
    setSelectedCommand(entry.commandName);
    setTestData(JSON.stringify(entry.input, null, 2));
    toast.info("Loaded execution from history. Click Execute to run again.");
  };

  const handleReplayFromSnapshot = async (snapshot: {
    id: string;
    timestamp: number;
    state: Record<string, unknown>;
  }) => {
    setTestData(JSON.stringify(snapshot.state, null, 2));
    toast.info(`Loaded state from snapshot ${snapshot.id}`);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Flame className="h-8 w-8" />
            Manifest Test Playground
          </h1>
          <p className="text-muted-foreground">
            Interactive testing environment for manifest commands with state
            snapshots and execution history
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowHistory(!showHistory)}
            variant={showHistory ? "default" : "outline"}
          >
            <History className="mr-2 h-4 w-4" />
            {showHistory ? "Hide" : "Show"} History
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Load History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Execution History</DialogTitle>
                <DialogDescription>
                  View and replay previous command executions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 mt-4">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No execution history found
                  </p>
                ) : (
                  history.map((entry) => (
                    <Card className="p-3" key={entry.id}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{entry.entityName}</Badge>
                            <ArrowRight className="h-3 w-3" />
                            <Badge variant="secondary">
                              {entry.commandName}
                            </Badge>
                            {entry.result.success ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <X className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleReplayFromHistory(entry)}
                          size="sm"
                          variant="ghost"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Command Selection & Input */}
        <div className="space-y-4">
          {/* Entity & Command Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Command Selection</CardTitle>
              <CardDescription>
                Choose an entity and command to execute
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="entity-select">Entity</Label>
                <Select
                  disabled={entities.length === 0}
                  onValueChange={(value) => {
                    setSelectedEntity(value);
                    setSelectedCommand("");
                  }}
                  value={selectedEntity}
                >
                  <SelectTrigger id="entity-select">
                    <SelectValue placeholder="Select an entity..." />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity.name} value={entity.name}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{entity.displayName}</span>
                          <span className="text-xs text-muted-foreground">
                            {entity.commands.length} commands
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="command-select">Command</Label>
                <Select
                  disabled={
                    !selectedEntityCommands ||
                    selectedEntityCommands.length === 0
                  }
                  onValueChange={setSelectedCommand}
                  value={selectedCommand}
                >
                  <SelectTrigger id="command-select">
                    <SelectValue placeholder="Select a command..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedEntityCommands?.map((command) => (
                      <SelectItem key={command} value={command}>
                        {command}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCommandDetail && (
                <Alert>
                  <FileJson className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {selectedCommandDetail.description ||
                      `Execute ${selectedCommand} command`}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Test Data Input */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Test Data</CardTitle>
                  <CardDescription>
                    JSON input for the command parameters
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      setTestData(JSON.stringify({ id: "test-id" }, null, 2))
                    }
                    size="sm"
                    variant="outline"
                  >
                    Template
                  </Button>
                  <Button
                    disabled={!testData}
                    onClick={() => copyToClipboard(testData)}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                className={`font-mono text-sm ${testDataError ? "border-destructive" : ""}`}
                onChange={(e) => setTestData(e.target.value)}
                placeholder='{"id": "test-id", "status": "active"}'
                rows={12}
                value={testData}
              />
              {testDataError && (
                <p className="text-sm text-destructive">{testDataError}</p>
              )}

              {/* Command Parameters Reference */}
              {selectedCommandDetail &&
                selectedCommandDetail.parameters.length > 0 && (
                  <div className="space-y-2">
                    <Label>Available Parameters</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedCommandDetail.parameters.map(
                        (param: { name: string; type: string }) => (
                        <Badge key={param.name} variant="outline">
                          {param.name}: {param.type}
                        </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Execution Options */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  checked={isDryRun}
                  id="dry-run"
                  onChange={(e) => setIsDryRun(e.target.checked)}
                  type="checkbox"
                />
                <Label className="cursor-pointer" htmlFor="dry-run">
                  Dry Run (validate guards/constraints only, no execution)
                </Label>
              </div>

              <Button
                className="w-full"
                disabled={
                  !(selectedEntity && selectedCommand) ||
                  isExecuting ||
                  !!testDataError
                }
                onClick={handleExecute}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    {isDryRun ? "Validate" : "Execute"} Command
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results & History */}
        <div className="space-y-4">
          {/* Execution Result */}
          {executionResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Execution Result</CardTitle>
                  <Badge
                    variant={
                      executionResult.success ? "default" : "destructive"
                    }
                  >
                    {executionResult.success ? "Success" : "Failed"}
                  </Badge>
                </div>
                <CardDescription>
                  Execution time: {executionResult.executionTime}ms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="output">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="output">Output</TabsTrigger>
                      <TabsTrigger value="guards">
                        Guards
                        {executionResult.guards.filter(
                          (g: { passed: boolean }) => !g.passed
                        ).length > 0 && (
                          <Badge className="ml-1 h-5 px-1" variant="destructive">
                            {
                              executionResult.guards.filter(
                                (g: { passed: boolean }) => !g.passed
                              ).length
                            }
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="constraints">
                        Constraints
                        {executionResult.constraints.filter(
                          (c: { passed: boolean }) => !c.passed
                        ).length > 0 && (
                          <Badge className="ml-1 h-5 px-1" variant="destructive">
                            {
                              executionResult.constraints.filter(
                                (c: { passed: boolean }) => !c.passed
                              ).length
                            }
                          </Badge>
                        )}
                      </TabsTrigger>
                    <TabsTrigger value="policy">Policy</TabsTrigger>
                  </TabsList>

                  <TabsContent className="space-y-2" value="output">
                    {executionResult.success ? (
                      <div className="space-y-2">
                        <CollapsibleSection
                          expanded={expandedSections.has("output")}
                          onToggle={() => toggleSection("output")}
                          title="Command Result"
                        >
                          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(
                              executionResult.output?.result,
                              null,
                              2
                            )}
                          </pre>
                        </CollapsibleSection>

                        {executionResult.output?.events &&
                          executionResult.output.events.length > 0 && (
                            <CollapsibleSection
                              expanded={expandedSections.has("events")}
                              onToggle={() => toggleSection("events")}
                              title={`Emitted Events (${executionResult.output.events.length})`}
                            >
                              <div className="space-y-2">
                                {executionResult.output.events.map(
                                  (
                                    event: { name: string; payload?: unknown },
                                    i: number
                                  ) => (
                                    <Card className="p-2" key={i}>
                                      <Badge variant="outline">
                                        {event.name}
                                      </Badge>
                                      <pre className="bg-muted p-2 rounded text-xs mt-2 overflow-x-auto">
                                        {JSON.stringify(event.payload, null, 2)}
                                      </pre>
                                    </Card>
                                  )
                                )}
                              </div>
                            </CollapsibleSection>
                          )}
                      </div>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {executionResult.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent className="space-y-2" value="guards">
                    {executionResult.guards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No guards defined
                      </p>
                    ) : (
                      executionResult.guards.map(
                        (
                          guard: {
                            index: number;
                            expression: string;
                            passed: boolean;
                            message?: string;
                          },
                          i: number
                        ) => (
                        <Card
                          className={`p-3 ${guard.passed ? "border-green-500" : "border-destructive"}`}
                          key={i}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {guard.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-destructive" />
                              )}
                              <span className="text-sm font-medium">
                                Guard #{guard.index + 1}
                              </span>
                            </div>
                            <Badge
                              variant={guard.passed ? "default" : "destructive"}
                            >
                              {guard.passed ? "Pass" : "Fail"}
                            </Badge>
                          </div>
                          {guard.expression && (
                            <pre className="bg-muted p-2 rounded text-xs mt-2 overflow-x-auto">
                              {guard.expression}
                            </pre>
                          )}
                          {guard.message && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {guard.message}
                            </p>
                          )}
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent className="space-y-2" value="constraints">
                    {executionResult.constraints.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No constraints evaluated
                      </p>
                    ) : (
                      executionResult.constraints.map(
                        (
                          constraint: {
                            name: string;
                            severity: string;
                            passed: boolean;
                            message?: string;
                          },
                          i: number
                        ) => (
                        <Card
                          className={`p-3 ${
                            constraint.passed
                              ? ""
                              : constraint.severity === "block"
                                ? "border-destructive"
                                : "border-yellow-500"
                          }`}
                          key={i}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {constraint.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4" />
                              )}
                              <span className="text-sm font-medium">
                                {constraint.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  constraint.severity === "block"
                                    ? "destructive"
                                    : constraint.severity === "warn"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {constraint.severity}
                              </Badge>
                              <Badge
                                variant={
                                  constraint.passed ? "default" : "destructive"
                                }
                              >
                                {constraint.passed ? "Pass" : "Fail"}
                              </Badge>
                            </div>
                          </div>
                          {constraint.message && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {constraint.message}
                            </p>
                          )}
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="policy">
                    {executionResult.policy ? (
                      <Card
                        className={`p-3 ${executionResult.policy.denied ? "border-destructive" : "border-green-500"}`}
                      >
                        <div className="flex items-center gap-2">
                          {executionResult.policy.denied ? (
                            <X className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {executionResult.policy.denied
                                ? "Policy Denied"
                                : "Policy Allowed"}
                            </p>
                            {executionResult.policy.policyName && (
                              <p className="text-xs text-muted-foreground">
                                Policy: {executionResult.policy.policyName}
                              </p>
                            )}
                            {executionResult.policy.reason && (
                              <p className="text-xs text-muted-foreground">
                                {executionResult.policy.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No policy evaluation result
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Captured Snapshots */}
          {capturedSnapshots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Captured Snapshots</CardTitle>
                <CardDescription>
                  State snapshots from successful executions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {capturedSnapshots.map((snapshot) => (
                  <Card className="p-3" key={snapshot.id}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{snapshot.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(snapshot.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleReplayFromSnapshot(snapshot)}
                        size="sm"
                        variant="ghost"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Execution History Panel */}
          {showHistory && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
                <CardDescription>
                  Command execution history for{" "}
                  {selectedEntity || "all entities"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No execution history found
                  </p>
                ) : (
                  history.map((entry) => (
                    <Card
                      className="p-2 cursor-pointer hover:bg-muted/50"
                      key={entry.id}
                      onClick={() => handleReplayFromHistory(entry)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {entry.result.success ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-destructive" />
                          )}
                          <div>
                            <p className="text-xs font-medium">
                              {entry.entityName}.{entry.commandName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {entry.result.executionTime}ms
                        </Badge>
                      </div>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Documentation Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            The Manifest Test Playground allows you to interactively test
            commands defined in the Manifest IR.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Dry Run:</strong> Validates guards and constraints without
              executing the command
            </li>
            <li>
              <strong>Snapshots:</strong> Captures state after successful
              execution for replay
            </li>
            <li>
              <strong>History:</strong> Maintains execution history for replay
              and debugging
            </li>
          </ul>
          <p className="text-xs">
            See{" "}
            <Link
              className="text-primary hover:underline"
              href="https://github.com/angriff36/manifest"
              target="_blank"
            >
              Manifest Specification
            </Link>{" "}
            for details on command semantics.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for collapsible sections
interface CollapsibleSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border rounded-lg">
      <button
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50"
        onClick={onToggle}
        type="button"
      >
        <span className="text-sm font-medium">{title}</span>
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// Default implementation using fetch
async function executeDefaultCommand(
  entityName: string,
  commandName: string,
  testData: Record<string, unknown>
): Promise<ExecutionResult> {
  const response = await fetch("/api/settings/manifest-playground/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entityName,
      commandName,
      testData,
      options: { captureSnapshot: true },
    }),
  });

  if (!response.ok) {
    throw new Error(`Execution failed: ${response.statusText}`);
  }

  return response.json() as Promise<ExecutionResult>;
}
