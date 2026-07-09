import { Component } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-logs-page',
  standalone: true,
  imports: [NgFor, NgClass, IconComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Logs</h1><p class="mt-1 text-[11px] text-[#778196]">Search and analyze system logs.</p></div>
        <div class="flex flex-wrap gap-2"><button class="lf-button-secondary">Last 24 Hours <app-icon name="chevron" [size]="13" /></button><button class="lf-button-secondary"><app-icon name="filter" [size]="14" /> Filters</button><button class="lf-button-secondary"><app-icon name="download" [size]="14" /> Export</button></div>
      </div>

      <div class="lf-table-shell overflow-hidden">
        <div class="border-b border-[#e7ebf1] p-3">
          <div class="relative max-w-md"><span class="absolute inset-y-0 left-3 flex items-center text-[#8e98aa]"><app-icon name="search" [size]="14" /></span><input class="lf-input pl-9" placeholder="Search logs..." /></div>
        </div>
        <div class="overflow-x-auto">
          <table class="lf-table min-w-[900px]">
            <thead><tr><th>Time</th><th>Level</th><th>Source</th><th>Message</th></tr></thead>
            <tbody>
              <tr *ngFor="let row of logs">
                <td>{{ row.time }}</td>
                <td><span class="rounded px-1.5 py-1 text-[8px] font-bold" [ngClass]="levelClass(row.level)">{{ row.level }}</span></td>
                <td class="font-medium text-[#465167]">{{ row.source }}</td>
                <td class="max-w-[650px] truncate text-[#2e394e]">{{ row.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between px-4 py-3 text-[10px] text-[#7c8699]"><span>Showing 1–7 of 1,245 logs</span><div class="flex gap-1"><button class="grid h-7 w-7 place-items-center rounded border border-[#dfe4ec] bg-[#7c3aed] text-white">1</button><button class="grid h-7 w-7 place-items-center rounded border border-[#dfe4ec]">2</button><button class="grid h-7 w-7 place-items-center rounded border border-[#dfe4ec]">3</button><span class="px-1">…</span><button class="grid h-7 min-w-8 place-items-center rounded border border-[#dfe4ec] px-1">178</button></div></div>
      </div>
    </section>
  `,
})
export class LogsComponent {
  readonly logs = [
    { time: 'May 08, 2025 15:45:12', level: 'ERROR', source: 'Proxy', message: 'Upstream timeout - api-02 (10.0.2.22:9090) /api/v1/orders' },
    { time: 'May 08, 2025 15:45:11', level: 'WARN', source: 'HealthCheck', message: 'Health check failed for web-04 (10.0.1.14:8080)' },
    { time: 'May 08, 2025 15:45:09', level: 'INFO', source: 'Router', message: 'Request routed to web-01 (10.0.1.11:8080) /api/v1/users' },
    { time: 'May 08, 2025 15:45:08', level: 'INFO', source: 'Proxy', message: '200 GET /api/v1/auth 95ms' },
    { time: 'May 08, 2025 15:45:07', level: 'WARN', source: 'Security', message: 'Rate limit exceeded for IP 203.0.113.45' },
    { time: 'May 08, 2025 15:45:05', level: 'INFO', source: 'HealthCheck', message: 'Health check passed for db-01 (10.0.3.31:5432)' },
    { time: 'May 08, 2025 15:45:03', level: 'ERROR', source: 'Proxy', message: 'Connection refused: cache-02 (10.0.4.12:11211)' },
  ];

  levelClass(level: string): string {
    return {
      ERROR: 'bg-[#fff0f2] text-[#ef3f55]',
      WARN: 'bg-[#fff7e8] text-[#f59e0b]',
      INFO: 'bg-[#eef6ff] text-[#3b82f6]',
    }[level] ?? 'bg-slate-100 text-slate-600';
  }
}
