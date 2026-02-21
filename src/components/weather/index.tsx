import { FC } from "hono/jsx";
import {
  CurrentWeather,
  getCurrentWeather,
  getShortTermForecast,
  ShortTermForecast,
} from "../../networking/villageForecast";
import { getMidTermForecast, WeeklyForecast } from "../../networking/midForecast";
import { AIR_QUALITY_GRADES, AirQualityData, getAirQuality } from "../../networking/airQuality";
import { twMerge } from "tailwind-merge";
import { Locations } from "../../settings";

// 위치별 날씨 데이터
interface WeatherData extends CurrentWeather {
  location: string;
  isPrimary: boolean;
  airQuality: AirQualityData | null;
}

// 우산 알림 정보
interface RainAlertData {
  isCurrentlyRaining: boolean;
  currentHour: number;
  todayFirstRainHour: number | null;
  tomorrowFirstRainHour: number | null;
}

// 전체 날씨 정보
export interface WeatherInfo {
  current: WeatherData[];
  shortTerm: ShortTermForecast[];
  midTerm: WeeklyForecast[];
  rainAlert: RainAlertData | null;
}

// 모든 날씨 정보 조회
export async function getAllWeather(locations: Locations): Promise<WeatherInfo> {
  const primaryLocation = locations[0];

  const [currentResults, shortTerm, midTerm] = await Promise.all([
    Promise.all(
      locations.map(async (loc, index) => {
        try {
          const [weather, airQuality] = await Promise.all([
            getCurrentWeather(loc.weather.nx, loc.weather.ny),
            getAirQuality(loc.airQuality.stationName).catch((error) => {
              console.error(`대기질 조회 실패 (${loc.name}):`, error);
              return null;
            }),
          ]);
          return { ...weather, location: loc.name, isPrimary: index === 0, airQuality };
        } catch (error) {
          console.error(`날씨 조회 실패 (${loc.name}):`, error);
          return null;
        }
      }),
    ),
    getShortTermForecast(primaryLocation.weather.nx, primaryLocation.weather.ny).catch((error) => {
      console.error("단기예보 조회 실패:", error);
      return [];
    }),
    getMidTermForecast().catch((error) => {
      console.error("중기예보 조회 실패:", error);
      return [];
    }),
  ]);

  const current = currentResults.filter((r): r is WeatherData => r !== null);

  const primary = current[0];
  const rainAlert: RainAlertData | null = primary
    ? {
        isCurrentlyRaining: primary.pty !== "0",
        currentHour: primary.currentHour,
        todayFirstRainHour: primary.todayFirstRainHour,
        tomorrowFirstRainHour: primary.tomorrowFirstRainHour,
      }
    : null;

  return { current, shortTerm, midTerm, rainAlert };
}

