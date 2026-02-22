"use client";

import { useEffect, useState } from "react";
import { syncCurrentUser } from "../actions";

export const AutoRegisterStaff = () => {
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
      <div className="text-sm text-muted-foreground">
        Setting up your account...
      </div>
    );
  }

  return <div className="text-sm text-red-500">{message}</div>;
};
