import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NgClass, NgIf, DecimalPipe } from '@angular/common';
import { IconComponent } from '../shared/icon.component';
import { StatCardComponent } from '../shared/stat-card.component';
import { ApiService } from '../services/api.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-load-testing-page',
  standalone: true,
  imports: [NgClass, NgIf, DecimalPipe, IconComponent, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Load Testing</h1><p class="mt-1 text-[11px] text-[#778196]">Run load tests and analyze performance under stress.</p></div>
        <button (click)="newTest()" [disabled]="activeTest?.status === 'Running'" class="lf-button-primary">
          <app-icon name="plus" [size]="14" /> {{ activeTest?.status === 'Running' ? 'Test in Progress' : 'New Test' }}
        </button>
      </div>

      <div class="grid gap-4 xl:grid-cols-[260px_1fr_260px]">
        <article class="lf-card p-4 xl:row-span-2">
          <h2 class="lf-card-title">Active Test</h2>
          <div class="mt-4 flex items-start justify-between">
            <strong class="text-[13px] text-[#263248]">{{ activeTest?.id || 'No Test' }}</strong>
            <span class="rounded-full px-2 py-1 text-[8px] font-semibold"
                  [ngClass]="activeTest?.status === 'Running' ? 'bg-[#e8fbf5] text-[#08a981]' : 'bg-gray-100 text-gray-600'">
              {{ activeTest?.status || 'Idle' }}
            </span>
          </div>
          <dl class="mt-5 space-y-3 text-[10px]">
            <div class="flex justify-between"><dt class="text-[#7a8496]">Target</dt><dd class="font-medium">{{ activeTest?.target || 'N/A' }}</dd></div>
            <div class="flex justify-between"><dt class="text-[#7a8496]">Started</dt><dd class="font-medium">{{ formatStartedAt() }}</dd></div>
            <div class="flex justify-between"><dt class="text-[#7a8496]">Duration</dt><dd class="font-medium">{{ activeTest?.duration ? activeTest.duration + 's' : 'N/A' }}</dd></div>
            <div class="flex justify-between"><dt class="text-[#7a8496]">Concurrency</dt><dd class="font-medium">{{ activeTest?.concurrency || 0 }}</dd></div>
          </dl>
          <div class="mt-6">
            <div class="mb-2 flex justify-between text-[10px]"><span>Progress</span><strong>{{ activeTest?.progress || 0 }}%</strong></div>
            <div class="h-2 rounded-full bg-[#e7ebf1]">
              <div class="h-2 rounded-full bg-[#14b8a6]" [style.width.%]="activeTest?.progress || 0"></div>
            </div>
          </div>
        </article>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <app-stat-card label="Throughput" [value]="(activeTest?.throughput || 0) + ' req/s'" />
          <app-stat-card label="Avg Latency" [value]="(activeTest?.avg_latency || 0) + ' ms'" />
          <app-stat-card label="P95 Latency" [value]="(activeTest?.p95_latency || 0) + ' ms'" />
          <app-stat-card label="Error Rate" [value]="(activeTest?.error_rate || 0) + '%'" tone="danger" />
        </div>

        <article class="lf-card p-4 xl:row-span-2">
          <h2 class="lf-card-title">Result Distribution</h2>
          <div class="mt-8 flex flex-col items-center gap-6">
            <div class="relative h-36 w-36 rounded-full" [style.background]="getConicGradient()">
              <div class="absolute inset-[22px] rounded-full bg-white"></div>
            </div>
            <div class="space-y-3 text-[10px]">
              <div class="flex items-center gap-2">
                <i class="h-2.5 w-2.5 rounded-full bg-[#16b8b0]"></i>
                <span>Success</span>
                <strong class="ml-3">{{ (100 - (activeTest?.error_rate || 0)) | number:'1.0-2' }}%</strong>
              </div>
              <div class="flex items-center gap-2">
                <i class="h-2.5 w-2.5 rounded-full bg-[#ef4444]"></i>
                <span>Errors</span>
                <strong class="ml-3">{{ (activeTest?.error_rate || 0) }}%</strong>
              </div>
            </div>
          </div>
        </article>

        <article class="lf-card min-h-[300px] p-4">
          <h2 class="lf-card-title">Requests per Second</h2>
          <div class="mt-5 h-[220px] w-full">
            <svg class="h-full w-full" viewBox="0 0 800 230" preserveAspectRatio="none" aria-label="Requests per second line chart">
              <g stroke="#e8ebf1" stroke-width="1">
                <line x1="45" y1="20" x2="790" y2="20"/>
                <line x1="45" y1="70" x2="790" y2="70"/>
                <line x1="45" y1="120" x2="790" y2="120"/>
                <line x1="45" y1="170" x2="790" y2="170"/>
                <line x1="45" y1="220" x2="790" y2="220"/>
              </g>
              <polyline fill="none" stroke="#7c3aed" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" [attr.points]="svgPoints"/>
              <g fill="#8b95a7" font-size="10">
                <text x="8" y="224">0</text>
                <text x="2" y="174">50</text>
                <text x="0" y="124">100</text>
                <text x="0" y="74">150</text>
                <text x="0" y="24">200</text>
              </g>
            </svg>
          </div>
        </article>
      </div>
    </section>
  `,
})
export class LoadTestingComponent implements OnInit, OnDestroy {
  activeTest: any = null;
  svgPoints = '45,220 790,220';
  private pollSub?: Subscription;
  private pointsList: number[] = [];

  constructor(private readonly apiService: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadActiveTest();
    this.pollSub = interval(1000).subscribe(() => {
      this.loadActiveTest();
    });
  }

  ngOnDestroy(): void {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
    }
  }

  loadActiveTest(): void {
    this.apiService.getLoadTestActive().subscribe({
      next: (data) => {
        this.activeTest = data;
        if (data && data.status === 'Running') {
          // Record current throughput as a point for chart
          this.pointsList.push(data.throughput || 0);
          if (this.pointsList.length > 25) {
            this.pointsList.shift();
          }
          this.generateSvgPoints();
        } else if (data && data.status === 'Completed' && this.pointsList.length > 0) {
          // test ended, keep last state
        } else {
          this.pointsList = [];
          this.svgPoints = '45,220 790,220';
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading load test active status:', err),
    });
  }

  newTest(): void {
    this.pointsList = [];
    this.apiService.startLoadTest().subscribe({
      next: (data) => {
        this.activeTest = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error starting load test:', err),
    });
  }

  formatStartedAt(): string {
    if (!this.activeTest?.started_at) return 'N/A';
    const date = new Date(this.activeTest.started_at * 1000);
    return date.toLocaleTimeString();
  }

  getConicGradient(): string {
    const errRate = this.activeTest?.error_rate || 0;
    const successPct = 100 - errRate;
    return `conic-gradient(#16b8b0 0 ${successPct}%, #ef4444 ${successPct}% 100%)`;
  }

  generateSvgPoints(): void {
    const maxVal = Math.max(...this.pointsList, 50);
    const stepX = 745 / Math.max(1, this.pointsList.length - 1);

    this.svgPoints = this.pointsList.map((pt, index) => {
      const x = 45 + index * stepX;
      // Scale points inside 200px height (220 - 20)
      const y = 220 - (pt / maxVal) * 200;
      return `${x},${y}`;
    }).join(' ');
  }
}
