import { redirect } from "next/navigation";

/** Deprecated — Event-tree boards live at /command-board (legacy route name). */
const ToolsBattleboardsPage = () => {
  redirect("/command-board");
};

export default ToolsBattleboardsPage;
