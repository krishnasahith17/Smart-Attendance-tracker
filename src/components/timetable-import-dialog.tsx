import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, Upload, Sparkles, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractTimetable } from "@/lib/ai.functions";
import { useAddCourse } from "@/hooks/use-data";
import { COLOR_KEYS, dayName } from "@/lib/attendance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReviewRow {
  name: string;
  day: number;
  start_time: string;
  end_time: string;
}

function parseDayName(s: string): number {
  const key = (s || "").trim().toLowerCase().slice(0, 3);
  const map: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };
  return map[key] ?? 1;
}

function normTime(t: string): string {
  if (!t) return "09:00";
  const m = t.match(/(\d{1,2}):(\d{2})/);
  if (!m) return "09:00";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function TimetableImportDialog({ open, onOpenChange }: Props) {
  const runExtract = useServerFn(extractTimetable);
  const addCourse = useAddCourse();
  const fileRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);

  function reset() {
    setRows(null);
    setAnalyzing(false);
    setSaving(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setAnalyzing(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const result = await runExtract({ data: { imageDataUrl: dataUrl } });
      if (!result || result.length === 0) {
        toast.error("No classes found. Try a clearer screenshot.");
        setAnalyzing(false);
        return;
      }
      setRows(
        result.map((r) => ({
          name: r.name ?? "Course",
          day: parseDayName(r.day),
          start_time: normTime(r.start_time),
          end_time: normTime(r.end_time),
        })),
      );
      toast.success(`Found ${result.length} class slots — review below`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read timetable");
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function updateRow(i: number, patch: Partial<ReviewRow>) {
    setRows((r) => (r ? r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) : r));
  }
  function removeRow(i: number) {
    setRows((r) => (r ? r.filter((_, idx) => idx !== i) : r));
  }

  async function save() {
    if (!rows || rows.length === 0) return;
    setSaving(true);
    try {
      // Group rows by course name
      const byName = new Map<string, ReviewRow[]>();
      for (const row of rows) {
        const key = row.name.trim() || "Course";
        const arr = byName.get(key) ?? [];
        arr.push(row);
        byName.set(key, arr);
      }
      let colorIdx = 0;
      for (const [name, courseRows] of byName) {
        await addCourse.mutateAsync({
          name,
          color: COLOR_KEYS[colorIdx % COLOR_KEYS.length],
          threshold: null,
          slots: courseRows.map((r) => ({
            day_of_week: r.day,
            start_time: `${r.start_time}:00`,
            end_time: `${r.end_time}:00`,
          })),
        });
        colorIdx++;
      }
      toast.success(`Imported ${byName.size} course${byName.size === 1 ? "" : "s"}`);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save courses");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-md">
        <DialogHeader className="p-5 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Import timetable
          </DialogTitle>
        </DialogHeader>

        {!rows ? (
          <div className="px-5 pb-5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={analyzing}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed bg-muted/40 p-8 text-center transition hover:bg-muted"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Reading your timetable…</p>
                  <p className="text-xs text-muted-foreground">AI is extracting your classes</p>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-semibold">Upload a timetable screenshot</p>
                  <p className="text-xs text-muted-foreground">
                    AI reads courses, days and times for you
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    <Upload className="h-3.5 w-3.5" /> Choose image
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFile}
            />
          </div>
        ) : (
          <>
            <div className="space-y-2.5 px-5 pb-2">
              <p className="text-xs text-muted-foreground">
                Review and fix anything the AI got wrong before saving.
              </p>
              {rows.map((row, i) => (
                <div key={i} className="rounded-2xl border bg-muted/40 p-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <Input
                      className="h-9 bg-card"
                      value={row.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                      placeholder="Course name"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-danger"
                      onClick={() => removeRow(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={String(row.day)} onValueChange={(v) => updateRow(i, { day: Number(v) })}>
                      <SelectTrigger className="h-9 w-[92px] shrink-0 bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {dayName(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      className="h-9 bg-card px-2"
                      value={row.start_time}
                      onChange={(e) => updateRow(i, { start_time: e.target.value })}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      className="h-9 bg-card px-2"
                      value={row.end_time}
                      onChange={(e) => updateRow(i, { end_time: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="gap-2 p-5 pt-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={reset}>
                Start over
              </Button>
              <Button className="flex-1 rounded-xl" onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save courses
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
