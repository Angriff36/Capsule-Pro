import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";

interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
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
          <p className="text-xs text-muted-foreground">{subtext}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export { KpiCard };
export type { KpiCardProps };
