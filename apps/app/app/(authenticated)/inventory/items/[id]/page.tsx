import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { ItemDetailClient } from "./item-detail-client";

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

const ItemDetailPage = async ({ params }: ItemDetailPageProps) => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  const item = await database.inventoryItem.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: { supplier: { select: { id: true, name: true } } },
  });

  if (!item) {
    notFound();
  }

  const quantityOnHand = item.quantityOnHand.toNumber();
  const reorderLevel = item.reorder_level.toNumber();
  const unitCost = item.unitCost.toNumber();
  const parLevel = item.parLevel.toNumber();

  const stockStatus =
    quantityOnHand <= 0
      ? "out_of_stock"
      : quantityOnHand <= reorderLevel
        ? "low_stock"
        : "in_stock";

  const totalValue = quantityOnHand * unitCost;

  const serializedItem = {
    id: item.id,
    item_number: item.item_number,
    name: item.name,
    description: item.description,
    category: item.category,
    unitOfMeasure: item.unitOfMeasure,
    unit_cost: unitCost,
    quantity_on_hand: quantityOnHand,
    par_level: parLevel,
    reorder_level: reorderLevel,
    supplierId: item.supplierId,
    tags: item.tags,
    fsa_status: item.fsa_status,
    fsa_temp_logged: item.fsa_temp_logged,
    fsa_allergen_info: item.fsa_allergen_info,
    fsa_traceable: item.fsa_traceable,
    total_value: totalValue,
    stock_status: stockStatus,
    supplier: item.supplier,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">
              Operations / Inventory / Items / {item.name}
            </MonoLabel>
            <DisplayHeading>{item.name}</DisplayHeading>
            <CommandBandLede>Item #{item.item_number}</CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/20 text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/inventory/items">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Items
              </Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={3}>
            <MetricCell>
              <MetricLabel>Qty on Hand</MetricLabel>
              <MetricValue>{quantityOnHand.toFixed(3)}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Unit Cost</MetricLabel>
              <MetricValue>${unitCost.toFixed(2)}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Total Value</MetricLabel>
              <MetricValue>${totalValue.toFixed(2)}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Par Level</MetricLabel>
              <MetricValue>{parLevel.toFixed(3)}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Reorder Level</MetricLabel>
              <MetricValue>{reorderLevel.toFixed(3)}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Stock Status</MetricLabel>
              <MetricValue>{stockStatus.replace(/_/g, " ")}</MetricValue>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <ItemDetailClient item={serializedItem} />
      </OperationalColumn>
    </PageCanvas>
  );
};

export default ItemDetailPage;
