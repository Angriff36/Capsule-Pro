import { redirect } from "next/navigation";

export default function StaffingPage() {
  redirect("/staffing/recommendations");
}

export const metadata = {
  title: "Staffing",
  description: "Staffing recommendations and management",
};
