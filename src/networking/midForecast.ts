import * as z from "zod";
import { TZDate } from "@date-fns/tz";
import { format, addDays } from "date-fns";
import { ko } from "date-fns/locale";

const MID_FORECAST_URL = new URL("http://apis.data.go.kr/1360000/MidFcstInfoService/");

// 기본 지역 코드
const DEFAULT_TEMP_REG_ID = "11B10101"; // 서울
const DEFAULT_LAND_REG_ID = "11B00000"; // 서울/인천/경기

// 발표시각 계산 (06시, 18시)
function getBaseDateTime(): string {
  const now = new TZDate(new Date(), "Asia/Seoul");
  const hours = now.getHours();

  // 06시 이전이면 전날 18시, 06시~18시면 당일 06시, 18시 이후면 당일 18시
  if (hours < 6) {
    const yesterday = addDays(now, -1);
    return format(yesterday, "yyyyMMdd") + "0600";
    // return format(yesterday, "yyyyMMdd") + "1800";
  } else if (hours < 18) {
    return format(now, "yyyyMMdd") + "0600";
  } else {
    return format(now, "yyyyMMdd") + "0600";
    // return format(now, "yyyyMMdd") + "1800";
  }
}

// 중기기온예보 응답 스키마
const midTaItemSchema = z.object({
  regId: z.string(),
  taMin4: z.number().optional(),
  taMax4: z.number().optional(),
  taMin5: z.number().optional(),
  taMax5: z.number().optional(),
  taMin6: z.number().optional(),
  taMax6: z.number().optional(),
  taMin7: z.number().optional(),
  taMax7: z.number().optional(),
  taMin8: z.number().optional(),
  taMax8: z.number().optional(),
  taMin9: z.number().optional(),
  taMax9: z.number().optional(),
  taMin10: z.number().optional(),
  taMax10: z.number().optional(),
});

const midTaResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z
      .object({
        items: z.object({
          item: z.array(midTaItemSchema),
        }),
      })
      .optional(),
  }),
});

// 중기육상예보 응답 스키마
const midLandItemSchema = z.object({
  regId: z.string(),
  rnSt3Am: z.number().optional(),
  rnSt3Pm: z.number().optional(),
  rnSt4Am: z.number().optional(),
  rnSt4Pm: z.number().optional(),
  rnSt5Am: z.number().optional(),
  rnSt5Pm: z.number().optional(),
  rnSt6Am: z.number().optional(),
  rnSt6Pm: z.number().optional(),
  rnSt7Am: z.number().optional(),
  rnSt7Pm: z.number().optional(),
  rnSt8: z.number().optional(),
  rnSt9: z.number().optional(),
  rnSt10: z.number().optional(),
  wf3Am: z.string().optional(),
  wf3Pm: z.string().optional(),
  wf4Am: z.string().optional(),
  wf4Pm: z.string().optional(),
  wf5Am: z.string().optional(),
  wf5Pm: z.string().optional(),
  wf6Am: z.string().optional(),
  wf6Pm: z.string().optional(),
  wf7Am: z.string().optional(),
  wf7Pm: z.string().optional(),
  wf8: z.string().optional(),
  wf9: z.string().optional(),
  wf10: z.string().optional(),
});

const midLandResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z
      .object({
        items: z.object({
          item: z.array(midLandItemSchema),
        }),
      })
      .optional(),
  }),
});

type MidTaItem = z.infer<typeof midTaItemSchema>;
type MidLandItem = z.infer<typeof midLandItemSchema>;

// 중기기온예보 조회
async function getMidTa(regId: string = DEFAULT_TEMP_REG_ID): Promise<MidTaItem | null> {
  const url = new URL("./getMidTa", MID_FORECAST_URL);
  url.searchParams.set("serviceKey", process.env.DATA_GO_KR_API_KEY ?? "");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("regId", regId);
  url.searchParams.set("tmFc", getBaseDateTime());
  url.searchParams.set("numOfRows", "10");

  const response = await fetch(url);
  const data = midTaResponseSchema.parse(await response.json());

  if (data.response.header.resultCode !== "00") {
    console.error("중기기온예보 API 오류:", data.response.header.resultMsg);
    return null;
  }

  return data.response.body?.items.item[0] ?? null;
}

