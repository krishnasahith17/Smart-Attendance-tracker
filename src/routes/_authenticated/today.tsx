import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useAttendance } from "@/hooks/use-stats";
import { useMarkAttendance } from "@/hooks/use-data";
import { StatusButtons } from "@/components/status-buttons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  COURSE_COLORS,
  formatTime,
  todayStr,
  weekdayOf,
  dayName,
  type AttendanceStatus,
} from "@/lib/attendance";

export const Route = createFileRoute("/_authenticated/today")({
  component: TodayPage,
});

function TodayPage() {
  const { loading, occByCourse, courses, holidaySet, semesterStart } = useAttendance();
  const mark = useMarkAttendance();
  const today = todayStr();
  const isHolidayToday = holidaySet.has(today);

  const todayItems = courses
    .flatMap((c) =>
      (occByCourse.get(c.id) ?? [])
        .filter((o) => o.date === today)
        .map((o) => ({ occ: o, course: c })),
    )
    .sort((a, b) => a.occ.startTime.localeCompare(b.occ.startTime));

  async function handleMark(
    courseId: string,
    slotId: string,
    status: AttendanceStatus | "pending",
  ) {
    try {
      await mark.mutateAsync({ courseId, slotId, date: today, status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <div className="px-4 pt-6">
      <header className="mb-5">
        <p className="text-sm text-muted-foreground">
          {dayName(weekdayOf(today), true)},{" "}
          {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">Today's classes</h1>
      </header>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
        </div>
      ) : !semesterStart ? (
        <EmptyState
          title="Finish setup first"
          body="Set your semester start date and add courses to see today's classes."
          cta
        />
      ) : isHolidayToday ? (
        <div className="rounded-3xl border bg-card p-8 text-center shadow-card">
          <PartyPopper className="mx-auto mb-3 h-10 w-10 text-accent" />
          <h3 className="font-bold">It's a holiday!</h3>
          <p className="mt-1 text-sm text-muted-foreground">No classes are scheduled today. Enjoy the break.</p>
        </div>
      ) : todayItems.length === 0 ? (
        <EmptyState
          title="No classes today"
          body="Nothing scheduled for today. Check the History tab to mark past classes."
        />
      ) : (
        <div className="space-y-3">
          {todayItems.map(({ occ, course }) => (
            <div key={occ.slotId} className="rounded-3xl border bg-card p-4 shadow-card animate-slide-up">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="h-9 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COURSE_COLORS[course.color] }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{course.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(occ.startTime)} – {formatTime(occ.endTime)}
                  </p>
                </div>
              </div>
              <StatusButtons
                status={occ.status}
                onChange={(s) => handleMark(course.id, occ.slotId, s)}
                disabled={mark.isPending}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta?: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed bg-card p-8 text-center">
      <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {cta && (
        <Button asChild className="mt-4 rounded-xl">
          <Link to="/onboarding">Set up now</Link>
        </Button>
      )}
    </div>
  );
}
