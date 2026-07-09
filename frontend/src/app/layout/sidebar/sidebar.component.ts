import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

import {
  Activity,
  BellRing,
  ChartNoAxesCombined,
  CircleHelp,
  FlaskConical,
  Gauge,
  Layers3,
  ListTree,
  Logs,
  Network,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  LucideAngularModule,
} from 'lucide-angular';

interface NavigationItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  @Input() mobileOpen = false;
  @Output() closeMobile = new EventEmitter<void>();

  readonly sidebarIcons = {
    Gauge,
    ChartNoAxesCombined,
    Layers3,
    Server,
    Network,
    ListTree,
    Activity,
    BellRing,
    Logs,
    ShieldCheck,
    FlaskConical,
    Settings,
    CircleHelp,
    SlidersHorizontal,
  };

  readonly primaryNavigation: NavigationItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'gauge',
    },
    {
      label: 'Traffic Analytics',
      route: '/traffic-analytics',
      icon: 'chart-no-axes-combined',
    },
    {
      label: 'Server Pools',
      route: '/server-pools',
      icon: 'layers-3',
    },
    {
      label: 'Real Servers',
      route: '/real-servers',
      icon: 'server',
    },
    {
      label: 'Server Details',
      route: '/server-details',
      icon: 'network',
    },
    {
      label: 'Request Tracking',
      route: '/request-tracking',
      icon: 'list-tree',
    },
    {
      label: 'Health & Alerts',
      route: '/health-alerts',
      icon: 'bell-ring',
    },
    {
      label: 'Logs',
      route: '/logs',
      icon: 'logs',
    },
    {
      label: 'Security',
      route: '/security',
      icon: 'shield-check',
    },
    {
      label: 'Load Testing',
      route: '/load-testing',
      icon: 'flask-conical',
    },
  ];

  readonly secondaryNavigation: NavigationItem[] = [
    {
      label: 'Settings',
      route: '/settings',
      icon: 'settings',
    },
    {
      label: 'Help',
      route: '/help',
      icon: 'circle-help',
    },
  ];

  handleNavigation(): void {
    this.closeMobile.emit();
  }
}