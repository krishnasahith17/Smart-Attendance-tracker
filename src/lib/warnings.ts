import type { CourseStats } from "@/lib/attendance";

export function warningMessage(s: CourseStats): string {
  if (s.held === 0) return "No classes recorded yet — start marking to see your standing.";
  if (s.level === "danger") {
    if (s.needToAttend > 0) {
      return `Below target — attend the next ${s.needToAttend} class${s.needToAttend === 1 ? "" : "es"} to recover to ${s.threshold}%.`;
    }
    return `You're below your ${s.threshold}% target.`;
  }
  if (s.canMiss <= 0) {
    return `Right at the limit — don't miss any more classes to stay at ${s.threshold}%.`;
  }
  return `You can miss ${s.canMiss} more class${s.canMiss === 1 ? "" : "es"} and stay above ${s.threshold}%.`;
}

export const LEVEL_STYLES: Record<
  CourseStats["level"],
  { text: string; bg: string; ring: string; label: string }
> = {
  safe: {
    text: "text-success",
    bg: "bg-success/12",
    ring: "var(--success)",
    label: "On track",
  },
  caution: {
    text: "text-warning",
    bg: "bg-warning/15",
    ring: "var(--warning)",
    label: "Cutting it close",
  },
  danger: {
    text: "text-danger",
    bg: "bg-danger/12",
    ring: "var(--danger)",
    label: "At risk",
  },
};
