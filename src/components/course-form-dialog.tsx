import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { COLOR_KEYS, COURSE_COLORS, dayName } from "@/lib/attendance";
import { useAddCourse, useUpdateCourse, type SlotInput } from "@/hooks/use-data";

export interface CourseInitial {
  id: string;
  name: string;
  color: string;
  threshold: number | null;
  slots: SlotInput[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CourseInitial | null;
}

interface EditableSlot {
  day_of_week: number;
  start_time: string; // HH:MM
  end_time: string;
}

function toHHMM(t: string): string {
  return t.slice(0, 5);
}

export function CourseFormDialog({ open, onOpenChange, initial }: Props) {
  const addCourse = useAddCourse();
  const updateCourse = useUpdateCourse();
  const [name, setName] = useState("");
  const [color, setColor] = useState("indigo");
  const [threshold, setThreshold] = useState("");
  const [slots, setSlots] = useState<EditableSlot[]>([]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setColor(initial.color);
      setThreshold(initial.threshold != null ? String(initial.threshold) : "");
      setSlots(
        initial.slots.map((s) => ({
          day_of_week: s.day_of_week,
          start_time: toHHMM(s.start_time),
          end_time: toHHMM(s.end_time),
        })),
      );
    } else {
      setName("");
      setColor("indigo");
      setThreshold("");
      setSlots([{ day_of_week: 1, start_time: "09:00", end_time: "10:00" }]);
    }
  }, [open, initial]);

  function addSlot() {
    setSlots((s) => [...s, { day_of_week: 1, start_time: "09:00", end_time: "10:00" }]);
  }
  function removeSlot(i: number) {
    setSlots((s) => s.filter((_, idx) => idx !== i));
  }
  function updateSlot(i: number, patch: Partial<EditableSlot>) {
    setSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, ...patch } : slot)));
  }

  const busy = addCourse.isPending || updateCourse.isPending;

  async function save() {
    if (!name.trim()) {
      toast.error("Give the course a name");
      return;
    }
    for (const s of slots) {
      if (s.end_time <= s.start_time) {
        toast.error("Each slot must end after it starts");
        return;
      }
    }
    const th = threshold.trim() === "" ? null : Math.max(1, Math.min(100, Number(threshold)));
    const slotInputs: SlotInput[] = slots.map((s) => ({
      day_of_week: s.day_of_week,
      start_time: `${s.start_time}:00`,
      end_time: `${s.end_time}:00`,
    }));
    try {
      if (initial) {
        await updateCourse.mutateAsync({
          id: initial.id,
          name: name.trim(),
          color,
          threshold: th,
          slots: slotInputs,
        });
        toast.success("Course updated");
      } else {
        await addCourse.mutateAsync({ name: name.trim(), color, threshold: th, slots: slotInputs });
        toast.success("Course added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save course");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-md">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>{initial ? "Edit course" : "Add course"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-5 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="course-name">Course name / code</Label>
            <Input
              id="course-name"
              placeholder="e.g. Digital Design"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  className={cn(
                    "h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition",
                    color === key && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: COURSE_COLORS[key] }}
                  aria-label={key}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="course-threshold">Target attendance % (optional)</Label>
            <Input
              id="course-threshold"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              placeholder="Uses global target if empty"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label>Weekly class slots</Label>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-primary" onClick={addSlot}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {slots.map((slot, i) => (
                <div key={i} className="rounded-2xl border bg-muted/40 p-2.5">
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(slot.day_of_week)}
                      onValueChange={(v) => updateSlot(i, { day_of_week: Number(v) })}
                    >
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
                      value={slot.start_time}
                      onChange={(e) => updateSlot(i, { start_time: e.target.value })}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      className="h-9 bg-card px-2"
                      value={slot.end_time}
                      onChange={(e) => updateSlot(i, { end_time: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-danger"
                      onClick={() => removeSlot(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {slots.length === 0 && (
                <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
                  No slots yet — add at least one weekly class time.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 p-5 pt-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1 rounded-xl" onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initial ? "Save" : "Add course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
