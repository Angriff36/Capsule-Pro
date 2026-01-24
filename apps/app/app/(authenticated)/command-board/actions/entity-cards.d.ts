import type { CreateCardInput } from "../types";
import type { CardResult } from "./cards";
export type CreateEntityCardInput = CreateCardInput & {
  entityType: "client" | "event" | "task" | "employee" | "inventory";
  entityId: string;
};
export declare function createEntityCard(
  boardId: string,
  input: CreateEntityCardInput
): Promise<CardResult>;
//# sourceMappingURL=entity-cards.d.ts.map
