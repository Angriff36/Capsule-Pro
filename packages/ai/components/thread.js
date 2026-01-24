import { twMerge } from "tailwind-merge";
export const Thread = ({ children, className, ...props }) => (
  <div
    className={twMerge(
      "flex flex-1 flex-col items-start gap-4 overflow-y-auto p-8 pb-0",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
