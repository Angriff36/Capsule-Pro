import { redirect } from "next/navigation";

// NOTE: This redirect is a fallback. The primary redirect is in next.config.ts
// which fires at the edge before layout rendering (avoids Clerk currentUser() delay).
const StaffAvailabilityPage = () => {
  redirect("/scheduling/availability");
};

export default StaffAvailabilityPage;
