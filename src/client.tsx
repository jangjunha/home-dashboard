import { useEffect, useState } from "hono/jsx";
import { render } from "hono/jsx/dom";

// const client = hc<AppType>("/");

const ClockApp = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;

    const tick = () => {
      const now = new Date();
      const nextMinute = ((now: Date) => {
        const t = new Date(now);
        t.setMinutes(now.getMinutes() + 1, 0, 0);
        return t;
      })(now);
      setNow(now);
      timerId = setTimeout(tick, nextMinute.getTime() - now.getTime());
    };

    tick();
    return () => timerId !== null && window.clearInterval(timerId);
  }, []);

  return (
    <>
      <div class="text-2xl text-neutral-300 mb-2">
        {now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
      </div>
      <div class="text-7xl font-light tracking-wider">
        {now.toLocaleTimeString("ko-KR", {
          dayPeriod: "short",
          hour: "numeric",
          minute: "numeric",
        })}
      </div>
    </>
  );
};
render(<ClockApp />, document.getElementById("clock-root")!);

const SecondsAgo = ({ timestamp }: { timestamp: number }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  if (timestamp === undefined) {
    return null;
  }
  const secondsAgo = Math.floor((now - timestamp) / 1000);
  return <>{secondsAgo}초 전</>;
};
for (const elem of document.getElementsByClassName("seconds-ago-root")) {
  if (elem instanceof HTMLElement) {
    const datetime = elem.dataset.datetime;
    if (datetime === undefined) {
      continue;
    }
    render(<SecondsAgo timestamp={new Date(datetime).getTime()} />, elem);
  }
}
