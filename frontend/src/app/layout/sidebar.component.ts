import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '../shared/icon.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <aside class="flex h-full w-[224px] flex-col overflow-hidden bg-[linear-gradient(180deg,#123f91_0%,#0d347b_50%,#08265f_100%)] text-white shadow-[8px_0_25px_rgba(15,43,99,0.10)]">
      <div class="flex h-[64px] shrink-0 items-center border-b border-white/10 px-5">
        <a routerLink="/dashboard" class="flex items-center gap-2.5" (click)="navigate.emit()">
          <span class="relative block h-7 w-7">
            <i class="absolute left-0 top-1.5 h-[7px] w-[18px] -rotate-45 rounded-full bg-gradient-to-r from-[#0fd2de] to-[#2b82ff]"></i>
            <i class="absolute left-1.5 top-3 h-[7px] w-[18px] -rotate-45 rounded-full bg-gradient-to-r from-[#7653ff] to-[#f14aa7]"></i>
            <i class="absolute left-3 top-[18px] h-[7px] w-[16px] -rotate-45 rounded-full bg-gradient-to-r from-[#ff4775] to-[#ff9a21]"></i>
          </span>
          <strong class="text-[17px] font-extrabold tracking-[0.035em]">LOAD<span class="text-[#ff921e]">FLOW</span></strong>
        </a>
      </div>

      <nav class="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ng-container *ngIf="!settingsMode; else settingsNavigation">
          <a
            *ngFor="let item of mainItems"
            [routerLink]="item.route"
            routerLinkActive="nav-active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            class="nav-item"
            (click)="navigate.emit()"
          >
            <app-icon [name]="item.icon" [size]="16" [strokeWidth]="1.7" />
            <span>{{ item.label }}</span>
          </a>
        </ng-container>

        <ng-template #settingsNavigation>
          <div class="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Settings</div>
          <a
            *ngFor="let item of settingsItems"
            [routerLink]="item.route"
            routerLinkActive="settings-active"
            [routerLinkActiveOptions]="{ exact: item.route === '/settings/general' }"
            class="nav-item"
            (click)="navigate.emit()"
          >
            <app-icon [name]="item.icon" [size]="16" [strokeWidth]="1.7" />
            <span>{{ item.label }}</span>
          </a>
        </ng-template>
      </nav>
    </aside>
  `,
  styles: [`
    .nav-item { display:flex; min-height:38px; align-items:center; gap:11px; margin:3px 0; border-radius:6px; padding:9px 10px; color:rgba(225,235,255,.88); font-size:12px; font-weight:500; transition:.16s ease; }
    .nav-item:hover { color:#fff; background:rgba(255,255,255,.08); }
    .nav-active { color:#fff !important; background:linear-gradient(100deg,#ef477b 0%,#f65d5e 44%,#ff921e 100%) !important; box-shadow:0 6px 14px rgba(2,19,57,.24), inset 0 1px rgba(255,255,255,.18); }
    .settings-active { color:#fff !important; background:linear-gradient(100deg,#8a55ed 0%,#a874f5 100%) !important; box-shadow:0 6px 14px rgba(2,19,57,.20), inset 0 1px rgba(255,255,255,.18); }
    .sidebar-scroll { scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.18) transparent; }
    .sidebar-scroll::-webkit-scrollbar { width:4px; }
    .sidebar-scroll::-webkit-scrollbar-thumb { border-radius:999px; background:rgba(255,255,255,.18); }
  `],
})
export class SidebarComponent {
  @Output() navigate = new EventEmitter<void>();
  settingsMode = false;

  readonly mainItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Traffic Analytics', route: '/traffic-analytics', icon: 'chart' },
    { label: 'Server Pools', route: '/server-pools', icon: 'layers' },
    { label: 'Real Servers', route: '/real-servers', icon: 'server' },
    { label: 'Server Details', route: '/server-details', icon: 'network' },
    { label: 'Request Tracking', route: '/request-tracking', icon: 'request' },
    { label: 'Live API Flow', route: '/api-flow', icon: 'flow' },
    { label: 'Health & Alerts', route: '/health-alerts', icon: 'alert' },
    { label: 'Logs', route: '/logs', icon: 'logs' },
    { label: 'Security', route: '/security', icon: 'shield' },
    { label: 'Load Testing', route: '/load-testing', icon: 'flask' },
    { label: 'Settings', route: '/settings/general', icon: 'settings' },
    { label: 'Help', route: '/help', icon: 'help' },
  ];

  readonly settingsItems: NavItem[] = [
    { label: 'General', route: '/settings/general', icon: 'settings' },
    { label: 'Routing', route: '/settings/routing', icon: 'route' },
    { label: 'Health Checks', route: '/settings/health-checks', icon: 'activity' },
    { label: 'Rate Limiting', route: '/settings/rate-limiting', icon: 'clock' },
    { label: 'Security', route: '/settings/security', icon: 'shield' },
    { label: 'Notifications', route: '/settings/notifications', icon: 'bell' },
    { label: 'Integrations', route: '/settings/integrations', icon: 'layers' },
  ];

  constructor(private readonly router: Router) {
    this.updateMode(router.url);
    router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.updateMode(event.urlAfterRedirects);
    });
  }

  private updateMode(url: string): void {
    this.settingsMode = url.startsWith('/settings');
  }
}
