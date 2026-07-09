import { Component } from '@angular/core';
import { NgClass, NgFor } from '@angular/common';

@Component({
  selector: 'app-request-tracking-page',
  standalone: true,
  imports: [NgFor, NgClass],
  template: `
    <section class="lf-page"><div class="mb-5"><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Request Tracking</h1><p class="mt-1 text-[11px] text-[#778196]">Trace request paths, selected backends, retries and timeouts.</p></div><div class="lf-card p-4"><input class="lf-input max-w-md" placeholder="Enter request ID or endpoint..." /><div class="mt-5 overflow-x-auto"><table class="lf-table min-w-[900px]"><thead><tr><th>Request ID</th><th>Endpoint</th><th>Backend</th><th>Retries</th><th>Timeouts</th><th>Status</th><th>Latency</th></tr></thead><tbody><tr *ngFor="let row of rows"><td class="font-mono">{{row.id}}</td><td>{{row.endpoint}}</td><td>{{row.backend}}</td><td>{{row.retries}}</td><td>{{row.timeouts}}</td><td><span [ngClass]="row.status === 200 ? 'text-[#08a981]' : 'text-[#ef4444]'">{{row.status}}</span></td><td>{{row.latency}}</td></tr></tbody></table></div></div></section>
  `,
})
export class RequestTrackingComponent {
  readonly rows = [
    { id: 'req_8f3a9d1', endpoint: '/api/v1/users', backend: 'web-01', retries: 0, timeouts: 0, status: 200, latency: '95 ms' },
    { id: 'req_5b8c21e', endpoint: '/api/v1/orders', backend: 'api-02', retries: 2, timeouts: 1, status: 504, latency: '3.02 s' },
    { id: 'req_91d4a27', endpoint: '/api/v1/auth', backend: 'api-01', retries: 0, timeouts: 0, status: 200, latency: '82 ms' },
  ];
}
