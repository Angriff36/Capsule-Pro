import { UsersClient } from "./users-client";

const DevConsoleUsersPage = () => (
  <div className="dev-console-stack">
    <header className="dev-console-header">
      <div>
        <p className="dev-console-breadcrumb">Developers / Directory</p>
        <h1 className="dev-console-title">Users</h1>
      </div>
    </header>

    <UsersClient />
  </div>
);

export default DevConsoleUsersPage;
