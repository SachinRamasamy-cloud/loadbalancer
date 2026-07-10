import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgClass, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../shared/icon.component';
import { StatCardComponent } from '../shared/stat-card.component';
import { ApiService, BackendModel } from '../services/api.service';

@Component({
  selector: 'app-real-servers-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, IconComponent, StatCardComponent, FormsModule, TitleCasePipe],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Real Servers</h1>
          <p class="mt-1 text-[11px] text-[#778196]">View and manage all backend servers.</p>
        </div>
        <div class="flex gap-2">
          <button (click)="loadBackends()" class="lf-button-secondary">
            <app-icon name="activity" [size]="14" /> Refresh
          </button>
          <button (click)="openAddModal()" class="lf-button-primary">
            <app-icon name="plus" [size]="14" /> Add Server
          </button>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Total Servers" [value]="backends.length.toString()" hint="All registered" />
        <app-stat-card label="Healthy" [value]="healthyCount().toString()" hint="Eligible and verified" tone="success" />
        <app-stat-card label="Warning" [value]="warningCount().toString()" hint="Unknown or draining" tone="warning" />
        <app-stat-card label="Down" [value]="downCount().toString()" hint="Failing active checks" tone="danger" />
      </div>

      <!-- Add Server Modal Overlay -->
      <div *ngIf="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-[#dfe4ec]">
          <div class="flex items-center justify-between border-b border-[#e1e5ed] pb-3 mb-4">
            <h3 class="text-base font-bold text-[#1a2438]">Add New Backend Server</h3>
            <button (click)="showAddModal = false" class="text-gray-400 hover:text-gray-600">
              <app-icon name="close" [size]="18" />
            </button>
          </div>

          <div class="space-y-4">
            <div *ngIf="errorMessage" class="rounded bg-[#fff0f2] p-2.5 text-[11px] text-[#ef3f55] font-medium">
              {{ errorMessage }}
            </div>
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold text-[#606b7f]">Server ID (Unique)</span>
              <input class="lf-input" [(ngModel)]="newServer.id" placeholder="e.g. fast-api-2" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold text-[#606b7f]">Server Name</span>
              <input class="lf-input" [(ngModel)]="newServer.name" placeholder="e.g. Fast API 2" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold text-[#606b7f]">Base URL</span>
              <input class="lf-input" [(ngModel)]="newServer.url" placeholder="e.g. http://localhost:9001" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold text-[#606b7f]">Weight</span>
              <input class="lf-input" type="number" [(ngModel)]="newServer.weight" placeholder="e.g. 1" />
            </label>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-[#e1e5ed] pt-4">
            <button (click)="showAddModal = false" class="lf-button-secondary">Cancel</button>
            <button (click)="submitAddServer()" class="lf-button-primary">Add Server</button>
          </div>
        </div>
      </div>

      <!-- Edit Weight Modal Overlay -->
      <div *ngIf="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4">
        <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-[#dfe4ec]">
          <div class="flex items-center justify-between border-b border-[#e1e5ed] pb-3 mb-4">
            <h3 class="text-base font-bold text-[#1a2438]">Edit Weight: {{ editingBackend?.name }}</h3>
            <button (click)="showEditModal = false" class="text-gray-400 hover:text-gray-600">
              <app-icon name="close" [size]="18" />
            </button>
          </div>

          <div class="space-y-4">
            <div *ngIf="errorMessage" class="rounded bg-[#fff0f2] p-2.5 text-[11px] text-[#ef3f55] font-medium">
              {{ errorMessage }}
            </div>
            <label class="block">
              <span class="mb-1.5 block text-[10px] font-semibold text-[#606b7f]">Weight</span>
              <input class="lf-input" type="number" [(ngModel)]="editWeight" placeholder="e.g. 5" />
            </label>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-[#e1e5ed] pt-4">
            <button (click)="showEditModal = false" class="lf-button-secondary">Cancel</button>
            <button (click)="submitEditServer()" class="lf-button-primary">Save Changes</button>
          </div>
        </div>
      </div>

      <div class="lf-table-shell mt-4 overflow-x-auto">
        <table class="lf-table min-w-[1120px]">
          <thead>
            <tr>
              <th>Server Name (ID)</th>
              <th>IP Address</th>
              <th>Port</th>
              <th>Weight</th>
              <th>Est. CPU</th>
              <th>Est. Memory</th>
              <th>Active Conns</th>
              <th>Total Requests</th>
              <th>Error Rate</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of backends">
              <td class="font-semibold text-[#283348]">
                {{ row.name }} <span class="text-[10px] text-gray-400 font-normal">({{ row.id }})</span>
              </td>
              <td>{{ getIp(row.url) }}</td>
              <td>{{ getPort(row.url) }}</td>
              <td>{{ row.weight }}</td>
              <td [ngClass]="getEstimatedCpu(row) > 60 ? 'text-[#e63950] font-semibold' : ''">{{ getEstimatedCpu(row) }}%</td>
              <td [ngClass]="getEstimatedMemory(row) > 70 ? 'text-[#e63950] font-semibold' : ''">{{ getEstimatedMemory(row) }}%</td>
              <td>{{ row.active_requests }}</td>
              <td>{{ row.total_requests }}</td>
              <td [ngClass]="row.error_rate > 5 ? 'text-[#e63950] font-semibold' : ''">{{ row.error_rate }}%</td>
              <td>
                <span class="inline-flex items-center gap-1.5 font-medium" [ngClass]="statusClass(row.status)">
                  <i class="h-1.5 w-1.5 rounded-full bg-current"></i>
                  {{ row.status | titlecase }}
                </span>
              </td>
              <td>
                <div class="flex justify-end gap-2">
                  <button *ngIf="row.enabled && row.status !== 'draining'" (click)="drainServer(row.id)" class="px-2 py-1 text-[9px] font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded" title="Drain backend traffic">
                    Drain
                  </button>
                  <button *ngIf="row.enabled" (click)="disableServer(row.id)" class="px-2 py-1 text-[9px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded" title="Disable backend">
                    Disable
                  </button>
                  <button *ngIf="!row.enabled" (click)="enableServer(row.id)" class="px-2 py-1 text-[9px] font-semibold text-green-600 bg-green-50 hover:bg-green-100 rounded" title="Enable backend">
                    Enable
                  </button>
                  <button (click)="openEditModal(row)" class="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit Server Weight">
                    <app-icon name="edit" [size]="14" />
                  </button>
                  <button (click)="deleteServer(row.id)" class="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete backend">
                    <app-icon name="close" [size]="14" />
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="backends.length === 0">
              <td colspan="11" class="text-center py-8 text-[#778196]">
                No backend servers registered in the load balancer. Click "Add Server" to register one.
              </td>
            </tr>
          </tbody>
        </table>
        <div class="flex items-center justify-between px-4 py-3 text-[10px] text-[#7c8699]">
          <span>Showing 1 to {{ backends.length }} of {{ backends.length }} servers</span>
        </div>
      </div>
    </section>
  `,
})
export class RealServersComponent implements OnInit {
  backends: BackendModel[] = [];
  showAddModal = false;
  showEditModal = false;
  editingBackend: BackendModel | null = null;
  editWeight = 1;

  newServer = {
    id: '',
    name: '',
    url: '',
    weight: 1,
  };

  errorMessage = '';

  constructor(private readonly apiService: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadBackends();
  }

  loadBackends(): void {
    this.apiService.getBackends().subscribe({
      next: (data) => {
        console.log('LOADED BACKENDS DATA:', JSON.stringify(data));
        this.backends = data || [];
        console.log('SET BACKENDS:', this.backends.length);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching backends:', err),
    });
  }

  healthyCount(): number {
    return this.backends.filter((b) => b.status === 'healthy').length;
  }

  warningCount(): number {
    return this.backends.filter((b) => b.status === 'unknown' || b.status === 'draining').length;
  }

  downCount(): number {
    return this.backends.filter((b) => b.status === 'unhealthy').length;
  }

  statusClass(status: string): string {
    if (status === 'healthy') return 'text-[#0aa985]';
    if (status === 'unhealthy') return 'text-[#f04455]';
    return 'text-[#f59e0b]'; // draining, unknown
  }

  getIp(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      return url.hostname;
    } catch {
      return urlStr;
    }
  }

  getPort(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      return url.port || (url.protocol === 'https:' ? '443' : '80');
    } catch {
      return '';
    }
  }

  getEstimatedCpu(row: BackendModel): number {
    return Math.min(Math.round(row.active_requests * 12 + (row.id.includes('slow') ? 30 : 10)), 95);
  }

  getEstimatedMemory(row: BackendModel): number {
    return Math.min(Math.round(row.weight * 10 + 25), 85);
  }

  openAddModal(): void {
    this.errorMessage = '';
    this.newServer = {
      id: '',
      name: '',
      url: '',
      weight: 1,
    };
    this.showAddModal = true;
  }

  submitAddServer(): void {
    if (!this.newServer.id || !this.newServer.name || !this.newServer.url) {
      this.errorMessage = 'Please fill out all fields.';
      return;
    }

    this.apiService.createBackend(this.newServer).subscribe({
      next: () => {
        this.showAddModal = false;
        this.loadBackends();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Failed to add server. Ensure URL is valid.';
        this.cdr.detectChanges();
      },
    });
  }

  openEditModal(row: BackendModel): void {
    this.errorMessage = '';
    this.editingBackend = row;
    this.editWeight = row.weight;
    this.showEditModal = true;
  }

  submitEditServer(): void {
    if (!this.editingBackend) return;

    this.apiService.updateBackend(this.editingBackend.id, { weight: this.editWeight }).subscribe({
      next: () => {
        this.showEditModal = false;
        this.loadBackends();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.detail || 'Failed to update server weight.';
        this.cdr.detectChanges();
      },
    });
  }

  enableServer(id: string): void {
    this.apiService.enableBackend(id).subscribe({
      next: () => {
        this.loadBackends();
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  disableServer(id: string): void {
    this.apiService.disableBackend(id).subscribe({
      next: () => {
        this.loadBackends();
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  drainServer(id: string): void {
    this.apiService.drainBackend(id).subscribe({
      next: () => {
        this.loadBackends();
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  deleteServer(id: string): void {
    if (confirm(`Are you sure you want to remove backend "${id}"?`)) {
      this.apiService.deleteBackend(id).subscribe({
        next: () => {
          this.loadBackends();
          this.cdr.detectChanges();
        },
        error: (err) => console.error(err),
      });
    }
  }
}
