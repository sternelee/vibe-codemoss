const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

export function formatRateLimitWindowLabel(
  windowDurationMins: number | null | undefined,
): string {
  if (
    typeof windowDurationMins !== "number"
    || !Number.isFinite(windowDurationMins)
  ) {
    return "Rate limit";
  }

  const roundedMinutes = Math.round(windowDurationMins);
  if (roundedMinutes <= 0) {
    return "Rate limit";
  }
  if (roundedMinutes === MINUTES_PER_WEEK) {
    return "Weekly limit";
  }
  if (roundedMinutes % MINUTES_PER_DAY === 0) {
    return `${roundedMinutes / MINUTES_PER_DAY}d limit`;
  }
  if (roundedMinutes % MINUTES_PER_HOUR === 0) {
    return `${roundedMinutes / MINUTES_PER_HOUR}h limit`;
  }
  return `${roundedMinutes}m limit`;
}
