/**
 * @module ChartOfAccountsPage
 * @intent Server component for Chart of Accounts management page
 * @responsibility Render the Chart of Accounts client component
 * @domain Accounting
 * @tags chart-of-accounts, page, accounting
 * @canonical true
 */

import { ChartOfAccountsClient } from "./chart-of-accounts-client";

const ChartOfAccountsPage = () => <ChartOfAccountsClient />;

export default ChartOfAccountsPage;
