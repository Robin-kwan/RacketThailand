import "server-only";

import { JWT } from "google-auth-library";
import {
  PLAYER_ANALYTICS_ACTIONS,
  PLAYER_ANALYTICS_SPORTS,
  playerAnalyticsWindow,
  playerEventName,
  type PlayerAnalyticsAction,
} from "@/lib/player-analytics";

export const ANALYTICS_RANGE_KEYS = ["7d", "30d", "90d"] as const;

export type AnalyticsRangeKey = (typeof ANALYTICS_RANGE_KEYS)[number];

export type GoogleAnalyticsDashboardData = {
  generatedAt: string;
  range: AnalyticsRangeKey;
  summary: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    views: number;
    engagementRate: number;
    realtimeActiveUsers: number;
  };
  trend: {
    date: string;
    activeUsers: number;
    sessions: number;
    views: number;
  }[];
  topPages: {
    path: string;
    views: number;
    activeUsers: number;
  }[];
  channels: {
    channel: string;
    sessions: number;
    activeUsers: number;
  }[];
  countries: {
    country: string;
    countryCode: string;
    sessions: number;
    activeUsers: number;
  }[];
  authPages: {
    path: string;
    views: number;
    activeUsers: number;
  }[];
};

type AnalyticsConfig = {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
};

type AnalyticsRow = {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
};

type AnalyticsReport = {
  rows?: AnalyticsRow[];
  metadata?: {
    subjectToThresholding?: boolean;
    dataLossFromOtherRow?: boolean;
  };
};

type BatchReportResponse = {
  reports?: AnalyticsReport[];
  error?: { message?: string; status?: string };
};

type RealtimeReportResponse = AnalyticsReport & {
  error?: { message?: string; status?: string };
};

const RANGE_START_DATE: Record<AnalyticsRangeKey, string> = {
  "7d": "6daysAgo",
  "30d": "29daysAgo",
  "90d": "89daysAgo",
};

const REPORTING_ENV_NAMES = [
  "GOOGLE_ANALYTICS_PROPERTY_ID",
  "GOOGLE_ANALYTICS_CLIENT_EMAIL",
  "GOOGLE_ANALYTICS_PRIVATE_KEY",
] as const;

let cachedAuthClient: JWT | null = null;
let cachedAuthIdentity = "";

export function resolveAnalyticsRange(value?: string): AnalyticsRangeKey {
  return ANALYTICS_RANGE_KEYS.includes(value as AnalyticsRangeKey)
    ? (value as AnalyticsRangeKey)
    : "30d";
}

export function getGoogleAnalyticsConfiguration() {
  const measurementId =
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() ?? "";
  const missingReportingVariables = REPORTING_ENV_NAMES.filter(
    (name) => !process.env[name]?.trim(),
  );

  return {
    measurementId,
    trackingConfigured: /^G-[A-Z0-9]+$/i.test(measurementId),
    reportingConfigured: missingReportingVariables.length === 0,
    missingReportingVariables: [...missingReportingVariables],
  };
}

function getAnalyticsConfig(): AnalyticsConfig {
  const status = getGoogleAnalyticsConfiguration();
  if (!status.reportingConfigured) {
    throw new Error("GOOGLE_ANALYTICS_REPORTING_NOT_CONFIGURED");
  }

  return {
    propertyId: process.env.GOOGLE_ANALYTICS_PROPERTY_ID!.trim(),
    clientEmail: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL!.trim(),
    privateKey: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  };
}

function getAuthClient(config: AnalyticsConfig) {
  const identity = `${config.clientEmail}:${config.privateKey.slice(-48)}`;
  if (!cachedAuthClient || cachedAuthIdentity !== identity) {
    cachedAuthClient = new JWT({
      email: config.clientEmail,
      key: config.privateKey,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
    cachedAuthIdentity = identity;
  }
  return cachedAuthClient;
}

async function getAccessToken(config: AnalyticsConfig) {
  const response = await getAuthClient(config).getAccessToken();
  if (!response.token) {
    throw new Error("GOOGLE_ANALYTICS_TOKEN_UNAVAILABLE");
  }
  return response.token;
}

async function postAnalyticsApi<T>({
  url,
  token,
  body,
}: {
  url: string;
  token: string;
  body: unknown;
}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = (await response.json()) as T & {
    error?: { message?: string; status?: string };
  };

  if (!response.ok) {
    const status = payload.error?.status ?? `HTTP_${response.status}`;
    throw new Error(`GOOGLE_ANALYTICS_API_${status}`);
  }

  return payload;
}

function toNumber(value?: string) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dimension(row: AnalyticsRow, index: number) {
  return row.dimensionValues?.[index]?.value?.trim() ?? "";
}

function metric(row: AnalyticsRow | undefined, index: number) {
  return toNumber(row?.metricValues?.[index]?.value);
}

function reportRows(report?: AnalyticsReport) {
  return report?.rows ?? [];
}

export type PlayerFunnelData = {
  metrics: Record<PlayerAnalyticsAction, { events: number; users: number }>;
  limited: boolean;
};

export async function fetchPlayerFunnel(
  days: number,
  sport: string,
): Promise<PlayerFunnelData> {
  const config = getAnalyticsConfig();
  const token = await getAccessToken(config);
  const window = playerAnalyticsWindow(days);
  const sports = sport === "all" ? [...PLAYER_ANALYTICS_SPORTS] : [sport];
  const requests = PLAYER_ANALYTICS_ACTIONS.map((action) => ({
    dateRanges: [{ startDate: window.startDate, endDate: window.endDate }],
    metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "eventName",
              inListFilter: {
                values: sports
                  .map((code) => playerEventName(action, code))
                  .filter(Boolean),
              },
            },
          },
          {
            filter: {
              fieldName: "hostName",
              stringFilter: {
                matchType: "FULL_REGEXP",
                value:
                  "(badminton\\.|padel\\.|pickleball\\.|tennis\\.|tabletennis\\.)?racketthailand\\.com",
              },
            },
          },
        ],
      },
    },
  }));
  // GA limits batchRunReports to five requests. Aggregate each action across sports
  // at the provider, so a multi-sport visitor is not counted multiple times.
  const batches = await Promise.all(
    [requests.slice(0, 5), requests.slice(5)].map((batch) =>
      postAnalyticsApi<BatchReportResponse>({
        url: `https://analyticsdata.googleapis.com/v1beta/properties/${config.propertyId}:batchRunReports`,
        token,
        body: { requests: batch },
      }),
    ),
  );
  const reports = batches.flatMap((batch) => batch.reports ?? []);
  if (reports.length !== PLAYER_ANALYTICS_ACTIONS.length)
    throw new Error("PLAYER_ANALYTICS_INCOMPLETE_REPORT");
  return {
    metrics: Object.fromEntries(
      PLAYER_ANALYTICS_ACTIONS.map((action, index) => {
        const row = reportRows(reports[index])[0];
        return [action, { events: metric(row, 0), users: metric(row, 1) }];
      }),
    ) as PlayerFunnelData["metrics"],
    limited: reports.some(
      (report) =>
        report.metadata?.subjectToThresholding ||
        report.metadata?.dataLossFromOtherRow,
    ),
  };
}

