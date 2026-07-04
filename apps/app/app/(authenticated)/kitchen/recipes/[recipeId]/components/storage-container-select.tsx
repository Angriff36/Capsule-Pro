"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  dishClearDefaultContainer,
  dishUpdate,
  listContainers,
} from "@/app/lib/manifest-client.generated";

// Storage lives on the dish (Dish.defaultContainerId), not the recipe — this
// select dispatches the governed Dish.update / Dish.clearDefaultContainer
// commands, then refreshes the server-rendered page.

const NONE_VALUE = "__none__";

interface ContainerOption {
  containerType: string;
  id: string;
  name: string;
}

export function StorageContainerSelect({
  currentContainerId,
  currentContainerName,
  dishId,
}: {
  currentContainerId: string | null;
  currentContainerName: string | null;
  dishId: string;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<ContainerOption[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listContainers()
      .then((res) => {
        if (cancelled) {
          return;
        }
        setOptions(
          res.data
            .filter((c) => c.isActive !== false)
            .map((c) => ({
              containerType: c.containerType,
              id: c.id,
              name: c.name,
            }))
        );
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Failed to load storage containers");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the current assignment visible even if it is inactive or missing
  // from the list response.
  const items =
    currentContainerId && !options.some((o) => o.id === currentContainerId)
      ? [
          {
            containerType: "",
            id: currentContainerId,
            name: currentContainerName ?? "Current container",
          },
          ...options,
        ]
      : options;

  const handleChange = (value: string) => {
    const next = value === NONE_VALUE ? null : value;
    if (next === (currentContainerId ?? null)) {
      return;
    }
    setPending(true);
    const run = next
      ? dishUpdate({ defaultContainerId: next, id: dishId })
      : dishClearDefaultContainer({ id: dishId });
    run
      .then(() => router.refresh())
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update storage container"
        )
      )
      .finally(() => setPending(false));
  };

  return (
    <Select
      disabled={pending}
      onValueChange={handleChange}
      value={currentContainerId ?? NONE_VALUE}
    >
      <SelectTrigger
        aria-label="Storage container"
        className="h-8 w-full text-[13px]"
      >
        <SelectValue placeholder="Choose a container" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>None</SelectItem>
        {items.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
            {o.containerType ? ` · ${o.containerType}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
