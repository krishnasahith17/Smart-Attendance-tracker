import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, Sparkles, FileText } from "lucide-react";
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
import { extractHolidays } from "@/lib/ai.functions";
import { useAddHolidays } from "@/hooks/use-data";
import { eachDateInRange } from "@/lib/attendance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReviewRow {
  name: string;
  start_date: string;
  end_date: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function HolidayImportDialog({ open, onOpenChange }: Props) {
  const runExtract = useServerFn(extractHolidays);
  const addHolidays = useAddHolidays();
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
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    setAnalyzing(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const result = await runExtract({ data: { fileDataUrl: dataUrl, filename: file.name } });
      if (!result || result.length === 0) {
        toast.error("No holidays detected. You can add them manually.");
        setAnalyzing(false);
        return;
      }
      setRows(
        result
          .filter((r) => ISO.test(r.start_date))
          .map((r) => ({
            name: r.name ?? "Holiday",
            start_date: r.start_date,
            end_date: ISO.test(r.end_date) ? r.end_date : r.start_date,
          })),
      );
      toast.success(`Found ${result.length} holiday period(s) — review below`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the calendar");
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
      const items: { holiday_date: string; name: string | null; source: string }[] = [];
      const seen = new Set<string>();
      for (const row of rows) {
        if (!ISO.test(row.start_date)) continue;
        const end = ISO.test(row.end_date) && row.end_date >= row.start_date ? row.end_date : row.start_date;
        for (const d of eachDateInRange(row.start_date, end)) {
          if (seen.has(d)) continue;
          seen.add(d);
          items.push({ holiday_date: d, name: row.name || "Holiday", source: "ai" });
        }
      }
      if (items.length === 0) {
        toast.error("No valid dates to save");
        setSaving(false);
        return;
      }
      await addHolidays.mutateAsync(items);
      toast.success(`Added ${items.length} holiday day(s)`);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save holidays");
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
            <Sparkles className="h-5 w-5 text-primary" /> Import holidays
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
                  <p className="text-sm font-medium">Scanning your calendar…</p>
                  <p className="text-xs text-muted-foreground">AI is finding holiday dates</p>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <FileText className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-semibold">Upload the academic calendar PDF</p>
                  <p className="text-xs text-muted-foreground">
                    AI detects all holidays and breaks automatically
                  </p>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onFile} />
          </div>
        ) : (
          <>
            <div className="space-y-2.5 px-5 pb-2">
              <p className="text-xs text-muted-foreground">
                Review the detected holidays. Fix or remove anything wrong before saving.
              </p>
              {rows.map((row, i) => (
                <div key={i} className="rounded-2xl border bg-muted/40 p-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <Input
                      className="h-9 bg-card"
                      value={row.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                      placeholder="Holiday name"
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
                    <Input
                      type="date"
                      className="h-9 bg-card px-2 text-xs"
                      value={row.start_date}
                      onChange={(e) => updateRow(i, { start_date: e.target.value })}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="date"
                      className="h-9 bg-card px-2 text-xs"
                      value={row.end_date}
                      onChange={(e) => updateRow(i, { end_date: e.target.value })}
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
                Save holidays
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
