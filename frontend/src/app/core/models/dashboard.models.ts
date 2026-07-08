export type StatusTone = 'healthy' | 'warning' | 'critical' | 'info';

export interface TrafficPoint {
  readonly x: number;
  readonly y: number;
}

export interface TrafficSeries {
  readonly name: string;
  readonly color: string;
  readonly points: readonly TrafficPoint[];
}

export interface PoolRow {
  readonly name: string;
  readonly statusColor: string;
  readonly servers: number;
  readonly throughput: string;
  readonly errorRate: string;
}

export interface AlertItem {
  readonly source: string;
  readonly message: string;
  readonly tone: StatusTone;
}

export interface DashboardOverview {
  readonly trafficGbps: number;
  readonly activePools: number;
  readonly totalPools: number;
  readonly bandwidth: string;
  readonly trend: number;
  readonly healthyServers: number;
  readonly warningServers: number;
  readonly downServers: number;
  readonly pools: readonly PoolRow[];
  readonly alerts: readonly AlertItem[];
  readonly trafficSeries: readonly TrafficSeries[];
}
