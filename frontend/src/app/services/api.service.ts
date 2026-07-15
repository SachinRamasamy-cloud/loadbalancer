import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, throwError } from 'rxjs';

declare global {
  interface Window {
    __LOADFLOW_CONFIG__?: {
      apiUrl?: string;
      apiKey?: string;
    };
  }
}

export type BackendStatus = 'healthy' | 'unhealthy' | 'unknown' | 'draining' | 'disabled';

export interface BackendModel {
  id: string;
  name: string;
  url: string;
  weight: number;
  enabled: boolean;
  status: BackendStatus;
  active_requests: number;
  total_requests: number;
  total_errors: number;
  last_latency_ms: number | null;
  last_checked_at: string | null;
  last_error: string | null;
  consecutive_successes: number;
  consecutive_failures: number;
  eligible: boolean;
  error_rate: number;
}

export interface OverviewMetrics {
  total_requests: number;
  requests_per_second: number;
  average_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  error_rate: number;
  status_codes: Record<string, number>;
  backend_distribution: Record<string, number>;
  healthy_backends: number;
  unhealthy_backends: number;
  active_requests: number;
  algorithm: string;
  database_enabled?: boolean;
  database_available?: boolean;
}

export interface TimeseriesPoint {
  time: string;
  requests: number;
  errors: number;
  avg_latency_ms: number;
}

export interface LogRecord {
  request_id: string;
  timestamp: string;
  method: string;
  path: string;
  backend_id: string | null;
  status_code: number;
  duration_ms: number;
  error: string | null;
  retry_count: number;
}

