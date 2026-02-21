import * as z from "zod";

const BASE_URL = new URL("http://ws.bus.go.kr/api/rest/");

export const getArrInfoByRouteList = async (
  stId: string,
  busRouteId: string,
  ord: string,
): Promise<BusArrivalResponse> => {
  const url = new URL("./arrive/getArrInfoByRoute", BASE_URL);
  url.searchParams.set("resultType", "json");
  url.searchParams.set("serviceKey", process.env.DATA_GO_KR_API_KEY ?? "");
  url.searchParams.set("stId", stId);
  url.searchParams.set("busRouteId", busRouteId);
  url.searchParams.set("ord", ord);

  const response = await fetch(url);
  return await busArrivalResponseSchema.parse(await response.json());
};

// ── Enum 상수 정의 ──

const ROUTE_TYPES = {
  공용: "0",
  공항: "1",
  마을: "2",
  간선: "3",
  지선: "4",
  순환: "5",
  광역: "6",
  인천: "7",
  경기: "8",
  폐지: "9",
  한강: "14",
} as const;

const BUS_TYPES = {
  일반버스: "0",
  저상버스: "1",
  굴절버스: "2",
} as const;

const ARRIVE_STATUSES = {
  운행중: "0",
  도착: "1",
} as const;

const LAST_BUS_FLAGS = {
  막차아님: "0",
  막차: "1",
} as const;

const CONGESTION_DIVS = {
  데이터없음: "0",
  재차인원: "2",
  혼잡도: "4",
} as const;

const CONGESTION_LEVELS = {
  데이터없음: "0",
  여유: "3",
  보통: "4",
  혼잡: "5",
} as const;

const DETOUR_STATUSES = {
  정상: "00",
  우회: "11",
} as const;

// ── Zod Enum ──

const routeTypeSchema = z.enum(ROUTE_TYPES);
const busTypeSchema = z.enum(BUS_TYPES);
const arriveStatusSchema = z.enum(ARRIVE_STATUSES);
const lastBusFlagSchema = z.enum(LAST_BUS_FLAGS);
const congestionDivsSchema = z.enum(CONGESTION_DIVS);
const detourStatusSchema = z.enum(DETOUR_STATUSES);

// ── Schema 정의 ──

