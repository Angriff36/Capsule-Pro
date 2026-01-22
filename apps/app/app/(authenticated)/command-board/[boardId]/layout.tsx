import type { ReactNode } from "react";

type CommandBoardLayoutProperties = {
  readonly children: ReactNode;
};

const CommandBoardLayout = ({ children }: CommandBoardLayoutProperties) => (
  <>{children}</>
);

export default CommandBoardLayout;
