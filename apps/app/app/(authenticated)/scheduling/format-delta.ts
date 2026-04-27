const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const formatDelta = (current: number, previous: number) => {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) {
    return c > 0 ? "+100%" : "0%";
  }
  const delta = (c - p) / p;
  if (!Number.isFinite(delta)) return "0%";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${percentFormatter.format(delta)}`;
};
