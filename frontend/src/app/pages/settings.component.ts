import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { ApiService, ConnectionTestResult } from '../services/api.service';
import { StatCardComponent } from '../shared/stat-card.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, NgClass, StatCardComponent, IconComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex items-start justify-between">
        <div>
          <h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Settings</h1>
          <p class="mt-1 text-[11px] text-[#778196]">Configure API connection, routing algorithm, and health checks.</p>
        </div>
        <div class="flex gap-2">
          <button (click)="testConnection()" [disabled]="testingConnection" class="lf-button-secondary">
            <app-icon name="activity" [size]="13" />
            {{ testingConnection ? 'Testing...' : 'Test Connection' }}
          </button>
          <button (click)="saveChanges()" class="lf-button-primary">
            <app-icon name="refresh" [size]="13" /> Save Changes
          </button>
        </div>
      </div>

      <div *ngIf="notification" class="mb-4 flex items-center gap-2 rounded-lg border p-3 text-[11px] font-medium" [ngClass]="notification.type === 'success' ? 'border-[#bdeee8] bg-[#edfffc] text-[#078c82]' : 'border-[#f5c6cb] bg-[#fff0f2] text-[#cf3548]'">
        <app-icon [name]="notification.type === 'success' ? 'activity' : 'close'" [size]="14" />
        {{ notification.message }}
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card
          label="Active Algorithm"
          [value]="formatAlgoName(selectedAlgorithm)"
          hint="Load balancing strategy"
          tone="info"
        />
        <app-stat-card
          label="Backend URL"
          [value]="getShortUrl(apiUrl)"
          hint="FastAPI endpoint"
        />
        <app-stat-card
          label="Connection"
          [value]="connectionStatus"
          [hint]="connectionHint"
          [tone]="connectionResult ? 'success' : 'neutral'"
        />
        <app-stat-card
          label="Database"
          [value]="databaseStatus"
          [hint]="databaseHint"
          [tone]="connectionResult?.database?.database?.available ? 'success' : 'neutral'"
        />
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article class="lf-card p-5">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1ecff]">
              <app-icon name="network" [size]="16" class="text-[#7c3aed]" />
            </div>
            <div>
              <h2 class="lf-card-title">API Connection</h2>
              <p class="mt-0.5 text-[10px] text-[#8b95a7]">Backend URL and authentication credentials</p>
            </div>
          </div>
          <div class="mt-5 space-y-4">
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold text-[#606b7f]">Backend API URL</span>
              <input class="lf-input" [(ngModel)]="apiUrl" placeholder="http://localhost:8080" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold text-[#606b7f]">Admin API Key</span>
              <input class="lf-input" type="password" [(ngModel)]="apiKey" placeholder="X-Admin-API-Key value" />
            </label>
            <div class="rounded-lg bg-[#f7f8fb] p-3 text-[10px] leading-5 text-[#7b8597]">
              The frontend communicates with FastAPI only. Supabase credentials remain in the backend environment.
            </div>
          </div>
        </article>

        <article class="lf-card p-5">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eafbf5]">
              <app-icon name="activity" [size]="16" class="text-[#0ca78f]" />
            </div>
            <div>
              <h2 class="lf-card-title">Routing Algorithm</h2>
              <p class="mt-0.5 text-[10px] text-[#8b95a7]">Select how requests are distributed across backends</p>
            </div>
          </div>
          <div class="mt-5 space-y-4">
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold text-[#606b7f]">Active Algorithm</span>
              <select class="lf-select" [(ngModel)]="selectedAlgorithm">
                <option *ngFor="let algo of availableAlgorithms" [value]="algo">
                  {{ formatAlgoName(algo) }}
                </option>
              </select>
            </label>
            <div class="space-y-2.5">
              <div *ngFor="let desc of algorithmDescriptions" class="flex items-start gap-2.5 rounded-lg border p-3" [ngClass]="selectedAlgorithm === desc.key ? 'border-[#c8b5f5] bg-[#faf8ff]' : 'border-[#e6e9ef] bg-[#fafbfc]'">
                <div class="mt-0.5 h-2 w-2 shrink-0 rounded-full" [ngClass]="selectedAlgorithm === desc.key ? 'bg-[#7c3aed]' : 'bg-[#d1d5df]'"></div>
                <div>
                  <p class="text-[10px] font-semibold" [ngClass]="selectedAlgorithm === desc.key ? 'text-[#4c2889]' : 'text-[#3a465d]'">{{ desc.label }}</p>
                  <p class="mt-0.5 text-[9px] leading-4 text-[#8b95a7]">{{ desc.hint }}</p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article class="lf-card p-5">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edfffc]">
              <app-icon name="refresh" [size]="16" class="text-[#0ca78f]" />
            </div>
            <div>
              <h2 class="lf-card-title">Health Checks</h2>
              <p class="mt-0.5 text-[10px] text-[#8b95a7]">Active backend health monitoring configuration</p>
            </div>
          </div>
          <div class="mt-5">
            <dl class="space-y-3">
              <div class="flex items-center justify-between rounded-lg bg-[#f7f8fb] px-3 py-2.5">
                <dt class="text-[10px] font-medium text-[#6b7688]">Check Interval</dt>
                <dd class="text-[11px] font-semibold text-[#2d394f]">5 seconds</dd>
              </div>
              <div class="flex items-center justify-between rounded-lg bg-[#f7f8fb] px-3 py-2.5">
                <dt class="text-[10px] font-medium text-[#6b7688]">Request Timeout</dt>
                <dd class="text-[11px] font-semibold text-[#2d394f]">3 seconds</dd>
              </div>
              <div class="flex items-center justify-between rounded-lg bg-[#f7f8fb] px-3 py-2.5">
                <dt class="text-[10px] font-medium text-[#6b7688]">Healthy Threshold</dt>
                <dd class="text-[11px] font-semibold text-[#2d394f]">2 consecutive successes</dd>
              </div>
              <div class="flex items-center justify-between rounded-lg bg-[#f7f8fb] px-3 py-2.5">
                <dt class="text-[10px] font-medium text-[#6b7688]">Unhealthy Threshold</dt>
                <dd class="text-[11px] font-semibold text-[#2d394f]">3 consecutive failures</dd>
              </div>
            </dl>
          </div>
        </article>

        <article class="lf-card p-5">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff5e5]">
              <app-icon name="logs" [size]="16" class="text-[#d97706]" />
            </div>
            <div>
              <h2 class="lf-card-title">Connection Status</h2>
              <p class="mt-0.5 text-[10px] text-[#8b95a7]">Last tested backend connectivity results</p>
            </div>
          </div>
          <div class="mt-5">
            <div *ngIf="connectionResult; else noTest" class="space-y-3">
              <div class="flex items-center justify-between rounded-lg border border-[#e6e9ef] px-3 py-3">
                <div class="flex items-center gap-2">
                  <div class="h-2 w-2 rounded-full" [ngClass]="connectionResult.platform.status === 'ok' ? 'bg-[#10b981]' : 'bg-[#f59e0b]'"></div>
                  <span class="text-[11px] font-medium text-[#3a465d]">FastAPI</span>
                </div>
                <span class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" [ngClass]="connectionResult.platform.status === 'ok' ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#fffbeb] text-[#d97706]'">
                  {{ connectionResult.platform.status }}
                </span>
              </div>
              <div class="flex items-center justify-between rounded-lg border border-[#e6e9ef] px-3 py-3">
                <div class="flex items-center gap-2">
                  <div class="h-2 w-2 rounded-full" [ngClass]="connectionResult.database.database.available ? 'bg-[#10b981]' : 'bg-[#ef4444]'"></div>
                  <span class="text-[11px] font-medium text-[#3a465d]">Supabase</span>
                </div>
                <span class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" [ngClass]="connectionResult.database.database.available ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#fef2f2] text-[#dc2626]'">
                  {{ connectionResult.database.database.available ? 'Connected' : 'Unavailable' }}
                </span>
              </div>
              <div class="flex items-center justify-between rounded-lg border border-[#e6e9ef] px-3 py-3">
                <div class="flex items-center gap-2">
                  <div class="h-2 w-2 rounded-full" [ngClass]="connectionResult.database.api_history_worker.running ? 'bg-[#10b981]' : 'bg-[#f59e0b]'"></div>
                  <span class="text-[11px] font-medium text-[#3a465d]">History Worker</span>
                </div>
                <span class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" [ngClass]="connectionResult.database.api_history_worker.running ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#fffbeb] text-[#d97706]'">
                  {{ connectionResult.database.api_history_worker.running ? 'Running' : 'Stopped' }}
                </span>
              </div>
            </div>
            <ng-template #noTest>
              <div class="flex min-h-[180px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#dfe3eb] bg-[#fafbfc] px-4 text-center">
                <app-icon name="eye" [size]="20" class="text-[#b0b8c7]" />
                <p class="mt-2 text-[10px] text-[#8b95a7]">Click "Test Connection" to verify backend connectivity.</p>
              </div>
            </ng-template>
          </div>
        </article>
      </div>
    </section>
  `,
})
export class SettingsComponent implements OnInit {
  apiUrl = '';
  apiKey = '';
  selectedAlgorithm = 'round_robin';
  availableAlgorithms: string[] = [
    'round_robin',
    'smooth_weighted_round_robin',
    'least_inflight',
  ];

  connectionResult: ConnectionTestResult | null = null;
  testingConnection = false;
  notification: { type: 'success' | 'error'; message: string } | null = null;

  readonly algorithmDescriptions = [
    { key: 'round_robin', label: 'Round Robin', hint: 'Equal rotation across all healthy backends. Predictable and simple.' },
    { key: 'smooth_weighted_round_robin', label: 'Smooth Weighted Round Robin', hint: 'Proportional distribution based on backend weight. Prevents bursty traffic spikes.' },
    { key: 'least_inflight', label: 'Least In-Flight', hint: 'Routes to the backend with the lowest active-requests-to-weight ratio.' },
  ];

  constructor(
    private readonly apiService: ApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.apiUrl = this.apiService.getApiUrl();
    this.apiKey = this.apiService.getApiKey();
    this.loadRouting();
  }

  get connectionStatus(): string {
    if (!this.connectionResult) return 'Not tested';
    return this.connectionResult.platform.status === 'ok' ? 'Healthy' : 'Degraded';
  }

  get connectionHint(): string {
    if (!this.connectionResult) return 'Run a connection test';
    return this.connectionResult.platform.status === 'ok' ? 'All services reachable' : 'Some services unreachable';
  }

  get databaseStatus(): string {
    if (!this.connectionResult?.database?.database) return 'Unknown';
    return this.connectionResult.database.database.available ? 'Connected' : 'Unavailable';
  }

  get databaseHint(): string {
    if (!this.connectionResult?.database?.api_history_worker) return 'Requires connection test';
    return this.connectionResult.database.api_history_worker.running ? 'History worker active' : 'History worker stopped';
  }

  loadRouting(): void {
    this.apiService.getRouting().subscribe({
      next: (data) => {
        this.selectedAlgorithm = data.algorithm;
        this.availableAlgorithms = data.available?.length
          ? data.available
          : this.availableAlgorithms;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  testConnection(): void {
    this.notification = null;
    this.connectionResult = null;
    this.testingConnection = true;

    this.apiService.testConnection(this.apiUrl, this.apiKey).subscribe({
      next: (result) => {
        this.connectionResult = result;
        this.testingConnection = false;
        this.showNotification(
          result.database.database.available ? 'success' : 'error',
          result.database.database.available
            ? 'FastAPI, Supabase, and the API history worker are reachable.'
            : 'FastAPI is reachable, but Supabase is unavailable.'
        );
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.testingConnection = false;
        this.showNotification('error', this.apiService.getErrorMessage(error));
        this.cdr.detectChanges();
      },
    });
  }

  formatAlgoName(algorithm: string): string {
    return algorithm
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getShortUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname + (parsed.port ? ':' + parsed.port : '');
    } catch {
      return url.length > 20 ? url.slice(0, 20) + '...' : url;
    }
  }

  saveChanges(): void {
    this.notification = null;
    this.apiService.setApiUrl(this.apiUrl);
    this.apiService.setApiKey(this.apiKey);

    this.apiService.updateRouting(this.selectedAlgorithm).subscribe({
      next: () => {
        this.apiUrl = this.apiService.getApiUrl();
        this.showNotification('success', 'Connection settings and routing algorithm saved successfully.');
        this.loadRouting();
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.showNotification(
          'error',
          `Local settings saved, but routing update failed: ${this.apiService.getErrorMessage(error)}`
        );
        this.cdr.detectChanges();
      },
    });
  }

  private showNotification(type: 'success' | 'error', message: string): void {
    this.notification = { type, message };
    window.setTimeout(() => {
      this.notification = null;
      this.cdr.detectChanges();
    }, 6000);
  }
}
