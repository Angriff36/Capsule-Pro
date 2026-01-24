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
type TaskCardProps = {
  task: TaskWithRelations;
  currentUserId?: string | null;
  compact?: boolean;
};
export declare function TaskCard({
  task,
  currentUserId,
  compact,
}: TaskCardProps): import("react").JSX.Element;
//# sourceMappingURL=task-card.d.ts.map
