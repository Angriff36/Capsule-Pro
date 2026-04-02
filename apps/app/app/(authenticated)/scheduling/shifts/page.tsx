import { Suspense } from "react";
import { ShiftsClient } from "./components/shifts-client";

const SchedulingShiftsPage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <span className="text-muted-foreground">Loading shifts...</span>
        </div>
      }
    >
      <ShiftsClient />
    </Suspense>
  );
};

export default SchedulingShiftsPage;
