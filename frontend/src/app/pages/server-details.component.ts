import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgClass, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { StatCardComponent } from '../shared/stat-card.component';
import { ApiService, BackendModel, TrackingRecord } from '../services/api.service';

@Component({
  selector: 'app-server-details-page',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, TitleCasePipe, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Server Details</h1>
          <p class="mt-1 text-[11px] text-[#778196]">Inspect backend resource usage, health and active requests.</p>
        </div>
        <button (click)="loadData()" class="lf-button-secondary">Refresh</button>
      </div>

      <!-- Server Selector Dropdown -->
      <div class="mb-5 flex items-center gap-3 bg-white p-3 rounded-xl border border-[#e2e8f0] w-fit">
        <label class="text-[11px] font-semibold text-[#606b7f]">Select Server:</label>
        <select class="lf-select text-[11px] min-w-[200px]" (change)="onServerChange($event)">
          <option *ngFor="let b of backends" [value]="b.id" [selected]="b.id === selectedBackend?.id">
            {{ b.name }} ({{ b.id }})
          </option>
        </select>
      </div>

      <div *ngIf="selectedBackend" class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <app-stat-card label="CPU Usage" [value]="getEstimatedCpu(selectedBackend) + '%'" hint="Estimated load" [tone]="getEstimatedCpu(selectedBackend) > 60 ? 'warning' : 'success'" />
          <app-stat-card label="Memory Usage" [value]="getEstimatedMemory(selectedBackend) + '%'" hint="Estimated RAM" />
          <app-stat-card label="Active Requests" [value]="selectedBackend.active_requests.toString()" hint="Currently in flight" />
          <app-stat-card label="Uptime" [value]="selectedBackend.eligible ? 'Online' : 'Disabled'" hint="Status eligibility" [tone]="selectedBackend.eligible ? 'success' : 'neutral'" />
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <article class="lf-card p-5">
            <h2 class="lf-card-title">Server Information</h2>
            <dl class="mt-5 grid grid-cols-2 gap-4 text-[11px]">
              <dt class="text-[#7b8597]">Server ID</dt>
              <dd class="font-semibold text-gray-800">{{ selectedBackend.id }}</dd>
              <dt class="text-[#7b8597]">IP Address</dt>
              <dd class="text-gray-600">{{ getIp(selectedBackend.url) }}</dd>
              <dt class="text-[#7b8597]">Port</dt>
              <dd class="text-gray-600">{{ getPort(selectedBackend.url) }}</dd>
              <dt class="text-[#7b8597]">Pool</dt>
              <dd class="text-gray-600 font-semibold">{{ getPoolName(selectedBackend.id) }}</dd>
              <dt class="text-[#7b8597]">Weight</dt>
              <dd class="text-gray-600">{{ selectedBackend.weight }}</dd>
              <dt class="text-[#7b8597]">Health Check Status</dt>
              <dd class="font-bold" [ngClass]="selectedBackend.status === 'healthy' ? 'text-[#0aa985]' : 'text-[#f04455]'">
                {{ selectedBackend.status | titlecase }}
              </dd>
            </dl>
          </article>

          <article class="lf-card p-5">
            <h2 class="lf-card-title">Recent Activity History</h2>
            <div class="mt-5 space-y-3 text-[11px] max-h-[300px] overflow-y-auto">
              <div *ngFor="let log of backendLogs" class="rounded-lg bg-[#f8fafc] p-3 border border-gray-100">
                <div class="flex justify-between">
                  <strong class="text-indigo-600">{{ log.method }} {{ log.path }}</strong>
                  <span [ngClass]="log.status_code >= 400 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'">
                    HTTP {{ log.status_code }}
                  </span>
                </div>
                <div class="mt-1 flex justify-between text-[9px] text-gray-500">
                  <span>Latency: {{ log.duration_ms }} ms</span>
                  <span>{{ formatTimestamp(log.timestamp) }}</span>
                </div>
              </div>
              <div *ngIf="backendLogs.length === 0" class="py-12 text-center text-gray-500 text-[11px]">
                No recent request activity recorded for this backend.
              </div>
            </div>
          </article>
        </div>
      </div>

      <div *ngIf="backends.length === 0" class="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-100">
        No backend servers registered. Go to "Real Servers" to register one first.
      </div>
    </section>
  `,
})
export class ServerDetailsComponent implements OnInit {
  backends: BackendModel[] = [];
  selectedBackend: BackendModel | null = null;
  backendLogs: TrackingRecord[] = [];

  constructor(private readonly apiService: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.apiService.getBackends().subscribe({
      next: (backends) => {
        this.backends = backends || [];
        if (backends.length > 0) {
          if (!this.selectedBackend) {
            this.selectedBackend = backends[0];
          } else {
            // refresh selected backend info
            const found = backends.find(b => b.id === this.selectedBackend?.id);
            if (found) this.selectedBackend = found;
          }
          this.loadBackendLogs();
        } else {
          this.selectedBackend = null;
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching backends:', err),
    });
  }

  loadBackendLogs(): void {
    if (!this.selectedBackend) return;
    this.apiService.getTrackingRecords(200).subscribe({
      next: (logs) => {
        this.backendLogs = (logs || []).filter(l => l.backend_id === this.selectedBackend?.id);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching backend logs:', err),
    });
  }

  onServerChange(event: any): void {
    const val = event.target.value;
    const found = this.backends.find(b => b.id === val);
    if (found) {
      this.selectedBackend = found;
      this.loadBackendLogs();
    }
  }

  getIp(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      return url.hostname;
    } catch {
      return urlStr;
    }
  }

  getPort(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      return url.port || (url.protocol === 'https:' ? '443' : '80');
    } catch {
      return '';
    }
  }

  getPoolName(id: string): string {
    const b_id = id.toLowerCase();
    if (b_id.includes('fast') || b_id.includes('web')) return 'App-Web-Pool';
    if (b_id.includes('slow') || b_id.includes('unstable') || b_id.includes('api')) return 'App-API-Pool';
    return 'Default-Pool';
  }

  getEstimatedCpu(row: BackendModel): number {
    return Math.min(Math.round(row.active_requests * 12 + (row.id.includes('slow') ? 30 : 10)), 95);
  }

  getEstimatedMemory(row: BackendModel): number {
    return Math.min(Math.round(row.weight * 10 + 25), 85);
  }

  formatTimestamp(isoStr: string): string {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString();
    } catch {
      return isoStr;
    }
  }
}
