import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, X, Ban, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAttendance } from "@/hooks/use-stats";
import { useMarkAttendance } from "@/hooks/use-data";
import { ProgressRing } from "@/components/progress-ring";
import { StatusButtons } from "@/components/status-buttons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LEVEL_STYLES, warningMessage } from "@/lib/warnings";
import { COURSE_COLORS, formatDatePretty, formatTime, type AttendanceStatus, type Occurrence } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/course/$courseId")({
  component: CourseDetail,
});

function CourseDetail() {
  const { courseId } = useParams({ from: "/_authenticated/course/$courseId" });
  const navigate = useNavigate();
  const { loading, statsByCourse, occByCourse } = useAttendance();
  const mark = useMarkAttendance();

  const stats = statsByCourse.get(courseId);
  const occs = (occByCourse.get(courseId) ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));

  async function handleMark(o: Occurrence, status: AttendanceStatus | "pending") {
    try {
      await mark.mutateAsync({ courseId: o.courseId, slotId: o.slotId, date: o.date, status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 px-4 pt-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="px-4 pt-6">
        <Button variant="ghost" className="mb-4 gap-1 pl-1" onClick={() => navigate({ to: "/dashboard" })}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="text-sm text-muted-foreground">Course not found.</p>
      </div>
    );
  }

  const lvl = LEVEL_STYLES[stats.level];
  const ringColor = COURSE_COLORS[stats.course.color] ?? "var(--primary)";

  return (
    <div className="px-4 pt-6">
      <Button variant="ghost" className="mb-3 gap-1 pl-1" onClick={() => navigate({ to: "/dashboard" })}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{stats.course.name}</h1>

      <section className="mb-4 rounded-3xl border bg-card p-5 shadow-card">
        <div className="flex items-center gap-5">
          <ProgressRing value={stats.percentage} size={108} strokeWidth={10} color={ringColor}>
            <span className="text-2xl font-extrabold leading-none">{Math.round(stats.percentage)}%</span>
            <span className="text-[0.6rem] text-muted-foreground">target {stats.threshold}%</span>
          </ProgressRing>
          <div className="grid flex-1 grid-cols-2 gap-2">
            <Stat icon={Check} label="Attended" value={stats.attended} tone="text-success" />
            <Stat icon={X} label="Missed" value={stats.missed} tone="text-danger" />
            <Stat icon={Clock} label="Pending" value={stats.pending} tone="text-muted-foreground" />
            <Stat icon={Ban} label="Cancelled" value={stats.cancelled} tone="text-muted-foreground" />
          </div>
        </div>
        <p className={cn("mt-4 rounded-xl px-3 py-2.5 text-sm font-medium", lvl.bg, lvl.text)}>
          {warningMessage(stats)}
        </p>
      </section>

      <h2 className="mb-2.5 px-1 text-sm font-bold text-muted-foreground">CLASS HISTORY</h2>
      {occs.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          No classes scheduled yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {occs.map((o) => (
            <div key={`${o.slotId}-${o.date}`} className="rounded-2xl border bg-card p-3.5 shadow-card">
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{formatDatePretty(o.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(o.startTime)} – {formatTime(o.endTime)}
                  </p>
                </div>
              </div>
              <StatusButtons status={o.status} onChange={(s) => handleMark(o, s)} disabled={mark.isPending} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Check;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/50 px-3 py-2">
      <div className={cn("flex items-center gap-1 text-xs font-medium", tone)}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-0.5 text-xl font-extrabold">{value}</div>
    </div>
  );
}
