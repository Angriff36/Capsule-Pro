import { Suspense } from "react";
import { TimeOffClient } from "./components/time-off-client";

const TimeOffPage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <span className="text-muted-foreground">Loading time-off requests...</span>
        </div>
      }
    >
      <TimeOffClient />
    </Suspense>
  );
};

export default TimeOffPage;
