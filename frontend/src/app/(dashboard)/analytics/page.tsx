"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDashboard,
  getTrends,
  getFactories,
  getPerformance,
  getStatus,
  type DashboardData,
  type AnalyticsTrends,
  type FactoryStats,
  type PerformanceData,
  type StatusDistribution,
} from "@/lib/api";
import {
  BarChart3,
  Loader2,
  RefreshCw,
  AlertCircle,
  Layers,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  ChevronRight,
} from "lucide-react";

// ─── Chart Colors ───────────────────────────────────────────────────────────

const COLORS = {
  amber: "#D97706",
  green: "#16A34A",
  blue: "#2563EB",
  purple: "#7C3AED",
  red: "#DC2626",
  slate: "#64748B",
  teal: "#0D9488",
  pink: "#DB2777",
};

const STATUS_COLORS: Record<string, string> = {
  completed: COLORS.green,
  processing: COLORS.blue,
  queued: COLORS.slate,
  waiting_review: COLORS.amber,
  uploading: COLORS.purple,
  failed: COLORS.red,
  cancelled: COLORS.slate,
  completed_with_errors: COLORS.amber,
};

const CHART_COLORS = [COLORS.amber, COLORS.blue, COLORS.green, COLORS.purple, COLORS.teal, COLORS.pink, COLORS.slate];

// ─── Sparkline SVG ─────────────────────────────────────────────────────────

