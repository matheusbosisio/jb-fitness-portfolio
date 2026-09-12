const saoPauloDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

export function todayInSaoPaulo(now = new Date()) { return saoPauloDate.format(now); }

export function isFutureStoreDate(value: string, now = new Date()) { return value > todayInSaoPaulo(now); }

export function currentMonthPeriod(now = new Date()) {
  const today = todayInSaoPaulo(now);
  return { start: `${today.slice(0, 7)}-01`, end: today };
}

export function parseReportPeriod(startValue?: string, endValue?: string, now = new Date()) {
  const defaults = currentMonthPeriod(now);
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  const start = startValue && validDate.test(startValue) ? startValue : defaults.start;
  const end = endValue && validDate.test(endValue) ? endValue : defaults.end;
  if (start > end) return { ...defaults, from: new Date(`${defaults.start}T00:00:00-03:00`), until: new Date(new Date(`${defaults.end}T00:00:00-03:00`).getTime() + 86_400_000), adjusted: true };
  return { start, end, from: new Date(`${start}T00:00:00-03:00`), until: new Date(new Date(`${end}T00:00:00-03:00`).getTime() + 86_400_000), adjusted: false };
}
