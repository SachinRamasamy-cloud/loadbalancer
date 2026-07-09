import { Component } from '@angular/core';
import { StatCardComponent } from '../shared/stat-card.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [StatCardComponent, IconComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex items-start justify-between"><div><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Dashboard</h1><p class="mt-1 text-[11px] text-[#778196]">Real-time load balancer health and traffic overview.</p></div><button class="lf-button-secondary">Last 24 Hours <app-icon name="chevron" [size]="13" /></button></div>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><app-stat-card label="Total Requests" value="2.48M" hint="↑ 12.5%" tone="success" /><app-stat-card label="Requests / sec" value="12,450" hint="Peak 16,820" /><app-stat-card label="Active Connections" value="3,842" hint="Across 48 servers" /><app-stat-card label="Healthy Servers" value="38 / 48" hint="79% available" tone="success" /></div>
      <div class="mt-4 grid gap-4 xl:grid-cols-[1.55fr_0.8fr]">
        <article class="lf-card min-h-[350px] p-4"><h2 class="lf-card-title">Traffic Overview</h2><div class="mt-5 h-[270px]"><svg class="h-full w-full" viewBox="0 0 800 260" preserveAspectRatio="none"><g stroke="#e8ebf1"><line x1="40" y1="20" x2="790" y2="20"/><line x1="40" y1="80" x2="790" y2="80"/><line x1="40" y1="140" x2="790" y2="140"/><line x1="40" y1="200" x2="790" y2="200"/></g><polyline fill="none" stroke="#7c3aed" stroke-width="4" points="40,190 90,145 140,165 190,95 240,120 290,80 340,110 390,65 440,100 490,85 540,125 590,90 640,112 690,75 740,100 790,70"/></svg></div></article>
        <article class="lf-card p-4"><h2 class="lf-card-title">Backend Distribution</h2><div class="mt-8 flex justify-center"><div class="relative h-44 w-44 rounded-full" style="background:conic-gradient(#7c3aed 0 42%,#16b8b0 42% 72%,#f59e0b 72% 88%,#ef4444 88% 100%)"><div class="absolute inset-[28px] rounded-full bg-white"></div></div></div><div class="mt-7 grid grid-cols-2 gap-3 text-[10px]"><span>Web Pool · 42%</span><span>API Pool · 30%</span><span>Cache · 16%</span><span>Other · 12%</span></div></article>
      </div>
    </section>
  `,
})
export class DashboardComponent {}
