import { formatDuration, intervalToDuration } from "date-fns";
import { BusArrivalItem, getArrInfoByRouteList } from "../networking/bus";
import { twMerge } from "tailwind-merge";
import { FC, useContext } from "hono/jsx";
import { ko } from "date-fns/locale";
import { BusStations } from "../settings";
import { SettingsContext } from "..";

export interface BusArrivalsData {
  arrivals: BusArrivalItem[];
  fetchedAt: Date;
}

export async function fetchAllBusArrivals(stations: BusStations): Promise<BusArrivalsData> {
  const requests = stations.flatMap((station) =>
    station.buses.map((bus) =>
      getArrInfoByRouteList(station.stId, bus.busRouteId, bus.ord).catch((error) => {
        console.error(`버스 정보 조회 실패: ${station.name} - ${bus.name}`, error);
        return null;
      }),
    ),
  );

  const responses = await Promise.all(requests);

  return {
    arrivals: responses.filter((res) => res !== null).flatMap((res) => res.msgBody.itemList),
    fetchedAt: new Date(),
  };
}

// 버스 도착정보 컴포넌트
const BusArrivalCard: FC<{
  traTime: string;
  sectOrd: string;
  staOrd: string;
  tintColor: string;
}> = ({ traTime, sectOrd, staOrd, tintColor }) => {
  const stopsAway = Number(staOrd) - Number(sectOrd);
  const seconds = Number(traTime);

  if (seconds <= 0 || stopsAway < 0) {
    return <span class="text-neutral-500">정보 없음</span>;
  }

  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  const formatted = formatDuration(duration, { format: ["minutes", "seconds"], locale: ko });

  return (
    <div class="flex items-baseline gap-2">
      <span class={twMerge("text-xl font-semibold", tintColor)}>{formatted}</span>
      <span class="text-sm text-neutral-400">{stopsAway}번째 전</span>
    </div>
  );
};

export const BusInfo: FC<{ arrivals: BusArrivalItem[]; fetchedAt: Date }> = ({
  arrivals,
  fetchedAt,
}) => {
  const settings = useContext(SettingsContext);
  const groupedByStation = Map.groupBy(arrivals, (bus) => bus.stId);

  return (
    <section class="py-6 px-6 border-b border-neutral-700">
      <div class="flex items-baseline justify-between mb-4">
        <h2 class="text-lg text-neutral-400">버스 도착정보</h2>
        <span
          data-datetime={fetchedAt.toISOString()}
          class="seconds-ago-root text-sm text-neutral-500"
        />
      </div>
      {arrivals.length === 0 ? (
        <div class="text-neutral-500 text-center py-4">버스 정보를 불러올 수 없습니다</div>
      ) : (
        <div class="space-y-4">
          {[...groupedByStation.entries()].map(([stId, buses]) => (
            <div>
              <h3 class="text-sm text-neutral-300 mb-2">
                {settings.busStations.find((s) => s.stId === stId)?.name ?? buses[0].stNm}
              </h3>
              <div class="space-y-2">
                {buses.map((bus) => (
                  <div class="flex items-center justify-between bg-neutral-800 rounded-lg p-4">
                    <span
                      class={twMerge(
                        "text-white px-3 py-1 rounded-full font-bold text-lg",
                        settings.busStations
                          .find((s) => s.stId === stId)
                          ?.buses.find((b) => b.name === bus.busRouteAbrv)?.style?.bg ??
                          "bg-neutral-600",
                      )}
                    >
                      {bus.busRouteAbrv}
                    </span>
                    <div class="flex gap-6">
                      <BusArrivalCard
                        traTime={bus.traTime1}
                        sectOrd={bus.sectOrd1}
                        staOrd={bus.staOrd}
                        tintColor={
                          settings.busStations
                            .find((s) => s.stId === stId)
                            ?.buses.find((b) => b.name === bus.busRouteAbrv)?.style?.text ??
                          "text-neutral-400"
                        }
                      />
                      <BusArrivalCard
                        traTime={bus.traTime2}
                        sectOrd={bus.sectOrd2}
                        staOrd={bus.staOrd}
                        tintColor={
                          settings.busStations
                            .find((s) => s.stId === stId)
                            ?.buses.find((b) => b.name === bus.busRouteAbrv)?.style?.text ??
                          "text-neutral-400"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
