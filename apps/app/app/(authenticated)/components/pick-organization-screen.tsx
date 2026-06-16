"use client";

import { OrganizationSwitcher } from "@clerk/nextjs";

export function PickOrganizationScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="font-semibold text-2xl">Choose an organization</h1>
        <p className="text-muted-foreground text-sm">
          Capsule Pro is tenant-scoped. Select or create an organization to continue.
        </p>
      </div>
      <OrganizationSwitcher
        afterCreateOrganizationUrl="/events"
        afterSelectOrganizationUrl="/events"
        hidePersonal
      />
    </div>
  );
}
