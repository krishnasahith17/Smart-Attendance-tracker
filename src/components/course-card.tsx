import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, ShieldCheck } from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";
import { LEVEL_STYLES, warningMessage } from "@/lib/warnings";
import { COURSE_COLORS, type CourseStats } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export function CourseCard({ stats }: { stats: CourseStats }) {
  const lvl = LEVEL_STYLES[stats.level];
  const ringColor = COURSE_COLORS[stats.course.color] ?? "var(--primary)";

  return (
    <Link
      to="/course/$courseId"
      params={{ courseId: stats.course.id }}
      className="block rounded-3xl border bg-card p-4 shadow-card transition active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <ProgressRing value={stats.percentage} size={78} strokeWidth={8} color={ringColor}>
          <span className="text-lg font-extrabold leading-none">{Math.round(stats.percentage)}</span>
          <span className="text-[0.6rem] font-medium text-muted-foreground">percent</span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold">{stats.course.name}</h3>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {stats.attended}/{stats.held} attended
            {stats.pending > 0 && ` · ${stats.pending} pending`}
          </p>
          <div
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold",
              lvl.bg,
              lvl.text,
            )}
          >
            {stats.level === "danger" ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <ShieldCheck className="h-3 w-3" />
            )}
            {lvl.label}
          </div>
        </div>

        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>

      <p className={cn("mt-3 rounded-xl px-3 py-2 text-xs font-medium", lvl.bg, lvl.text)}>
        {warningMessage(stats)}
      </p>
    </Link>
  );
}
