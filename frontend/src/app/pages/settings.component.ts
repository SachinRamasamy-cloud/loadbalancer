import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService, ConnectionTestResult } from '../services/api.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, NgClass, RouterLink, RouterLinkActive],
  template: `
    <section class="lf-page">
      <div class="mb-5">
        <h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Settings</h1>
        <p class="mt-1 text-[11px] text-[#778196]">Configure system settings and API connections.</p>
      </div>

      <div *ngIf="notification" class="mb-4 rounded-lg p-3 text-[11px] font-medium" [ngClass]="notification.type === 'success' ? 'bg-[#eafbf9] text-[#08a981]' : 'bg-[#fff0f2] text-[#ef3f55]'">
        {{ notification.message }}
      </div>

      <div class="grid gap-4 xl:grid-cols-[170px_1.05fr_1.15fr_1.15fr]">
        <nav class="lf-card h-fit p-2">
          <a *ngFor="let tab of tabs" [routerLink]="tab.route" routerLinkActive="bg-gradient-to-r from-[#8b55ee] to-[#7543e7] text-white shadow-sm" class="block rounded-[6px] px-3 py-2.5 text-[10px] font-medium text-[#465269] hover:bg-[#f5f1ff]">{{ tab.label }}</a>
        </nav>

        <article class="lf-card p-4">
          <h2 class="lf-card-title text-[14px]">API Connection</h2>
          <div class="mt-5 space-y-4">
            <label class="block">
              <span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Backend API URL</span>
              <input class="lf-input" [(ngModel)]="apiUrl" placeholder="http://localhost:8080" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Admin API Key (X-Admin-API-Key)</span>
              <input class="lf-input" type="password" [(ngModel)]="apiKey" placeholder="X-Admin-API-Key value" />
            </label>

            <div class="rounded-lg bg-gray-50 p-2 text-[10px] font-medium text-gray-500">
              The frontend calls FastAPI only. Supabase credentials must remain in the backend environment.
            </div>

            <div *ngIf="connectionResult" class="space-y-2 rounded-lg border border-[#e7ebf1] p-3 text-[10px]">
              <div class="flex justify-between">
                <span class="text-[#778196]">FastAPI</span>
                <strong [ngClass]="connectionResult.platform.status === 'ok' ? 'text-[#08a981]' : 'text-[#f59e0b]'">
                  {{ connectionResult.platform.status }}
                </strong>
              </div>
              <div class="flex justify-between">
                <span class="text-[#778196]">Supabase</span>
                <strong [ngClass]="connectionResult.database.database.available ? 'text-[#08a981]' : 'text-[#ef3f55]'">
                  {{ connectionResult.database.database.available ? 'Connected' : 'Unavailable' }}
                </strong>
              </div>
              <div class="flex justify-between">
                <span class="text-[#778196]">History Worker</span>
                <strong [ngClass]="connectionResult.database.api_history_worker.running ? 'text-[#08a981]' : 'text-[#f59e0b]'">
                  {{ connectionResult.database.api_history_worker.running ? 'Running' : 'Stopped' }}
                </strong>
              </div>
            </div>

            <button (click)="testConnection()" [disabled]="testingConnection" class="lf-button-secondary w-full">
              {{ testingConnection ? 'Testing Connection...' : 'Test Connection' }}
            </button>
          </div>
        </article>

        <article class="lf-card p-4">
          <h2 class="lf-card-title text-[14px]">Routing Settings</h2>
          <div class="mt-5 space-y-4">
            <label class="block">
              <span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Active Routing Algorithm</span>
              <select class="lf-select text-[11px]" [(ngModel)]="selectedAlgorithm">
                <option *ngFor="let algo of availableAlgorithms" [value]="algo">
                  {{ formatAlgoName(algo) }}
                </option>
              </select>
            </label>
            <div class="space-y-1 text-[10px] text-[#778196]">
              <p><strong>Round Robin:</strong> predictable, equal rotation.</p>
              <p><strong>Smooth Weighted Round Robin:</strong> proportional capacity without bursty loops.</p>
              <p><strong>Least In-Flight:</strong> chooses the lowest active-requests-to-weight score.</p>
            </div>
          </div>
        </article>

        <article class="lf-card flex flex-col p-4">
          <h2 class="lf-card-title text-[14px]">Health Check Configuration</h2>
          <div class="mt-5 space-y-4 text-[10px]">
            <p>LoadFlow performs active backend health checks at background intervals.</p>
            <dl class="space-y-2 text-[11px]">
              <div class="flex justify-between border-b border-gray-100 pb-1">
                <dt class="font-medium text-gray-500">Interval</dt>
                <dd class="font-semibold text-gray-800">5 seconds</dd>
              </div>
              <div class="flex justify-between border-b border-gray-100 pb-1">
                <dt class="font-medium text-gray-500">Timeout</dt>
                <dd class="font-semibold text-gray-800">3 seconds</dd>
              </div>
              <div class="flex justify-between border-b border-gray-100 pb-1">
                <dt class="font-medium text-gray-500">Healthy Threshold</dt>
                <dd class="font-semibold text-gray-800">2 successes</dd>
              </div>
              <div class="flex justify-between pb-1">
                <dt class="font-medium text-gray-500">Unhealthy Threshold</dt>
                <dd class="font-semibold text-gray-800">3 failures</dd>
              </div>
            </dl>
          </div>
          <div class="mt-auto pt-8 text-right">
            <button (click)="saveChanges()" class="lf-button-primary">Save Changes</button>
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

  readonly tabs = [
    { label: 'General & Connection', route: '/settings/general' },
    { label: 'Routing', route: '/settings/routing' },
    { label: 'Health Checks', route: '/settings/health-checks' },
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

  loadRouting(): void {
    this.apiService.getRouting().subscribe({
      next: (data) => {
        this.selectedAlgorithm = data.algorithm;
        this.availableAlgorithms = data.available?.length
          ? data.available
          : this.availableAlgorithms;
        this.cdr.detectChanges();
      },
      error: () => {
        // The connection form remains usable even when the saved endpoint is offline.
      },
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

  saveChanges(): void {
    this.notification = null;
    this.apiService.setApiUrl(this.apiUrl);
    this.apiService.setApiKey(this.apiKey);

    this.apiService.updateRouting(this.selectedAlgorithm).subscribe({
      next: () => {
        this.apiUrl = this.apiService.getApiUrl();
        this.showNotification('success', 'Connection settings and routing algorithm were saved.');
        this.loadRouting();
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.showNotification(
          'error',
          `The local connection settings were saved, but the routing update failed: ${this.apiService.getErrorMessage(error)}`
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
