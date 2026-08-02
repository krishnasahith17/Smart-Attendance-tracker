import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  Holiday,
  Slot,
} from "@/lib/attendance";

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

/* -------------------------------- session ------------------------------- */

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

/* ------------------------------- profile -------------------------------- */

export interface Profile {
  id: string;
  email: string | null;
  semester_start: string | null;
  global_threshold: number;
  onboarding_complete: boolean;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const id = await currentUserId();
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/* ------------------------------- courses -------------------------------- */

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async (): Promise<Course[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Course[];
    },
  });
}

export function useSlots() {
  return useQuery({
    queryKey: ["slots"],
    queryFn: async (): Promise<Slot[]> => {
      const { data, error } = await supabase.from("course_slots").select("*");
      if (error) throw error;
      return data as Slot[];
    },
  });
}

export interface SlotInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface CourseInput {
  name: string;
  color: string;
  threshold: number | null;
  slots: SlotInput[];
}

export function useAddCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CourseInput) => {
      const userId = await currentUserId();
      const { data: course, error } = await supabase
        .from("courses")
        .insert({
          user_id: userId,
          name: input.name,
          color: input.color,
          threshold: input.threshold,
        })
        .select()
        .single();
      if (error) throw error;
      if (input.slots.length > 0) {
        const { error: slotErr } = await supabase.from("course_slots").insert(
          input.slots.map((s) => ({
            user_id: userId,
            course_id: course.id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
          })),
        );
        if (slotErr) throw slotErr;
      }
      return course as Course;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; color: string; threshold: number | null; slots: SlotInput[] }) => {
      const userId = await currentUserId();
      const { error } = await supabase
        .from("courses")
        .update({ name: input.name, color: input.color, threshold: input.threshold })
        .eq("id", input.id);
      if (error) throw error;
      // Replace slots: delete existing then insert new
      const { error: delErr } = await supabase.from("course_slots").delete().eq("course_id", input.id);
      if (delErr) throw delErr;
      if (input.slots.length > 0) {
        const { error: insErr } = await supabase.from("course_slots").insert(
          input.slots.map((s) => ({
            user_id: userId,
            course_id: input.id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
          })),
        );
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
      qc.invalidateQueries({ queryKey: ["records"] });
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
      qc.invalidateQueries({ queryKey: ["records"] });
    },
  });
}

/* ------------------------------- holidays ------------------------------- */

export function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: async (): Promise<Holiday[]> => {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("holiday_date", { ascending: true });
      if (error) throw error;
      return data as Holiday[];
    },
  });
}

export function useAddHolidays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { holiday_date: string; name: string | null; source: string }[]) => {
      const userId = await currentUserId();
      const { error } = await supabase.from("holidays").upsert(
        items.map((i) => ({ ...i, user_id: userId })),
        { onConflict: "user_id,holiday_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      qc.invalidateQueries({ queryKey: ["records"] });
    },
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays"] });
      qc.invalidateQueries({ queryKey: ["records"] });
    },
  });
}

/* ------------------------------- records -------------------------------- */

export function useRecords() {
  return useQuery({
    queryKey: ["records"],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const { data, error } = await supabase.from("attendance_records").select("*");
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      courseId: string;
      slotId: string;
      date: string;
      status: AttendanceStatus | "pending";
    }) => {
      const userId = await currentUserId();
      if (input.status === "pending") {
        const { error } = await supabase
          .from("attendance_records")
          .delete()
          .eq("course_id", input.courseId)
          .eq("slot_id", input.slotId)
          .eq("record_date", input.date);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("attendance_records").upsert(
        {
          user_id: userId,
          course_id: input.courseId,
          slot_id: input.slotId,
          record_date: input.date,
          status: input.status,
        },
        { onConflict: "user_id,course_id,slot_id,record_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["records"] }),
  });
}

/** Delete every attendance record before a given date (exclusive). */
export function useDeleteRecordsBefore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      const { data, error } = await supabase
        .from("attendance_records")
        .delete()
        .lt("record_date", date)
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["records"] }),
  });
}
