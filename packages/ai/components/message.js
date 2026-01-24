import { Streamdown } from "streamdown";
import { twMerge } from "tailwind-merge";
export const Message = ({ data, markdown }) => (
  <div
    className={twMerge(
      "flex max-w-[80%] flex-col gap-2 rounded-xl px-4 py-2",
      data.role === "user"
        ? "self-end bg-foreground text-background"
        : "self-start bg-muted"
    )}
  >
    <Streamdown {...markdown}>{data.content}</Streamdown>
  </div>
);
