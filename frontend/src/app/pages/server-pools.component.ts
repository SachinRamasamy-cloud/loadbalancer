import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { IconComponent } from '../shared/icon.component';
import { StatCardComponent } from '../shared/stat-card.component';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-server-pools-page',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, IconComponent, StatCardComponent],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Server Pools</h1>
          <p class="mt-1 text-[11px] text-[#778196]">Manage and configure all server pools.</p>
        </div>
        <button (click)="loadPools()" class="lf-button-secondary"><app-icon name="refresh" [size]="14" /> Refresh</button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Total Pools" [value]="pools.length.toString()" hint="Active pools" />
        <app-stat-card label="Healthy Pools" [value]="getHealthyCount().toString()" hint="Fully healthy" tone="success" />
        <app-stat-card label="Draining Pools" [value]="getDrainingCount().toString()" hint="Partial capacity" tone="warning" />
        <app-stat-card label="Down Pools" [value]="getDownCount().toString()" hint="Critical state" tone="danger" />
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
            <tr *ngIf="pools.length === 0">
              <td colspan="8" class="text-center py-8 text-[#778196]">
                No pools registered. Register some servers first.
              </td>
            </tr>
          </tbody>
        </table>
        <div class="flex items-center justify-between px-4 py-3 text-[10px] text-[#7c8699]">
          <span>Showing 1 to {{ pools.length }} of {{ pools.length }} pools</span>
        </div>
      </div>
    </section>
  `,
})
export class ServerPoolsComponent implements OnInit {
  pools: any[] = [];

  constructor(private readonly apiService: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadPools();
  }

  loadPools(): void {
    this.apiService.getPools().subscribe({
      next: (data) => {
        this.pools = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching pools:', err),
    });
  }

  getHealthyCount(): number {
    return this.pools.filter(p => p.status === 'Healthy').length;
  }

  getDrainingCount(): number {
    return this.pools.filter(p => p.status === 'Warning').length;
  }

  getDownCount(): number {
    return this.pools.filter(p => p.status === 'Down').length;
  }

  statusClass(status: string): string {
    return status === 'Down' ? 'text-[#f04455]' : status === 'Warning' ? 'text-[#f59e0b]' : 'text-[#0aa985]';
  }
}
