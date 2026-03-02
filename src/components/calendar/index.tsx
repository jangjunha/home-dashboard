import { FC, useContext } from "hono/jsx";
import type { CalendarEvent } from "../../networking/googleCalendar";
import { twMerge } from "tailwind-merge";
import { SettingsContext } from "../..";

interface Props {
  todayEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
}

export const FamilyCalendar: FC<Props> = ({ todayEvents, upcomingEvents }) => {
  return (
    <section class="py-6 px-6 flex-1">
      {/* 오늘 */}
      <div class="mb-6">
        <h3 class="text-sm text-neutral-300 uppercase tracking-wider mb-3">오늘</h3>
        {todayEvents.length > 0 ? (
          <div class="space-y-2">
            {todayEvents.map((event) => (
              <EventRow key={event.id} event={event} showDate={false} />
            ))}
          </div>
        ) : (
          <div class="text-neutral-500 text-center py-4">오늘 일정이 없습니다</div>
        )}
      </div>

      {/* 이번 주 */}
      <div>
        <h3 class="text-sm text-neutral-300 uppercase tracking-wider mb-3">이번 주</h3>
        {upcomingEvents.length > 0 ? (
          <div class="space-y-2">
            {upcomingEvents.slice(0, 8).map((event) => (
              <EventRow key={event.id} event={event} showDate={true} />
            ))}
          </div>
        ) : (
          <div class="text-neutral-500 text-center py-4">이번 주 일정이 없습니다</div>
        )}
      </div>
    </section>
  );
};

const EventRow: FC<{ event: CalendarEvent; showDate: boolean }> = ({ event, showDate }) => {
  const settings = useContext(SettingsContext);

  const now = Date.now();
  const isOngoing = event.endSortKey !== null && event.sortKey <= now && now < event.endSortKey;
  const isPast = event.endSortKey !== null && event.endSortKey <= now;

  const subtitle = [showDate ? event.dateLabel : null, event.timeLabel].filter(Boolean).join(" · ");

  return (
    <div
      class={twMerge(
        "flex items-center gap-3 rounded-lg p-3 transition-opacity",
        showDate ? "bg-neutral-800/50" : "bg-neutral-800",
        isOngoing && "bg-neutral-700 ring-1 ring-white/10",
        isPast && "opacity-40",
      )}
    >
      <div
        class={twMerge(
          "w-1 rounded-full flex-shrink-0",
          isOngoing ? "h-10" : "h-10",
          settings.calendars.find((c) => c.id === event.calendarId)?.style?.bg,
        )}
      />
      <div class="flex-1 min-w-0">
        <div class="font-medium truncate">
          <span
            class={twMerge(settings.calendars.find((c) => c.id === event.calendarId)?.style?.text)}
          >
            {settings.calendars.find((c) => c.id === event.calendarId)?.name}
          </span>{" "}
          {event.title}
        </div>
        <div class="text-sm text-neutral-400">
          {subtitle}
          {isOngoing && <span class="ml-2 text-xs text-white/60 font-medium">진행 중</span>}
        </div>
      </div>
    </div>
  );
};
