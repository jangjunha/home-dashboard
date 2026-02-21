import { Hono } from "hono";
import { createContext } from "hono/jsx";
import { getAllWeather, Weather } from "./components/weather";
import { BusInfo, fetchAllBusArrivals } from "./components/bus";
import { Layout } from "./components/layout";
import { FamilyCalendar } from "./components/calendar";
import { getAllCalendarEvents } from "./networking/googleCalendar";
import { loadSettings } from "./settings";

const settings = loadSettings();
const app = new Hono();

export const SettingsContext = createContext(settings);

const routes = app.get("/", async (c) => {
  const [busData, weatherInfo, calendarData] = await Promise.all([
    fetchAllBusArrivals(settings.busStations),
    getAllWeather(settings.locations).catch((error) => {
      console.error("날씨 정보 조회 실패:", error);
      return null;
    }),
    getAllCalendarEvents(settings.calendars).catch((error) => {
      console.error("캘린더 정보 조회 실패:", error);
      return { todayEvents: [], upcomingEvents: [] };
    }),
  ]);
  return c.html(
    <SettingsContext.Provider value={settings}>
      <Layout>
        <div class="w-[1080px] h-[1920px] mx-auto flex flex-col">
          <section id="clock-root" class="text-center py-8" />
          <Weather weatherInfo={weatherInfo} />
          <BusInfo arrivals={busData.arrivals} fetchedAt={busData.fetchedAt} />
          <FamilyCalendar
            todayEvents={calendarData.todayEvents}
            upcomingEvents={calendarData.upcomingEvents}
          />
        </div>
      </Layout>
    </SettingsContext.Provider>,
  );
});
export type AppType = typeof routes;

export default app;
