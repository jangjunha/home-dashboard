import * as z from "zod";

const AIR_QUALITY_URL = new URL(
  "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty",
);

// 대기질 등급
export const AIR_QUALITY_GRADES = {
  "1": { label: "좋음", color: "text-blue-400", bgColor: "bg-blue-500" },
  "2": { label: "보통", color: "text-green-400", bgColor: "bg-green-500" },
  "3": { label: "나쁨", color: "text-orange-400", bgColor: "bg-orange-500" },
  "4": { label: "매우나쁨", color: "text-red-400", bgColor: "bg-red-500" },
} as const;

// 응답 스키마
const airQualityItemSchema = z.object({
  dataTime: z.string().optional(),
  pm10Value: z.string().optional(),
  pm10Grade: z.string().optional(),
  pm25Value: z.string().optional(),
  pm25Grade: z.string().optional(),
  o3Value: z.string().optional(),
  o3Grade: z.string().optional(),
  no2Value: z.string().optional(),
  no2Grade: z.string().optional(),
  coValue: z.string().optional(),
  coGrade: z.string().optional(),
  so2Value: z.string().optional(),
  so2Grade: z.string().optional(),
  khaiValue: z.string().optional(),
  khaiGrade: z.string().optional(),
});

const airQualityResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z
      .object({
        items: z.array(airQualityItemSchema),
        totalCount: z.number(),
      })
      .optional(),
  }),
});

type AirQualityItem = z.infer<typeof airQualityItemSchema>;

// 대기질 데이터
export interface AirQualityData {
  stationName: string;
  dataTime: string;
  pm10: number | null;
  pm10Grade: string;
  pm25: number | null;
  pm25Grade: string;
  khaiGrade: string; // 통합대기환경지수 등급
  overallStatus: string;
  overallColor: string;
  overallBgColor: string;
  isGood: boolean;
  isBad: boolean;
}

// 실시간 대기질 조회
export async function getAirQuality(stationName: string): Promise<AirQualityData | null> {
  const url = new URL(AIR_QUALITY_URL);
  url.searchParams.set("serviceKey", process.env.DATA_GO_KR_API_KEY ?? "");
  url.searchParams.set("returnType", "json");
  url.searchParams.set("stationName", stationName);
  url.searchParams.set("dataTerm", "DAILY");
  url.searchParams.set("ver", "1.3");
  url.searchParams.set("numOfRows", "1");

  try {
    const response = await fetch(url);
    const data = airQualityResponseSchema.parse(await response.json());

    if (data.response.header.resultCode !== "00") {
      console.error("대기질 API 오류:", data.response.header.resultMsg);
      return null;
    }

    const item = data.response.body?.items[0];
    if (!item) return null;

    return parseAirQualityItem(item, stationName);
  } catch (error) {
    console.error("대기질 조회 실패:", error);
    return null;
  }
}

function parseAirQualityItem(item: AirQualityItem, stationName: string): AirQualityData {
  const pm10 = item.pm10Value && item.pm10Value !== "-" ? Number.parseInt(item.pm10Value) : null;
  const pm25 = item.pm25Value && item.pm25Value !== "-" ? Number.parseInt(item.pm25Value) : null;
  const pm10Grade = item.pm10Grade ?? "0";
  const pm25Grade = item.pm25Grade ?? "0";
  const khaiGrade = item.khaiGrade ?? "0";

  // 가장 나쁜 등급을 기준으로 전체 상태 결정
  const worstGrade = Math.max(
    Number.parseInt(pm10Grade) || 0,
    Number.parseInt(pm25Grade) || 0,
    Number.parseInt(khaiGrade) || 0,
  ).toString();

  const gradeInfo = AIR_QUALITY_GRADES[worstGrade as keyof typeof AIR_QUALITY_GRADES] ?? {
    label: "정보없음",
    color: "text-neutral-400",
    bgColor: "bg-neutral-500",
  };

  return {
    stationName,
    dataTime: item.dataTime ?? "",
    pm10,
    pm10Grade,
    pm25,
    pm25Grade,
    khaiGrade,
    overallStatus: gradeInfo.label,
    overallColor: gradeInfo.color,
    overallBgColor: gradeInfo.bgColor,
    isGood: worstGrade === "1",
    isBad: worstGrade === "3" || worstGrade === "4",
  };
}
