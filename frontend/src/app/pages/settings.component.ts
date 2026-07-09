import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule, NgFor, RouterLink, RouterLinkActive],
  template: `
    <section class="lf-page">
      <div class="mb-5"><h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Settings</h1><p class="mt-1 text-[11px] text-[#778196]">Configure system settings and preferences.</p></div>

      <div class="grid gap-4 xl:grid-cols-[170px_1.05fr_1.15fr_1.15fr]">
        <nav class="lf-card h-fit p-2">
          <a *ngFor="let tab of tabs" [routerLink]="tab.route" routerLinkActive="bg-gradient-to-r from-[#8b55ee] to-[#7543e7] text-white shadow-sm" class="block rounded-[6px] px-3 py-2.5 text-[10px] font-medium text-[#465269] hover:bg-[#f5f1ff]">{{ tab.label }}</a>
        </nav>

        <article class="lf-card p-4">
          <h2 class="lf-card-title text-[14px]">General Settings</h2>
          <div class="mt-5 space-y-4">
            <label class="block"><span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">System Name</span><input class="lf-input" [(ngModel)]="systemName" /></label>
            <label class="block"><span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Time Zone</span><select class="lf-select" [(ngModel)]="timezone"><option>(UTC) Coordinated Universal Time</option><option>(IST) India Standard Time</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Data Retention</span><select class="lf-select" [(ngModel)]="retention"><option>30 days</option><option>60 days</option><option>90 days</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Refresh Interval</span><select class="lf-select" [(ngModel)]="refresh"><option>5 seconds</option><option>10 seconds</option><option>30 seconds</option></select></label>
          </div>
        </article>

        <article class="lf-card p-4">
          <h2 class="lf-card-title text-[14px]">Routing Settings</h2>
          <div class="mt-5 space-y-4">
            <label class="block"><span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Default Algorithm</span><select class="lf-select"><option>Smooth Weighted Round Robin</option><option>Least Inflight</option><option>Round Robin</option></select></label>
            <div class="flex items-center justify-between"><span class="text-[10px] font-medium text-[#465269]">Enable Session Persistence</span><button type="button" class="relative h-5 w-9 rounded-full bg-[#12b8b0]" (click)="persistence = !persistence"><span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition" [style.left.px]="persistence ? 18 : 2"></span></button></div>
            <label class="block"><span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Persistence Timeout</span><select class="lf-select"><option>30 minutes</option><option>1 hour</option></select></label>
            <div class="flex items-center justify-between"><span class="text-[10px] font-medium text-[#465269]">Enable Retries</span><button type="button" class="relative h-5 w-9 rounded-full bg-[#12b8b0]" (click)="retries = !retries"><span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition" [style.left.px]="retries ? 18 : 2"></span></button></div>
            <label class="block"><span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Max Retries</span><select class="lf-select"><option>3</option><option>5</option></select></label>
          </div>
        </article>

        <article class="lf-card flex flex-col p-4">
          <h2 class="lf-card-title text-[14px]">Health Check Settings</h2>
          <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label class="block"><span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Interval</span><select class="lf-select"><option>5 seconds</option><option>10 seconds</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Timeout</span><select class="lf-select"><option>3 seconds</option><option>5 seconds</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Healthy Threshold</span><input class="lf-input" value="3" /></label>
            <label class="block"><span class="mb-1.5 block text-[9px] font-medium text-[#606b7f]">Unhealthy Threshold</span><input class="lf-input" value="3" /></label>
          </div>
          <div class="mt-auto pt-8 text-right"><button class="lf-button-primary">Save Changes</button></div>
        </article>
      </div>
    </section>
  `,
})
export class SettingsComponent {
  systemName = 'LoadFlow Load Balancer';
  timezone = '(UTC) Coordinated Universal Time';
  retention = '30 days';
  refresh = '5 seconds';
  persistence = true;
  retries = true;

  readonly tabs = [
    { label: 'General', route: '/settings/general' },
    { label: 'Routing', route: '/settings/routing' },
    { label: 'Health Checks', route: '/settings/health-checks' },
    { label: 'Rate Limiting', route: '/settings/rate-limiting' },
    { label: 'Security', route: '/settings/security' },
    { label: 'Notifications', route: '/settings/notifications' },
    { label: 'Integrations', route: '/settings/integrations' },
  ];
}