export interface ApiRequestHistoryRecord {
  id: string;
  request_id: string;
  correlation_id: string | null;
  received_at: string;
  completed_at: string;
  http_method: string;
  route: string;
  query_present: boolean;
  request_size_bytes: number | null;
  response_size_bytes: number | null;
  final_status_code: number;
  total_duration_ms: number;
  selected_algorithm: string;
  final_backend_id: string | null;
  attempt_count: number;
  retry_count: number;
  outcome: string;
  error_type: string | null;
  error_code: string | null;
  error_message: string | null;
  worker_job_id: string | null;
  load_test_run_id: string | null;
  client_ip: string | null;
  client_ip_hash: string | null;
  user_agent_family: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ApiRequestAttempt {
  id: string;
  api_request_id: string;
  request_id: string;
  attempt_number: number;
  backend_id: string | null;
  selected_algorithm: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  upstream_status_code: number | null;
  outcome: string;
  retryable: boolean;
  retry_scheduled: boolean;
  error_type: string | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ApiRequestHistoryDetail extends ApiRequestHistoryRecord {
  attempts: ApiRequestAttempt[];
}

export interface TrackingRecord {
  request_id: string;
  timestamp: string;
  method: string;
  path: string;
  backend_id: string | null;
  status_code: number;
  duration_ms: number;
  error: string | null;
  error_type: string | null;
  retry_count: number;
  attempt_count: number;
  outcome: string;
}

export interface RoutingInfo {
  algorithm: string;
  available: string[];
}

export interface PlatformHealth {
  status: string;
  database: {
    enabled: boolean;
    available: boolean;
    status?: string;
    error?: string | null;
    [key: string]: unknown;
  };
  api_history_worker: {
    running: boolean;
    queue_size?: number;
    worker_id?: string;
    [key: string]: unknown;
  };
}

export interface DatabaseStatusResponse {
  database: PlatformHealth['database'];
  api_history_worker: PlatformHealth['api_history_worker'];
}

export interface ConnectionTestResult {
  platform: PlatformHealth;
  database: DatabaseStatusResponse;
}

export interface AlertItem {
  id: string;
  title: string;
  source: string;
  time: string;
  level: 'Critical' | 'Warning' | 'Info';
  color: string;
  background: string;
}

export interface AlertsResponse {
  total: number;
  critical: number;
  warning: number;
  info: number;
  alerts: AlertItem[];
}

export interface PoolRecord {
  name: string;
  algorithm: string;
  servers: number;
  healthy: number;
  requests: string;
  bandwidth: string;
  status: 'Healthy' | 'Warning' | 'Down';
}

export interface AnalyticsResponse {
  endpoints: Array<{ path: string; requests: string; share: string; progress: number }>;
  performance: Array<{
    path: string;
    requests: string;
    avg: string;
    p95: string;
    p99: string;
    error: string;
  }>;
}

export interface LoadTestStatus {
  id: string;
  status: 'Idle' | 'Running' | 'Completed' | 'Failed' | string;
  target: string;
  started_at: number;
  duration: number;
  concurrency: number;
  progress: number;
  throughput: number;
  avg_latency: number;
  p50_latency: number;
  p95_latency: number;
  p99_latency: number;
  error_rate: number;
  success_count: number;
  error_count: number;
  algorithm?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly defaultApiUrl = 'http://localhost:8080';
  private readonly defaultApiKey = 'change-me';

  constructor(private readonly http: HttpClient) {}

  getApiUrl(): string {
    const saved = this.readStorage('api_url');
    const runtime = typeof window !== 'undefined' ? window.__LOADFLOW_CONFIG__?.apiUrl : undefined;
    return this.normalizeBaseUrl(saved || runtime || this.defaultApiUrl);
  }

  setApiUrl(url: string): void {
    this.writeStorage('api_url', this.normalizeBaseUrl(url));
  }

  getApiKey(): string {
    const saved = this.readStorage('api_key');
    const runtime = typeof window !== 'undefined' ? window.__LOADFLOW_CONFIG__?.apiKey : undefined;
    return saved || runtime || this.defaultApiKey;
  }

  setApiKey(key: string): void {
    this.writeStorage('api_key', key.trim());
  }

  clearConnectionOverride(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('api_url');
    localStorage.removeItem('api_key');
  }

  getHealth(): Observable<PlatformHealth> {
    return this.http
      .get<PlatformHealth>(this.url('/healthz'))
      .pipe(catchError((error) => this.handleError(error)));
  }

  testConnection(apiUrl: string, apiKey: string): Observable<ConnectionTestResult> {
    const baseUrl = this.normalizeBaseUrl(apiUrl);
    const headers = this.headers(apiKey);

    return forkJoin({
      platform: this.http.get<PlatformHealth>(`${baseUrl}/healthz`),
      database: this.http.get<DatabaseStatusResponse>(`${baseUrl}/api/control/database/status`, { headers }),
    }).pipe(catchError((error) => this.handleError(error)));
  }

  getDatabaseStatus(): Observable<DatabaseStatusResponse> {
    return this.get<DatabaseStatusResponse>('/api/control/database/status');
  }

  getOverview(): Observable<OverviewMetrics> {
    return this.get<OverviewMetrics>('/api/control/overview');
  }

  getTimeseries(): Observable<TimeseriesPoint[]> {
    return this.get<TimeseriesPoint[]>('/api/control/metrics/timeseries');
  }

  getLogs(limit = 100): Observable<LogRecord[]> {
    const params = new HttpParams().set('limit', Math.min(Math.max(limit, 1), 500));
    return this.get<LogRecord[]>('/api/control/logs', params);
  }

  getRequestHistory(limit = 100, offset = 0): Observable<ApiRequestHistoryRecord[]> {
    const params = new HttpParams()
      .set('limit', Math.min(Math.max(limit, 1), 1000))
      .set('offset', Math.max(offset, 0));
    return this.get<ApiRequestHistoryRecord[]>('/api/control/history/requests', params);
  }

  getRequestHistoryDetail(requestId: string): Observable<ApiRequestHistoryDetail> {
    return this.get<ApiRequestHistoryDetail>(
      `/api/control/history/requests/${encodeURIComponent(requestId)}`
    );
  }

  getTrackingRecords(limit = 100): Observable<TrackingRecord[]> {
    return this.getRequestHistory(limit).pipe(
      map((rows) => rows.map((row) => this.historyToTracking(row))),
      catchError(() =>
        this.getLogs(Math.min(limit, 500)).pipe(
          map((rows) =>
            rows.map((row) => ({
              ...row,
              error_type: row.error?.toLowerCase().includes('timeout') ? 'TimeoutError' : null,
              attempt_count: Math.max(1, row.retry_count + 1),
              outcome: row.status_code >= 500 || row.error ? 'upstream_error' : 'success',
            }))
          )
        )
      )
    );
  }

  getBackends(): Observable<BackendModel[]> {
    return this.get<BackendModel[]>('/api/control/backends');
  }

  createBackend(backend: {
    id: string;
    name: string;
    url: string;
    weight: number;
  }): Observable<BackendModel> {
    return this.post<BackendModel>('/api/control/backends', backend);
  }

  updateBackend(
    id: string,
    payload: { name?: string; url?: string; weight?: number }
  ): Observable<BackendModel> {
    return this.patch<BackendModel>(`/api/control/backends/${encodeURIComponent(id)}`, payload);
  }

  deleteBackend(id: string): Observable<void> {
    return this.delete<void>(`/api/control/backends/${encodeURIComponent(id)}`);
  }

  enableBackend(id: string): Observable<BackendModel> {
    return this.post<BackendModel>(`/api/control/backends/${encodeURIComponent(id)}/enable`, {});
  }

  disableBackend(id: string): Observable<BackendModel> {
    return this.post<BackendModel>(`/api/control/backends/${encodeURIComponent(id)}/disable`, {});
  }

  drainBackend(id: string): Observable<BackendModel> {
    return this.post<BackendModel>(`/api/control/backends/${encodeURIComponent(id)}/drain`, {});
  }

  getRouting(): Observable<RoutingInfo> {
    return this.get<RoutingInfo>('/api/control/routing');
  }

  updateRouting(algorithm: string): Observable<{ algorithm: string }> {
    return this.put<{ algorithm: string }>('/api/control/routing', { algorithm });
  }

  getSecurityStats(): Observable<Record<string, unknown>> {
    return this.get<Record<string, unknown>>('/api/control/security/stats');
  }

  getAlerts(): Observable<AlertsResponse> {
    return this.get<AlertsResponse>('/api/control/alerts');
  }

  markAlertsAllRead(): Observable<{ status: string }> {
    return this.post<{ status: string }>('/api/control/alerts/mark-all-read', {});
  }

  getPools(): Observable<PoolRecord[]> {
    return this.get<PoolRecord[]>('/api/control/pools');
  }

  getAnalytics(): Observable<AnalyticsResponse> {
    return this.get<AnalyticsResponse>('/api/control/analytics');
  }

  getLoadTestActive(): Observable<LoadTestStatus> {
    return this.get<LoadTestStatus>('/api/control/load-test/active');
  }

  startLoadTest(): Observable<LoadTestStatus> {
    return this.post<LoadTestStatus>('/api/control/load-test', {});
  }

  sendDemoRequest(): Observable<unknown> {
    return this.get<unknown>('/api/demo');
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Unexpected API error';
  }

  private historyToTracking(row: ApiRequestHistoryRecord): TrackingRecord {
    return {
      request_id: row.request_id,
      timestamp: row.completed_at || row.received_at,
      method: row.http_method,
      path: row.route,
      backend_id: row.final_backend_id,
      status_code: row.final_status_code,
      duration_ms: Number(row.total_duration_ms || 0),
      error: row.error_message,
      error_type: row.error_type,
      retry_count: row.retry_count,
      attempt_count: row.attempt_count,
      outcome: row.outcome,
    };
  }

  private get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http
      .get<T>(this.url(path), { headers: this.headers(), params })
      .pipe(catchError((error) => this.handleError(error)));
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(this.url(path), body, { headers: this.headers() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  private put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<T>(this.url(path), body, { headers: this.headers() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  private patch<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .patch<T>(this.url(path), body, { headers: this.headers() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  private delete<T>(path: string): Observable<T> {
    return this.http
      .delete<T>(this.url(path), { headers: this.headers() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  private url(path: string): string {
    return `${this.getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private headers(apiKey = this.getApiKey()): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Admin-API-Key': apiKey,
    });
  }

  private normalizeBaseUrl(url: string): string {
    const value = url.trim();
    if (!value) return this.defaultApiUrl;
    return value.replace(/\/+$/, '');
  }

  private readStorage(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  }

  private writeStorage(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Unable to reach the LoadFlow backend.';

    if (error.status === 0) {
      message = 'Backend connection failed. Check the API URL, CORS configuration, HTTPS, and whether FastAPI is running.';
    } else if (error.status === 401 || error.status === 403) {
      message = 'The backend rejected the Admin API Key.';
    } else if (error.status === 404) {
      message = 'The requested LoadFlow API endpoint was not found.';
    } else if (error.status === 503) {
      message = 'The backend is running, but the database is unavailable.';
    } else if (typeof error.error?.detail === 'string') {
      message = error.error.detail;
    } else if (typeof error.error?.message === 'string') {
      message = error.error.message;
    } else if (error.message) {
      message = error.message;
    }

    return throwError(() => new Error(message));
  }
}
