import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function relativeDate(date: string | number | Date | dayjs.Dayjs): string {
  const localDate = dayjs(date);
  if (dayjs().diff(localDate, "month") > 0) {
    return localDate.format("MMMM D, YYYY");
  }
  return localDate.fromNow();
}