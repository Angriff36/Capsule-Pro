"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import type {
  CommandDetail,
  ConstraintDetail,
  EntityDetail,
  GuardDetail,
  PolicyDetail,
} from "@repo/types/manifest-editor";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code,
  FileJson,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";

interface ManifestPolicyEditorProps {
  entity: EntityDetail;
  onValidateExpression?: (
    type: "guard" | "constraint" | "policy",
    expression: string
  ) => Promise<boolean>;
}

export function ManifestPolicyEditor({
  entity,
  onValidateExpression,
}: ManifestPolicyEditorProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [validating, setValidating] = useState<Set<string>>(new Set());
  const [validationResults, setValidationResults] = useState<
    Map<string, { passed: boolean; message?: string }>
  >(new Map());

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedItems(next);
  };

  const handleValidate = async (
    type: "guard" | "constraint" | "policy",
    id: string,
    expression: string
  ) => {
    if (!onValidateExpression) return;

    setValidating((prev) => new Set(prev).add(id));
    try {
      const passed = await onValidateExpression(type, expression);
      setValidationResults((prev) => new Map(prev).set(id, { passed }));
    } catch (error) {
      setValidationResults((prev) =>
        new Map(prev).set(id, {
          passed: false,
          message: error instanceof Error ? error.message : "Validation failed",
        })
      );
    } finally {
      setValidating((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const totalGuards = entity.commands.reduce(
    (sum, cmd) => sum + cmd.guards.length,
    0
  );
  const totalConstraints =
    entity.constraints.length +
    entity.commands.reduce((sum, cmd) => sum + cmd.constraints.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <div className="flex-1">
          <AlertTitle>How to read this page</AlertTitle>
          <AlertDescription>
            <span className="font-medium">Actions</span> are things the system
            can do. <span className="font-medium">Rules</span> can block or warn
            before an action runs. <span className="font-medium">Checks</span>{" "}
            are preconditions. <span className="font-medium">Permissions</span>{" "}
            describe who is allowed. (Under the hood: commands, constraints,
            guards, and policies.)
          </AlertDescription>
        </div>
      </Alert>

      {/* Entity Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                {entity.displayName}
              </CardTitle>
              <CardDescription>
                What actions exist, what rules apply, and what checks run before
                execution.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{entity.commands.length} Actions</Badge>
              <Badge variant="outline">{totalConstraints} Rules</Badge>
              <Badge variant="outline">{totalGuards} Checks</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Editor Tabs */}
      <Tabs defaultValue="commands">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="commands">Actions</TabsTrigger>
          <TabsTrigger value="constraints">Rules</TabsTrigger>
          <TabsTrigger value="guards">Checks</TabsTrigger>
          <TabsTrigger value="policies">Permissions</TabsTrigger>
        </TabsList>

        {/* Commands Tab */}
        <TabsContent className="space-y-4" value="commands">
          {entity.commands.map((command) => (
            <CommandCard
              command={command}
              entityName={entity.name}
              expanded={expandedItems.has(`cmd-${command.name}`)}
              key={command.name}
              onToggle={() => toggleExpanded(`cmd-${command.name}`)}
              onValidate={(expr) =>
                handleValidate("guard", `cmd-${command.name}`, expr)
              }
              validating={validating.has(`cmd-${command.name}`)}
              validationResult={validationResults.get(`cmd-${command.name}`)}
            />
          ))}
        </TabsContent>

        {/* Constraints Tab */}
        <TabsContent className="space-y-4" value="constraints">
          {/* Entity-level constraints */}
          {entity.constraints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Entity-Level Rules
                </CardTitle>
                <CardDescription>
                  These rules apply to all actions on this business object
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {entity.constraints.map((constraint) => (
                  <ConstraintItem
                    constraint={constraint}
                    entityName={entity.name}
                    key={constraint.name}
                    onValidate={(expr) =>
                      handleValidate(
                        "constraint",
                        `entity-${constraint.name}`,
                        expr
                      )
                    }
                    validating={validating.has(`entity-${constraint.name}`)}
                    validationResult={validationResults.get(
                      `entity-${constraint.name}`
                    )}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Command-level constraints */}
          {entity.commands.map((command) =>
            command.constraints.length > 0 ? (
              <Card key={command.name}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {command.name} Rules
                  </CardTitle>
                  <CardDescription>
                    Rules specific to the {command.name} action
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {command.constraints.map((constraint) => (
                    <ConstraintItem
                      commandName={command.name}
                      constraint={constraint}
                      entityName={entity.name}
                      key={constraint.name}
                      onValidate={(expr) =>
                        handleValidate(
                          "constraint",
                          `${command.name}-${constraint.name}`,
                          expr
                        )
                      }
                      validating={validating.has(
                        `${command.name}-${constraint.name}`
                      )}
                      validationResult={validationResults.get(
                        `${command.name}-${constraint.name}`
                      )}
                    />
                  ))}
                </CardContent>
              </Card>
            ) : null
          )}
        </TabsContent>

        {/* Guards Tab */}
        <TabsContent className="space-y-4" value="guards">
          {entity.commands.map((command) =>
            command.guards.length > 0 ? (
              <Card key={command.name}>
                <Collapsible
                  onOpenChange={() => toggleExpanded(`guard-${command.name}`)}
                  open={expandedItems.has(`guard-${command.name}`)}
                >
                  <CardHeader className="cursor-pointer">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <div>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          {command.name} Checks
                        </CardTitle>
                        <CardDescription>
                          {command.guards.length} precondition
                          {command.guards.length > 1 ? "s" : ""} before
                          execution
                        </CardDescription>
                      </div>
                      {expandedItems.has(`guard-${command.name}`) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      {command.guards.map((guard, index) => (
                        <GuardItem
                          commandName={command.name}
                          entityName={entity.name}
                          guard={guard}
                          index={index}
                          key={index}
                          onValidate={(expr) =>
                            handleValidate(
                              "guard",
                              `${command.name}-guard-${index}`,
                              expr
                            )
                          }
                          validating={validating.has(
                            `${command.name}-guard-${index}`
                          )}
                          validationResult={validationResults.get(
                            `${command.name}-guard-${index}`
                          )}
                        />
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ) : null
          )}
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent className="space-y-4" value="policies">
          {entity.policies.length > 0 ? (
            entity.policies.map((policy) => (
              <PolicyCard
                entityName={entity.name}
                key={policy.name}
                policy={policy}
              />
            ))
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  No policies defined for this entity
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Command Card Component
interface CommandCardProps {
  command: CommandDetail;
  entityName: string;
  expanded: boolean;
  onToggle: () => void;
  onValidate: (expression: string) => void;
  validating: boolean;
  validationResult?: { passed: boolean; message?: string };
}

function CommandCard({
  command,
  entityName,
  expanded,
  onToggle,
  onValidate,
  validating,
  validationResult,
}: CommandCardProps) {
  return (
    <Card>
      <Collapsible onOpenChange={onToggle} open={expanded}>
        <CardHeader className="cursor-pointer">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                {command.name}
                {command.description && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {command.description}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {command.guards.length} guard
                {command.guards.length !== 1 ? "s" : ""} •{" "}
                {command.constraints.length} constraint
                {command.constraints.length !== 1 ? "s" : ""} •{" "}
                {command.emittedEvents.length} event
                {command.emittedEvents.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Parameters */}
            {command.parameters.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Parameters</h4>
                <div className="flex flex-wrap gap-2">
                  {command.parameters.map((param) => (
                    <Badge key={param.name} variant="secondary">
                      {param.name}: {param.type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Guards */}
            {command.guards.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">
                  Checks (Preconditions)
                </h4>
                <div className="space-y-2">
                  {command.guards.map((guard, index) => (
                    <GuardItem
                      commandName={command.name}
                      entityName={entityName}
                      guard={guard}
                      index={index}
                      key={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Constraints */}
            {command.constraints.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Rules</h4>
                <div className="space-y-2">
                  {command.constraints.map((constraint) => (
                    <ConstraintItem
                      commandName={command.name}
                      constraint={constraint}
                      entityName={entityName}
                      key={constraint.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Mutations */}
            {command.mutations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Mutations</h4>
                <div className="space-y-1 text-sm">
                  {command.mutations.map((mutation, index) => (
                    <div
                      className="font-mono text-muted-foreground"
                      key={index}
                    >
                      {mutation.property} = {mutation.expression}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events */}
            {command.emittedEvents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Emitted Events</h4>
                <div className="flex flex-wrap gap-2">
                  {command.emittedEvents.map((event) => (
                    <Badge key={event} variant="outline">
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Constraint Item Component
interface ConstraintItemProps {
  constraint: ConstraintDetail;
  entityName: string;
  commandName?: string;
  onValidate?: (expression: string) => void;
  validating?: boolean;
  validationResult?: { passed: boolean; message?: string };
}

function ConstraintItem({
  constraint,
  entityName,
  commandName,
  onValidate,
  validating,
  validationResult,
}: ConstraintItemProps) {
  const severityConfig = {
    block: {
      icon: ShieldAlert,
      color: "text-destructive",
      bg: "bg-destructive/10",
      label: "BLOCKING",
    },
    warn: {
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
      label: "WARNING",
    },
    info: {
      icon: AlertCircle,
      color: "text-info",
      bg: "bg-info/10",
      label: "INFO",
    },
  };

  const config = severityConfig[constraint.severity];
  const Icon = config.icon;

  return (
    <Alert className={config.bg}>
      <Icon className={`h-4 w-4 ${config.color}`} />
      <div className="flex items-start justify-between w-full">
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2">
            {constraint.name}
            <Badge className="ml-auto" variant="outline">
              {config.label}
            </Badge>
          </AlertTitle>
          {constraint.message && (
            <AlertDescription>{constraint.message}</AlertDescription>
          )}
          <div className="mt-2 font-mono text-xs bg-muted p-2 rounded">
            {constraint.expression}
          </div>
          {constraint.details && Object.keys(constraint.details).length > 0 && (
            <div className="mt-2 text-xs">
              <span className="font-medium">Details:</span>
              <pre className="mt-1">
                {JSON.stringify(constraint.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
        {validationResult && (
          <Badge
            className="ml-2"
            variant={validationResult.passed ? "default" : "destructive"}
          >
            {validationResult.passed ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <X className="h-3 w-3 mr-1" />
            )}
            {validationResult.passed ? "Valid" : "Invalid"}
          </Badge>
        )}
      </div>
    </Alert>
  );
}

// Guard Item Component
interface GuardItemProps {
  guard: GuardDetail;
  entityName: string;
  commandName: string;
  index: number;
  onValidate?: (expression: string) => void;
  validating?: boolean;
  validationResult?: { passed: boolean; message?: string };
}

function GuardItem({
  guard,
  entityName,
  commandName,
  index,
  onValidate,
  validating,
  validationResult,
}: GuardItemProps) {
  return (
    <Alert variant="default">
      <Shield className="h-4 w-4" />
      <div className="flex-1">
        <AlertTitle className="text-xs">Check #{index + 1}</AlertTitle>
        {guard.message && (
          <AlertDescription className="text-xs">
            {guard.message}
          </AlertDescription>
        )}
        <div className="mt-2 font-mono text-xs bg-muted p-2 rounded">
          {guard.expression}
        </div>
      </div>
      {validationResult && (
        <Badge variant={validationResult.passed ? "default" : "destructive"}>
          {validationResult.passed ? (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          ) : (
            <X className="h-3 w-3 mr-1" />
          )}
          {validationResult.passed ? "Valid" : "Invalid"}
        </Badge>
      )}
    </Alert>
  );
}

// Policy Card Component
interface PolicyCardProps {
  policy: PolicyDetail;
  entityName: string;
}

function PolicyCard({ policy, entityName }: PolicyCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          {policy.name}
          <Badge variant="outline">{policy.type}</Badge>
        </CardTitle>
        {policy.targetCommands.length > 0 && (
          <CardDescription>
            Applies to: {policy.targetCommands.join(", ")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium">Expression:</span>
            <div className="mt-1 font-mono text-sm bg-muted p-3 rounded">
              {policy.expression || "No expression defined"}
            </div>
          </div>
          {policy.message && (
            <div>
              <span className="text-sm font-medium">Message:</span>
              <p className="text-sm text-muted-foreground mt-1">
                {policy.message}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 18 18" />
    </svg>
  );
}
