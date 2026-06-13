import {
  BookOpen,
  CalendarDays,
  Clock,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { ModuleLanding } from "../components/module-landing";
import "./staff-sanity-theme.css";

const StaffPage = () => (
  <div className="contents" data-design="sanity">
    <ModuleLanding
      eyebrow="Operations / Staff"
      highlights={[
        {
          title: "Team",
          description:
            "Employee roster, roles, certifications, and contact information.",
          href: "/staff/team",
          actionLabel: "View team",
          icon: Users,
        },
        {
          title: "Schedule",
          description:
            "Weekly schedules, shift assignments, and calendar coordination.",
          href: "/staff/schedule",
          actionLabel: "View schedule",
          icon: CalendarDays,
        },
        {
          title: "Performance",
          description:
            "Employee performance metrics, reviews, and development tracking.",
          href: "/staff/performance",
          actionLabel: "View performance",
          icon: TrendingUp,
        },
        {
          title: "Availability",
          description:
            "Staff availability preferences, time-off requests, and blackout dates.",
          href: "/staff/availability",
          actionLabel: "Manage availability",
          icon: Clock,
        },
        {
          title: "My Training",
          description:
            "View and complete your assigned training modules and track progress.",
          href: "/staff/my-training",
          actionLabel: "View my training",
          icon: BookOpen,
        },
        {
          title: "Training Management",
          description:
            "Assign and track training modules, certifications, and compliance.",
          href: "/staff/training",
          actionLabel: "Manage training",
          icon: GraduationCap,
        },
      ]}
      summary="Team management, scheduling, performance, and training — your people operations hub."
      title="Staff"
    />
  </div>
);

export default StaffPage;
