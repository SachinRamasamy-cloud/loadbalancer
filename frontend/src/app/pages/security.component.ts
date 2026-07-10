import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { IconComponent } from '../shared/icon.component';
import { StatCardComponent } from '../shared/stat-card.component';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-security-page',
  standalone: true,
  imports: [NgFor, NgIf, IconComponent, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Security</h1><p class="mt-1 text-[11px] text-[#778196]">Monitor security events, rate limits and blocked activity.</p></div>
        <div class="flex gap-2">
          <button (click)="loadSecurityStats()" class="lf-button-secondary">
            <app-icon name="refresh" [size]="14" /> Refresh
          </button>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Blocked IPs" [value]="stats?.blocked_ips_count?.toString() || '0'" hint="Unique IPs" />
        <app-stat-card label="Rate Limit Hits" [value]="stats?.rate_limit_hits?.toString() || '0'" hint="Total hits" />
        <app-stat-card label="Auth Failures" [value]="stats?.auth_failures?.toString() || '0'" hint="Failed attempts" />
        <app-stat-card label="Suspicious Events" [value]="stats?.suspicious_events?.toString() || '0'" hint="Detected" />
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.45fr]">
        <article class="lf-card p-4">
          <h2 class="lf-card-title">Top Blocked IPs</h2>
          <div class="mt-4 space-y-4">
            <div *ngFor="let ip of stats?.blocked_ips" class="grid grid-cols-[110px_1fr_35px] items-center gap-3 text-[10px]">
              <span class="font-medium text-[#3c475b]">{{ ip.address }}</span>
              <div class="h-1.5 overflow-hidden rounded-full bg-[#ffe9ed]">
                <div class="h-full rounded-full bg-gradient-to-r from-[#f23b51] to-[#ef5262]" [style.width.%]="ip.progress"></div>
              </div>
              <span class="text-right text-[#5f697c]">{{ ip.hits }}</span>
            </div>
            <div *ngIf="!stats?.blocked_ips || stats.blocked_ips.length === 0" class="text-center py-4 text-[11px] text-[#778196]">
              No blocked IPs yet.
            </div>
          </div>
        </article>

        <article class="lf-card p-4">
          <h2 class="lf-card-title">Recent Security Events</h2>
          <div class="mt-3 divide-y divide-[#edf0f5]">
            <div *ngFor="let event of stats?.events" class="flex items-center gap-3 py-3 text-[10px]">
              <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full" [style.background]="event.background" [style.color]="event.color">
                <app-icon [name]="event.icon" [size]="12" />
              </span>
              <span class="min-w-0 flex-1 truncate font-medium text-[#354056]">{{ event.title }}</span>
              <span class="whitespace-nowrap text-[#5e697d]">{{ event.ip }}</span>
              <span class="h-2 w-2 rounded-full" [style.background]="event.color"></span>
            </div>
            <div *ngIf="!stats?.events || stats.events.length === 0" class="text-center py-4 text-[11px] text-[#778196]">
              No security events recorded.
            </div>
          </div>
        </article>
      </div>
    </section>
  `,
})
export class SecurityComponent implements OnInit {
  stats: any = null;

  constructor(private readonly apiService: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadSecurityStats();
  }

  loadSecurityStats(): void {
    this.apiService.getSecurityStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching security stats:', err),
    });
  }
}
