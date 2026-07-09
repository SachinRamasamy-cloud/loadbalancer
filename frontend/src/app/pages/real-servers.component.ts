import { Component } from '@angular/core';
import { NgClass, NgFor } from '@angular/common';
import { IconComponent } from '../shared/icon.component';
import { StatCardComponent } from '../shared/stat-card.component';

@Component({
  selector: 'app-real-servers-page',
  standalone: true,
  imports: [NgFor, NgClass, IconComponent, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Real Servers</h1><p class="mt-1 text-[11px] text-[#778196]">View and manage all backend servers.</p></div>
        <div class="flex gap-2"><button class="lf-button-secondary"><app-icon name="filter" [size]="14" /> Filters</button><button class="lf-button-primary"><app-icon name="plus" [size]="14" /> Add Server</button></div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Total Servers" value="48" hint="All registered" />
        <app-stat-card label="Healthy" value="38" hint="79% of total" tone="success" />
        <app-stat-card label="Warning" value="6" hint="12% of total" tone="warning" />
        <app-stat-card label="Down" value="4" hint="8% of total" tone="danger" />
      </div>

      <div class="lf-table-shell mt-4 overflow-x-auto">
        <table class="lf-table min-w-[1120px]">
          <thead><tr><th>Server Name</th><th>Pool</th><th>IP Address</th><th>Port</th><th>Weight</th><th>CPU</th><th>Memory</th><th>Active Conns</th><th>Status</th><th>Uptime</th><th class="text-right">Actions</th></tr></thead>
          <tbody>
            <tr *ngFor="let row of servers">
              <td class="font-semibold text-[#283348]">{{ row.name }}</td><td>{{ row.pool }}</td><td>{{ row.ip }}</td><td>{{ row.port }}</td><td>{{ row.weight }}</td>
              <td [ngClass]="row.cpu > 60 ? 'text-[#e63950] font-semibold' : ''">{{ row.cpu }}%</td><td [ngClass]="row.memory > 70 ? 'text-[#e63950] font-semibold' : ''">{{ row.memory }}%</td><td>{{ row.connections }}</td>
              <td><span class="inline-flex items-center gap-1.5 font-medium" [ngClass]="row.status === 'Warning' ? 'text-[#f59e0b]' : 'text-[#0aa985]'"><i class="h-1.5 w-1.5 rounded-full bg-current"></i>{{ row.status }}</span></td><td>{{ row.uptime }}</td>
              <td><div class="flex justify-end gap-3 text-[#8a94a8]"><button class="hover:text-[#6e2ae0]"><app-icon name="eye" [size]="15" /></button><button class="hover:text-[#6e2ae0]"><app-icon name="edit" [size]="15" /></button></div></td>
            </tr>
          </tbody>
        </table>
        <div class="flex items-center justify-between px-4 py-3 text-[10px] text-[#7c8699]"><span>Showing 1 to 7 of 48 servers</span><div class="flex gap-1"><button class="grid h-7 w-7 place-items-center rounded border border-[#dfe4ec] bg-[#7c3aed] text-white">1</button><button class="grid h-7 w-7 place-items-center rounded border border-[#dfe4ec]">2</button><button class="grid h-7 w-7 place-items-center rounded border border-[#dfe4ec]">3</button><span class="px-1">…</span><button class="grid h-7 w-7 place-items-center rounded border border-[#dfe4ec]">7</button></div></div>
      </div>
    </section>
  `,
})
export class RealServersComponent {
  readonly servers = [
    { name: 'web-01', pool: 'App-Web-Pool', ip: '10.0.1.11', port: 8080, weight: 10, cpu: 22, memory: 45, connections: 120, status: 'Healthy', uptime: '15d 4h' },
    { name: 'web-02', pool: 'App-Web-Pool', ip: '10.0.1.12', port: 8080, weight: 10, cpu: 28, memory: 48, connections: 135, status: 'Healthy', uptime: '12d 2h' },
    { name: 'web-03', pool: 'App-Web-Pool', ip: '10.0.1.13', port: 8080, weight: 10, cpu: 35, memory: 52, connections: 156, status: 'Healthy', uptime: '3d 7h' },
    { name: 'web-04', pool: 'App-Web-Pool', ip: '10.0.1.14', port: 8080, weight: 10, cpu: 70, memory: 73, connections: 198, status: 'Warning', uptime: '3d 5h' },
    { name: 'api-01', pool: 'App-API-Pool', ip: '10.0.2.21', port: 9090, weight: 5, cpu: 18, memory: 34, connections: 85, status: 'Healthy', uptime: '16d 6h' },
    { name: 'api-02', pool: 'App-API-Pool', ip: '10.0.2.22', port: 9090, weight: 5, cpu: 22, memory: 37, connections: 76, status: 'Healthy', uptime: '14d 1h' },
    { name: 'db-01', pool: 'Database-Pool', ip: '10.0.3.31', port: 5432, weight: 20, cpu: 31, memory: 61, connections: 42, status: 'Healthy', uptime: '22d 3h' },
  ];
}
