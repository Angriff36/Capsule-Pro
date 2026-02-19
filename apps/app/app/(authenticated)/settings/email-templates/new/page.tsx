"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/design-system/components/ui/form";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ArrowLeftIcon, Loader2Icon, MailIcon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  COMMON_MERGE_FIELDS,
  createEmailTemplate,
  extractMergeFields,
  renderTemplate,
  type EmailTemplateType,
} from "../actions";

const TEMPLATE_TYPES: { value: EmailTemplateType; label: string }[] = [
  { value: "proposal", label: "Proposal" },
  { value: "confirmation", label: "Confirmation" },
  { value: "reminder", label: "Reminder" },
  { value: "follow_up", label: "Follow-up" },
  { value: "contract", label: "Contract" },
  { value: "contact", label: "Contact" },
  { value: "custom", label: "Custom" },
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  templateType: z.enum([
    "proposal",
    "confirmation",
    "reminder",
    "follow_up",
    "contract",
    "contact",
    "custom",
  ]),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  isDefault: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewEmailTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      templateType: "custom",
      subject: "",
      body: "",
      isDefault: false,
    },
  });

  const watchSubject = form.watch("subject");
  const watchBody = form.watch("body");

  // Extract merge fields from current content
  const detectedFields = [
    ...new Set([
      ...extractMergeFields(watchSubject),
      ...extractMergeFields(watchBody),
    ]),
  ];

  // Preview with sample data
  const sampleData: Record<string, string> = {
    recipientName: "Jane Smith",
    recipientFirstName: "Jane",
    recipientEmail: "jane.smith@example.com",
    senderName: "John Doe",
    companyName: "Acme Catering Co.",
    eventName: "Summer Wedding Reception",
    eventDate: "June 15, 2026",
    eventTime: "6:00 PM",
    eventLocation: "Grand Ballroom, City Hotel",
    proposalTitle: "Wedding Catering Proposal",
    proposalUrl: "https://example.com/proposals/abc123",
    totalAmount: "$5,000.00",
    contractUrl: "https://example.com/contracts/abc123",
    message: "We look forward to making your event special!",
  };

  const preview = renderTemplate(
    { subject: watchSubject, body: watchBody },
    sampleData
  );

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      await createEmailTemplate({
        name: data.name,
        templateType: data.templateType,
        subject: data.subject,
        body: data.body,
        mergeFields: detectedFields,
        isDefault: data.isDefault,
      });
      toast.success("Template created", {
        description: `"${data.name}" has been created successfully.`,
      });
      router.push("/settings/email-templates");
    } catch (error) {
      toast.error("Failed to create template", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  const insertMergeField = (fieldName: string) => {
    const field = `{{${fieldName}}}`;
    const currentBody = form.getValues("body");
    form.setValue("body", currentBody + field);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings/email-templates">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Create Email Template
          </h1>
          <p className="text-muted-foreground">
            Create a new reusable email template with merge fields.
          </p>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={saving}>
          {saving ? (
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <SaveIcon className="mr-2 h-4 w-4" />
          )}
          Save Template
        </Button>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Wedding Proposal Follow-up"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="templateType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TEMPLATE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Subject</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Your {{eventName}} Proposal from {{companyName}}"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Use merge fields like {`{{recipientName}}`} for
                      personalization
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Body</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Dear {{recipientName}},&#10;&#10;We are pleased to present our proposal for {{eventName}}..."
                        className="min-h-[300px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Set as default template</FormLabel>
                      <FormDescription>
                        This template will be pre-selected for emails of this
                        type
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Merge Fields */}
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-semibold">Merge Fields</h3>
            <p className="text-sm text-muted-foreground">
              Click to insert a merge field into your template.
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {COMMON_MERGE_FIELDS.map((field) => (
                <button
                  key={field.name}
                  type="button"
                  onClick={() => insertMergeField(field.name)}
                  className="w-full text-left p-2 rounded hover:bg-muted text-sm"
                >
                  <code className="text-xs bg-muted px-1 rounded">
                    {`{{${field.name}}}`}
                  </code>
                  <p className="text-muted-foreground text-xs mt-1">
                    {field.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Detected Fields */}
          {detectedFields.length > 0 && (
            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="font-semibold">Detected Fields</h3>
              <p className="text-sm text-muted-foreground">
                These merge fields were found in your template:
              </p>
              <div className="flex flex-wrap gap-1">
                {detectedFields.map((field) => (
                  <code
                    key={field}
                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                  >
                    {`{{${field}}}`}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <Separator />
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Preview</h2>
        <p className="text-sm text-muted-foreground">
          Preview with sample data (actual values will be substituted when
          sending)
        </p>

        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">Rendered Preview</TabsTrigger>
            <TabsTrigger value="raw">Raw Template</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Subject</Label>
                <p className="font-medium">{preview.subject}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Body</Label>
                <div className="whitespace-pre-wrap text-sm">
                  {preview.body}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="raw">
            <div className="rounded-lg border p-4 space-y-4 font-mono text-sm bg-muted/30">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Subject</Label>
                <p>{watchSubject}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Body</Label>
                <pre className="whitespace-pre-wrap">{watchBody}</pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
