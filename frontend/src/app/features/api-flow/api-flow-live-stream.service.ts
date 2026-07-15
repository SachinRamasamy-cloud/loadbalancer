import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ApiFlowService } from './api-flow.service';
import { ApiFlowStreamState, BackendApiFlowEvent } from './api-flow.models';

@Injectable({ providedIn: 'root' })
export class ApiFlowLiveStreamService {
  private abortController: AbortController | null = null;
  private running = false;
  private reconnectAttempts = 0;
  private receivedEvents = 0;

  private readonly stateSubject = new BehaviorSubject<ApiFlowStreamState>({
    status: 'disconnected',
    receivedEvents: 0,
    reconnectAttempts: 0,
    lastEventAt: null,
    errorMessage: null,
  });

  readonly state$ = this.stateSubject.asObservable();

  constructor(
    private readonly apiService: ApiService,
    private readonly flowService: ApiFlowService,
    private readonly zone: NgZone
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.connectLoop();
  }

  stop(): void {
    this.running = false;
    this.abortController?.abort();
    this.abortController = null;
    this.updateState({ status: 'disconnected', errorMessage: null });
  }

  restart(): void {
    this.stop();
    this.reconnectAttempts = 0;
    this.start();
  }

  private async connectLoop(): Promise<void> {
    while (this.running) {
      const status = this.reconnectAttempts === 0 ? 'connecting' : 'reconnecting';
      this.updateState({ status, reconnectAttempts: this.reconnectAttempts, errorMessage: null });

      this.abortController = new AbortController();
      try {
        await this.consumeStream(this.abortController.signal);
        if (this.running) {
          throw new Error('Live API stream closed by the server');
        }
      } catch (error) {
        if (!this.running || this.abortController.signal.aborted) break;
        const message = error instanceof Error ? error.message : 'Live API stream failed';
        this.reconnectAttempts += 1;
        this.updateState({
          status: 'error',
          reconnectAttempts: this.reconnectAttempts,
          errorMessage: message,
        });
        const delay = Math.min(30_000, 1_500 * 2 ** Math.min(this.reconnectAttempts - 1, 4));
        await this.sleep(delay);
      }
    }
  }

  private async consumeStream(signal: AbortSignal): Promise<void> {
    const url = `${this.apiService.getApiUrl()}/api/control/events/stream?recent=500`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'X-Admin-API-Key': this.apiService.getApiKey(),
      },
      cache: 'no-store',
      signal,
    });

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.text();
        if (body) detail = `: ${body.slice(0, 300)}`;
      } catch {
        // Ignore body-read failures and report the HTTP status.
      }

      if (response.status === 401) {
        throw new Error(
          'Live API stream returned HTTP 401. Update the Admin API Key in Settings so it matches backend/.env.'
        );
      }

      throw new Error(`Live API stream returned HTTP ${response.status}${detail}`);
    }
    if (!response.body) {
      throw new Error('Live API stream response has no body');
    }

    this.reconnectAttempts = 0;
    this.updateState({ status: 'connected', reconnectAttempts: 0, errorMessage: null });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (this.running) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        this.processSseBlock(block);
        boundary = buffer.indexOf('\n\n');
      }
    }
  }

  private processSseBlock(block: string): void {
    const lines = block.split(/\r?\n/);
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');

    if (!data) return;

    try {
      const event = JSON.parse(data) as BackendApiFlowEvent;
      this.zone.run(() => {
        this.flowService.ingestBackendEvent(event);
        this.receivedEvents += 1;
        this.updateState({
          status: 'connected',
          receivedEvents: this.receivedEvents,
          lastEventAt: Date.now(),
          errorMessage: null,
        });
      });
    } catch {
      // Ignore malformed events and keep the stream alive.
    }
  }

  private updateState(patch: Partial<ApiFlowStreamState>): void {
    const next = { ...this.stateSubject.value, ...patch };
    this.zone.run(() => this.stateSubject.next(next));
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
