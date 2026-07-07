"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/design-system/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Switch } from "@repo/design-system/components/ui/switch";
import { cn } from "@repo/design-system/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  listUsers,
  trainingAssignmentCreate,
} from "@/app/lib/manifest-client.generated";

const formSchema = z.object({
  employeeId: z.string().optional(),
  assignToAll: z.boolean(),
  dueDate: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Employee {
  email: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
}

interface AssignTrainingDialogProps {
  moduleId: string;
  moduleName: string;
}

export function AssignTrainingDialog({
  moduleId,
  moduleName,
}: AssignTrainingDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: "",
      assignToAll: false,
    },
  });

  const assignToAll = form.watch("assignToAll");

  // Fetch employees when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingEmployees(true);
      listUsers({ limit: 200 })
        .then((result) => {
          if (result.data) {
            setEmployees(
              result.data
                .filter((u) => u.isActive !== false && !u.deletedAt)
                .map((u) => ({
                  id: u.id,
                  firstName: u.firstName ?? null,
                  lastName: u.lastName ?? null,
                  email: u.email ?? "",
                }))
            );
          }
        })
        .catch(() => {
          toast.error("Failed to load employees");
        })
        .finally(() => {
          setLoadingEmployees(false);
        });
    }
  }, [open]);

  const onSubmit = async (values: FormValues) => {
    if (!(values.assignToAll || values.employeeId)) {
      toast.error("Please select an employee or choose 'Assign to All'");
      return;
    }

    const dueAt = values.dueDate?.toISOString();

    setIsSubmitting(true);
    try {
      if (values.assignToAll) {
        if (employees.length === 0) {
          toast.error("No employees available to assign");
          return;
        }
        // The create command targets a single staff member, so "assign to all"
        // fans out to one assignment per employee.
        const results = await Promise.allSettled(
          employees.map((employee) =>
            trainingAssignmentCreate({
              moduleId,
              moduleTitle: moduleName,
              staffMemberId: employee.id,
              dueAt,
            })
          )
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          toast.error(
            `Assigned to ${employees.length - failed} of ${employees.length}; ${failed} failed`
          );
        } else {
          toast.success(`Training assigned to ${employees.length} employees`);
        }
      } else {
        await trainingAssignmentCreate({
          moduleId,
          moduleTitle: moduleName,
          staffMemberId: values.employeeId,
          dueAt,
        });
        toast.success("Training assigned successfully");
      }

      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to assign training"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>Assign to Employee</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Assign Training</DialogTitle>
          <DialogDescription>
            Assign "{moduleName}" to an employee or all employees.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="assignToAll"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Assign to All</FormLabel>
                    <FormDescription>
                      Assign this training to all employees
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!assignToAll && (
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select
                      disabled={loadingEmployees}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName && employee.lastName
                              ? `${employee.firstName} ${employee.lastName}`
                              : employee.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          variant="outline"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        disabled={(date) => date < new Date()}
                        mode="single"
                        onSelect={field.onChange}
                        selected={field.value}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Assigning..." : "Assign Training"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
