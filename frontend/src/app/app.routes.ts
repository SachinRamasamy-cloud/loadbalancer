import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'traffic-analytics',
        loadComponent: () => import('./pages/traffic-analytics.component').then((m) => m.TrafficAnalyticsComponent),
      },
      {
        path: 'server-pools',
        loadComponent: () => import('./pages/server-pools.component').then((m) => m.ServerPoolsComponent),
      },
      {
        path: 'real-servers',
        loadComponent: () => import('./pages/real-servers.component').then((m) => m.RealServersComponent),
      },
      {
        path: 'server-details',
        loadComponent: () => import('./pages/server-details.component').then((m) => m.ServerDetailsComponent),
      },
      {
        path: 'request-tracking',
        loadComponent: () => import('./pages/request-tracking.component').then((m) => m.RequestTrackingComponent),
      },
      {
        path: 'health-alerts',
        loadComponent: () => import('./pages/health-alerts.component').then((m) => m.HealthAlertsComponent),
      },
      {
        path: 'logs',
        loadComponent: () => import('./pages/logs.component').then((m) => m.LogsComponent),
      },
      {
        path: 'security',
        loadComponent: () => import('./pages/security.component').then((m) => m.SecurityComponent),
      },
      {
        path: 'load-testing',
        loadComponent: () => import('./pages/load-testing.component').then((m) => m.LoadTestingComponent),
      },
      {
        path: 'settings',
        redirectTo: 'settings/general',
        pathMatch: 'full',
      },
      {
        path: 'settings/:section',
        loadComponent: () => import('./pages/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'help',
        loadComponent: () => import('./pages/help.component').then((m) => m.HelpComponent),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
