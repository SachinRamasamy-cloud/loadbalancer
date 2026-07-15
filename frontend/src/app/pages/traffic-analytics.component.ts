import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { IconComponent } from '../shared/icon.component';
import { StatCardComponent } from '../shared/stat-card.component';
import { ApiService, OverviewMetrics } from '../services/api.service';

@Component({
  selector: 'app-traffic-analytics-page',
  standalone: true,
  imports: [NgFor, NgIf, IconComponent, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">API Performance</h1><p class="mt-1 text-[11px] text-[#778196]">Monitor API endpoints performance and error rates.</p></div>
        <div class="flex gap-2">
          <button (click)="loadAnalytics()" class="lf-button-secondary">
            <app-icon name="refresh" [size]="14" /> Refresh
          </button>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Total Requests" [value]="formatNumber(overview?.total_requests || 0)" hint="Processed total" tone="success" />
        <app-stat-card label="Avg Latency" [value]="(overview?.average_latency_ms || 0) + ' ms'" hint="Mean latency" tone="success" />
        <app-stat-card label="P95 Latency" [value]="(overview?.p95_latency_ms || 0) + ' ms'" hint="95th percentile" tone="success" />
        <app-stat-card label="Error Rate" [value]="(overview?.error_rate || 0) + '%'" hint="Total failure rate" tone="success" />
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.55fr]">
        <article class="lf-card p-4">
          <h2 class="lf-card-title">Top Endpoints by Requests</h2>
          <div class="mt-4 space-y-4">
            <div *ngFor="let endpoint of endpoints" class="grid grid-cols-[minmax(95px,1fr)_1.2fr_45px_42px] items-center gap-3 text-[10px]">
              <span class="truncate font-medium text-[#3a465d]">{{ endpoint.path }}</span>
              <div class="h-1.5 overflow-hidden rounded-full bg-[#f0e9ff]">
                <div class="h-full rounded-full bg-gradient-to-r from-[#8b43ee] to-[#7829df]" [style.width.%]="endpoint.progress"></div>
              </div>
              <span class="text-right text-[#5f6a7e]">{{ endpoint.requests }}</span>
              <span class="text-right text-[#5f6a7e]">{{ endpoint.share }}</span>
            </div>
            <div *ngIf="endpoints.length === 0" class="text-center py-8 text-[#778196] text-[11px]">
              No active endpoint data.
            </div>
          </div>
        </article>

        <article class="lf-card overflow-hidden">
          <div class="px-4 pt-4"><h2 class="lf-card-title">Endpoint Performance</h2></div>
          <div class="mt-3 overflow-x-auto">
            <table class="lf-table min-w-[700px]">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Requests</th>
                  <th>Avg Latency</th>
                  <th>P95 Latency</th>
                  <th>P99 Latency</th>
                  <th>Error Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of performance">
                  <td class="font-semibold text-[#283348]">{{ row.path }}</td>
                  <td>{{ row.requests }}</td>
                  <td>{{ row.avg }}</td>
                  <td>{{ row.p95 }}</td>
                  <td>{{ row.p99 }}</td>
                  <td>{{ row.error }}</td>
                </tr>
                <tr *ngIf="performance.length === 0">
                  <td colspan="6" class="text-center py-8 text-[#778196]">
                    No performance data available.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  `,
})
export class TrafficAnalyticsComponent implements OnInit {
  overview: OverviewMetrics | null = null;
  endpoints: any[] = [];
  performance: any[] = [];

  constructor(private readonly apiService: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    // Fetch Overview metrics
    this.apiService.getOverview().subscribe({
      next: (data) => {
        this.overview = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching overview for analytics:', err),
    });

    // Fetch Endpoint analytics
    this.apiService.getAnalytics().subscribe({
      next: (data) => {
        this.endpoints = data?.endpoints || [];
        this.performance = data?.performance || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching endpoints analytics:', err),
    });
  }

  formatNumber(val: number): string {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(2) + 'M';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(1) + 'k';
    }
    return val.toString();
  }
}
