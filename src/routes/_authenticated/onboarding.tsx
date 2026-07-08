import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  GraduationCap,
  CalendarRange,
  Target,
  Sparkles,
  Plus,
  BookOpen,
  Palmtree,
  Check,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAttendance } from "@/hooks/use-stats";
import { useUpdateProfile } from "@/hooks/use-data";
import { CourseFormDialog } from "@/components/course-form-dialog";
import { TimetableImportDialog } from "@/components/timetable-import-dialog";
import { HolidayImportDialog } from "@/components/holiday-import-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { COURSE_COLORS, dayName, formatTime, todayStr } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding;
});

function Onboarding() {
  const navigate = useNavigate();
  const { profile, courses, slots, holidays } = useAttendance();
  const updateProfile = useUpdateProfile();

  const [step, setStep] = useState(1);
  const [semesterStart, setSemesterStart] = useState("");
  const [threshold, setThreshold] = useState(75);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [holidayImportOpen, setHolidayImportOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.semester_start) setSemesterStart(profile.semester_start);
      if (profile.global_threshold) setThreshold(profile.global_threshold);
      if (profile.onboarding_complete) navigate({ to: "/dashboard" });
    }
  }, [profile, navigate]);

  async function goToStep2() {
    if (!semesterStart) {
      toast.error("Pick your semester start date");
      return;
    }
    if (semesterStart > todayStr()) {
      toast.error("Start date can't be in the future");
      return;
    }
    try {
      await updateProfile.mutateAsync({ semester_start: semesterStart, global_threshold: threshold });
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function finish() {
    setFinishing(true);
    try {
      await updateProfile.mutateAsync({
        semester_start: semesterStart,
        global_threshold: threshold,
        onboarding_complete: true,
      });
      toast.success("You're all set!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not finish setup");
      setFinishing(false);
    }
  }

  return (
    <div className="px-4 pt-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-hero-gradient shadow-glow">
          <GraduationCap className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step {step} of 3</p>
          <h1 className="text-xl font-extrabold leading-tight">Let's set up your semester</h1>
        </div>
      </div>

      <div className="mb-6 flex gap-1.5">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", s <= step ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="animate-slide-up space-y-4">
          <section className="rounded-3xl border bg-card p-5 shadow-card">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <CalendarRange className="h-4 w-4 text-primary" /> When did the semester start?
              </Label>
              <Input type="date" max={todayStr()} value={semesterStart} onChange={(e) => setSemesterStart(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                We count every scheduled class from this date to today.
              </p>
            </div>
          </section>
          <section className="rounded-3xl border bg-card p-5 shadow-card">
            <div className="mb-2.5 flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" /> Target attendance
              </Label>
              <span className="text-lg font-extrabold text-primary">{threshold}%</span>
            </div>
            <Slider value={[threshold]} min={40} max={100} step={1} onValueChange={(v) => setThreshold(v[0])} />
            <p className="mt-2 text-xs text-muted-foreground">
              Most colleges require 75%. You can override this per course later.
            </p>
          </section>
          <Button className="h-12 w-full rounded-2xl text-sm font-semibold" onClick={goToStep2} disabled={updateProfile.isPending}>
            Continue <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="animate-slide-up space-y-4">
          <p className="text-sm text-muted-foreground">
            Add your courses and their weekly class times, or let AI read your timetable screenshot.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto flex-col gap-1.5 rounded-2xl py-4" onClick={() => setImportOpen(true)}>
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold">Import timetable</span>
            </Button>
            <Button className="h-auto flex-col gap-1.5 rounded-2xl py-4" onClick={() => setCourseFormOpen(true)}>
              <Plus className="h-5 w-5" />
              <span className="text-xs font-semibold">Add manually</span>
            </Button>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card p-8 text-center">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No courses added yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {courses.map((course) => {
                const courseSlots = slots.filter((s) => s.course_id === course.id);
                return (
                  <div key={course.id} className="rounded-2xl border bg-card p-3.5 shadow-card">
                    <div className="flex items-center gap-2.5">
                      <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: COURSE_COLORS[course.color] }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{course.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {courseSlots.map((s) => (
                            <span key={s.id} className="rounded bg-muted px-1.5 py-0.5 text-[0.62rem] text-muted-foreground">
                              {dayName(s.day_of_week)} {formatTime(s.start_time)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="h-12 flex-1 rounded-2xl" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              className="h-12 flex-[2] rounded-2xl font-semibold"
              onClick={() => setStep(3)}
              disabled={courses.length === 0}
            >
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-slide-up space-y-4">
          <section className="rounded-3xl border bg-card p-5 shadow-card text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-accent">
              <Palmtree className="h-6 w-6" />
            </div>
            <h2 className="font-bold">Add holidays (optional)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your academic calendar PDF and AI will exclude holidays from your class counts.
            </p>
            <Button variant="outline" className="mt-4 w-full gap-1.5 rounded-xl" onClick={() => setHolidayImportOpen(true)}>
              <Sparkles className="h-4 w-4 text-primary" /> Import calendar PDF
            </Button>
            {holidays.length > 0 && (
              <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/12 px-3 py-1 text-xs font-semibold text-success">
                <Check className="h-3.5 w-3.5" /> {holidays.length} holiday day(s) added
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">You can always do this later in Settings.</p>
          </section>

          <div className="flex gap-2">
            <Button variant="outline" className="h-12 flex-1 rounded-2xl" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button className="h-12 flex-[2] rounded-2xl font-semibold" onClick={finish} disabled={finishing}>
              {finishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finish setup
            </Button>
          </div>
        </div>
      )}

      <CourseFormDialog open={courseFormOpen} onOpenChange={setCourseFormOpen} />
      <TimetableImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <HolidayImportDialog open={holidayImportOpen} onOpenChange={setHolidayImportOpen} />
    </div>
  );
}
