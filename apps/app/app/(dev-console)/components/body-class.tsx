"use client";

import { useEffect } from "react";

export const DevConsoleBodyClass = () => {
  useEffect(() => {
    document.body.classList.add("dev-console");
    return () => {
      document.body.classList.remove("dev-console");
    };
  }, []);

  return null;
};
