import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BackendModel {
  id: string;
  name: string;
  url: string;
  weight: number;
  enabled: boolean;
  status: 'healthy' | 'unhealthy' | 'unknown' | 'draining';
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
  status_codes: { [key: string]: number };
  backend_distribution: { [key: string]: number };
  healthy_backends: number;
  unhealthy_backends: number;
  active_requests: number;
  algorithm: string;
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

export interface RoutingInfo {
  algorithm: string;
  available: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private defaultApiUrl = 'http://localhost:8080';
  private defaultApiKey = 'change-me';

  constructor(private readonly http: HttpClient) {}

  getApiUrl(): string {
    return localStorage.getItem('api_url') || this.defaultApiUrl;
  }

  setApiUrl(url: string): void {
    localStorage.setItem('api_url', url);
  }

  getApiKey(): string {
    return localStorage.getItem('api_key') || this.defaultApiKey;
  }

  setApiKey(key: string): void {
    localStorage.setItem('api_key', key);
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Admin-API-Key': this.getApiKey(),
    });
  }

  getOverview(): Observable<OverviewMetrics> {
    return this.http.get<OverviewMetrics>(`${this.getApiUrl()}/api/control/overview`, {
      headers: this.getHeaders(),
    });
  }

  getTimeseries(): Observable<TimeseriesPoint[]> {
    return this.http.get<TimeseriesPoint[]>(`${this.getApiUrl()}/api/control/metrics/timeseries`, {
      headers: this.getHeaders(),
    });
  }

  getLogs(limit = 100): Observable<LogRecord[]> {
    return this.http.get<LogRecord[]>(`${this.getApiUrl()}/api/control/logs?limit=${limit}`, {
      headers: this.getHeaders(),
    });
  }

  getBackends(): Observable<BackendModel[]> {
    return this.http.get<BackendModel[]>(`${this.getApiUrl()}/api/control/backends`, {
      headers: this.getHeaders(),
    });
  }

  createBackend(backend: { id: string; name: string; url: string; weight: number }): Observable<BackendModel> {
    return this.http.post<BackendModel>(`${this.getApiUrl()}/api/control/backends`, backend, {
      headers: this.getHeaders(),
    });
  }

  updateBackend(id: string, payload: { name?: string; url?: string; weight?: number }): Observable<BackendModel> {
    return this.http.patch<BackendModel>(`${this.getApiUrl()}/api/control/backends/${id}`, payload, {
      headers: this.getHeaders(),
    });
  }

  deleteBackend(id: string): Observable<void> {
    return this.http.delete<void>(`${this.getApiUrl()}/api/control/backends/${id}`, {
      headers: this.getHeaders(),
    });
  }

  enableBackend(id: string): Observable<BackendModel> {
    return this.http.post<BackendModel>(`${this.getApiUrl()}/api/control/backends/${id}/enable`, {}, {
      headers: this.getHeaders(),
    });
  }

  disableBackend(id: string): Observable<BackendModel> {
    return this.http.post<BackendModel>(`${this.getApiUrl()}/api/control/backends/${id}/disable`, {}, {
      headers: this.getHeaders(),
    });
  }

  drainBackend(id: string): Observable<BackendModel> {
    return this.http.post<BackendModel>(`${this.getApiUrl()}/api/control/backends/${id}/drain`, {}, {
      headers: this.getHeaders(),
    });
  }

  getRouting(): Observable<RoutingInfo> {
    return this.http.get<RoutingInfo>(`${this.getApiUrl()}/api/control/routing`, {
      headers: this.getHeaders(),
    });
  }

  updateRouting(algorithm: string): Observable<{ algorithm: string }> {
    return this.http.put<{ algorithm: string }>(
      `${this.getApiUrl()}/api/control/routing`,
      { algorithm },
      { headers: this.getHeaders() }
    );
  }
}