// 중기육상예보 조회
async function getMidLandFcst(regId: string = DEFAULT_LAND_REG_ID): Promise<MidLandItem | null> {
  const url = new URL("./getMidLandFcst", MID_FORECAST_URL);
  url.searchParams.set("serviceKey", process.env.DATA_GO_KR_API_KEY ?? "");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("regId", regId);
  url.searchParams.set("tmFc", getBaseDateTime());
  url.searchParams.set("numOfRows", "10");

  const response = await fetch(url);
  const data = midLandResponseSchema.parse(await response.json());

  if (data.response.header.resultCode !== "00") {
    console.error("중기육상예보 API 오류:", data.response.header.resultMsg);
    return null;
  }

  return data.response.body?.items.item[0] ?? null;
}

// 날씨 텍스트를 이모지로 변환
function weatherTextToEmoji(wf: string): string {
  if (wf.includes("맑음")) return "☀️";
  if (wf.includes("구름많") && wf.includes("비")) return "🌦️";
  if (wf.includes("구름많") && wf.includes("눈")) return "🌨️";
  if (wf.includes("구름많")) return "⛅";
  if (wf.includes("흐리") && wf.includes("비")) return "🌧️";
  if (wf.includes("흐리") && wf.includes("눈")) return "🌨️";
  if (wf.includes("흐림") || wf.includes("흐리고")) return "☁️";
  if (wf.includes("비")) return "🌧️";
  if (wf.includes("눈")) return "❄️";
  if (wf.includes("소나기")) return "🌦️";
  return "🌤️";
}

// 주간 예보 데이터
export interface WeeklyForecast {
  date: string;
  dayOfWeek: string;
  emoji: string;
  weatherText: string;
  high: number | null;
  low: number | null;
  pop: number; // 강수확률
  hasRain: boolean;
}

// 중기예보 조회 (4-7일)
export async function getMidTermForecast(): Promise<WeeklyForecast[]> {
  const [taData, landData] = await Promise.all([getMidTa(), getMidLandFcst()]);

  if (!taData && !landData) {
    return [];
  }

  const now = new TZDate(new Date(), "Asia/Seoul");
  const forecasts: WeeklyForecast[] = [];

  // 4일 후부터 7일 후까지 (단기예보와 겹치지 않게)
  for (let day = 4; day <= 7; day++) {
    const targetDate = addDays(now, day);
    const dateStr = format(targetDate, "yyyyMMdd");
    const dayOfWeek = format(targetDate, "EEEE", { locale: ko });

    // 기온
    const taMinKey = `taMin${day}` as keyof MidTaItem;
    const taMaxKey = `taMax${day}` as keyof MidTaItem;
    const low = taData?.[taMinKey] as number | undefined;
    const high = taData?.[taMaxKey] as number | undefined;

    // 날씨/강수확률 (오전/오후 중 더 안좋은 것 선택)
    let wfAm: string | undefined;
    let wfPm: string | undefined;
    let rnStAm: number | undefined;
    let rnStPm: number | undefined;

    if (day <= 7) {
      const wfAmKey = `wf${day}Am` as keyof MidLandItem;
      const wfPmKey = `wf${day}Pm` as keyof MidLandItem;
      const rnStAmKey = `rnSt${day}Am` as keyof MidLandItem;
      const rnStPmKey = `rnSt${day}Pm` as keyof MidLandItem;

      wfAm = landData?.[wfAmKey] as string | undefined;
      wfPm = landData?.[wfPmKey] as string | undefined;
      rnStAm = landData?.[rnStAmKey] as number | undefined;
      rnStPm = landData?.[rnStPmKey] as number | undefined;
    }

    // 오후 날씨 우선, 없으면 오전
    const weatherText = wfPm ?? wfAm ?? "맑음";
    const pop = Math.max(rnStAm ?? 0, rnStPm ?? 0);
    const hasRain = weatherText.includes("비") || weatherText.includes("눈") || pop >= 50;

    forecasts.push({
      date: dateStr,
      dayOfWeek,
      emoji: weatherTextToEmoji(weatherText),
      weatherText,
      high: high ?? null,
      low: low ?? null,
      pop,
      hasRain,
    });
  }

  return forecasts;
}
