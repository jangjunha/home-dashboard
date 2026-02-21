import { calendar } from "@googleapis/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { JWT } from "google-auth-library";
import { Calendars } from "../settings";

const SEOUL_TZ = "Asia/Seoul";

// ─── Timezone helpers ─────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" in Seoul timezone */
function getSeoulDateStr(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Returns "HH:mm" in Seoul timezone (24-hour) */
function formatSeoulTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatKoreanDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, "d일 EEEE", { locale: ko });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function createCalendarClient() {
  const keysEnvVar = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!keysEnvVar) {
    throw new Error("The $CREDS environment variable was not found!");
  }
  const keys = JSON.parse(keysEnvVar);

  // create a JWT client
  const auth = new JWT({
    email: keys.client_email,
    key: keys.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  return calendar({ version: "v3", auth });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  /** "오늘" for today, "M/D (요)" for future */
  dateLabel: string;
  /** "HH:mm" for timed events, null for all-day */
  timeLabel: string | null;
  calendarId: string;
  sortKey: number;
  /** End timestamp in ms. null for all-day events (no specific end time) */
  endSortKey: number | null;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchEvents(
  cal: ReturnType<typeof createCalendarClient>,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  const res = await cal.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 30,
  });

  const todayStr = getSeoulDateStr(new Date());

  const events: CalendarEvent[] = [];

  for (const item of res.data.items ?? []) {
    if (item.status === "cancelled") continue;

    const isAllDay = !item.start?.dateTime;

    if (isAllDay) {
      const dateStr = item.start?.date;
      if (!dateStr) continue;
      const [y, m, d] = dateStr.split("-").map(Number);
      events.push({
        id: item.id ?? dateStr,
        title: item.summary ?? "(제목 없음)",
        dateLabel: dateStr === todayStr ? "오늘" : formatKoreanDate(dateStr),
        timeLabel: null,
        calendarId,
        sortKey: Date.UTC(y!, m! - 1, d!),
        endSortKey: null,
      });
    } else {
      const startDate = new Date(item.start!.dateTime!);
      const endDate = new Date(item.end!.dateTime!);
      const eventDateStr = getSeoulDateStr(startDate);
      events.push({
        id: item.id ?? item.start!.dateTime!,
        title: item.summary ?? "(제목 없음)",
        dateLabel: eventDateStr === todayStr ? "오늘" : formatKoreanDate(eventDateStr),
        timeLabel: formatSeoulTime(startDate),
        calendarId,
        sortKey: startDate.getTime(),
        endSortKey: endDate.getTime(),
      });
    }
  }

  return events;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAllCalendarEvents(calendars: Calendars): Promise<{
  todayEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
}> {
  if (calendars.length === 0) {
    return { todayEvents: [], upcomingEvents: [] };
  }

  const todayStr = getSeoulDateStr(new Date());
  const timeMin = new Date(`${todayStr}T00:00:00+09:00`);
  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + 7);

  const cal = createCalendarClient();

  const allEvents = (
    await Promise.all(
      calendars.map((config) =>
        fetchEvents(cal, config.id, timeMin, timeMax).catch((e) => {
          console.error(`[calendar] error (${config.name}):`, e);
          return [] as CalendarEvent[];
        }),
      ),
    )
  ).flat();

  allEvents.sort((a, b) => a.sortKey - b.sortKey);

  return {
    todayEvents: allEvents.filter((e) => e.dateLabel === "오늘"),
    upcomingEvents: allEvents.filter((e) => e.dateLabel !== "오늘"),
  };
}
