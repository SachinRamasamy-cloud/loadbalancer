import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  ApiFlowCategory,
  ApiFlowEvent,
  ApiFlowTarget,
} from './api-flow.models';

interface RouteDescriptor {
  category: ApiFlowCategory;
  categoryLabel: string;
  target: ApiFlowTarget;
  targetLabel: string;
}

@Injectable({ providedIn: 'root' })
export class ApiFlowService {
  private readonly maxEvents = 160;
  private readonly eventsSubject = new BehaviorSubject<ApiFlowEvent[]>([]);

  readonly events$ = this.eventsSubject.asObservable();

  beginRequest(method: string, url: string): string {
    const path = this.extractPath(url);
    const descriptor = this.describePath(path);
    const event: ApiFlowEvent = {
      id: this.createId(),
      method: method.toUpperCase(),
      url,
      path,
      category: descriptor.category,
      categoryLabel: descriptor.categoryLabel,
      target: descriptor.target,
      targetLabel: descriptor.targetLabel,
      phase: 'pending',
      statusCode: null,
      startedAt: Date.now(),
      completedAt: null,
      durationMs: null,
      selectedBackend: null,
      errorMessage: null,
    };

    this.eventsSubject.next([event, ...this.eventsSubject.value].slice(0, this.maxEvents));
    return event.id;
  }

  completeRequest(id: string, statusCode: number, selectedBackend: string | null): void {
    this.updateEvent(id, {
      phase: statusCode >= 400 ? 'error' : 'success',
      statusCode,
      selectedBackend,
      completedAt: Date.now(),
    });
  }

  failRequest(id: string, statusCode: number | null, message: string): void {
    this.updateEvent(id, {
      phase: 'error',
      statusCode,
      errorMessage: message,
      completedAt: Date.now(),
    });
  }

  cancelRequest(id: string): void {
    this.updateEvent(id, {
      phase: 'cancelled',
      errorMessage: 'Request was cancelled before a response was received.',
      completedAt: Date.now(),
    });
  }

  clear(): void {
    this.eventsSubject.next([]);
  }

  getSnapshot(): ApiFlowEvent[] {
    return this.eventsSubject.value;
  }

  private updateEvent(
    id: string,
    patch: Partial<Pick<ApiFlowEvent, 'phase' | 'statusCode' | 'selectedBackend' | 'errorMessage' | 'completedAt'>>
  ): void {
    const now = patch.completedAt ?? Date.now();
    const next = this.eventsSubject.value.map((event) => {
      if (event.id !== id) return event;
      return {
        ...event,
        ...patch,
        durationMs: Math.max(0, now - event.startedAt),
      };
    });
    this.eventsSubject.next(next);
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

  private createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `flow-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
