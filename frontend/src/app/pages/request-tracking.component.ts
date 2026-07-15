import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, TrackingRecord } from '../services/api.service';
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

      <div *ngIf="errorMessage" class="mb-4 rounded-lg bg-[#fff0f2] p-3 text-[11px] font-medium text-[#ef3f55]">
        {{ errorMessage }}
      </div>

      <div class="lf-card p-4">
        <input class="lf-input max-w-md" [(ngModel)]="searchQuery" placeholder="Enter request ID or endpoint..." />

        <div class="mt-5 overflow-x-auto">
          <table class="lf-table min-w-[980px]">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Endpoint</th>
                <th>Backend</th>
                <th>Attempts</th>
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
                <td>{{ row.attempt_count }}</td>
                <td>{{ row.retry_count }}</td>
                <td>
                  <span *ngIf="isTimeout(row)" class="font-semibold text-red-500">1</span>
                  <span *ngIf="!isTimeout(row)">0</span>
                </td>
                <td>
                  <span [ngClass]="row.status_code >= 400 ? 'font-semibold text-[#ef4444]' : 'font-semibold text-[#08a981]'">
                    {{ row.status_code }}
                  </span>
                </td>
                <td>{{ row.duration_ms }} ms</td>
              </tr>
              <tr *ngIf="filteredRows().length === 0">
                <td colspan="8" class="py-8 text-center text-[#778196]">
                  No matching tracked requests found. Generate traffic through /api/demo and refresh this page.
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
  rows: TrackingRecord[] = [];
  searchQuery = '';
  errorMessage = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTracking();
  }

  loadTracking(): void {
    this.errorMessage = '';
    this.apiService.getTrackingRecords(200).subscribe({
      next: (data) => {
        this.rows = data || [];
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.rows = [];
        this.errorMessage = this.apiService.getErrorMessage(error);
        this.cdr.detectChanges();
      },
    });
  }

  filteredRows(): TrackingRecord[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.rows;

    return this.rows.filter((row) =>
      row.request_id.toLowerCase().includes(query) ||
      row.path.toLowerCase().includes(query) ||
      row.method.toLowerCase().includes(query) ||
      row.outcome.toLowerCase().includes(query) ||
      (row.backend_id?.toLowerCase().includes(query) ?? false) ||
      row.status_code.toString().includes(query)
    );
  }

  isTimeout(row: TrackingRecord): boolean {
    return (
      row.outcome === 'timeout' ||
      row.duration_ms >= 15000 ||
      row.error_type?.toLowerCase().includes('timeout') === true ||
      row.error?.toLowerCase().includes('timeout') === true
    );
  }
}
