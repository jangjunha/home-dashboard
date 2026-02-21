import * as z from "zod";
import { TZDate } from "@date-fns/tz";
import { format, subHours, addDays, parse } from "date-fns";
import { ko } from "date-fns/locale";

const BASE_URL = new URL("http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/");

// 하늘상태 코드
const SKY_CODES = {
  "1": "맑음",
  "3": "구름많음",
  "4": "흐림",
} as const;

// 강수형태 코드
const PTY_CODES = {
  "0": "없음",
  "1": "비",
  "2": "비/눈",
  "3": "눈",
  "4": "소나기",
  "5": "빗방울",
  "6": "빗방울눈날림",
  "7": "눈날림",
} as const;

// 날씨 아이콘 매핑
export function getWeatherEmoji(sky: string, pty: string): string {
  if (pty !== "0") {
    switch (pty) {
      case "1":
      case "4":
      case "5":
        return "🌧️";
      case "2":
      case "6":
        return "🌨️";
      case "3":
      case "7":
        return "❄️";
    }
  }
  switch (sky) {
    case "1":
      return "☀️";
    case "3":
      return "⛅";
    case "4":
      return "☁️";
    default:
      return "🌤️";
  }
}

// Zod 스키마
const weatherItemSchema = z.object({
  baseDate: z.string(),
  baseTime: z.string(),
  category: z.string(),
  fcstDate: z.string().optional(),
  fcstTime: z.string().optional(),
  fcstValue: z.string().optional(),
  nx: z.number(),
  ny: z.number(),
  obsrValue: z.string().optional(),
});

const weatherResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z
      .object({
        dataType: z.string(),
        items: z.object({
          item: z.array(weatherItemSchema),
        }),
        numOfRows: z.number(),
        pageNo: z.number(),
        totalCount: z.number(),
      })
      .optional(),
  }),
});

type WeatherItem = z.infer<typeof weatherItemSchema>;

// 초단기실황 조회 (현재 날씨)
async function getUltraSrtNcst(nx: number, ny: number): Promise<WeatherItem[]> {
  const now = new TZDate(new Date(), "Asia/Seoul");
  const baseDate = now.getMinutes() < 40 ? subHours(now, 1) : now;

  const url = new URL("./getUltraSrtNcst", BASE_URL);
  url.searchParams.set("serviceKey", process.env.DATA_GO_KR_API_KEY ?? "");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", format(baseDate, "yyyyMMdd"));
  url.searchParams.set("base_time", format(baseDate, "HH") + "00");
  url.searchParams.set("nx", nx.toString());
  url.searchParams.set("ny", ny.toString());

  const response = await fetch(url);
  const data = weatherResponseSchema.parse(await response.json());

  if (data.response.header.resultCode !== "00") {
    throw new Error(`Weather API error: ${data.response.header.resultMsg}`);
  }

  return data.response.body?.items.item ?? [];
}

// 단기예보 조회
async function getVilageFcst(now: TZDate, nx: number, ny: number): Promise<WeatherItem[]> {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const baseTimes = [23, 20, 17, 14, 11, 8, 5, 2];

  let baseHour = 2;
  let baseDate = now;

  for (const bt of baseTimes) {
    if (hours > bt || (hours === bt && minutes >= 10)) {
      baseHour = bt;
      break;
    }
  }

  if (hours < 2 || (hours === 2 && minutes < 10)) {
    baseDate = subHours(now, 24);
    baseHour = 23;
  }

  const url = new URL("./getVilageFcst", BASE_URL);
  url.searchParams.set("serviceKey", process.env.DATA_GO_KR_API_KEY ?? "");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", format(baseDate, "yyyyMMdd"));
  url.searchParams.set("base_time", baseHour.toString().padStart(2, "0") + "00");
  url.searchParams.set("nx", nx.toString());
  url.searchParams.set("ny", ny.toString());
  url.searchParams.set("numOfRows", "1000");

  const response = await fetch(url);
  const data = weatherResponseSchema.parse(await response.json());

  if (data.response.header.resultCode !== "00") {
    throw new Error(`Weather API error: ${data.response.header.resultMsg}`);
  }

  return data.response.body?.items.item ?? [];
}

// 현재 날씨 데이터
export interface CurrentWeather {
  temperature: number;
  humidity: number;
  sky: string;
  skyText: string;
  pty: string;
  ptyText: string;
  emoji: string;
  high: number | null;
  low: number | null;
  pop: number | null;
  hasRain: boolean;
  currentHour: number;
  todayFirstRainHour: number | null; // 오늘 현재 시각 이후 첫 강수 시각
  tomorrowFirstRainHour: number | null; // 내일 첫 강수 시각
}

