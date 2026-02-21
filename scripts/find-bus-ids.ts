/**
 * 서울 버스 노선번호 + 정류소번호(arsId)로 API에서 쓰이는 stId, busRouteId, ord를 조회합니다.
 *
 * 사용법:
 *   bun scripts/find-bus-ids.ts <노선번호> <정류소번호(arsId)>
 *
 * 예시:
 *   bun scripts/find-bus-ids.ts 100 02004
 */

const [routeNo, arsId] = process.argv.slice(2);

if (!routeNo || !arsId) {
  console.error("사용법: bun scripts/find-bus-ids.ts <노선번호> <정류소번호(arsId)>");
  console.error("예시:   bun scripts/find-bus-ids.ts 100 02004");
  process.exit(1);
}

const API_KEY = process.env.DATA_GO_KR_API_KEY;
if (!API_KEY) {
  console.error("DATA_GO_KR_API_KEY 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

const BASE = "http://ws.bus.go.kr/api/rest";

async function fetchJson(url: URL) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

// 1단계: 노선번호 → busRouteId 목록 조회
console.log(`\n[1] 노선번호 "${routeNo}" 조회 중...`);
const routeUrl = new URL(`${BASE}/busRouteInfo/getBusRouteList`);
routeUrl.searchParams.set("serviceKey", API_KEY);
routeUrl.searchParams.set("resultType", "json");
routeUrl.searchParams.set("busRouteNm", routeNo);

const routeData = await fetchJson(routeUrl);

if (routeData?.msgHeader?.headerCd === "7") {
  console.error(`\n❌ API 인증 실패: ${routeData.msgHeader.headerMsg}`);
  console.error(`   → data.go.kr에서 "서울특별시_버스노선조회" API 사용 신청이 필요합니다.`);
  console.error(`   → https://www.data.go.kr/data/15000193/openapi.do`);
  process.exit(1);
}

const routes: Array<{ busRouteId: string; busRouteNm: string; routeType: string }> =
  routeData?.msgBody?.itemList ?? [];

if (routes.length === 0) {
  console.error(`노선번호 "${routeNo}"를 찾을 수 없습니다.`);
  process.exit(1);
}

// 정확히 일치하는 노선 우선, 없으면 전체 출력
const exactRoutes = routes.filter((r) => r.busRouteNm === routeNo);
const candidates = exactRoutes.length > 0 ? exactRoutes : routes;

if (candidates.length > 1) {
  console.log(`  → 노선 ${candidates.length}개 발견:`);
  candidates.forEach((r) =>
    console.log(`    busRouteId=${r.busRouteId}  노선명=${r.busRouteNm}  유형=${r.routeType}`),
  );
}

// 2단계: 각 busRouteId에 대해 정류소 목록에서 arsId 검색
for (const route of candidates) {
  console.log(`\n[2] busRouteId=${route.busRouteId} (${route.busRouteNm}) 정류소 목록 조회 중...`);

  const stationUrl = new URL(`${BASE}/busRouteInfo/getStaionByRoute`);
  stationUrl.searchParams.set("serviceKey", API_KEY);
  stationUrl.searchParams.set("resultType", "json");
  stationUrl.searchParams.set("busRouteId", route.busRouteId);

  const stationData = await fetchJson(stationUrl);
  const stations: Array<{ stId: string; stNm: string; arsId: string; seq: string }> =
    stationData?.msgBody?.itemList ?? [];

  // arsId는 앞의 0이 생략될 수 있어서 숫자로 비교
  const match = stations.find((s) => s.arsId.replace(/^0+/, "") === arsId.replace(/^0+/, ""));

  if (!match) {
    console.log(`  → arsId="${arsId}" 해당 노선에서 찾을 수 없음`);
    continue;
  }

  console.log(`\n✅ 결과 (${route.busRouteNm} @ ${match.stNm}):`);
  console.log(`   stId      = "${match.stId}"`);
  console.log(`   busRouteId= "${route.busRouteId}"`);
  console.log(`   ord       = "${match.seq}"`);
  console.log(`\n   bus.tsx 복사용:`);
  console.log(`   { name: "${routeNo}", busRouteId: "${route.busRouteId}", ord: "${match.seq}" }`);
}
