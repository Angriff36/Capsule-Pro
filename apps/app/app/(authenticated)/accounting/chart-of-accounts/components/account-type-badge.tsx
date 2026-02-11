/**
 * @module AccountTypeBadge
 * @intent Display account type with color-coded badge
 * @responsibility Render a styled badge showing account type with appropriate styling
 * @domain Accounting
 * @tags chart-of-accounts, badge, accounting
 * @canonical true
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  type AccountType,
  getAccountTypeColor,
  getAccountTypeLabel,
} from "@/app/lib/use-chart-of-accounts";

interface AccountTypeBadgeProps {
  type: AccountType;
}

export function AccountTypeBadge({ type }: AccountTypeBadgeProps) {
  return (
    <Badge className={getAccountTypeColor(type)} variant="outline">
      {getAccountTypeLabel(type)}
    </Badge>
  );
}
