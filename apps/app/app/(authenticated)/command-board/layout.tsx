import type { ReactNode } from "react";

interface CommandBoardLayoutProperties {
  readonly children: ReactNode;
}

const CommandBoardLayout = ({ children }: CommandBoardLayoutProperties) => (
  <>{children}</>
);

export default CommandBoardLayout;
