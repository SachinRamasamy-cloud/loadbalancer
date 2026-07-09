import { Component } from '@angular/core';
import { IconComponent } from '../shared/icon.component';
import { StatCardComponent } from '../shared/stat-card.component';

@Component({
  selector: 'app-load-testing-page',
  standalone: true,
  imports: [IconComponent, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Load Testing</h1><p class="mt-1 text-[11px] text-[#778196]">Run load tests and analyze performance under stress.</p></div>
        <button class="lf-button-primary"><app-icon name="plus" [size]="14" /> New Test</button>
      </div>

      <div class="grid gap-4 xl:grid-cols-[260px_1fr_260px]">
        <article class="lf-card p-4 xl:row-span-2">
          <h2 class="lf-card-title">Active Test</h2>
          <div class="mt-4 flex items-start justify-between"><strong class="text-[13px] text-[#263248]">Test-2025-05-08-01</strong><span class="rounded-full bg-[#e8fbf5] px-2 py-1 text-[8px] font-semibold text-[#08a981]">Running</span></div>
          <dl class="mt-5 space-y-3 text-[10px]"><div class="flex justify-between"><dt class="text-[#7a8496]">Target</dt><dd class="font-medium">/api/v1/users</dd></div><div class="flex justify-between"><dt class="text-[#7a8496]">Started</dt><dd class="font-medium">May 08, 2025 15:40:00</dd></div><div class="flex justify-between"><dt class="text-[#7a8496]">Duration</dt><dd class="font-medium">10m 24s</dd></div><div class="flex justify-between"><dt class="text-[#7a8496]">Concurrent Users</dt><dd class="font-medium">500</dd></div></dl>
          <div class="mt-6"><div class="mb-2 flex justify-between text-[10px]"><span>Progress</span><strong>62%</strong></div><div class="h-2 rounded-full bg-[#e7ebf1]"><div class="h-2 w-[62%] rounded-full bg-[#14b8a6]"></div></div></div>
        </article>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <app-stat-card label="Throughput" value="12,450" />
          <app-stat-card label="Avg Latency" value="156 ms" />
          <app-stat-card label="P95 Latency" value="320 ms" />
          <app-stat-card label="Error Rate" value="0.42%" />
        </div>

        <article class="lf-card p-4 xl:row-span-2">
          <h2 class="lf-card-title">Result Distribution</h2>
          <div class="mt-8 flex flex-col items-center gap-6">
            <div class="relative h-36 w-36 rounded-full" style="background: conic-gradient(#16b8b0 0 99.58%, #ef4444 99.58% 100%);"><div class="absolute inset-[22px] rounded-full bg-white"></div></div>
            <div class="space-y-3 text-[10px]"><div class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full bg-[#16b8b0]"></i><span>Success</span><strong class="ml-3">99.58%</strong></div><div class="flex items-center gap-2"><i class="h-2.5 w-2.5 rounded-full bg-[#ef4444]"></i><span>Errors</span><strong class="ml-3">0.42%</strong></div></div>
          </div>
        </article>

        <article class="lf-card min-h-[300px] p-4">
          <h2 class="lf-card-title">Requests per Second</h2>
          <div class="mt-5 h-[220px] w-full">
            <svg class="h-full w-full" viewBox="0 0 800 230" preserveAspectRatio="none" aria-label="Requests per second line chart">
              <g stroke="#e8ebf1" stroke-width="1"><line x1="45" y1="20" x2="790" y2="20"/><line x1="45" y1="70" x2="790" y2="70"/><line x1="45" y1="120" x2="790" y2="120"/><line x1="45" y1="170" x2="790" y2="170"/><line x1="45" y1="220" x2="790" y2="220"/></g>
              <polyline fill="none" stroke="#7c3aed" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" points="45,165 70,145 95,95 120,115 145,70 170,82 195,78 220,110 245,95 270,125 295,104 320,122 345,90 370,110 395,116 420,98 445,130 470,103 495,92 520,114 545,100 570,126 595,96 620,118 645,92 670,128 695,106 720,118 745,96 770,112"/>
              <g fill="#8b95a7" font-size="10"><text x="8" y="224">0</text><text x="2" y="174">5k</text><text x="0" y="124">10k</text><text x="0" y="74">15k</text><text x="0" y="24">20k</text><text x="45" y="228">15:40</text><text x="220" y="228">15:42</text><text x="395" y="228">15:44</text><text x="570" y="228">15:46</text><text x="740" y="228">15:50</text></g>
            </svg>
          </div>
        </article>
      </div>
      <div class="mt-3 text-center"><button class="text-[10px] font-semibold text-[#7c3aed]">View all tests →</button></div>
    </section>
  `,
})
export class LoadTestingComponent {}
