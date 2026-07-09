import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { IconComponent } from '../shared/icon.component';
import { StatCardComponent } from '../shared/stat-card.component';

@Component({
  selector: 'app-security-page',
  standalone: true,
  imports: [NgFor, IconComponent, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Security</h1><p class="mt-1 text-[11px] text-[#778196]">Monitor security events, rate limits and blocked activity.</p></div>
        <div class="flex gap-2"><button class="lf-button-secondary">Last 24 Hours <app-icon name="chevron" [size]="13" /></button><button class="lf-button-secondary"><app-icon name="filter" [size]="14" /> Filters</button></div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Blocked IPs" value="56" hint="Unique IPs" />
        <app-stat-card label="Rate Limit Hits" value="1,243" hint="Total hits" />
        <app-stat-card label="Auth Failures" value="342" hint="Failed attempts" />
        <app-stat-card label="Suspicious Events" value="18" hint="Detected" />
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.45fr]">
        <article class="lf-card p-4">
          <h2 class="lf-card-title">Top Blocked IPs</h2>
          <div class="mt-4 space-y-4">
            <div *ngFor="let ip of blockedIps" class="grid grid-cols-[110px_1fr_35px] items-center gap-3 text-[10px]">
              <span class="font-medium text-[#3c475b]">{{ ip.address }}</span>
              <div class="h-1.5 overflow-hidden rounded-full bg-[#ffe9ed]"><div class="h-full rounded-full bg-gradient-to-r from-[#f23b51] to-[#ef5262]" [style.width.%]="ip.progress"></div></div>
              <span class="text-right text-[#5f697c]">{{ ip.hits }}</span>
            </div>
          </div>
        </article>

        <article class="lf-card p-4">
          <h2 class="lf-card-title">Recent Security Events</h2>
          <div class="mt-3 divide-y divide-[#edf0f5]">
            <div *ngFor="let event of events" class="flex items-center gap-3 py-3 text-[10px]">
              <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full" [style.background]="event.background" [style.color]="event.color"><app-icon [name]="event.icon" [size]="12" /></span>
              <span class="min-w-0 flex-1 truncate font-medium text-[#354056]">{{ event.title }}</span>
              <span class="whitespace-nowrap text-[#5e697d]">{{ event.ip }}</span>
              <span class="h-2 w-2 rounded-full" [style.background]="event.color"></span>
            </div>
          </div>
          <div class="pt-3 text-center"><button class="text-[10px] font-semibold text-[#7c3aed]">View all security events →</button></div>
        </article>
      </div>
    </section>
  `,
})
export class SecurityComponent {
  readonly blockedIps = [
    { address: '200.0.113.45', hits: 243, progress: 100 },
    { address: '198.51.100.23', hits: 142, progress: 58 },
    { address: '203.0.113.56', hits: 98, progress: 40 },
    { address: '192.0.2.10', hits: 87, progress: 36 },
    { address: '198.51.100.77', hits: 65, progress: 27 },
  ];

  readonly events = [
    { title: 'Rate limit exceeded', ip: '203.0.113.45', icon: 'clock', color: '#ef3f55', background: '#fff0f2' },
    { title: 'SQL injection attempt detected', ip: '198.51.100.23', icon: 'shield', color: '#ef3f55', background: '#fff0f2' },
    { title: 'Auth failure (5+ attempts)', ip: '223.0.113.56', icon: 'lock', color: '#f97316', background: '#fff5eb' },
    { title: 'Suspicious user agent blocked', ip: '192.0.2.10', icon: 'user', color: '#f59e0b', background: '#fff7e8' },
    { title: 'Rate limit exceeded', ip: '198.51.100.77', icon: 'clock', color: '#ef3f55', background: '#fff0f2' },
  ];
}
