type ClientTableProps = {
  clients: Array<{
    id: string;
    name: string;
    email: string | null;
    lifetimeValue: number;
    orderCount: number;
    lastOrderDate: Date | null;
    averageOrderValue: number;
  }>;
  className?: string;
};
export declare function ClientTable({
  clients,
  className,
}: ClientTableProps): import("react").JSX.Element;
//# sourceMappingURL=client-table.d.ts.map
