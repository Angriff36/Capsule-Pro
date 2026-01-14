import { BellIcon, HelpCircleIcon } from "lucide-react";

export const DevConsoleTopbar = () => (
  <div className="dev-console-topbar">
    <div className="dev-console-topbar-title">Platform / Overview</div>
    <div className="dev-console-topbar-actions">
      <button className="dev-console-icon-button" type="button">
        <BellIcon className="h-4 w-4" />
      </button>
      <button className="dev-console-icon-button" type="button">
        <HelpCircleIcon className="h-4 w-4" />
      </button>
    </div>
  </div>
);
