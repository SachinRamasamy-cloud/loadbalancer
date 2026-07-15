import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  ApiFlowCategory,
  ApiFlowEvent,
  ApiFlowPhase,
  ApiFlowSource,
  ApiFlowTarget,
  BackendApiFlowEvent,
} from './api-flow.models';

interface RouteDescriptor {
  category: ApiFlowCategory;
  categoryLabel: string;
  target: ApiFlowTarget;
  targetLabel: string;
}

@Injectable({ providedIn: 'root' })
export class ApiFlowService {
  private readonly maxEvents = 2_000;
  private readonly eventsSubject = new BehaviorSubject<ApiFlowEvent[]>([]);

  readonly events$ = this.eventsSubject.asObservable();

  createRequestId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `flow-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  beginRequest(method: string, url: string, requestId = this.createRequestId()): string {
    const path = this.extractPath(url);
    const descriptor = this.describePath(path);
    const existing = this.findByRequestId(requestId);

    if (existing) {
      this.patchByRequestId(requestId, {
        method: method.toUpperCase(),
        url,
        path,
        category: descriptor.category,
        categoryLabel: descriptor.categoryLabel,
        target: descriptor.target,
        targetLabel: descriptor.targetLabel,
        source: 'browser',
        lifecycleStage: 'browser_request_started',
      });
      return existing.id;
    }

    const event = this.createEvent({
      requestId,
      correlationId: null,
      method: method.toUpperCase(),
      url,
      path,
      descriptor,
      source: 'browser',
      clientName: 'Angular HttpClient',
      startedAt: Date.now(),
      lifecycleStage: 'browser_request_started',
    });

    this.prepend(event);
    return event.id;
  }

  completeRequest(id: string, statusCode: number, selectedBackend: string | null): void {
    this.patchById(id, {
      phase: statusCode >= 400 ? 'error' : 'success',
      statusCode,
      selectedBackend,
      completedAt: Date.now(),
      lifecycleStage: 'browser_response_received',
    });
  }

  failRequest(id: string, statusCode: number | null, message: string): void {
    this.patchById(id, {
      phase: 'error',
      statusCode,
      errorMessage: message,
      completedAt: Date.now(),
      lifecycleStage: 'browser_request_failed',
    });
  }

  cancelRequest(id: string): void {
    this.patchById(id, {
      phase: 'cancelled',
      errorMessage: 'Request was cancelled before a response was received.',
      completedAt: Date.now(),
      lifecycleStage: 'browser_request_cancelled',
    });
  }

  ingestBackendEvent(raw: BackendApiFlowEvent): void {
    const requestId = raw.request_id?.trim();
    if (!requestId) return;

    const path = raw.path || '/';
    const descriptor = this.describePath(path);
    const eventType = raw.event_type || 'unknown';
    const existing = this.findByRequestId(requestId);
    const timestamp = this.parseTimestamp(raw.timestamp) ?? Date.now();

    if (!existing) {
      this.prepend(
        this.createEvent({
          requestId,
          correlationId: raw.correlation_id || null,
          method: (raw.method || 'GET').toUpperCase(),
          url: path,
          path,
          descriptor,
          source: 'external',
          clientName: raw.client_name || 'External API client',
          startedAt: timestamp,
          lifecycleStage: eventType,
          lastSequence: raw.sequence ?? null,
        })
      );
    }

    const current = this.findByRequestId(requestId);
    if (!current) return;

    // Ignore replayed or out-of-order lifecycle messages already applied.
    if (
      raw.sequence !== undefined &&
      current.lastSequence !== null &&
      raw.sequence <= current.lastSequence
    ) {
      return;
    }

    const patch: Partial<ApiFlowEvent> = {
      correlationId: raw.correlation_id || current.correlationId,
      method: (raw.method || current.method).toUpperCase(),
      path,
      url: path,
      category: descriptor.category,
      categoryLabel: descriptor.categoryLabel,
      target: descriptor.target,
      targetLabel: descriptor.targetLabel,
      clientName: raw.client_name || current.clientName,
      lifecycleStage: eventType,
      lastSequence: raw.sequence ?? current.lastSequence,
      algorithm: raw.algorithm || current.algorithm,
      selectedBackend: raw.backend_id || current.selectedBackend,
      attemptNumber: raw.attempt_number ?? current.attemptNumber,
      statusCode: raw.status_code ?? current.statusCode,
      errorMessage: raw.error_message || current.errorMessage,
    };

    if (raw.attempt_number && raw.attempt_number > 1) {
      patch.retryCount = Math.max(current.retryCount, raw.attempt_number - 1);
    }
    if (eventType === 'retry_scheduled') {
      patch.retryCount = Math.max(current.retryCount + 1, (raw.attempt_number || 1) - 1);
      patch.phase = 'pending';
    }
    if (eventType === 'backend_selected' || eventType === 'attempt_started') {
      patch.phase = 'pending';
    }
    if (eventType === 'attempt_failed') {
      patch.phase = raw.retry_scheduled ? 'warning' : current.phase;
    }
    if (eventType === 'history_queued') {
      patch.persisted = false;
    }
    if (eventType === 'history_saved') {
      patch.persisted = true;
    }
    if (eventType === 'history_failed' || eventType === 'history_skipped') {
      patch.persisted = false;
    }
    if (eventType === 'request_completed' || eventType === 'request_failed') {
      const statusCode = raw.status_code ?? current.statusCode;
      patch.phase = this.finalPhase(raw.phase, statusCode);
      patch.completedAt = timestamp;
      patch.durationMs = raw.duration_ms ?? Math.max(0, timestamp - current.startedAt);
    } else if (raw.duration_ms !== undefined && raw.duration_ms !== null) {
      patch.durationMs = raw.duration_ms;
    }

    this.patchByRequestId(requestId, patch, false);
  }

  clear(): void {
    this.eventsSubject.next([]);
  }

  getSnapshot(): ApiFlowEvent[] {
    return this.eventsSubject.value;
  }

  private createEvent(input: {
    requestId: string;
    correlationId: string | null;
    method: string;
    url: string;
    path: string;
    descriptor: RouteDescriptor;
    source: ApiFlowSource;
    clientName: string | null;
    startedAt: number;
    lifecycleStage: string;
    lastSequence?: number | null;
  }): ApiFlowEvent {
    return {
      id: input.requestId,
      requestId: input.requestId,
      correlationId: input.correlationId,
      method: input.method,
      url: input.url,
      path: input.path,
      category: input.descriptor.category,
      categoryLabel: input.descriptor.categoryLabel,
      target: input.descriptor.target,
      targetLabel: input.descriptor.targetLabel,
      phase: 'pending',
      statusCode: null,
      startedAt: input.startedAt,
      completedAt: null,
      durationMs: null,
      selectedBackend: null,
      errorMessage: null,
      source: input.source,
      clientName: input.clientName,
      lifecycleStage: input.lifecycleStage,
      attemptNumber: null,
      retryCount: 0,
      algorithm: null,
      persisted: null,
      lastSequence: input.lastSequence ?? null,
    };
  }

  private prepend(event: ApiFlowEvent): void {
    const withoutDuplicate = this.eventsSubject.value.filter(
      (item) => item.requestId !== event.requestId
    );
    this.eventsSubject.next([event, ...withoutDuplicate].slice(0, this.maxEvents));
  }

  private findByRequestId(requestId: string): ApiFlowEvent | undefined {
    return this.eventsSubject.value.find((event) => event.requestId === requestId);
  }

  private patchById(id: string, patch: Partial<ApiFlowEvent>): void {
    const event = this.eventsSubject.value.find((item) => item.id === id);
    if (!event) return;
    this.patchByRequestId(event.requestId, patch);
  }

  private patchByRequestId(
    requestId: string,
    patch: Partial<ApiFlowEvent>,
    calculateDuration = true
  ): void {
    let updated: ApiFlowEvent | null = null;
    const next = this.eventsSubject.value.map((event) => {
      if (event.requestId !== requestId) return event;
      const completedAt = patch.completedAt ?? event.completedAt;
      updated = {
        ...event,
        ...patch,
        durationMs:
          patch.durationMs !== undefined
            ? patch.durationMs
            : calculateDuration && completedAt !== null
              ? Math.max(0, completedAt - event.startedAt)
              : event.durationMs,
      };
      return updated;
    });

    if (updated) {
      // Move the changed request to the top without duplicating it.
      this.eventsSubject.next([
        updated,
        ...next.filter((event) => event.requestId !== requestId),
      ].slice(0, this.maxEvents));
    }
  }

  private finalPhase(rawPhase: string | null | undefined, statusCode: number | null): ApiFlowPhase {
    if (rawPhase === 'error' || (statusCode !== null && statusCode >= 400)) return 'error';
    return 'success';
  }

  private describePath(path: string): RouteDescriptor {
    const clean = path.toLowerCase();

    if (clean === '/healthz' || clean.endsWith('/health')) {
      return this.descriptor('health', 'Platform Health', 'platform', 'Platform Runtime');
    }
    if (clean.includes('/database/status')) {
      return this.descriptor('database', 'Database Status', 'supabase', 'Supabase');
    }
    if (clean.includes('/overview')) {
      return this.descriptor('overview', 'Overview API', 'metrics-store', 'Metrics Store');
    }
    if (clean.includes('/metrics/')) {
      return this.descriptor('metrics', 'Metrics API', 'metrics-store', 'Metrics Store');
    }
    if (clean.includes('/analytics')) {
      return this.descriptor('analytics', 'Analytics API', 'metrics-store', 'Metrics Store');
    }
    if (clean.includes('/logs')) {
      return this.descriptor('logs', 'Logs API', 'supabase', 'Supabase');
    }
    if (clean.includes('/history/requests')) {
      return this.descriptor('history', 'Request History', 'supabase', 'Supabase');
    }
    if (clean.includes('/backends')) {
      return this.descriptor('backends', 'Backend Control', 'control-plane', 'Control Plane');
    }
    if (clean.includes('/routing')) {
      return this.descriptor('routing', 'Routing Control', 'control-plane', 'Control Plane');
    }
    if (clean.includes('/pools')) {
      return this.descriptor('pools', 'Server Pools', 'metrics-store', 'Metrics Store');
    }
    if (clean.includes('/security')) {
      return this.descriptor('security', 'Security API', 'control-plane', 'Control Plane');
    }
    if (clean.includes('/alerts')) {
      return this.descriptor('alerts', 'Alerts API', 'control-plane', 'Control Plane');
    }
    if (clean.includes('/load-test')) {
      return this.descriptor('load-test', 'Load Test API', 'control-plane', 'Control Plane');
    }
    if (!clean.startsWith('/api/control') && clean.startsWith('/api/')) {
      return this.descriptor('proxy', 'Proxy Traffic', 'backend-pool', 'Backend Pool');
    }

    return this.descriptor('other', 'Other API', 'platform', 'Platform Runtime');
  }

  private descriptor(
    category: ApiFlowCategory,
    categoryLabel: string,
    target: ApiFlowTarget,
    targetLabel: string
  ): RouteDescriptor {
    return { category, categoryLabel, target, targetLabel };
  }

  private extractPath(url: string): string {
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      return new URL(url, base).pathname;
    } catch {
      const withoutQuery = url.split('?')[0];
      return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
    }
  }

  private parseTimestamp(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
