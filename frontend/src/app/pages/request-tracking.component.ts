import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, LogRecord } from '../services/api.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-request-tracking-page',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, FormsModule, IconComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Request Tracking</h1>
          <p class="mt-1 text-[11px] text-[#778196]">Trace request paths, selected backends, retries and timeouts.</p>
        </div>
        <button (click)="loadTracking()" class="lf-button-secondary">
          <app-icon name="refresh" [size]="14" /> Refresh
        </button>
      </div>

      <div class="lf-card p-4">
        <input class="lf-input max-w-md" [(ngModel)]="searchQuery" placeholder="Enter request ID or endpoint..." />

        <div class="mt-5 overflow-x-auto">
          <table class="lf-table min-w-[900px]">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Endpoint</th>
                <th>Backend</th>
                <th>Retries</th>
                <th>Timeouts</th>
                <th>Status</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of filteredRows()">
                <td class="font-mono text-[11px]">{{ row.request_id }}</td>
                <td class="font-semibold">{{ row.method }} {{ row.path }}</td>
                <td class="font-mono">{{ row.backend_id || 'None' }}</td>
                <td>{{ row.retry_count }}</td>
                <td>
                  <span *ngIf="isTimeout(row)" class="text-red-500 font-semibold">1</span>
                  <span *ngIf="!isTimeout(row)">0</span>
                </td>
                <td>
                  <span [ngClass]="row.status_code >= 400 ? 'text-[#ef4444] font-semibold' : 'text-[#08a981] font-semibold'">
                    {{ row.status_code }}
                  </span>
                </td>
                <td>{{ row.duration_ms }} ms</td>
              </tr>
              <tr *ngIf="filteredRows().length === 0">
                <td colspan="7" class="text-center py-8 text-[#778196]">
                  No matching tracked requests found. Try generating traffic!
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `,
})
export class RequestTrackingComponent implements OnInit {
  rows: LogRecord[] = [];
  searchQuery = '';

  constructor(private readonly apiService: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadTracking();
  }

  loadTracking(): void {
    this.apiService.getLogs(100).subscribe({
      next: (data) => {
        this.rows = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching logs for tracking:', err),
    });
  }

  filteredRows(): LogRecord[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.rows;

    return this.rows.filter((row) => {
      return (
        row.request_id.toLowerCase().includes(q) ||
        row.path.toLowerCase().includes(q) ||
        (row.backend_id && row.backend_id.toLowerCase().includes(q))
      );
    });
  }

  isTimeout(row: LogRecord): boolean {
    return (
      row.duration_ms >= 15000 ||
      (row.error ? row.error.toLowerCase().includes('timeout') : false)
    );
  }
}
