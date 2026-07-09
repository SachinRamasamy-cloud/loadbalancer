import { Component } from '@angular/core';
import { StatCardComponent } from '../shared/stat-card.component';

@Component({
  selector: 'app-server-details-page',
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <section class="lf-page"><div class="mb-5"><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Server Details</h1><p class="mt-1 text-[11px] text-[#778196]">Inspect backend resource usage, health and active requests.</p></div><div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><app-stat-card label="CPU Usage" value="22%" hint="Normal" tone="success" /><app-stat-card label="Memory Usage" value="45%" hint="7.2 GB / 16 GB" /><app-stat-card label="Active Requests" value="120" hint="Current" /><app-stat-card label="Uptime" value="15d 4h" hint="Since last restart" /></div><div class="mt-4 grid gap-4 lg:grid-cols-2"><article class="lf-card p-5"><h2 class="lf-card-title">Server Information</h2><dl class="mt-5 grid grid-cols-2 gap-4 text-[11px]"><dt class="text-[#7b8597]">Server</dt><dd class="font-semibold">web-01</dd><dt class="text-[#7b8597]">IP Address</dt><dd>10.0.1.11</dd><dt class="text-[#7b8597]">Port</dt><dd>8080</dd><dt class="text-[#7b8597]">Pool</dt><dd>App-Web-Pool</dd><dt class="text-[#7b8597]">Weight</dt><dd>10</dd><dt class="text-[#7b8597]">Health</dt><dd class="text-[#08a981]">Healthy</dd></dl></article><article class="lf-card p-5"><h2 class="lf-card-title">Recovery History</h2><div class="mt-5 space-y-4 text-[11px]"><p class="rounded-lg bg-[#f8fafc] p-3">Health check passed · 2 minutes ago</p><p class="rounded-lg bg-[#f8fafc] p-3">CPU returned below warning threshold · 2 days ago</p><p class="rounded-lg bg-[#f8fafc] p-3">Server rejoined pool · 8 days ago</p></div></article></div></section>
  `,
})
export class ServerDetailsComponent {}