// 현재 날씨 조회
export async function getCurrentWeather(nx: number, ny: number): Promise<CurrentWeather> {
  const now = new TZDate(new Date(), "Asia/Seoul");

  const [ncstItems, fcstItems] = await Promise.all([
    getUltraSrtNcst(nx, ny),
    getVilageFcst(now, nx, ny),
  ]);

  const ncstMap = new Map(ncstItems.map((item) => [item.category, item.obsrValue ?? "0"]));

  const temperature = Number.parseFloat(ncstMap.get("T1H") ?? "0");
  const humidity = Number.parseFloat(ncstMap.get("REH") ?? "0");
  const sky = ncstMap.get("SKY") ?? "1";
  const pty = ncstMap.get("PTY") ?? "0";

  const today = format(now, "yyyyMMdd");
  const tomorrow = format(addDays(now, 1), "yyyyMMdd");
  const currentHour = now.getHours();

  let high: number | null = null;
  let low: number | null = null;
  let maxPop = 0;
  let hasRain = pty !== "0";
  let todayFirstRainHour: number | null = null;
  let tomorrowFirstRainHour: number | null = null;

  for (const item of fcstItems) {
    if (!item.fcstDate || !item.fcstValue) continue;

    if (item.fcstDate === today) {
      if (item.category === "TMX") high = Number.parseFloat(item.fcstValue);
      if (item.category === "TMN") low = Number.parseFloat(item.fcstValue);
      if (item.category === "POP") {
        const pop = Number.parseFloat(item.fcstValue);
        if (pop > maxPop) maxPop = pop;
      }
      if (item.category === "PTY" && item.fcstValue !== "0") {
        hasRain = true;
        const hour = parseInt(item.fcstTime?.substring(0, 2) ?? "99");
        if (hour >= currentHour && (todayFirstRainHour === null || hour < todayFirstRainHour)) {
          todayFirstRainHour = hour;
        }
      }
    }

    if (item.fcstDate === tomorrow && item.category === "PTY" && item.fcstValue !== "0") {
      const hour = parseInt(item.fcstTime?.substring(0, 2) ?? "99");
      if (tomorrowFirstRainHour === null || hour < tomorrowFirstRainHour) {
        tomorrowFirstRainHour = hour;
      }
    }
  }

  return {
    temperature,
    humidity,
    sky,
    skyText: SKY_CODES[sky as keyof typeof SKY_CODES] ?? "알 수 없음",
    pty,
    ptyText: PTY_CODES[pty as keyof typeof PTY_CODES] ?? "없음",
    emoji: getWeatherEmoji(sky, pty),
    high,
    low,
    pop: maxPop > 0 ? maxPop : null,
    hasRain,
    currentHour,
    todayFirstRainHour,
    tomorrowFirstRainHour,
  };
}

// 단기 예보 데이터
export interface ShortTermForecast {
  date: string;
  dayOfWeek: string;
  emoji: string;
  high: number | null;
  low: number | null;
  pop: number;
  hasRain: boolean;
}

// 단기 예보 조회 (오늘 - +3일)
export async function getShortTermForecast(nx: number, ny: number): Promise<ShortTermForecast[]> {
  const now = TZDate.tz("Asia/Seoul");
  const fcstItems = await getVilageFcst(now, nx, ny);

  const byDate = new Map<
    string,
    { sky: string[]; pty: string[]; pop: number[]; tmx: number | null; tmn: number | null }
  >();

  for (const item of fcstItems) {
    const date = item.fcstDate;
    if (!date) continue;

    if (!byDate.has(date)) {
      byDate.set(date, { sky: [], pty: [], pop: [], tmx: null, tmn: null });
    }
    const dayData = byDate.get(date)!;

    if (item.category === "SKY" && item.fcstValue) {
      dayData.sky.push(item.fcstValue);
    }
    if (item.category === "PTY" && item.fcstValue) {
      dayData.pty.push(item.fcstValue);
    }
    if (item.category === "POP" && item.fcstValue) {
      dayData.pop.push(Number.parseFloat(item.fcstValue));
    }
    if (item.category === "TMX" && item.fcstValue) {
      dayData.tmx = Number.parseFloat(item.fcstValue);
    }
    if (item.category === "TMN" && item.fcstValue) {
      dayData.tmn = Number.parseFloat(item.fcstValue);
    }
  }

  const forecasts: ShortTermForecast[] = [];

  for (let i = 0; i < 4; i++) {
    const targetDate = format(addDays(now, i), "yyyyMMdd");
    const dayData = byDate.get(targetDate);

    if (!dayData) continue;

    const skyCounts = new Map<string, number>();
    for (const s of dayData.sky) {
      skyCounts.set(s, (skyCounts.get(s) ?? 0) + 1);
    }
    const dominantSky = [...skyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "1";

    const hasRain = dayData.pty.some((p) => p !== "0");
    const maxPop = dayData.pop.length > 0 ? Math.max(...dayData.pop) : 0;
    const ptyForEmoji = hasRain ? "1" : "0";

    const dateObj = parse(targetDate, "yyyyMMdd", new Date());

    forecasts.push({
      date: targetDate,
      dayOfWeek: i === 0 ? "오늘" : i === 1 ? "내일" : format(dateObj, "EEEE", { locale: ko }),
      emoji: getWeatherEmoji(dominantSky, ptyForEmoji),
      high: dayData.tmx,
      low: dayData.tmn,
      pop: maxPop,
      hasRain,
    });
  }

  return forecasts;
}

export { SKY_CODES, PTY_CODES };