// 날씨 컴포넌트
export const Weather: FC<{ weatherInfo: WeatherInfo | null }> = ({ weatherInfo }) => {
  if (!weatherInfo || weatherInfo.current.length === 0) {
    return (
      <section class="py-6 px-6 border-b border-neutral-700">
        <h2 class="text-lg text-neutral-400 mb-4">날씨</h2>
        <div class="text-neutral-500 text-center py-4">날씨 정보를 불러올 수 없습니다</div>
      </section>
    );
  }

  const primaryWeather = weatherInfo.current[0];
  const otherLocations = weatherInfo.current.slice(1);
  const condition = primaryWeather
    ? primaryWeather.pty !== "0"
      ? primaryWeather.ptyText
      : primaryWeather.skyText
    : "";

  return (
    <>
      {/* 비 알림 배너 */}
      <RainAlert weatherInfo={weatherInfo} />

      <section class="py-6 px-6 border-b border-neutral-700">
        {primaryWeather && (
          <div class="flex items-center justify-between mb-6">
            {/* 현재 기온 */}
            <div class="flex items-center gap-5">
              <span class="text-7xl">{primaryWeather.emoji}</span>
              <div>
                <div class="flex items-center gap-4">
                  <span class="text-6xl font-light">{primaryWeather.temperature.toFixed()}°</span>
                  {primaryWeather.high !== null && primaryWeather.low !== null && (
                    <div class="flex flex-col items-end text-xl">
                      <div class="text-red-400">{primaryWeather.high}°</div>
                      <div class="text-blue-400">{primaryWeather.low}°</div>
                    </div>
                  )}
                </div>
                <div class="text-neutral-400 mt-1">
                  {primaryWeather.location} · {condition}
                </div>
              </div>
            </div>

            {/* 세부 지표 */}
            <div class="flex gap-8 items-start">
              <WeatherStat label="습도" value={`${primaryWeather.humidity}%`} />
              {primaryWeather.pop !== null && primaryWeather.pop > 0 && (
                <WeatherStat
                  label="강수확률"
                  value={`${primaryWeather.pop}%`}
                  valueClass="text-blue-300"
                />
              )}
              {primaryWeather.airQuality && (
                <>
                  <PmStatItem value={primaryWeather.airQuality.pm10} type="pm10" label="미세먼지" />
                  <PmStatItem
                    value={primaryWeather.airQuality.pm25}
                    type="pm25"
                    label="초미세먼지"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* 주간 예보 (단기 + 중기) */}
        {(weatherInfo.shortTerm.length > 0 || weatherInfo.midTerm.length > 0) && (
          <div class="mb-6">
            <div class="flex gap-2 [&>*]:flex-1">
              {weatherInfo.shortTerm.slice(1).map((forecast) => (
                <ShortTermForecastCard forecast={forecast} />
              ))}
              {weatherInfo.midTerm.map((forecast) => (
                <MidTermForecastCard forecast={forecast} />
              ))}
            </div>
          </div>
        )}

        {/* 다른 지역 날씨 */}
        {otherLocations.length > 0 && (
          <div class="grid grid-cols-2 gap-3">
            {otherLocations.map((weather) => (
              <LocationWeatherCard weather={weather} />
            ))}
          </div>
        )}
      </section>
    </>
  );
};

function formatHour(hour: number): string {
  if (hour === 0) return "자정";
  if (hour < 12) return `오전 ${hour}시`;
  if (hour === 12) return "오후 12시";
  return `오후 ${hour - 12}시`;
}

// 우산 알림 배너
const RainAlert: FC<{ weatherInfo: WeatherInfo }> = ({ weatherInfo }) => {
  const a = weatherInfo.rainAlert;
  if (!a) return null;

  const showTomorrow = a.currentHour >= 18 && a.tomorrowFirstRainHour !== null;
  const showToday = a.todayFirstRainHour !== null;

  if (!a.isCurrentlyRaining && !showToday && !showTomorrow) return null;

  const details: string[] = [];
  if (a.isCurrentlyRaining) details.push("지금 비/눈이 내리고 있어요");
  else if (showToday) details.push(`오늘 ${formatHour(a.todayFirstRainHour!)}경 비 예보`);
  if (showTomorrow) details.push(`내일 ${formatHour(a.tomorrowFirstRainHour!)}경 비 예보`);

  return (
    <div class="bg-blue-600 px-6 py-4 flex items-center justify-center gap-4 rounded-4xl">
      <span class="text-4xl">☔</span>
      <div>
        <div class="font-bold text-lg">우산을 챙기세요!</div>
        <div class="text-blue-100 text-sm">{details.join(" · ")}</div>
      </div>
    </div>
  );
};

// 단기 예보 카드
const ShortTermForecastCard: FC<{ forecast: ShortTermForecast }> = ({ forecast }) => {
  return (
    <div
      class={twMerge(
        "flex flex-col items-center gap-1 px-4 py-3 rounded-lg min-w-[80px]",
        forecast.hasRain ? "bg-blue-900/30" : "bg-neutral-800",
      )}
    >
      <span class="text-sm text-neutral-400">{forecast.dayOfWeek}</span>
      <span class="text-2xl">{forecast.emoji}</span>
      <div class="text-sm">
        {forecast.high !== null && <span class="text-red-400">{Math.round(forecast.high)}°</span>}
        {forecast.high !== null && forecast.low !== null && (
          <span class="text-neutral-500"> / </span>
        )}
        {forecast.low !== null && <span class="text-blue-400">{Math.round(forecast.low)}°</span>}
      </div>
      {forecast.pop > 0 && <span class="text-xs text-blue-300">{forecast.pop}%</span>}
    </div>
  );
};

// 중기 예보 카드
const MidTermForecastCard: FC<{ forecast: WeeklyForecast }> = ({ forecast }) => {
  return (
    <div
      class={twMerge(
        "flex flex-col items-center gap-1 px-4 py-3 rounded-lg min-w-[80px]",
        forecast.hasRain ? "bg-blue-900/30" : "bg-neutral-800",
      )}
    >
      <span class="text-sm text-neutral-400">{forecast.dayOfWeek}</span>
      <span class="text-2xl">{forecast.emoji}</span>
      <div class="text-sm">
        {forecast.high !== null && <span class="text-red-400">{Math.round(forecast.high)}°</span>}
        {forecast.high !== null && forecast.low !== null && (
          <span class="text-neutral-500"> / </span>
        )}
        {forecast.low !== null && <span class="text-blue-400">{Math.round(forecast.low)}°</span>}
      </div>
      {forecast.pop > 0 && <span class="text-xs text-blue-300">{forecast.pop}%</span>}
    </div>
  );
};

// 지역별 날씨 카드 (작은 버전)
const LocationWeatherCard: FC<{ weather: WeatherData }> = ({ weather }) => {
  const condition = weather.pty !== "0" ? weather.ptyText : weather.skyText;

  return (
    <div
      class={twMerge(
        "flex items-center justify-between px-4 py-3 rounded-lg",
        weather.hasRain ? "bg-blue-900/30 border border-blue-700" : "bg-neutral-800",
      )}
    >
      <div class="flex items-center gap-3">
        <span class="text-2xl">{weather.emoji}</span>
        <div>
          <div class="font-medium">{weather.location}</div>
          <div class="text-sm text-neutral-400">{condition}</div>
        </div>
      </div>
      <div class="text-right">
        <div class="flex items-baseline justify-end gap-2">
          <div class="text-xl font-light">{weather.temperature.toFixed()}°</div>
          {weather.high !== null && weather.low !== null && (
            <div class="text-xs text-neutral-500">
              <span class="text-red-400">{weather.high}°</span>
              {"/"}
              <span class="text-blue-400">{weather.low}°</span>
            </div>
          )}
        </div>
        <div class="flex gap-2 text-xs">
          {weather.airQuality && (
            <div class="text-neutral-400">
              먼지 <PmBadge value={weather.airQuality.pm10} type="pm10" />
              {" · "}
              <PmBadge value={weather.airQuality.pm25} type="pm25" />
            </div>
          )}
          {weather.pop !== null && weather.pop > 0 && (
            <div>
              <span class="text-neutral-400">강수</span> {weather.pop}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 라벨+값 형태의 날씨 통계 항목
const WeatherStat: FC<{ label: string; value: string; valueClass?: string }> = ({
  label,
  value,
  valueClass,
}) => (
  <div class="text-center">
    <div class="text-xs text-neutral-500 mb-1">{label}</div>
    <div class={twMerge("text-xl", valueClass ?? "text-white")}>{value}</div>
  </div>
);

// PM 수치를 라벨+등급 형태로 표시 (좋음이면 숨김)
const PmStatItem: FC<{ value: number | null; type: "pm10" | "pm25"; label: string }> = ({
  value,
  type,
  label,
}) => {
  if (value === null) return null;
  const grade = getPmGrade(value, type);
  if (grade === "1") return null;
  const info = AIR_QUALITY_GRADES[grade];
  return (
    <div class="text-center">
      <div class="text-xs text-neutral-500 mb-1">{label}</div>
      <div class={twMerge("text-xl", info.color)}>{info.label}</div>
      <div class="text-xs text-neutral-500 mt-0.5">{value}</div>
    </div>
  );
};

// 수치 기반 PM 등급 판별 (환경부 기준)
// PM10: 좋음 0–30 / 보통 31–80 / 나쁨 81–150 / 매우나쁨 151+
// PM25: 좋음 0–15 / 보통 16–35 / 나쁨 36–75 / 매우나쁨 76+
function getPmGrade(value: number, type: "pm10" | "pm25"): keyof typeof AIR_QUALITY_GRADES {
  if (type === "pm10") {
    if (value <= 30) return "1";
    if (value <= 80) return "2";
    if (value <= 150) return "3";
    return "4";
  } else {
    if (value <= 15) return "1";
    if (value <= 35) return "2";
    if (value <= 75) return "3";
    return "4";
  }
}

const PmBadge: FC<{ value: number | null; type: "pm10" | "pm25" }> = ({ value, type }) => {
  if (value === null) return <span class="text-neutral-500">(unknown)</span>;
  const grade = getPmGrade(value, type);
  const info = AIR_QUALITY_GRADES[grade];
  return <span class={info.color}>{info.label}</span>;
};
