import { redirect } from "next/navigation";

// Redirect root command-board route to a default board
// In the future, this could show a list of boards or create a new one
export default async function CommandBoardRootPage() {
  // For now, redirect to a default board ID
  // You can change this to show a list of boards instead
  redirect("/command-board/default");
}
