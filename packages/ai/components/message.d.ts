import type { Message as MessageType } from "ai";
import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";
type MessageProps = {
  data: MessageType;
  markdown?: ComponentProps<typeof Streamdown>;
};
export declare const Message: ({
  data,
  markdown,
}: MessageProps) => import("react").JSX.Element;
//# sourceMappingURL=message.d.ts.map
