import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { IconComponent } from '../shared/icon.component';
import { StatCardComponent } from '../shared/stat-card.component';

@Component({
  selector: 'app-traffic-analytics-page',
  standalone: true,
  imports: [NgFor, IconComponent, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">API Performance</h1><p class="mt-1 text-[11px] text-[#778196]">Monitor API endpoints performance and error rates.</p></div>
        <div class="flex gap-2"><button class="lf-button-secondary">Last 24 Hours <app-icon name="chevron" [size]="13" /></button><button class="lf-button-secondary"><app-icon name="filter" [size]="14" /> Filters</button></div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Total Requests" value="2.48M" hint="↑ 12.5%" tone="success" />
        <app-stat-card label="Avg Latency" value="128 ms" hint="↓ 8.2%" tone="success" />
        <app-stat-card label="P95 Latency" value="312 ms" hint="↓ 6.1%" tone="success" />
        <app-stat-card label="Error Rate" value="0.35%" hint="↓ 0.12%" tone="success" />
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.55fr]">
        <article class="lf-card p-4">
          <h2 class="lf-card-title">Top Endpoints by Requests</h2>
          <div class="mt-4 space-y-4">
            <div *ngFor="let endpoint of endpoints" class="grid grid-cols-[minmax(95px,1fr)_1.2fr_45px_42px] items-center gap-3 text-[10px]">
              <span class="truncate font-medium text-[#3a465d]">{{ endpoint.path }}</span>
              <div class="h-1.5 overflow-hidden rounded-full bg-[#f0e9ff]"><div class="h-full rounded-full bg-gradient-to-r from-[#8b43ee] to-[#7829df]" [style.width.%]="endpoint.progress"></div></div>
              <span class="text-right text-[#5f6a7e]">{{ endpoint.requests }}</span>
              <span class="text-right text-[#5f6a7e]">{{ endpoint.share }}</span>
            </div>
          </div>
        </article>

        <article class="lf-card overflow-hidden">
          <div class="px-4 pt-4"><h2 class="lf-card-title">Endpoint Performance</h2></div>
          <div class="mt-3 overflow-x-auto">
            <table class="lf-table min-w-[700px]">
              <thead><tr><th>Endpoint</th><th>Requests</th><th>Avg Latency</th><th>P95 Latency</th><th>P99 Latency</th><th>Error Rate</th></tr></thead>
              <tbody><tr *ngFor="let row of performance"><td class="font-semibold text-[#283348]">{{ row.path }}</td><td>{{ row.requests }}</td><td>{{ row.avg }}</td><td>{{ row.p95 }}</td><td>{{ row.p99 }}</td><td>{{ row.error }}</td></tr></tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  `,
})
export class TrafficAnalyticsComponent {
  readonly endpoints = [
    { path: '/api/v1/auth', requests: '320k', share: '12.9%', progress: 100 },
    { path: '/api/v1/users', requests: '280k', share: '11.3%', progress: 88 },
    { path: '/api/v1/orders', requests: '245k', share: '9.9%', progress: 77 },
    { path: '/api/v1/products', requests: '210k', share: '8.5%', progress: 66 },
    { path: '/api/v1/payments', requests: '180k', share: '7.3%', progress: 56 },
  ];

  readonly performance = [
    { path: '/api/v1/auth', requests: '320k', avg: '95 ms', p95: '210 ms', p99: '380 ms', error: '0.23%' },
    { path: '/api/v1/users', requests: '280k', avg: '110 ms', p95: '250 ms', p99: '420 ms', error: '0.16%' },
    { path: '/api/v1/orders', requests: '245k', avg: '142 ms', p95: '310 ms', p99: '520 ms', error: '0.42%' },
    { path: '/api/v1/products', requests: '210k', avg: '130 ms', p95: '280 ms', p99: '480 ms', error: '0.31%' },
    { path: '/api/v1/payments', requests: '180k', avg: '180 ms', p95: '410 ms', p99: '650 ms', error: '0.52%' },
  ];
}
