import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { StatCardComponent } from '../shared/stat-card.component';
import { IconComponent } from '../shared/icon.component';
import { ApiService, OverviewMetrics, TimeseriesPoint } from '../services/api.service';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [StatCardComponent, IconComponent, NgFor, NgIf, DecimalPipe],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex items-start justify-between">
        <div>
          <h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Dashboard</h1>
          <p class="mt-1 text-[11px] text-[#778196]">Real-time load balancer health and traffic overview.</p>
        </div>
        <div class="flex gap-2">
          <button (click)="loadData()" class="lf-button-secondary">
            <app-icon name="refresh" [size]="13" /> Refresh
          </button>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card
          label="Total Requests"
          [value]="formatNumber(metrics?.total_requests || 0)"
          hint="Total requests processed"
          tone="neutral"
        />
        <app-stat-card
          label="Requests / sec"
          [value]="((metrics?.requests_per_second || 0) | number:'1.0-2') || '0'"
          [hint]="'Algorithm: ' + (metrics?.algorithm || 'none')"
        />
        <app-stat-card
          label="Active Connections"
          [value]="(metrics?.active_requests || 0).toString()"
          hint="Across all servers"
        />
        <app-stat-card
          label="Healthy Servers"
          [value]="(metrics?.healthy_backends || 0) + ' / ' + ((metrics?.healthy_backends || 0) + (metrics?.unhealthy_backends || 0))"
          [hint]="getHealthyPercentage() + '% available'"
          tone="success"
        />
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[1.55fr_0.8fr]">
        <article class="lf-card min-h-[350px] p-4">
          <h2 class="lf-card-title">Traffic Overview</h2>
          <div class="mt-5 h-[270px]">
            <svg class="h-full w-full" viewBox="0 0 800 260" preserveAspectRatio="none">
              <g stroke="#e8ebf1">
                <line x1="40" y1="20" x2="790" y2="20"/>
                <line x1="40" y1="80" x2="790" y2="80"/>
                <line x1="40" y1="140" x2="790" y2="140"/>
                <line x1="40" y1="200" x2="790" y2="200"/>
              </g>
              <polyline
                fill="none"
                stroke="#7c3aed"
                stroke-width="4"
                [attr.points]="svgPoints"
              />
              <g fill="#8b95a7" font-size="10" *ngIf="timeseries.length > 0">
                <text x="40" y="225">{{ timeseries[0].time }}</text>
                <text x="415" y="225" *ngIf="timeseries.length > 2">{{ timeseries[Math.floor(timeseries.length / 2)].time }}</text>
                <text x="730" y="225" *ngIf="timeseries.length > 1">{{ timeseries[timeseries.length - 1].time }}</text>
              </g>
            </svg>
          </div>
        </article>

        <article class="lf-card p-4">
          <h2 class="lf-card-title">Backend Distribution</h2>
          <div class="mt-8 flex justify-center">
            <div class="relative h-44 w-44 rounded-full" [style.background]="conicGradient">
              <div class="absolute inset-[28px] rounded-full bg-white"></div>
            </div>
          </div>
          <div class="mt-7 grid grid-cols-2 gap-3 text-[10px]">
            <span *ngFor="let item of distribution; let idx = index" class="flex items-center gap-1.5">
              <i class="h-2 w-2 rounded-full" [style.background-color]="getColor(idx)"></i>
              <span class="truncate">{{ item.id }} · {{ item.percentage | number:'1.0-1' }}%</span>
            </span>
            <span *ngIf="distribution.length === 0" class="col-span-2 text-center text-[#778196]">
              No active distribution data.
            </span>
          </div>
        </article>
      </div>
    </section>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  metrics: OverviewMetrics | null = null;
  timeseries: TimeseriesPoint[] = [];
  distribution: { id: string; percentage: number }[] = [];
  svgPoints = '40,200 790,200';
  Math = Math;

  private pollSub?: Subscription;

  constructor(private readonly apiService: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.pollSub = interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.apiService.getOverview())
      )
      .subscribe({
        next: (data) => {
          this.metrics = data;
          this.updateDistribution(data.backend_distribution);
          this.loadTimeseries();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching overview metrics:', err);
        },
      });
  }

  ngOnDestroy(): void {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
    }
  }

  loadData(): void {
    this.apiService.getOverview().subscribe({
      next: (data) => {
        this.metrics = data;
        this.updateDistribution(data.backend_distribution);
        this.loadTimeseries();
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  loadTimeseries(): void {
    this.apiService.getTimeseries().subscribe({
      next: (data) => {
        this.timeseries = data || [];
        this.generateSvgPoints();
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  getHealthyPercentage(): number {
    if (!this.metrics) return 0;
    const total = this.metrics.healthy_backends + this.metrics.unhealthy_backends;
    if (total === 0) return 0;
    return Math.round((this.metrics.healthy_backends / total) * 100);
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

  private updateDistribution(dist: { [key: string]: number }): void {
    const entries = Object.entries(dist || {});
    const total = entries.reduce((acc, [_, count]) => acc + count, 0);

    if (total === 0) {
      this.distribution = [];
      return;
    }

    this.distribution = entries.map(([id, count]) => ({
      id,
      percentage: (count / total) * 100,
    }));
  }

  get conicGradient(): string {
    if (!this.distribution || this.distribution.length === 0) {
      return 'conic-gradient(#e7ebf1 0 100%)';
    }
    let currentPct = 0;
    const slices: string[] = [];
    this.distribution.forEach((item, index) => {
      const color = this.getColor(index);
      const nextPct = currentPct + item.percentage;
      slices.push(`${color} ${currentPct}% ${nextPct}%`);
      currentPct = nextPct;
    });
    return `conic-gradient(${slices.join(', ')})`;
  }

  getColor(index: number): string {
    const colors = ['#7c3aed', '#16b8b0', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
    return colors[index % colors.length];
  }

  private generateSvgPoints(): void {
    if (!this.timeseries || this.timeseries.length === 0) {
      this.svgPoints = '40,200 790,200';
      return;
    }

    const n = this.timeseries.length;
    const maxRequests = Math.max(...this.timeseries.map((pt) => pt.requests), 5);

    this.svgPoints = this.timeseries
      .map((pt, i) => {
        const x = 40 + i * (750 / (n === 1 ? 1 : n - 1));
        const y = 200 - (pt.requests / maxRequests) * 180;
        return `${x},${y}`;
      })
      .join(' ');
  }
}
