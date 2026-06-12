"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { syncCurrentUser } from "../actions";

export const AutoRegisterStaff = () => {
  const router = useRouter();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const sync = async () => {
      setStatus("loading");
      const result = await syncCurrentUser();
      if (result.status === "success") {
        setStatus("success");
        // Refresh server data to show synced user in staff directory.
        // Use startTransition + router.refresh() instead of revalidatePath
        // from the server action to avoid clearing sibling form input values.
        startTransition(() => {
          router.refresh();
        });
      } else {
        setStatus("error");
        setMessage(result.message ?? "Failed to sync");
      }
    };
    sync();
  }, []);

  if (status === "success" || status === "idle") {
    return null;
  }

  if (status === "loading") {
    return (
      <div className="text-muted-foreground text-sm">
        Setting up your account...
      </div>
    );
  }

  return <div className="text-red-500 text-sm">{message}</div>;
};
