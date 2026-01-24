Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommandBoardRootPage;
const navigation_1 = require("next/navigation");
// Redirect root command-board route to a default board
// In the future, this could show a list of boards or create a new one
async function CommandBoardRootPage() {
  // For now, redirect to a default board ID
  // You can change this to show a list of boards instead
  (0, navigation_1.redirect)("/command-board/default");
}