function Sparkline({ data, color = COLORS.amber, height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const width = 120;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Donut Chart SVG ────────────────────────────────────────────────────────

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = data.map((d) => {
    const pct = d.value / total;
    const length = pct * circumference;
    const seg = { ...d, pct, length, offset, color: d.color };
    offset += length;
    return seg;
  });

  return (
    <svg width={160} height={160} viewBox="0 0 160 160" className="shrink-0">
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={seg.color}
          strokeWidth="20"
          strokeDasharray={`${seg.length} ${circumference - seg.length}`}
          strokeDashoffset={-seg.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-500"
        />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle"         className="fill-foreground text-lg font-bold" dominantBaseline="text-after-edge">
        {total}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle"         className="fill-muted-foreground text-[10px]" dominantBaseline="text-before-edge">
        total
      </text>
    </svg>
  );
}

// ─── Bar Chart ──────────────────────────────────────────────────────────────

function BarChart({
  data,
  maxBars = 8,
  height = 160,
}: {
  data: { label: string; value: number; color?: string }[];
  maxBars?: number;
  height?: number;
}) {
  const items = data.slice(0, maxBars);
  const max = Math.max(...items.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {items.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
          <span className="text-[10px] tabular-nums text-muted-foreground">{d.value}</span>
          <div
            className="w-full rounded-t-sm transition-all duration-500"
            style={{
              height: `${(d.value / max) * 100}%`,
              backgroundColor: d.color || CHART_COLORS[i % CHART_COLORS.length],
              minHeight: d.value > 0 ? 4 : 0,
            }}
          />
          <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Horizontal Bar ─────────────────────────────────────────────────────────

function HorizontalBar({ label, value, max, color = COLORS.amber }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm min-w-[100px] truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm tabular-nums font-medium w-16 text-right">{value}</span>
    </div>
  );
}

// ─── Analytics Page Content ─────────────────────────────────────────────────

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Data
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [factories, setFactories] = useState<FactoryStats | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [status, setStatus] = useState<StatusDistribution | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(Number(searchParams.get("days")) || 30);
  const [factoryFilter, setFactoryFilter] = useState(searchParams.get("factory") || "");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, t, f, p, s] = await Promise.all([
        getDashboard(),
        getTrends(days),
        getFactories(),
        getPerformance(),
        getStatus(),
      ]);
      if (!d && !t && !f && !p && !s) {
        setError("Analytics data unavailable.");
        return;
      }
      if (d) setDashboard(d);
      if (t) setTrends(t);
      if (f) setFactories(f);
      if (p) setPerformance(p);
      if (s) setStatus(s);
    } catch {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const summary = dashboard?.summary;
  const perf = performance;
  const successRate = perf
    ? ((perf.reliability.total_inspections - perf.reliability.failed_inspections) /
        Math.max(perf.reliability.total_inspections, 1)) *
      100
    : null;

  // Filter factories
  const filteredFactories = factories?.factories.filter(
    (f) => !factoryFilter || f.factory === factoryFilter
  );

  // Processing trend data (last 14 days)
  const trendData = trends?.ocr_completions_per_day?.slice(-14) || [];
  const confTrend = trends?.ocr_completions_per_day
    ?.filter((d) => d.avg_processing_time_ms != null)
    .slice(-14) || [];

  // Status distribution for donut
  const statusDist = dashboard?.status_distribution || status?.batch_statuses || [];

  // Top defects
  const topDefects = status?.top_defects || [];

  return (
    <div className="flex-1 min-h-screen bg-zinc-950">
      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-backdrop-filter:bg-zinc-950/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Analytics</h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Insights and metrics across all batches
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                <SelectTrigger className="w-28 bg-zinc-900 border-zinc-800 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="border-zinc-800 text-zinc-300 hover:bg-zinc-800">
                <RefreshCw className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="p-6 space-y-6">
        {/* Loading */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3 animate-pulse">
                <div className="h-3 w-20 rounded bg-zinc-800" />
                <div className="h-8 w-16 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="mb-4 size-12 text-red-500" />
              <p className="text-lg font-medium text-zinc-300">{error}</p>
              <Button className="mt-4" onClick={fetchAll} variant="outline">
                <RefreshCw className="mr-2 size-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── KPI Cards ── */}
        {!loading && !error && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <KPICard
                icon={<Layers className="size-4" />}
                label="Total Batches"
                value={summary?.total_batches ?? 0}
                sub={`${summary?.batches_today ?? 0} today`}
                color={COLORS.amber}
              />
              <KPICard
                icon={<FileText className="size-4" />}
                label="Pages Processed"
                value={summary?.processed_pages?.toLocaleString() ?? "0"}
                sub={`${summary?.total_pages?.toLocaleString() ?? 0} total`}
                color={COLORS.blue}
              />
              <KPICard
                icon={<CheckCircle2 className="size-4" />}
                label="Avg Confidence"
                value={summary?.average_confidence != null ? `${summary.average_confidence.toFixed(1)}%` : "\u2014"}
                sub={perf?.confidence.batches_with_confidence ? `${perf.confidence.batches_with_confidence} batches` : ""}
                color={summary?.average_confidence != null && summary.average_confidence >= 90 ? COLORS.green : COLORS.amber}
              />
              <KPICard
                icon={<TrendingUp className="size-4" />}
                label="Success Rate"
                value={successRate != null ? `${successRate.toFixed(1)}%` : "\u2014"}
                sub={`${perf?.reliability.failed_inspections ?? 0} failed`}
                color={successRate != null && successRate >= 95 ? COLORS.green : successRate != null && successRate >= 85 ? COLORS.amber : COLORS.red}
              />
              <KPICard
                icon={<Clock className="size-4" />}
                label="Avg Processing"
                value={perf?.ocr_processing.avg_time_ms != null ? `${(perf.ocr_processing.avg_time_ms / 1000).toFixed(1)}s` : "\u2014"}
                sub={`${perf?.ocr_processing.total_completed ?? 0} completed`}
                color={COLORS.purple}
                sparkline={confTrend.map((d) => d.avg_processing_time_ms ?? 0)}
              />
            </div>

            {/* ── Charts Row 1 ── */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Processing Trend */}
              <GlassCard title="Processing Trend" subtitle="Pages processed per day">
                {trendData.length > 0 ? (
                  <div className="h-48">
                    <LineChart
                      data={trendData.map((d) => ({ label: d.date?.slice(5) || "", value: d.count }))}
                      color={COLORS.amber}
                      height={160}
                    />
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </GlassCard>

              {/* Status Distribution */}
              <GlassCard title="Status Distribution" subtitle="Current batch statuses">
                {statusDist.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <DonutChart
                      data={statusDist.map((s) => ({
                        label: s.status,
                        value: s.count,
                        color: STATUS_COLORS[s.status] || COLORS.slate,
                      }))}
                    />
                    <div className="space-y-2">
                      {statusDist.map((s) => (
                        <div key={s.status} className="flex items-center gap-2 text-sm">
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: STATUS_COLORS[s.status] || COLORS.slate }}
                          />
                          <span className="text-zinc-400 min-w-[100px]">{s.status.replace(/_/g, " ")}</span>
                          <span className="tabular-nums font-medium text-zinc-200">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </GlassCard>
            </div>

            {/* ── Charts Row 2 ── */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Factory Comparison */}
              <GlassCard title="Factory Comparison" subtitle="Pages per factory">
                {filteredFactories && filteredFactories.length > 0 ? (
                  <BarChart
                    data={filteredFactories.map((f, i) => ({
                      label: f.factory,
                      value: f.total_pages,
                      color: CHART_COLORS[i % CHART_COLORS.length],
                    }))}
                    maxBars={10}
                    height={160}
                  />
                ) : (
                  <EmptyChart />
                )}
              </GlassCard>

              {/* Confidence Trend */}
              <GlassCard title="Confidence Trend" subtitle="Average confidence over time">
                {confTrend.length > 0 ? (
                  <div className="h-48">
                    <LineChart
                      data={confTrend.map((d) => ({
                        label: d.date?.slice(5) || "",
                        value: Math.round((d.avg_processing_time_ms ?? 0) / 1000 * 10) / 10,
                      }))}
                      color={COLORS.green}
                      height={160}
                      formatValue={(v) => `${v}s`}
                    />
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </GlassCard>
            </div>

            {/* ── Charts Row 3 ── */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top Defects */}
              <GlassCard title="Top Defects" subtitle="Most frequent defect types">
                {topDefects.length > 0 ? (
                  <div className="space-y-3">
                    {topDefects.slice(0, 10).map((d, i) => (
                      <HorizontalBar
                        key={d.defect}
                        label={d.defect}
                        value={d.count}
                        max={topDefects[0]?.count || 1}
                        color={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </GlassCard>

              {/* Shift Distribution */}
              <GlassCard title="Shift Distribution" subtitle="Inspections per shift">
                {status?.shift_distribution && status.shift_distribution.length > 0 ? (
                  <div className="space-y-3">
                    {status.shift_distribution.map((s, i) => (
                      <HorizontalBar
                        key={s.shift}
                        label={`Shift ${s.shift}`}
                        value={s.count}
                        max={Math.max(...status.shift_distribution.map((x) => x.count), 1)}
                        color={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </GlassCard>
            </div>

            {/* ── Recent Batches Table ── */}
            {dashboard?.recent_batches && dashboard.recent_batches.length > 0 && (
              <GlassCard title="Recent Batches" subtitle="Latest batch activity">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Batch</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Pages</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Processed</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Factory</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                        <th className="py-2 px-3 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recent_batches.slice(0, 8).map((b) => (
                        <tr
                          key={b.id}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                          onClick={() => router.push(`/batches/${b.id}`)}
                        >
                          <td className="py-2.5 px-3 font-mono text-sm text-zinc-200">{b.batch_no}</td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className="text-[10px] border-zinc-700 text-zinc-300"
                            >
                              {b.status?.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-zinc-300">{b.total_pages}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-zinc-300">{b.processed_pages}</td>
                          <td className="py-2.5 px-3 text-zinc-400">{b.factory_name || "\u2014"}</td>
                          <td className="py-2.5 px-3 text-zinc-400 text-xs">
                            {b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "\u2014"}
                          </td>
                          <td className="py-2.5 px-3">
                            <ChevronRight className="size-4 text-zinc-600" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}

            {/* ── Performance Details ── */}
            {perf && (
              <GlassCard title="OCR Performance" subtitle="Processing reliability metrics">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Total Inspections</p>
                    <p className="text-xl font-bold text-zinc-200">{perf.reliability.total_inspections.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Failed</p>
                    <p className="text-xl font-bold text-red-400">{perf.reliability.failed_inspections}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Retried</p>
                    <p className="text-xl font-bold text-amber-400">{perf.reliability.retried_inspections}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Duplicates Found</p>
                    <p className="text-xl font-bold text-purple-400">{perf.reliability.duplicates_found}</p>
                  </div>
                </div>
                {perf.ocr_processing.min_time_ms != null && (
                  <div className="grid grid-cols-3 gap-6 mt-4 pt-4 border-t border-zinc-800">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Min Time</p>
                      <p className="text-lg font-semibold text-zinc-300">{(perf.ocr_processing.min_time_ms / 1000).toFixed(1)}s</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Avg Time</p>
                      <p className="text-lg font-semibold text-zinc-300">{(perf.ocr_processing.avg_time_ms! / 1000).toFixed(1)}s</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Max Time</p>
                      <p className="text-lg font-semibold text-zinc-300">{(perf.ocr_processing.max_time_ms! / 1000).toFixed(1)}s</p>
                    </div>
                  </div>
                )}
              </GlassCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KPICard({
  icon,
  label,
  value,
  sub,
  color,
  sparkline,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  sparkline?: number[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:bg-zinc-900/70 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="rounded-lg bg-zinc-800 p-2" style={{ color }}>
          {icon}
        </div>
        {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} color={color} />}
      </div>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

function GlassCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-32 text-zinc-600">
      <p className="text-sm">No data available</p>
    </div>
  );
}

// ─── Line Chart SVG ─────────────────────────────────────────────────────────

function LineChart({
  data,
  color = COLORS.amber,
  height = 160,
  formatValue,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  if (data.length < 2) return <EmptyChart />;
  const width = 600;
  const padding = { top: 10, right: 10, bottom: 25, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  const xScale = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
  const yScale = (v: number) => padding.top + chartH - ((v - min) / range) * chartH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(d.value)}`).join(" ");
  const areaPath = `${linePath} L${xScale(data.length - 1)},${padding.top + chartH} L${xScale(0)},${padding.top + chartH} Z`;

  const yTicks = 5;
  const yStep = range / yTicks;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
      {/* Grid lines */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = padding.top + chartH - (i / yTicks) * chartH;
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" className="text-zinc-800" strokeWidth="1" />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" className="fill-zinc-600 text-[9px]">
              {formatValue ? formatValue(Math.round((min + i * yStep) * 10) / 10) : Math.round(min + i * yStep)}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill={color} fillOpacity={0.08} />

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r="3" fill={color} className="hover:r-4 transition-all">
          <title>{`${d.label}: ${d.value}`}</title>
        </circle>
      ))}

      {/* X labels */}
      {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 7)) === 0 || i === data.length - 1).map((d, i) => {
        const idx = data.indexOf(d);
        return (
          <text key={i} x={xScale(idx)} y={height - 5} textAnchor="middle" className="fill-zinc-600 text-[9px]">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Export ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsContent />
    </Suspense>
  );
}
