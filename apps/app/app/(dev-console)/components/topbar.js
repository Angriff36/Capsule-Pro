Object.defineProperty(exports, "__esModule", { value: true });
exports.DevConsoleTopbar = void 0;
const lucide_react_1 = require("lucide-react");
const DevConsoleTopbar = () => (
  <div className="dev-console-topbar">
    <div className="dev-console-topbar-title">Platform / Overview</div>
    <div className="dev-console-topbar-actions">
      <button className="dev-console-icon-button" type="button">
        <lucide_react_1.BellIcon className="h-4 w-4" />
      </button>
      <button className="dev-console-icon-button" type="button">
        <lucide_react_1.HelpCircleIcon className="h-4 w-4" />
      </button>
    </div>
  </div>
);
exports.DevConsoleTopbar = DevConsoleTopbar;
