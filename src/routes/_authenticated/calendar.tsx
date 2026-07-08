import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useAttendance } from "@/hooks/use-stats";
import { useMarkAttendance } from "@/hooks/use-data";
import { StatusButtons } from "@/components/status-buttons";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  COURSE_COLORS,
  formatDatePretty,
  formatTime,
  todayStr,
  type AttendanceStatus,
  type Occurrence,
} from "@/lib/attendance";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: HistoryPage,
});

function HistoryPage() {
  const { loading, allOccurrences, courses, semesterStart } = useAttendance();
  const mark = useMarkAttendance();
  const [pendingOnly, setPendingOnly] = useState(false);
  const today = todayStr();

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const grouped = useMemo(() => {
    const filtered = allOccurrences.filter((o) => (pendingOnly ? o.status === "pending" : true));
    const map = new Map<string, Occurrence[]>();
    for (const o of filtered) {
      const arr = map.get(o.date) ?? [];
      arr.push(o);
      map.set(o.date, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, occs]) => ({
        date,
        occs: occs.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));
  }, [allOccurrences, pendingOnly]);

  async function handleMark(o: Occurrence, status: AttendanceStatus | "pending") {
    try {
      await mark.mutateAsync({ courseId: o.courseId, slotId: o.slotId, date: o.date, status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <div className="px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">Go back and mark any classes you missed.</p>
      </header>

      {!loading && semesterStart && allOccurrences.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
          <Label htmlFor="pending-only" className="text-sm font-medium">
            Show unmarked only
          </Label>
          <Switch id="pending-only" checked={pendingOnly} onCheckedChange={setPendingOnly} />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card p-8 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="font-bold">{pendingOnly ? "All caught up!" : "Nothing to show"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendingOnly
              ? "You've marked every class so far."
              : "Once you set a semester start and add courses, class history appears here."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.date}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <h2 className="text-sm font-bold">{formatDatePretty(group.date)}</h2>
                {group.date === today && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-bold text-primary">
                    TODAY
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {group.occs.map((o) => {
                  const course = courseById.get(o.courseId);
                  return (
                    <div key={`${o.slotId}-${o.date}`} className="rounded-2xl border bg-card p-3.5 shadow-card">
                      <div className="mb-2.5 flex items-center gap-2.5">
                        <span
                          className="h-8 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: COURSE_COLORS[course?.color ?? "indigo"] }}
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold">{course?.name ?? "Course"}</h3>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(o.startTime)} – {formatTime(o.endTime)}
                          </p>
                        </div>
                      </div>
                      <StatusButtons
                        status={o.status}
                        onChange={(s) => handleMark(o, s)}
                        disabled={mark.isPending}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
