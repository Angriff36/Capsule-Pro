import type {
  User as DbUser,
  KitchenTask,
  KitchenTaskClaim,
} from "@repo/database";
type UserSelect = Pick<
  DbUser,
  "id" | "firstName" | "lastName" | "email" | "avatarUrl"
>;
type TaskWithRelations = KitchenTask & {
  claims: Array<
    KitchenTaskClaim & {
      user: UserSelect | null;
    }
  >;
};
type ProductionBoardClientProps = {
  initialTasks: TaskWithRelations[];
  currentUserId?: string | null;
  tenantId?: string;
};
export declare function ProductionBoardClient({
  initialTasks,
  currentUserId,
  tenantId,
}: ProductionBoardClientProps): import("react").JSX.Element;
//# sourceMappingURL=production-board-client.d.ts.map
