import { redirect } from "next/navigation";

/** Deprecated — Command Board lives at /command-board. */
const ToolsBattleboardsPage = () => {
  redirect("/command-board");
};

export default ToolsBattleboardsPage;
