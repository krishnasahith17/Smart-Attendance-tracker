export type AttendanceStatus = "attended" | "missed" | "holiday";

export interface Course {
  id: string;
  name: string;
  threshold: number | null;
  color: string;
}

export interface Slot {
  id: string;
  course_id: string;
  day_of_week: number; // 0 = Sunday ... 6 = Saturday
  start_time: string; // "HH:MM:SS"
  end_time: string;
}

export interface Holiday {
  id: string;
  holiday_date: string; // YYYY-MM-DD
  name: string | null;
  source: string;
}

export interface AttendanceRecord {
  id: string;
  course_id: string;
  slot_id: string | null;
  record_date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface Occurrence {
  courseId: string;
  slotId: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  status: AttendanceStatus | "pending";
}

export interface CourseStats {
  course: Course;
  attended: number;
  missed: number;
  cancelled: number;
  pending: number;
  held: number; // attended + missed
  totalOccurrences: number;
  percentage: number; // 0-100 based on held classes
  threshold: number;
  canMiss: number; // additional consecutive skips allowed while staying >= threshold
  needToAttend: number; // consecutive attends required to recover to threshold
  level: "safe" | "caution" | "danger";
}

/* ----------------------------- date helpers ----------------------------- */

export function todayStr(): string {
  return toDateStr(new Date());
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function weekdayOf(str: string): number {
  return parseDate(str).getDay();
}

export function eachDateInRange(start: string, end: string): string[] {
  const result: string[] = [];
  const s = parseDate(start);
  const e = parseDate(end);
  if (s > e) return result;
  const cur = new Date(s);
  while (cur <= e) {
    result.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function dayName(dow: number, long = false): string {
  return (long ? DAY_NAMES_LONG : DAY_NAMES)[dow] ?? "";
}

export function formatTime(t: string): string {
  // "08:00:00" -> "8:00 AM"
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const m = mStr ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export function formatDatePretty(str: string): string {
  const d = parseDate(str);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/* --------------------------- occurrence engine -------------------------- */

function recordKey(slotId: string, date: string): string {
  return `${slotId}|${date}`;
}

export function buildRecordMap(records: AttendanceRecord[]): Map<string, AttendanceStatus> {
  const map = new Map<string, AttendanceStatus>();
  for (const r of records) {
    if (!r.slot_id) continue;
    map.set(recordKey(r.slot_id, r.record_date), r.status);
  }
  return map;
}

/**
 * Generate every scheduled class occurrence for a set of slots between
 * semesterStart and endDate (inclusive), skipping holidays.
 */
export function generateOccurrences(
  slots: Slot[],
  semesterStart: string,
  endDate: string,
  holidaySet: Set<string>,
  recordMap: Map<string, AttendanceStatus>,
): Occurrence[] {
  if (!semesterStart) return [];
  const dates = eachDateInRange(semesterStart, endDate);
  const occurrences: Occurrence[] = [];
  const slotsByDay = new Map<number, Slot[]>();
  for (const s of slots) {
    const arr = slotsByDay.get(s.day_of_week) ?? [];
    arr.push(s);
    slotsByDay.set(s.day_of_week, arr);
  }
  for (const date of dates) {
    if (holidaySet.has(date)) continue;
    const dow = weekdayOf(date);
    const daySlots = slotsByDay.get(dow);
    if (!daySlots) continue;
    for (const slot of daySlots) {
      const status = recordMap.get(recordKey(slot.id, date)) ?? "pending";
      occurrences.push({
        courseId: slot.course_id,
        slotId: slot.id,
        date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        status,
      });
    }
  }
  return occurrences;
}

/* ---------------------------- stats + threshold ------------------------- */

export function computeCourseStats(
  course: Course,
  occurrences: Occurrence[],
  globalThreshold: number,
): CourseStats {
  const threshold = course.threshold ?? globalThreshold;
  let attended = 0;
  let missed = 0;
  let cancelled = 0;
  let pending = 0;
  for (const o of occurrences) {
    if (o.status === "attended") attended++;
    else if (o.status === "missed") missed++;
    else if (o.status === "holiday") cancelled++;
    else pending++;
  }
  const held = attended + missed;
  const percentage = held > 0 ? (attended / held) * 100 : 100;
  const t = Math.min(threshold, 100) / 100;

  let canMiss = 0;
  let needToAttend = 0;
  if (held === 0) {
    canMiss = 0;
  } else if (percentage / 100 >= t) {
    canMiss = t > 0 ? Math.max(0, Math.floor(attended / t) - held) : 999;
  } else {
    needToAttend = t < 1 ? Math.ceil((t * held - attended) / (1 - t)) : Infinity;
  }

  let level: CourseStats["level"];
  if (held === 0) level = "safe";
  else if (percentage / 100 < t) level = "danger";
  else if (canMiss <= 1) level = "caution";
  else level = "safe";

  return {
    course,
    attended,
    missed,
    cancelled,
    pending,
    held,
    totalOccurrences: occurrences.length,
    percentage: Math.round(percentage * 10) / 10,
    threshold,
    canMiss,
    needToAttend: Number.isFinite(needToAttend) ? needToAttend : 0,
    level,
  };
}

export interface OverallStats {
  attended: number;
  held: number;
  percentage: number;
  safeCourses: number;
  atRiskCourses: number;
  totalCourses: number;
}

export function computeOverall(statsList: CourseStats[]): OverallStats {
  let attended = 0;
  let held = 0;
  let safe = 0;
  let risk = 0;
  for (const s of statsList) {
    attended += s.attended;
    held += s.held;
    if (s.level === "danger" || s.level === "caution") risk++;
    else safe++;
  }
  return {
    attended,
    held,
    percentage: held > 0 ? Math.round((attended / held) * 1000) / 10 : 100,
    safeCourses: safe,
    atRiskCourses: risk,
    totalCourses: statsList.length,
  };
}

/* ------------------------------ color map ------------------------------- */

export const COURSE_COLORS: Record<string, string> = {
  indigo: "oklch(0.48 0.17 276)",
  teal: "oklch(0.66 0.12 192)",
  emerald: "oklch(0.66 0.15 155)",
  amber: "oklch(0.75 0.15 70)",
  rose: "oklch(0.62 0.2 12)",
  violet: "oklch(0.55 0.2 300)",
  sky: "oklch(0.62 0.14 235)",
  orange: "oklch(0.68 0.17 45)",
};

export const COLOR_KEYS = Object.keys(COURSE_COLORS);
