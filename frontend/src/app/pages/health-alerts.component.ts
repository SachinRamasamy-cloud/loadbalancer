import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { StatCardComponent } from '../shared/stat-card.component';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-health-alerts-page',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Health & Alerts</h1><p class="mt-1 text-[11px] text-[#778196]">Monitor system health and active alerts.</p></div>
        <button (click)="markAllRead()" class="lf-button-primary">Mark all as read</button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Total Alerts" [value]="totalAlerts.toString()" hint="Active alerts" />
        <app-stat-card label="Critical" [value]="criticalAlerts.toString()" [hint]="(totalAlerts ? (criticalAlerts/totalAlerts*100 | number:'1.0-0') : '0') + '% of alerts'" tone="danger" />
        <app-stat-card label="Warning" [value]="warningAlerts.toString()" [hint]="(totalAlerts ? (warningAlerts/totalAlerts*100 | number:'1.0-0') : '0') + '% of alerts'" tone="warning" />
        <app-stat-card label="Info" [value]="infoAlerts.toString()" [hint]="(totalAlerts ? (infoAlerts/totalAlerts*100 | number:'1.0-0') : '0') + '% of alerts'" tone="info" />
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <article class="lf-card p-5">
          <h2 class="lf-card-title">Alerts by Severity</h2>
          <div class="mt-6 flex flex-col items-center justify-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
            <div class="relative h-40 w-40 rounded-full" [style.background]="getConicGradient()">
              <div class="absolute inset-[24px] rounded-full bg-white"></div>
            </div>
            <div class="space-y-3 text-[11px]">
              <div class="flex items-center gap-2">
                <i class="h-2.5 w-2.5 rounded-full bg-[#ef4444]"></i>
                <span>Critical</span>
                <strong class="ml-3">{{ criticalAlerts }} ({{ (totalAlerts ? (criticalAlerts/totalAlerts*100 | number:'1.0-0') : '0') }}%)</strong>
              </div>
              <div class="flex items-center gap-2">
                <i class="h-2.5 w-2.5 rounded-full bg-[#f59e0b]"></i>
                <span>Warning</span>
                <strong class="ml-3">{{ warningAlerts }} ({{ (totalAlerts ? (warningAlerts/totalAlerts*100 | number:'1.0-0') : '0') }}%)</strong>
              </div>
              <div class="flex items-center gap-2">
                <i class="h-2.5 w-2.5 rounded-full bg-[#16b8b0]"></i>
                <span>Info</span>
                <strong class="ml-3">{{ infoAlerts }} ({{ (totalAlerts ? (infoAlerts/totalAlerts*100 | number:'1.0-0') : '0') }}%)</strong>
              </div>
            </div>
          </div>
        </article>

        <article class="lf-card p-4">
          <h2 class="lf-card-title">Recent Alerts</h2>
          <div class="mt-3 divide-y divide-[#edf0f5]">
            <div *ngFor="let alert of alerts" class="flex items-start gap-3 py-3">
              <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" [style.background]="alert.color"></span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-[11px] font-medium text-[#354056]">{{ alert.title }}</p>
                <p class="mt-0.5 text-[9px] text-[#929aaa]">{{ alert.source }}</p>
              </div>
              <span class="whitespace-nowrap text-[9px] text-[#7c8799]">{{ alert.time }}</span>
              <span class="rounded-full px-2 py-1 text-[8px] font-semibold" [style.color]="alert.color" [style.background]="alert.background">{{ alert.level }}</span>
            </div>
            <div *ngIf="alerts.length === 0" class="py-8 text-center text-[#778196] text-[11px]">
              All caught up! No active alerts.
            </div>
          </div>
        </article>
      </div>
    </section>
  `,
})
export class HealthAlertsComponent implements OnInit {
  alerts: any[] = [];
  totalAlerts = 0;
  criticalAlerts = 0;
  warningAlerts = 0;
  infoAlerts = 0;

  constructor(private readonly apiService: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.apiService.getAlerts().subscribe({
      next: (data) => {
        this.alerts = data?.alerts || [];
        this.totalAlerts = data?.total || 0;
        this.criticalAlerts = data?.critical || 0;
        this.warningAlerts = data?.warning || 0;
        this.infoAlerts = data?.info || 0;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching alerts:', err),
    });
  }

  markAllRead(): void {
    this.apiService.markAlertsAllRead().subscribe({
      next: () => {
        this.loadAlerts();
      },
      error: (err) => console.error('Error marking alerts read:', err),
    });
  }

  getConicGradient(): string {
    const total = this.totalAlerts;
    if (total === 0) return 'conic-gradient(#e7ebf1 0 100%)';
    const critPct = (this.criticalAlerts / total) * 100;
    const warnPct = (this.warningAlerts / total) * 100;

    const critEnd = critPct;
    const warnEnd = critEnd + warnPct;

    return `conic-gradient(#ef4444 0 ${critEnd}%, #f59e0b ${critEnd}% ${warnEnd}%, #16b8b0 ${warnEnd}% 100%)`;
  }
}
