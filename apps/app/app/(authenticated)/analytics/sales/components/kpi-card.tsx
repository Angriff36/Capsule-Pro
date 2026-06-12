import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";

interface KpiCardProps {
  label: string;
  subtext?: string;
  value: string;
}

function KpiCard({ label, value, subtext }: KpiCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {subtext ? (
        <CardContent>
          <p className="text-muted-foreground text-xs">{subtext}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export type { KpiCardProps };
export { KpiCard };