const busArrivalItemSchema = z.object({
  // 정류소 정보
  stId: z.string().describe("정류소 고유 ID"),
  stNm: z.string().describe("정류소명"),
  arsId: z.string().describe("정류소 번호"),

  // 노선 정보
  busRouteId: z.string().describe("노선 ID"),
  busRouteAbrv: z.string().describe("노선 약칭 (안내용)"),
  rtNm: z.string().describe("노선명 (DB관리용)"),
  routeType: routeTypeSchema.describe("노선유형"),
  term: z.string().describe("배차간격 (분)"),
  firstTm: z.string().describe("첫차시간 (yyyyMMddHHmmss)"),
  lastTm: z.string().describe("막차시간 (yyyyMMddHHmmss)"),
  nextBus: z.string().describe("막차운행여부 (N:막차아님, Y:막차)"),
  staOrd: z.string().describe("요청 정류소 순번"),
  dir: z.string().describe("방향"),
  mkTm: z.string().describe("제공시각"),
  deTourAt: detourStatusSchema.describe("우회여부"),

  // === 첫번째 도착예정 버스 ===
  vehId1: z.string().describe("첫번째 도착예정 버스 ID"),
  plainNo1: z.string().describe("첫번째 도착예정 차량번호"),
  sectOrd1: z.string().describe("첫번째 버스 현재구간 순번"),
  stationNm1: z.string().describe("첫번째 버스 최종 정류소명"),
  traTime1: z.string().describe("첫번째 버스 여행시간 (분)"),
  traSpd1: z.string().describe("첫번째 버스 여행속도 (Km/h)"),
  isArrive1: arriveStatusSchema.describe("첫번째 버스 도착출발여부"),
  isLast1: lastBusFlagSchema.describe("첫번째 버스 막차여부"),
  busType1: busTypeSchema.describe("첫번째 버스 차량유형"),

  avgCf1: z.string().describe("첫번째 버스 이동평균 보정계수"),
  expCf1: z.string().describe("첫번째 버스 지수평활 보정계수"),
  kalCf1: z.string().describe("첫번째 버스 기타1 보정계수"),
  neuCf1: z.string().describe("첫번째 버스 기타2 보정계수"),

  exps1: z.string().describe("첫번째 버스 지수평활 도착예정시간(초)"),
  kals1: z.string().describe("첫번째 버스 기타1 도착예정시간(초)"),
  neus1: z.string().describe("첫번째 버스 기타2 도착예정시간(초)"),

  rerdie_Div1: congestionDivsSchema.describe("첫번째 버스 재차 구분"),
  reride_Num1: z.string().describe("첫번째 버스 재차 인원/혼잡도"),
  brerde_Div1: congestionDivsSchema.describe("첫번째 버스 뒷차 구분"),
  brdrde_Num1: z.string().describe("첫번째 버스 뒷차 인원/혼잡도"),
  full1: z.string().describe("첫번째 버스 만차여부"),

  nstnId1: z.string().describe("첫번째 버스 다음정류소 ID"),
  nstnOrd1: z.string().describe("첫번째 버스 다음정류소 순번"),
  nstnSpd1: z.string().describe("첫번째 버스 다음정류소 예정여행속도"),
  nstnSec1: z.string().describe("첫번째 버스 다음정류소 예정여행시간(초)"),

  nmainStnid1: z.string().describe("첫번째 버스 1번째 주요정류소 ID"),
  nmainOrd1: z.string().describe("첫번째 버스 1번째 주요정류소 순번"),
  nmainSec1: z.string().describe("첫번째 버스 1번째 주요정류소 예정여행시간(초)"),

  nmain2Stnid1: z.string().describe("첫번째 버스 2번째 주요정류소 ID"),
  nmain2Ord1: z.string().describe("첫번째 버스 2번째 주요정류소 순번"),
  namin2Sec1: z.string().describe("첫번째 버스 2번째 주요정류소 예정여행시간(초)"),

  nmain3Stnid1: z.string().describe("첫번째 버스 3번째 주요정류소 ID"),
  nmain3Ord1: z.string().describe("첫번째 버스 3번째 주요정류소 순번"),
  nmain3Sec1: z.string().describe("첫번째 버스 3번째 주요정류소 예정여행시간(초)"),

  goal1: z.string().describe("첫번째 버스 종점 도착예정시간(초)"),

  // === 두번째 도착예정 버스 ===
  vehId2: z.string().describe("두번째 도착예정 버스 ID"),
  plainNo2: z.string().describe("두번째 도착예정 차량번호"),
  sectOrd2: z.string().describe("두번째 버스 현재구간 순번"),
  stationNm2: z.string().describe("두번째 버스 최종 정류소명"),
  traTime2: z.string().describe("두번째 버스 여행시간 (분)"),
  traSpd2: z.string().describe("두번째 버스 여행속도 (Km/h)"),
  isArrive2: arriveStatusSchema.describe("두번째 버스 도착출발여부"),
  isLast2: lastBusFlagSchema.describe("두번째 버스 막차여부"),
  busType2: busTypeSchema.describe("두번째 버스 차량유형"),

  avgCf2: z.string().describe("두번째 버스 이동평균 보정계수"),
  expCf2: z.string().describe("두번째 버스 지수평활 보정계수"),
  kalCf2: z.string().describe("두번째 버스 기타1 보정계수"),
  neuCf2: z.string().describe("두번째 버스 기타2 보정계수"),

  exps2: z.string().describe("두번째 버스 지수평활 도착예정시간(초)"),
  kals2: z.string().describe("두번째 버스 기타1 도착예정시간(초)"),
  neus2: z.string().describe("두번째 버스 기타2 도착예정시간(초)"),

  rerdie_Div2: congestionDivsSchema.describe("두번째 버스 재차 구분"),
  reride_Num2: z.string().describe("두번째 버스 재차 인원/혼잡도"),
  brerde_Div2: congestionDivsSchema.describe("두번째 버스 뒷차 구분"),
  brdrde_Num2: z.string().describe("두번째 버스 뒷차 인원/혼잡도"),
  full2: z.string().describe("두번째 버스 만차여부"),

  nstnId2: z.string().describe("두번째 버스 다음정류소 ID"),
  nstnOrd2: z.string().describe("두번째 버스 다음정류소 순번"),
  nstnSpd2: z.string().describe("두번째 버스 다음정류소 예정여행속도"),
  nstnSec2: z.string().describe("두번째 버스 다음정류소 예정여행시간(초)"),

  nmainStnid2: z.string().describe("두번째 버스 1번째 주요정류소 ID"),
  nmainOrd2: z.string().describe("두번째 버스 1번째 주요정류소 순번"),
  nmainSec2: z.string().describe("두번째 버스 1번째 주요정류소 예정여행시간(초)"),

  nmain2Stnid2: z.string().describe("두번째 버스 2번째 주요정류소 ID"),
  nmain2Ord2: z.string().describe("두번째 버스 2번째 주요정류소 순번"),
  namin2Sec2: z.string().describe("두번째 버스 2번째 주요정류소 예정여행시간(초)"),

  nmain3Stnid2: z.string().describe("두번째 버스 3번째 주요정류소 ID"),
  nmain3Ord2: z.string().describe("두번째 버스 3번째 주요정류소 순번"),
  nmain3Sec2: z.string().describe("두번째 버스 3번째 주요정류소 예정여행시간(초)"),

  goal2: z.string().describe("두번째 버스 종점 도착예정시간(초)"),

  // 도착 안내 메시지
  arrmsg1: z.string().describe("첫번째 버스 도착정보 메시지"),
  arrmsg2: z.string().describe("두번째 버스 도착정보 메시지"),
});

const comMsgHeaderSchema = z.object({
  errMsg: z.string().nullable(),
  requestMsgID: z.string().nullable(),
  responseMsgID: z.string().nullable(),
  responseTime: z.string().nullable(),
  returnCode: z.string().nullable(),
  successYN: z.string().nullable(),
});

const msgHeaderSchema = z.object({
  headerCd: z.string().describe("결과 코드"),
  headerMsg: z.string().describe("결과 메시지"),
  itemCount: z.number().describe("항목 개수"),
});

export const busArrivalResponseSchema = z.object({
  comMsgHeader: comMsgHeaderSchema.describe("공통 메시지 헤더"),
  msgHeader: msgHeaderSchema.describe("메시지 헤더"),
  msgBody: z
    .object({
      itemList: z.array(busArrivalItemSchema).describe("버스 도착정보 목록"),
    })
    .describe("본문"),
});

export type BusArrivalResponse = z.infer<typeof busArrivalResponseSchema>;
export type BusArrivalItem = z.infer<typeof busArrivalItemSchema>;

export {
  ROUTE_TYPES,
  BUS_TYPES,
  ARRIVE_STATUSES,
  LAST_BUS_FLAGS,
  CONGESTION_DIVS,
  CONGESTION_LEVELS,
  DETOUR_STATUSES,
};
