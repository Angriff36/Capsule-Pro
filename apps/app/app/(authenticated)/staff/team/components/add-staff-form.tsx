"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { type ActionState, addStaffMember } from "../actions";
import { employmentTypeOptions, roleOptions } from "../constants";

const initialState: ActionState = { status: "idle" };

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      {pending ? "Adding..." : "Add staff member"}
    </Button>
  );
};

export const AddStaffForm = () => {
  const [state, formAction] = useActionState(addStaffMember, initialState);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form action={formAction} className="space-y-4" ref={formRef}>
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Could not add staff</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      {state.status === "success" ? (
        <Alert>
          <AlertTitle>Staff added</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3">
        <Label htmlFor="firstName">First name</Label>
        <Input autoComplete="given-name" id="firstName" name="firstName" />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="lastName">Last name</Label>
        <Input autoComplete="family-name" id="lastName" name="lastName" />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="email">Email</Label>
        <Input autoComplete="email" id="email" name="email" type="email" />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="role">Role</Label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue="staff"
          id="role"
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
        <Label htmlFor="employmentType">Employment type</Label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue="full_time"
          id="employmentType"
          name="employmentType"
        >
          {employmentTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton />
    </form>
  );
};
