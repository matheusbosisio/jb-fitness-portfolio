type SaleResult = {
  soldAt: Date;
  revenue: number;
  profit: number;
};

export type DailySalesPoint = {
  date: string;
  label: string;
  revenue: number;
  profit: number;
};

const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

export function buildDailySalesSeries(sales: SaleResult[], endDate: string, days = 7): DailySalesPoint[] {
  const end = new Date(`${endDate}T12:00:00.000Z`);
  const results = new Map<string, { revenue: number; profit: number }>();

  for (const sale of sales) {
    const key = sale.soldAt.toISOString().slice(0, 10);
    const current = results.get(key) ?? { revenue: 0, profit: 0 };
    current.revenue += sale.revenue;
    current.profit += sale.profit;
    results.set(key, current);
  }

  return Array.from({ length: days }, (_, index) => {
    const current = new Date(end);
    current.setUTCDate(end.getUTCDate() - (days - index - 1));
    const date = current.toISOString().slice(0, 10);
    return { date, label: shortDate.format(current), ...(results.get(date) ?? { revenue: 0, profit: 0 }) };
  });
}
