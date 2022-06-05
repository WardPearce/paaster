import human from 'human-time'

export function friendlyTime(utcTime: number): String {
  if (Math.round((Date.now() - utcTime) / (1000 * 60 * 60 * 24)) > 7) {
    return new Date(utcTime).toLocaleDateString(
      undefined, { year: "numeric", month: "long", day: "numeric" }
    )
  } else {
    return human(new Date(utcTime))
  }
}
