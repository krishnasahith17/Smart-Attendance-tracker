import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarRange,
  Target,
  Sparkles,
  Plus,
  Trash2,
  Moon,
  LogOut,
  Palmtree,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAttendance } from "@/hooks/use-stats";
import { useAddHolidays, useDeleteHoliday, useUpdateProfile } from "@/hooks/use-data";
import { HolidayImportDialog } from "@/components/holiday-import-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDatePretty } from "@/lib/attendance";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { loading, profile, holidays } = useAttendance();
  const updateProfile = useUpdateProfile();
  const addHolidays = useAddHolidays();
  const deleteHoliday = useDeleteHoliday();

  const [semesterStart, setSemesterStart] = useState("");
  const [threshold, setThreshold] = useState(75);
  const [importOpen, setImportOpen] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (profile) {
      setSemesterStart(profile.semester_start ?? "");
      setThreshold(profile.global_threshold ?? 75);
    }
  }, [profile]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDark(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function saveProfile() {
    try {
      await updateProfile.mutateAsync({
        semester_start: semesterStart || null,
        global_threshold: threshold,
      });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function addManualHoliday() {
    if (!newHolidayDate) {
      toast.error("Pick a date");
      return;
    }
    try {
      await addHolidays.mutateAsync([
        { holiday_date: newHolidayDate, name: newHolidayName || "Holiday", source: "manual" },
      ]);
      setNewHolidayDate("");
      setNewHolidayName("");
      toast.success("Holiday added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="px-4 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
      </header>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Semester + threshold */}
          <section className="rounded-3xl border bg-card p-5 shadow-card">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <CalendarRange className="h-4 w-4 text-primary" /> Semester start date
                </Label>
                <Input
                  type="date"
                  value={semesterStart}
                  onChange={(e) => setSemesterStart(e.target.value)}
                />
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-primary" /> Global target attendance
                  </Label>
                  <span className="text-lg font-extrabold text-primary">{threshold}%</span>
                </div>
                <Slider
                  value={[threshold]}
                  min={40}
                  max={100}
                  step={1}
                  onValueChange={(v) => setThreshold(v[0])}
                />
              </div>
              <Button className="w-full rounded-xl" onClick={saveProfile} disabled={updateProfile.isPending}>
                Save changes
              </Button>
            </div>
          </section>

          {/* Holidays */}
          <section className="rounded-3xl border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-bold">
                <Palmtree className="h-4 w-4 text-accent" /> Holidays
              </h2>
              <Button variant="outline" size="sm" className="h-8 gap-1 rounded-lg" onClick={() => setImportOpen(true)}>
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Import PDF
              </Button>
            </div>

            <div className="mb-3 flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  className="h-9"
                  placeholder="Holiday"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                />
              </div>
              <Button size="icon" className="h-9 w-9 shrink-0 rounded-lg" onClick={addManualHoliday}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {holidays.length === 0 ? (
              <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
                No holidays yet. Import a calendar or add dates manually.
              </p>
            ) : (
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {holidays.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{h.name ?? "Holiday"}</p>
                      <p className="text-xs text-muted-foreground">{formatDatePretty(h.holiday_date)}</p>
                    </div>
                    {h.source === "ai" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-bold text-primary">
                        AI
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-danger"
                      onClick={() => deleteHoliday.mutate(h.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Attendance start cut-off */}
          <section className="rounded-3xl border bg-card p-5 shadow-card">
            <h2 className="mb-1 flex items-center gap-1.5 font-bold">
              <Eraser className="h-4 w-4 text-danger" /> Attendance cut-off
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              If your college only counts attendance from a certain date, clear everything marked
              before it.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Count attendance from</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={cutoffDate}
                  onChange={(e) => setCutoffDate(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="shift-start" className="text-xs font-medium">
                  Also move semester start to this date
                </Label>
                <Switch id="shift-start" checked={shiftStart} onCheckedChange={setShiftStart} />
              </div>
              <Button
                variant="outline"
                className="w-full rounded-xl text-danger hover:text-danger"
                disabled={!cutoffDate || deleteBefore.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                Clear attendance before this date
              </Button>
            </div>
          </section>


          {/* Appearance */}
          <section className="rounded-3xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-toggle" className="flex items-center gap-1.5 font-medium">
                <Moon className="h-4 w-4 text-primary" /> Dark mode
              </Label>
              <Switch id="dark-toggle" checked={dark} onCheckedChange={toggleDark} />
            </div>
          </section>

          <Button
            variant="outline"
            className="w-full gap-2 rounded-2xl text-danger hover:text-danger"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>

          <p className="pb-2 text-center text-xs text-muted-foreground">
            {profile?.email}
          </p>
        </div>
      )}

      <HolidayImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
