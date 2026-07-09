import { Component } from '@angular/core';
import { NgClass, NgFor } from '@angular/common';
import { IconComponent } from '../shared/icon.component';
import { StatCardComponent } from '../shared/stat-card.component';

@Component({
  selector: 'app-server-pools-page',
  standalone: true,
  imports: [NgFor, NgClass, IconComponent, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Server Pools</h1>
          <p class="mt-1 text-[11px] text-[#778196]">Manage and configure all server pools.</p>
        </div>
        <button class="lf-button-primary"><app-icon name="plus" [size]="14" /> Create Pool</button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Total Pools" value="12" hint="Active pools" />
        <app-stat-card label="Healthy Pools" value="10" hint="83% of total" tone="success" />
        <app-stat-card label="Draining Pools" value="1" hint="8% of total" tone="warning" />
        <app-stat-card label="Down Pools" value="1" hint="8% of total" tone="danger" />
      </div>

      <div class="lf-table-shell mt-4 overflow-x-auto">
        <table class="lf-table min-w-[900px]">
          <thead>
            <tr>
              <th>Pool Name</th><th>Algorithm</th><th>Servers</th><th>Healthy</th><th>Requests/sec</th><th>Bandwidth</th><th>Status</th><th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of pools">
              <td class="font-semibold text-[#283348]">{{ row.name }}</td>
              <td>{{ row.algorithm }}</td>
              <td>{{ row.servers }}</td>
              <td>{{ row.healthy }}</td>
              <td>{{ row.requests }}</td>
              <td>{{ row.bandwidth }}</td>
              <td><span class="inline-flex items-center gap-1.5 font-medium" [ngClass]="statusClass(row.status)"><i class="h-1.5 w-1.5 rounded-full bg-current"></i>{{ row.status }}</span></td>
              <td><div class="flex justify-end gap-3 text-[#8a94a8]"><button class="hover:text-[#6e2ae0]"><app-icon name="eye" [size]="15" /></button><button class="hover:text-[#6e2ae0]"><app-icon name="edit" [size]="15" /></button></div></td>
            </tr>
          </tbody>
        </table>
        <div class="flex items-center justify-between px-4 py-3 text-[10px] text-[#7c8699]">
          <span>Showing 1 to 6 of 12 pools</span>
          <div class="flex gap-1"><button class="grid h-7 w-7 place-items-center rounded border border-[#dfe4ec] bg-[#7c3aed] text-white">1</button><button class="grid h-7 w-7 place-items-center rounded border border-[#dfe4ec]">2</button><button class="grid h-7 w-7 place-items-center rounded border border-[#dfe4ec]">3</button></div>
        </div>
      </div>
    </section>
  `,
})
export class ServerPoolsComponent {
  statusClass(status: string): string {
    return status === 'Down' ? 'text-[#f04455]' : status === 'Warning' ? 'text-[#f59e0b]' : 'text-[#0aa985]';
  }

  readonly pools = [
    { name: 'App-Web-Pool', algorithm: 'Smooth WRR', servers: 22, healthy: 20, requests: '8.6k', bandwidth: '3.2 Gbps', status: 'Healthy' },
    { name: 'App-API-Pool', algorithm: 'Least Inflight', servers: 8, healthy: 8, requests: '3.1k', bandwidth: '1.4 Gbps', status: 'Healthy' },
    { name: 'Database-Pool', algorithm: 'Round Robin', servers: 5, healthy: 5, requests: '1.2k', bandwidth: '620 Mbps', status: 'Healthy' },
    { name: 'Cache-Pool', algorithm: 'Least Inflight', servers: 6, healthy: 5, requests: '850', bandwidth: '420 Mbps', status: 'Warning' },
    { name: 'Static-Pool', algorithm: 'Round Robin', servers: 4, healthy: 4, requests: '320', bandwidth: '180 Mbps', status: 'Healthy' },
    { name: 'Legacy-Pool', algorithm: 'Smooth WRR', servers: 3, healthy: 0, requests: '0', bandwidth: '0 bps', status: 'Down' },
  ];
}
