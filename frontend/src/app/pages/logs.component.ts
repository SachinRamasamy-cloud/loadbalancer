import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgClass, NgIf, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../shared/icon.component';
import { ApiService, LogRecord } from '../services/api.service';

@Component({
  selector: 'app-logs-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, IconComponent, FormsModule, DatePipe, DecimalPipe],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Logs</h1>
          <p class="mt-1 text-[11px] text-[#778196]">Search and analyze proxy system logs.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button (click)="loadLogs()" class="lf-button-secondary">
            <app-icon name="activity" [size]="14" /> Refresh
          </button>
        </div>
      </div>

      <div class="lf-table-shell overflow-hidden">
        <div class="border-b border-[#e7ebf1] p-3">
          <div class="relative max-w-md">
            <span class="absolute inset-y-0 left-3 flex items-center text-[#8e98aa]">
              <app-icon name="search" [size]="14" />
            </span>
            <input
              [(ngModel)]="searchQuery"
              class="lf-input pl-9"
              placeholder="Filter logs by path, backend, status..."
            />
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="lf-table min-w-[900px]">
            <thead>
              <tr>
                <th>Time</th>
                <th>Level</th>
                <th>Backend (Source)</th>
                <th>Request Details & Message</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of filteredLogs()">
                <td>{{ formatTimestamp(row.timestamp) }}</td>
                <td>
                  <span class="rounded px-1.5 py-1 text-[8px] font-bold" [ngClass]="levelClass(getLogLevel(row))">
                    {{ getLogLevel(row) }}
                  </span>
                </td>
                <td class="font-medium text-[#465167]">
                  {{ row.backend_id || 'none' }}
                </td>
                <td class="max-w-[650px] truncate text-[#2e394e]">
                  <strong class="text-indigo-600">{{ row.method }}</strong> {{ row.path }} &middot;
                  Status <span [ngClass]="row.status_code >= 400 ? 'text-red-500 font-semibold' : 'text-green-600'">{{ row.status_code }}</span> &middot;
                  <span>{{ row.duration_ms | number:'1.0-1' }} ms</span>
                  <span *ngIf="row.retry_count > 0" class="ml-1.5 text-amber-600 font-medium">
                    (Retries: {{ row.retry_count }})
                  </span>
                  <span *ngIf="row.error" class="ml-1.5 text-red-600 font-semibold">
                    [Error: {{ row.error }}]
                  </span>
                </td>
              </tr>
              <tr *ngIf="filteredLogs().length === 0">
                <td colspan="4" class="text-center py-8 text-[#778196]">
                  No matching log records found. Try sending traffic through the proxy!
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between px-4 py-3 text-[10px] text-[#7c8699]">
          <span>Showing {{ filteredLogs().length }} of {{ logs.length }} logs</span>
        </div>
      </div>
    </section>
  `,
})
export class LogsComponent implements OnInit {
  logs: LogRecord[] = [];
  searchQuery = '';

  constructor(private readonly apiService: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.apiService.getLogs(200).subscribe({
      next: (data) => {
        this.logs = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching logs:', err),
    });
  }

  filteredLogs(): LogRecord[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.logs;

    return this.logs.filter((log) => {
      const matchPath = log.path?.toLowerCase().includes(q);
      const matchMethod = log.method?.toLowerCase().includes(q);
      const matchBackend = log.backend_id?.toLowerCase().includes(q);
      const matchStatus = log.status_code?.toString().includes(q);
      const matchError = log.error?.toLowerCase().includes(q);
      return matchPath || matchMethod || matchBackend || matchStatus || matchError;
    });
  }

  getLogLevel(row: LogRecord): 'ERROR' | 'WARN' | 'INFO' {
    if (row.status_code >= 500 || row.error) {
      return 'ERROR';
    }
    if (row.status_code >= 400 || row.retry_count > 0) {
      return 'WARN';
    }
    return 'INFO';
  }

  levelClass(level: string): string {
    return {
      ERROR: 'bg-[#fff0f2] text-[#ef3f55]',
      WARN: 'bg-[#fff7e8] text-[#f59e0b]',
      INFO: 'bg-[#eef6ff] text-[#3b82f6]',
    }[level] ?? 'bg-slate-100 text-slate-600';
  }

  formatTimestamp(isoStr: string): string {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString() + ' ' + d.toLocaleDateString();
    } catch {
      return isoStr;
    }
  }
}
