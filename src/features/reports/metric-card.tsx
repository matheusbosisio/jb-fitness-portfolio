export function MetricCard({ label, value, detail, tone = "default" }: { label: string; value: string; detail?: string; tone?: "default" | "positive" }) {
  return <article className="rounded-2xl border border-border bg-white p-5 shadow-sm"><p className="text-sm font-medium text-muted">{label}</p><p className={`mt-2 text-2xl font-semibold tracking-tight ${tone === "positive" ? "text-green-700" : "text-foreground"}`}>{value}</p>{detail ? <p className="mt-2 text-xs leading-5 text-muted">{detail}</p> : null}</article>;
}
