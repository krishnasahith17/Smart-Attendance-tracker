import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Sparkles, Pencil, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAttendance } from "@/hooks/use-stats";
import { useDeleteCourse } from "@/hooks/use-data";
import { CourseFormDialog, type CourseInitial } from "@/components/course-form-dialog";
import { TimetableImportDialog } from "@/components/timetable-import-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { COURSE_COLORS, dayName, formatTime } from "@/lib/attendance";

export const Route = createFileRoute("/_authenticated/courses")({
  component: CoursesPage,
});

function CoursesPage() {
  const { loading, courses, slots } = useAttendance();
  const deleteCourse = useDeleteCourse();
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<CourseInitial | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(courseId: string) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    setEditing({
      id: course.id,
      name: course.name,
      color: course.color,
      threshold: course.threshold,
      slots: slots
        .filter((s) => s.course_id === courseId)
        .map((s) => ({ day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time })),
    });
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteCourse.mutateAsync(deleteId);
      toast.success("Course deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Courses</h1>
        <p className="text-sm text-muted-foreground">Add, edit or import your classes anytime.</p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-auto flex-col gap-1.5 rounded-2xl py-4" onClick={() => setImportOpen(true)}>
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold">AI import</span>
        </Button>
        <Button className="h-auto flex-col gap-1.5 rounded-2xl py-4" onClick={openAdd}>
          <Plus className="h-5 w-5" />
          <span className="text-xs font-semibold">Add manually</span>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card p-8 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="font-bold">No courses yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Import a timetable screenshot or add your first course.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const courseSlots = slots
              .filter((s) => s.course_id === course.id)
              .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
            return (
              <div key={course.id} className="rounded-3xl border bg-card p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 h-9 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COURSE_COLORS[course.color] }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{course.name}</h3>
                    {course.threshold != null && (
                      <p className="text-xs text-muted-foreground">Target {course.threshold}%</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {courseSlots.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No slots</span>
                      ) : (
                        courseSlots.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-lg bg-muted px-2 py-1 text-[0.68rem] font-medium text-muted-foreground"
                          >
                            {dayName(s.day_of_week)} {formatTime(s.start_time)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(course.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-danger"
                      onClick={() => setDeleteId(course.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CourseFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} />
      <TimetableImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the course, its slots and all its attendance records. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-danger text-danger-foreground hover:bg-danger/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
