/**
 * Helper functions for time-off formatting and calculations
 */

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function calculateDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days > 0) {
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    return `${days} day${days !== 1 ? "s" : ""}${hours > 0 ? ` ${hours}h` : ""}`;
  }
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours > 0) {
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
  const minutes = Math.floor(diffMs / (1000 * 60));
  return `${minutes}m`;
}
