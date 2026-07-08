import { Check, X, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/attendance";

interface Props {
  status: AttendanceStatus | "pending";
  onChange: (status: AttendanceStatus | "pending") => void;
  disabled?: boolean;
}

const OPTIONS: {
  key: AttendanceStatus;
  label: string;
  icon: typeof Check;
  active: string;
}[] = [
  { key: "attended", label: "Present", icon: Check, active: "bg-success text-success-foreground border-success" },
  { key: "missed", label: "Absent", icon: X, active: "bg-danger text-danger-foreground border-danger" },
  { key: "holiday", label: "Cancelled", icon: Ban, active: "bg-muted-foreground text-background border-muted-foreground" },
];

export function StatusButtons({ status, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = status === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(isActive ? "pending" : opt.key)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-[0.68rem] font-semibold transition active:scale-95",
              isActive
                ? cn(opt.active, "animate-pop-in")
                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.6} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
