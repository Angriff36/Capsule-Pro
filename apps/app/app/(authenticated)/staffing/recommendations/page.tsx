import { StaffingRecommendationsClient } from "./staffing-recommendations-client";

export default function StaffingRecommendationsPage() {
  return <StaffingRecommendationsClient />;
}

export const metadata = {
  title: "Staffing Recommendations",
  description: "Calculated staffing recommendations for events",
};
