import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Sparkles, TrendingUp } from "lucide-react";
import { useAttendance } from "@/hooks/use-stats";
import { ProgressRing } from "@/components/progress-ring";
import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { loading, stats, overall, courses } = useAttendance();

  return (
    <div className="px-4 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()} 👋</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Your attendance</h1>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      ) : (
        <>
          <section className="relative mb-5 overflow-hidden rounded-3xl bg-hero-gradient p-5 text-primary-foreground shadow-glow">
            <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-5">
              <ProgressRing
                value={overall.percentage}
                size={104}
                strokeWidth={10}
                color="white"
                trackColor="rgba(255,255,255,0.25)"
              >
                <span className="text-2xl font-extrabold leading-none">
                  {Math.round(overall.percentage)}%
                </span>
                <span className="text-[0.6rem] opacity-80">overall</span>
              </ProgressRing>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4" /> Semester summary
                </div>
                <p className="mt-1 text-xs text-primary-foreground/85">
                  {overall.attended} of {overall.held} classes attended
                </p>
                <div className="mt-3 flex gap-2">
                  <div className="rounded-xl bg-white/15 px-2.5 py-1.5">
                    <div className="text-base font-bold leading-none">{overall.safeCourses}</div>
                    <div className="text-[0.6rem] opacity-80">on track</div>
                  </div>
                  <div className="rounded-xl bg-white/15 px-2.5 py-1.5">
                    <div className="text-base font-bold leading-none">{overall.atRiskCourses}</div>
                    <div className="text-[0.6rem] opacity-80">at risk</div>
                  </div>
                  <div className="rounded-xl bg-white/15 px-2.5 py-1.5">
                    <div className="text-base font-bold leading-none">{overall.totalCourses}</div>
                    <div className="text-[0.6rem] opacity-80">courses</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {courses.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-bold">No courses yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your courses or import your timetable to get started.
              </p>
              <Button asChild className="mt-4 rounded-xl">
                <Link to="/courses">
                  <Plus className="mr-1 h-4 w-4" /> Add courses
                </Link>
              </Button>
            </div>
          ) : (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-muted-foreground">COURSES</h2>
              </div>
              {stats.map((s) => (
                <CourseCard key={s.course.id} stats={s} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
