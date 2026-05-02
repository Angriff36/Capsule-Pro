"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
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
import { ArrowLeftIcon, Loader2Icon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { EmailTriggerType } from "../actions";
import {
  deleteEmailWorkflow,
  getAvailableTemplates,
  getEmailWorkflowById,
  TRIGGER_TYPE_GROUPS,
  TRIGGER_TYPE_LABELS,
  updateEmailWorkflow,
} from "../actions";

export default function EditEmailWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = params
    ? { id: (params as unknown as { id: string }).id }
    : { id: "" };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [templates, setTemplates] = useState<
    { id: string; name: string; template_type: string }[]
  >([]);

  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<string>("");
  const [emailTemplateId, setEmailTemplateId] = useState<string>("none");
  const [recipientType, setRecipientType] = useState("client");
  const [customEmails, setCustomEmails] = useState("");
  const [triggerConfig, setTriggerConfig] = useState("{}");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [workflow, tmpls] = await Promise.all([
          getEmailWorkflowById(id),
          getAvailableTemplates(),
        ]);
        setName(workflow.name);
        setTriggerType(workflow.triggerType);
        setEmailTemplateId(workflow.emailTemplateId ?? "none");
        setTriggerConfig(JSON.stringify(workflow.triggerConfig ?? {}, null, 2));

        const rc = workflow.recipientConfig as Record<string, unknown> | null;
        if (rc?.type) {
          setRecipientType(rc.type as string);
          if (rc.type === "custom" && Array.isArray(rc.emails)) {
            setCustomEmails((rc.emails as string[]).join(", "));
          }
        }

        setIsActive(workflow.isActive);
        setTemplates(tmpls);
      } catch (error) {
        toast.error("Failed to load workflow", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        router.push("/settings/email-workflows");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Workflow name is required");
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

      await updateEmailWorkflow(id, {
        name: name.trim(),
        triggerType: triggerType as EmailTriggerType,
        triggerConfig: parsedTriggerConfig,
        emailTemplateId: emailTemplateId === "none" ? null : emailTemplateId,
        recipientConfig,
        isActive,
      });

      toast.success("Workflow updated successfully");
      router.push("/settings/email-workflows");
    } catch (error) {
      toast.error("Failed to update workflow", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEmailWorkflow(id);
      toast.success("Workflow deleted");
      router.push("/settings/email-workflows");
    } catch (error) {
      toast.error("Failed to delete workflow", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} size="sm" variant="ghost">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Workflow</h1>
            <p className="text-muted-foreground mt-1">{name}</p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={deleting} variant="outline">
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{name}&quot;? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Workflow Configuration</CardTitle>
            <CardDescription>
              Update when and how this automated email is triggered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name</Label>
              <Input
                id="name"
                onChange={(e) => setName(e.target.value)}
                required
                value={name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select onValueChange={setTriggerType} value={triggerType}>
                <SelectTrigger>
                  <SelectValue />
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    No template (raw trigger only)
                  </SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.template_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                rows={4}
                value={triggerConfig}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                checked={isActive}
                id="isActive"
                onChange={(e) => setIsActive(e.target.checked)}
                type="checkbox"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button disabled={submitting} type="submit">
                {submitting && (
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
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
