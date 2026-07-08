import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

function extractJson(text: string): unknown {
  let cleaned = text.trim();
  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // Find the first JSON array/object bracket
  const firstArr = cleaned.indexOf("[");
  const firstObj = cleaned.indexOf("{");
  let start = -1;
  if (firstArr === -1) start = firstObj;
  else if (firstObj === -1) start = firstArr;
  else start = Math.min(firstArr, firstObj);
  if (start === -1) throw new Error("No JSON found in AI response");
  const openChar = cleaned[start];
  const closeChar = openChar === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(closeChar);
  const jsonStr = cleaned.slice(start, end + 1);
  return JSON.parse(jsonStr);
}

async function callGateway(content: unknown[]): Promise<unknown> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured (missing key).");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue using AI features.");
    console.error(`[AI] Gateway error ${res.status}: ${body}`);
    throw new Error(`AI request failed (${res.status}).`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? "";
  return extractJson(text);
}

export interface ExtractedSlot {
  name: string;
  day: string;
  start_time: string;
  end_time: string;
}

export const extractTimetable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string }) => {
    if (!input?.imageDataUrl || typeof input.imageDataUrl !== "string") {
      throw new Error("An image is required.");
    }
    if (input.imageDataUrl.length > 12_000_000) throw new Error("Image is too large.");
    return input;
  })
  .handler(async ({ data }): Promise<ExtractedSlot[]> => {
    const prompt = `You are reading a college weekly timetable from an image. Extract every class block visible.
For each class, return: the course name/code exactly as written, the day of week, the start time and end time.
Times must be in 24-hour "HH:MM" format. Day must be one of Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
If a course appears in multiple slots, return one object per slot.
Return ONLY a JSON array, no other text, in this exact format:
[{"name":"Digital Design","day":"Monday","start_time":"08:00","end_time":"09:00"}]`;

    const result = await callGateway([
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: data.imageDataUrl } },
    ]);
    if (!Array.isArray(result)) throw new Error("AI returned an unexpected format.");
    return result as ExtractedSlot[];
  });

export interface ExtractedHoliday {
  name: string;
  start_date: string;
  end_date: string;
}

export const extractHolidays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileDataUrl: string; filename?: string }) => {
    if (!input?.fileDataUrl || typeof input.fileDataUrl !== "string") {
      throw new Error("A PDF file is required.");
    }
    if (input.fileDataUrl.length > 16_000_000) throw new Error("PDF is too large.");
    return input;
  })
  .handler(async ({ data }): Promise<ExtractedHoliday[]> => {
    const currentYear = new Date().getFullYear();
    const prompt = `You are reading an official academic calendar PDF. Identify EVERY holiday, vacation, break, and non-instructional day.
For each, return a name and its date range. Single-day holidays should have the same start and end date.
Dates MUST be in "YYYY-MM-DD" format. If the year is not explicit, assume the academic year around ${currentYear}.
Return ONLY a JSON array, no other text, in this exact format:
[{"name":"Diwali Break","start_date":"${currentYear}-11-01","end_date":"${currentYear}-11-05"}]`;

    const result = await callGateway([
      { type: "text", text: prompt },
      {
        type: "file",
        file: { filename: data.filename ?? "calendar.pdf", file_data: data.fileDataUrl },
      },
    ]);
    if (!Array.isArray(result)) throw new Error("AI returned an unexpected format.");
    return result as ExtractedHoliday[];
  });
