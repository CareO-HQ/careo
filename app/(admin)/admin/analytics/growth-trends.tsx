"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlatformGrowthData, type PlatformGrowthData } from "@/app/actions/platform-analytics";

type Metric = "users" | "residents" | "organizations" | "careHomes";
type Range = "30d" | "90d" | "12m" | "all";
type Granularity = "day" | "week" | "month";

const METRICS: Record<Metric, { label: string; totalLabel: string; addedLabel: string }> = {
  users: { label: "Users", totalLabel: "User accounts", addedLabel: "New accounts" },
  residents: { label: "Residents", totalLabel: "Residents in care", addedLabel: "Admissions" },
  organizations: { label: "Organizations", totalLabel: "Organizations", addedLabel: "New organizations" },
  careHomes: { label: "Care homes", totalLabel: "Care homes", addedLabel: "New care homes" },
};

const RANGES: Record<Range, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
  all: "All time",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  nurse: "Nurse",
  care_assistant: "Care assistant",
  agency_nurse: "Agency nurse",
  agency_care_assistant: "Agency care assistant",
  kitchen_staff: "Kitchen staff",
  mdt: "MDT",
  rqia: "RQIA",
};

const SERIES_COLOR = "var(--chart-2)";

/** A dated span: counted from `start` until `end` (exclusive), or forever when end is null. */
interface Span {
  start: Date;
  end: Date | null;
}

interface Bucket {
  label: string;
  tooltipLabel: string;
  total: number;
  added: number;
}

function toSpans(data: PlatformGrowthData, metric: Metric): Span[] {
  switch (metric) {
    case "users":
      return data.users.map((user) => ({ start: new Date(user.createdAt), end: null }));
    case "residents":
      return data.residents.map((stay) => ({
        start: new Date(stay.start),
        end: stay.end ? new Date(stay.end) : null,
      }));
    case "organizations":
      return data.organizations.map((createdAt) => ({ start: new Date(createdAt), end: null }));
    case "careHomes":
      return data.careHomes.map((createdAt) => ({ start: new Date(createdAt), end: null }));
  }
}

function bucketPlan(range: Range, spans: Span[], now: Date): { start: Date; granularity: Granularity } {
  switch (range) {
    case "30d":
      return { start: startOfDay(subDays(now, 29)), granularity: "day" };
    case "90d":
      return { start: startOfWeek(subDays(now, 89), { weekStartsOn: 1 }), granularity: "week" };
    case "12m":
      return { start: startOfMonth(subMonths(now, 11)), granularity: "month" };
    case "all": {
      const earliest = spans.reduce<Date>((min, span) => (span.start < min ? span.start : min), now);
      // Short histories read better weekly than as one or two monthly bars.
      return differenceInCalendarDays(now, earliest) <= 120
        ? { start: startOfWeek(earliest, { weekStartsOn: 1 }), granularity: "week" }
        : { start: startOfMonth(earliest), granularity: "month" };
    }
  }
}

function nextBucket(date: Date, granularity: Granularity): Date {
  if (granularity === "day") return addDays(date, 1);
  if (granularity === "week") return addWeeks(date, 1);
  return addMonths(date, 1);
}

function activeAt(spans: Span[], moment: Date): number {
  return spans.filter((span) => span.start <= moment && (!span.end || span.end > moment)).length;
}

function buildBuckets(spans: Span[], range: Range, now: Date): { buckets: Bucket[]; startTotal: number } {
  const { start, granularity } = bucketPlan(range, spans, now);
  const buckets: Bucket[] = [];
  for (let cursor = start; cursor <= now; cursor = nextBucket(cursor, granularity)) {
    const bucketEnd = nextBucket(cursor, granularity);
    // The current bucket is still open, so its total is "as of now".
    const totalAt = bucketEnd > now ? now : new Date(bucketEnd.getTime() - 1);
    buckets.push({
      label:
        granularity === "month" ? format(cursor, "MMM yy") : format(cursor, "d MMM"),
      tooltipLabel:
        granularity === "day"
          ? format(cursor, "EEE d MMM yyyy")
          : granularity === "week"
            ? `Week of ${format(cursor, "d MMM yyyy")}`
            : format(cursor, "MMMM yyyy"),
      total: activeAt(spans, totalAt),
      added: spans.filter((span) => span.start >= cursor && span.start < bucketEnd).length,
    });
  }
  return { buckets, startTotal: activeAt(spans, new Date(start.getTime() - 1)) };
}

