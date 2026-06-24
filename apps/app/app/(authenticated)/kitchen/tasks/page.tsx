import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { getKitchenTasks, getMyActiveClaims } from "./actions";
import { KitchenTasksVerdanaView } from "./components/kitchen-tasks-verdana-view";
import { verdanaFontVariables } from "./verdana-fonts";
import "./verdana-health.css";

const KitchenTasksPage = async () => {
  const { orgId, userId: clerkId } = await auth();

  if (!orgId) {
    return notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const currentUser = clerkId
    ? await database.user.findFirst({
        where: {
          tenantId,
          authUserId: clerkId,
        },
      })
    : null;

  const tasks = await getKitchenTasks();
  const myClaims = currentUser ? await getMyActiveClaims(currentUser.id) : [];

  return (
    <>
      <Header page="Kitchen Tasks" pages={["Kitchen Ops"]} />
      <div className={verdanaFontVariables} data-verdana-health>
        <KitchenTasksVerdanaView myClaims={myClaims} tasks={tasks} />
      </div>
    </>
  );
};

export default KitchenTasksPage;
