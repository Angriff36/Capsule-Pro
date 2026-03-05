import { Header } from "../../components/header";
import { CustomReportBuilderClient } from "./custom-report-builder-client";

const CustomReportsPage = () => (
  <>
    <Header
      page="Custom Reports"
      pages={[{ label: "Analytics", href: "/analytics" }]}
    />
    <CustomReportBuilderClient />
  </>
);

export default CustomReportsPage;