const RECENCY_BANDS = [
  { label: "Last 7 days", maxDays: 7 },
  { label: "8–30 days", maxDays: 30 },
  { label: "31–90 days", maxDays: 90 },
  { label: "Over 90 days", maxDays: Infinity },
] as const;

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function formatChange(change: number): string {
  return change > 0 ? `+${change}` : `${change}`;
}

export function GrowthTrends() {
  const [data, setData] = useState<PlatformGrowthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>("users");
  const [range, setRange] = useState<Range>("12m");

  useEffect(() => {
    getPlatformGrowthData()
      .then(setData)
      .catch((error: unknown) => {
        console.error("Error fetching growth data:", error);
        toast.error("Failed to load growth trends");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const now = useMemo(() => (data ? new Date(data.generatedAt) : new Date()), [data]);

  const growth = useMemo(() => {
    if (!data) return null;
    const spans = toSpans(data, metric);
    const { buckets, startTotal } = buildBuckets(spans, range, now);
    const currentTotal = buckets.at(-1)?.total ?? 0;
    const added = buckets.reduce((sum, bucket) => sum + bucket.added, 0);
    return { buckets, startTotal, currentTotal, added };
  }, [data, metric, range, now]);

  const activity = useMemo(() => {
    if (!data) return null;
    const signedIn = data.users.filter((user) => user.lastSignInAt);
    const daysSince = signedIn.map((user) =>
      differenceInCalendarDays(now, new Date(user.lastSignInAt as string))
    );
    const recency: Array<{ band: string; users: number }> = RECENCY_BANDS.map((band, index) => {
      const minDays = index === 0 ? 0 : RECENCY_BANDS[index - 1].maxDays + 1;
      return {
        band: band.label,
        users: daysSince.filter((days) => days >= minDays && days <= band.maxDays).length,
      };
    });
    recency.push({ band: "Never signed in", users: data.users.length - signedIn.length });

    const roleCounts = new Map<string, number>();
    data.users.forEach((user) => roleCounts.set(user.role, (roleCounts.get(user.role) ?? 0) + 1));
    const roles = [...roleCounts.entries()]
      .map(([role, users]) => ({ role: ROLE_LABELS[role] ?? role.replace(/_/g, " "), users }))
      .sort((a, b) => b.users - a.users);

    return {
      total: data.users.length,
      active7: daysSince.filter((days) => days <= 7).length,
      active30: daysSince.filter((days) => days <= 30).length,
      never: data.users.length - signedIn.length,
      recency,
      roles,
    };
  }, [data, now]);

  const metricInfo = METRICS[metric];
  const totalConfig = { total: { label: metricInfo.totalLabel, color: SERIES_COLOR } } satisfies ChartConfig;
  const addedConfig = { added: { label: metricInfo.addedLabel, color: SERIES_COLOR } } satisfies ChartConfig;
  const usersConfig = { users: { label: "Users", color: SERIES_COLOR } } satisfies ChartConfig;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!growth || !activity) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Growth trends are unavailable right now.
        </CardContent>
      </Card>
    );
  }

  const percent = (part: number) =>
    activity.total === 0 ? "0%" : `${Math.round((part / activity.total) * 100)}%`;
  const change = growth.currentTotal - growth.startTotal;
  const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Growth Trends</CardTitle>
            <CardDescription>
              How the platform has grown. Users exclude platform admins; residents count those in care at
              each point (admitted and not yet discharged).
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={metric} onValueChange={(value) => setMetric(value as Metric)}>
              <TabsList>
                {(Object.keys(METRICS) as Metric[]).map((key) => (
                  <TabsTrigger key={key} value={key}>
                    {METRICS[key].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Select value={range} onValueChange={(value) => setRange(value as Range)}>
              <SelectTrigger className="w-[160px]" aria-label="Time range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RANGES) as Range[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {RANGES[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label={metricInfo.totalLabel} value={`${growth.currentTotal}`} detail="As of now" />
            <StatTile
              label={`Net change · ${RANGES[range].toLowerCase()}`}
              value={formatChange(change)}
              detail={
                growth.startTotal > 0
                  ? `${formatChange(Math.round(pct(change, growth.startTotal)))}% from ${growth.startTotal}`
                  : `From ${growth.startTotal} at the start of the period`
              }
            />
            <StatTile
              label={`${metricInfo.addedLabel} · ${RANGES[range].toLowerCase()}`}
              value={`${growth.added}`}
              detail={metric === "residents" ? "Admissions recorded in the period" : "Created in the period"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium">{metricInfo.totalLabel} over time</h3>
              <p className="mb-3 text-xs text-muted-foreground">Running total at the end of each period</p>
              <ChartContainer config={totalConfig} className="aspect-auto h-[260px] w-full">
                <AreaChart data={growth.buckets} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={48} />
                  <ChartTooltip
                    cursor={{ strokeWidth: 1 }}
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltipLabel}
                      />
                    }
                  />
                  <Area
                    dataKey="total"
                    type="monotone"
                    stroke="var(--color-total)"
                    strokeWidth={2}
                    fill="var(--color-total)"
                    fillOpacity={0.12}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
            <div>
              <h3 className="text-sm font-medium">{metricInfo.addedLabel}</h3>
              <p className="mb-3 text-xs text-muted-foreground">Added in each period</p>
              <ChartContainer config={addedConfig} className="aspect-auto h-[260px] w-full">
                <BarChart data={growth.buckets} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={48} />
                  <ChartTooltip
                    cursor={{ fillOpacity: 0.5 }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltipLabel}
                      />
                    }
                  />
                  <Bar dataKey="added" fill="var(--color-added)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Activity</CardTitle>
          <CardDescription>
            Based on each account&apos;s most recent sign-in. Platform admins are excluded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Active in last 7 days"
              value={`${activity.active7}`}
              detail={`${percent(activity.active7)} of ${activity.total} accounts`}
            />
            <StatTile
              label="Active in last 30 days"
              value={`${activity.active30}`}
              detail={`${percent(activity.active30)} of ${activity.total} accounts`}
            />
            <StatTile
              label="Never signed in"
              value={`${activity.never}`}
              detail="Invited or created but not yet used"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium">Last sign-in</h3>
              <p className="mb-3 text-xs text-muted-foreground">Accounts by time since their last sign-in</p>
              <ChartContainer
                config={usersConfig}
                className="aspect-auto w-full"
                style={{ height: activity.recency.length * 44 + 16 }}
              >
                <BarChart data={activity.recency} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="band" tickLine={false} axisLine={false} width={120} />
                  <ChartTooltip cursor={{ fillOpacity: 0.5 }} content={<ChartTooltipContent hideIndicator />} />
                  <Bar dataKey="users" fill="var(--color-users)" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    <LabelList dataKey="users" position="right" className="fill-foreground" fontSize={12} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
            <div>
              <h3 className="text-sm font-medium">Users by role</h3>
              <p className="mb-3 text-xs text-muted-foreground">Accounts across all organizations</p>
              <ChartContainer
                config={usersConfig}
                className="aspect-auto w-full"
                style={{ height: Math.max(activity.roles.length, 1) * 44 + 16 }}
              >
                <BarChart data={activity.roles} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="role" tickLine={false} axisLine={false} width={150} />
                  <ChartTooltip cursor={{ fillOpacity: 0.5 }} content={<ChartTooltipContent hideIndicator />} />
                  <Bar dataKey="users" fill="var(--color-users)" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    <LabelList dataKey="users" position="right" className="fill-foreground" fontSize={12} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
