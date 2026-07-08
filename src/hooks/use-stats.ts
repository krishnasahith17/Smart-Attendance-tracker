import { useMemo } from "react";
import {
  buildRecordMap,
  computeCourseStats,
  computeOverall,
  generateOccurrences,
  todayStr,
  type CourseStats,
  type Occurrence,
} from "@/lib/attendance";
import {
  useCourses,
  useHolidays,
  useProfile,
  useRecords,
  useSlots,
} from "@/hooks/use-data";

export function useAttendance() {
  const profileQ = useProfile();
  const coursesQ = useCourses();
  const slotsQ = useSlots();
  const holidaysQ = useHolidays();
  const recordsQ = useRecords();

  const loading =
    profileQ.isLoading ||
    coursesQ.isLoading ||
    slotsQ.isLoading ||
    holidaysQ.isLoading ||
    recordsQ.isLoading;

  const value = useMemo(() => {
    const profile = profileQ.data ?? null;
    const courses = coursesQ.data ?? [];
    const slots = slotsQ.data ?? [];
    const holidays = holidaysQ.data ?? [];
    const records = recordsQ.data ?? [];

    const semesterStart = profile?.semester_start ?? null;
    const today = todayStr();
    const holidaySet = new Set(holidays.map((h) => h.holiday_date));
    const recordMap = buildRecordMap(records);
    const globalThreshold = profile?.global_threshold ?? 75;

    const statsByCourse = new Map<string, CourseStats>();
    const occByCourse = new Map<string, Occurrence[]>();
    const allOccurrences: Occurrence[] = [];

    for (const course of courses) {
      const courseSlots = slots.filter((s) => s.course_id === course.id);
      const occ = semesterStart
        ? generateOccurrences(courseSlots, semesterStart, today, holidaySet, recordMap)
        : [];
      occByCourse.set(course.id, occ);
      allOccurrences.push(...occ);
      statsByCourse.set(course.id, computeCourseStats(course, occ, globalThreshold));
    }

    const stats = courses.map((c) => statsByCourse.get(c.id)!).filter(Boolean);
    const overall = computeOverall(stats);

    return {
      profile,
      courses,
      slots,
      holidays,
      holidaySet,
      recordMap,
      globalThreshold,
      semesterStart,
      today,
      stats,
      statsByCourse,
      occByCourse,
      allOccurrences,
      overall,
    };
  }, [profileQ.data, coursesQ.data, slotsQ.data, holidaysQ.data, recordsQ.data]);

  return { loading, ...value };
}
