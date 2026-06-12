import { Suspense } from "react";
import { AvailabilityClient } from "./components/availability-client";

const SchedulingAvailabilityPage = () => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center p-12">
        <span className="text-muted-foreground">Loading availability...</span>
      </div>
    }
  >
    <AvailabilityClient />
  </Suspense>
);

export default SchedulingAvailabilityPage;
