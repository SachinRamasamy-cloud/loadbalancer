import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { IconComponent } from '../shared/icon.component';
import { StatCardComponent } from '../shared/stat-card.component';

@Component({
  selector: 'app-health-alerts-page',
  standalone: true,
  imports: [NgFor, IconComponent, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Health & Alerts</h1><p class="mt-1 text-[11px] text-[#778196]">Monitor system health and active alerts.</p></div>
        <button class="lf-button-primary">Mark all as read</button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Total Alerts" value="24" hint="Active alerts" />
        <app-stat-card label="Critical" value="4" hint="17% of alerts" tone="danger" />
        <app-stat-card label="Warning" value="12" hint="50% of alerts" tone="warning" />
        <app-stat-card label="Info" value="8" hint="33% of alerts" tone="info" />
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <article class="lf-card p-5">
          <h2 class="lf-card-title">Alerts by Severity</h2>
          <div class="mt-6 flex flex-col items-center justify-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
            <div class="relative h-40 w-40 rounded-full" style="background: conic-gradient(#ef4444 0 16.7%, #f59e0b 16.7% 66.7%, #16b8b0 66.7% 100%);">
              <div class="absolute inset-[24px] rounded-full bg-white"></div>
            </div>
            <div class="space-y-3 text-[11px]">
              <div class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full bg-[#ef4444]"></i><span>Critical</span><strong class="ml-3">4 (17%)</strong></div>
              <div class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full bg-[#f59e0b]"></i><span>Warning</span><strong class="ml-3">12 (50%)</strong></div>
              <div class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full bg-[#16b8b0]"></i><span>Info</span><strong class="ml-3">8 (33%)</strong></div>
            </div>
          </div>
        </article>

        <article class="lf-card p-4">
          <h2 class="lf-card-title">Recent Alerts</h2>
          <div class="mt-3 divide-y divide-[#edf0f5]">
            <div *ngFor="let alert of alerts" class="flex items-start gap-3 py-3">
              <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" [style.background]="alert.color"></span>
              <div class="min-w-0 flex-1"><p class="truncate text-[11px] font-medium text-[#354056]">{{ alert.title }}</p><p class="mt-0.5 text-[9px] text-[#929aaa]">{{ alert.source }}</p></div>
              <span class="whitespace-nowrap text-[9px] text-[#7c8799]">{{ alert.time }}</span>
              <span class="rounded-full px-2 py-1 text-[8px] font-semibold" [style.color]="alert.color" [style.background]="alert.background">{{ alert.level }}</span>
            </div>
          </div>
          <div class="pt-3 text-right"><button class="text-[10px] font-semibold text-[#7c3aed]">View all alerts →</button></div>
        </article>
      </div>
    </section>
  `,
})
export class HealthAlertsComponent {
  readonly alerts = [
    { title: 'High response time on web-04', source: 'App-Web-Pool', time: '2m ago', level: 'Critical', color: '#ef4444', background: '#fff1f2' },
    { title: 'Database connection failures on db-02', source: 'Database-Pool', time: '6m ago', level: 'Critical', color: '#ef4444', background: '#fff1f2' },
    { title: 'High CPU usage on api-03', source: 'App-API-Pool', time: '12m ago', level: 'Warning', color: '#f59e0b', background: '#fff7e8' },
    { title: 'Health check failed for cache-02', source: 'Cache-Pool', time: '18m ago', level: 'Warning', color: '#f59e0b', background: '#fff7e8' },
    { title: 'Rate limit threshold reached for IP 203.0.113.45', source: 'Security', time: '25m ago', level: 'Info', color: '#16b8b0', background: '#eafbf9' },
  ];
}
