"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { EmailTriggerType } from "../actions";
import {
  createEmailWorkflow,
  getAvailableTemplates,
  TRIGGER_TYPE_GROUPS,
  TRIGGER_TYPE_LABELS,
} from "../actions";

interface TemplateOption {
  id: string;
  name: string;
  templateType: string;
  subject: string;
}

export default function NewEmailWorkflowPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<string>("");
  const [emailTemplateId, setEmailTemplateId] = useState<string>("none");
  const [recipientType, setRecipientType] = useState("client");
  const [customEmails, setCustomEmails] = useState("");
  const [triggerConfig, setTriggerConfig] = useState("{}");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    getAvailableTemplates()
      .then(setTemplates)
      .catch(() => {
        toast.error("Failed to load email templates");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Workflow name is required");
      return;
    }
    if (!triggerType) {
      toast.error("Trigger type is required");
      return;
    }

    setSubmitting(true);
    try {
      const recipientConfig = {
        type: recipientType,
        ...(recipientType === "custom" && {
          emails: customEmails
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
        }),
      };

      let parsedTriggerConfig = {};
      try {
        parsedTriggerConfig = JSON.parse(triggerConfig);
      } catch {
        toast.error("Trigger config must be valid JSON");
        setSubmitting(false);
        return;
      }

      const result = await createEmailWorkflow({
        name: name.trim(),
        triggerType: triggerType as EmailTriggerType,
        triggerConfig: parsedTriggerConfig,
        emailTemplateId: emailTemplateId === "none" ? null : emailTemplateId,
        recipientConfig,
        isActive,
      });

      toast.success("Workflow created successfully");
      router.push(`/settings/email-workflows/${result.id}`);
    } catch (error) {
      toast.error("Failed to create workflow", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} size="sm" variant="ghost">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            New Email Workflow
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure an automated email trigger
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Workflow Configuration</CardTitle>
            <CardDescription>
              Define when and how this automated email is triggered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name</Label>
              <Input
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Event Confirmation Email"
                required
                value={name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select onValueChange={setTriggerType} value={triggerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trigger..." />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPE_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.types.map((type) => (
                        <SelectItem key={type} value={type}>
                          {TRIGGER_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Email Template</Label>
              <Select
                onValueChange={setEmailTemplateId}
                value={emailTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    No template (raw trigger only)
                  </SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.templateType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active email templates found.{" "}
                  <a
                    className="text-primary underline"
                    href="/settings/email-templates/new"
                  >
                    Create one
                  </a>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientType">Recipients</Label>
              <Select onValueChange={setRecipientType} value={recipientType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    Client associated with trigger
                  </SelectItem>
                  <SelectItem value="assigned_user">
                    User assigned to the entity
                  </SelectItem>
                  <SelectItem value="event_manager">Event manager</SelectItem>
                  <SelectItem value="custom">Custom email addresses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customEmails">
                  Email Addresses (comma-separated)
                </Label>
                <Input
                  id="customEmails"
                  onChange={(e) => setCustomEmails(e.target.value)}
                  placeholder="admin@example.com, manager@example.com"
                  value={customEmails}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="triggerConfig">
                Trigger Configuration (JSON)
              </Label>
              <Textarea
                className="font-mono text-sm"
                id="triggerConfig"
                onChange={(e) => setTriggerConfig(e.target.value)}
                placeholder="{}"
                rows={4}
                value={triggerConfig}
              />
              <p className="text-xs text-muted-foreground">
                Additional conditions for when this trigger fires. Leave as{" "}
                {`
{}
`}{" "}
                for default behavior.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                checked={isActive}
                id="isActive"
                onChange={(e) => setIsActive(e.target.checked)}
                type="checkbox"
              />
              <Label htmlFor="isActive">Activate workflow immediately</Label>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button disabled={submitting} type="submit">
                {submitting && (
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Workflow
              </Button>
              <Button
                onClick={() => router.back()}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