export async function fetchGoogleAnalyticsDashboard(
  range: AnalyticsRangeKey,
): Promise<GoogleAnalyticsDashboardData> {
  const config = getAnalyticsConfig();
  const token = await getAccessToken(config);
  const propertyPath = `properties/${config.propertyId}`;
  const dateRanges = [{ startDate: RANGE_START_DATE[range], endDate: "today" }];

  const [batch, authPagesReport, realtimeReport] = await Promise.all([
    postAnalyticsApi<BatchReportResponse>({
      url: `https://analyticsdata.googleapis.com/v1beta/${propertyPath}:batchRunReports`,
      token,
      body: {
        requests: [
          {
            dateRanges,
            metrics: [
              { name: "activeUsers" },
              { name: "newUsers" },
              { name: "sessions" },
              { name: "screenPageViews" },
              { name: "engagementRate" },
            ],
          },
          {
            dateRanges,
            dimensions: [{ name: "date" }],
            metrics: [
              { name: "activeUsers" },
              { name: "sessions" },
              { name: "screenPageViews" },
            ],
            orderBys: [{ dimension: { dimensionName: "date" } }],
            limit: "100",
          },
          {
            dateRanges,
            dimensions: [{ name: "pagePath" }],
            metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
            orderBys: [
              { metric: { metricName: "screenPageViews" }, desc: true },
            ],
            limit: "10",
          },
          {
            dateRanges,
            dimensions: [{ name: "sessionPrimaryChannelGroup" }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: "10",
          },
          {
            dateRanges,
            dimensions: [{ name: "country" }, { name: "countryId" }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: "250",
          },
        ],
      },
    }),
    postAnalyticsApi<AnalyticsReport>({
      url: `https://analyticsdata.googleapis.com/v1beta/${propertyPath}:runReport`,
      token,
      body: {
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        dimensionFilter: {
          orGroup: {
            expressions: [
              {
                filter: {
                  fieldName: "pagePath",
                  stringFilter: { matchType: "BEGINS_WITH", value: "/login" },
                },
              },
              {
                filter: {
                  fieldName: "pagePath",
                  stringFilter: { matchType: "BEGINS_WITH", value: "/signup" },
                },
              },
            ],
          },
        },
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: "20",
      },
    }),
    postAnalyticsApi<RealtimeReportResponse>({
      url: `https://analyticsdata.googleapis.com/v1beta/${propertyPath}:runRealtimeReport`,
      token,
      body: { metrics: [{ name: "activeUsers" }] },
    }).catch(() => ({ rows: [] })),
  ]);

  const reports = batch.reports ?? [];
  const summaryRow = reportRows(reports[0])[0];

  return {
    generatedAt: new Date().toISOString(),
    range,
    summary: {
      activeUsers: metric(summaryRow, 0),
      newUsers: metric(summaryRow, 1),
      sessions: metric(summaryRow, 2),
      views: metric(summaryRow, 3),
      engagementRate: metric(summaryRow, 4),
      realtimeActiveUsers: metric(reportRows(realtimeReport)[0], 0),
    },
    trend: reportRows(reports[1]).map((row) => ({
      date: dimension(row, 0),
      activeUsers: metric(row, 0),
      sessions: metric(row, 1),
      views: metric(row, 2),
    })),
    topPages: reportRows(reports[2]).map((row) => ({
      path: dimension(row, 0) || "/",
      views: metric(row, 0),
      activeUsers: metric(row, 1),
    })),
    channels: reportRows(reports[3]).map((row) => ({
      channel: dimension(row, 0) || "Unassigned",
      sessions: metric(row, 0),
      activeUsers: metric(row, 1),
    })),
    countries: reportRows(reports[4]).map((row) => ({
      country: dimension(row, 0) || "Unknown",
      countryCode: dimension(row, 1),
      sessions: metric(row, 0),
      activeUsers: metric(row, 1),
    })),
    authPages: reportRows(authPagesReport).map((row) => ({
      path: dimension(row, 0) || "/",
      views: metric(row, 0),
      activeUsers: metric(row, 1),
    })),
  };
}
