"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type ActionState,
  deleteStaffMember,
  updateStaffMember,
} from "../actions";
import { employmentTypeOptions, roleOptions } from "../constants";

interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  employmentType: string;
}

const initialState: ActionState = { status: "idle" };

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      {pending ? "Saving..." : "Save changes"}
    </Button>
  );
};

interface EditStaffDialogProps {
  employee: Employee;
  children?: React.ReactNode;
}

export const EditStaffDialog = ({
  employee,
  children,
}: EditStaffDialogProps) => {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(updateStaffMember, initialState);
  const [deleteState, deleteAction] = useActionState(
    deleteStaffMember,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false);
      formRef.current?.reset();
    }
    if (deleteState.status === "success") {
      setOpen(false);
    }
  }, [state.status, deleteState.status]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" variant="outline">
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>
            Update {employee.firstName} {employee.lastName}&apos;s details.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" ref={formRef}>
          <input name="id" type="hidden" value={employee.id} />

          {state.status === "error" ? (
            <Alert variant="destructive">
              <AlertTitle>Could not update staff</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          {state.status === "success" ? (
            <Alert>
              <AlertTitle>Staff updated</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3">
            <Label htmlFor={`email-${employee.id}`}>Email</Label>
            <Input
              autoComplete="email"
              defaultValue={employee.email}
              id={`email-${employee.id}`}
              name="email"
              type="email"
            />
          </div>

          <div className="grid gap-3">
            <Label htmlFor={`firstName-${employee.id}`}>First name</Label>
            <Input
              autoComplete="given-name"
              defaultValue={employee.firstName}
              id={`firstName-${employee.id}`}
              name="firstName"
            />
          </div>

          <div className="grid gap-3">
            <Label htmlFor={`lastName-${employee.id}`}>Last name</Label>
            <Input
              autoComplete="family-name"
              defaultValue={employee.lastName}
              id={`lastName-${employee.id}`}
              name="lastName"
            />
          </div>

          <div className="grid gap-3">
            <Label htmlFor={`role-${employee.id}`}>Role</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={employee.role}
              id={`role-${employee.id}`}
              name="role"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3">
            <Label htmlFor={`employmentType-${employee.id}`}>
              Employment type
            </Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={employee.employmentType}
              id={`employmentType-${employee.id}`}
              name="employmentType"
            >
              {employmentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3">
            <Label htmlFor={`isActive-${employee.id}`}>Status</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={employee.isActive.toString()}
              id={`isActive-${employee.id}`}
              name="isActive"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>

        <div className="border-t pt-4 mt-4">
          <form action={deleteAction}>
            <input name="id" type="hidden" value={employee.id} />
            <Button className="w-full" type="submit" variant="destructive">
              Delete Staff Member
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
