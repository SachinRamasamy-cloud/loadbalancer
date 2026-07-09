import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (component) => component.DashboardComponent,
      ),
  },
  {
    path: 'traffic-analytics',
    loadComponent: () =>
      import(
        './pages/traffic-analytics/traffic-analytics.component'
      ).then(
        (component) => component.TrafficAnalyticsComponent,
      ),
  },
  {
    path: 'server-pools',
    loadComponent: () =>
      import('./pages/server-pools/server-pools.component').then(
        (component) => component.ServerPoolsComponent,
      ),
  },
  {
    path: 'real-servers',
    loadComponent: () =>
      import('./pages/real-servers/real-servers.component').then(
        (component) => component.RealServersComponent,
      ),
  },
  {
    path: 'server-details',
    loadComponent: () =>
      import(
        './pages/server-details/server-details.component'
      ).then(
        (component) => component.ServerDetailsComponent,
      ),
  },
  {
    path: 'request-tracking',
    loadComponent: () =>
      import(
        './pages/request-tracking/request-tracking.component'
      ).then(
        (component) => component.RequestTrackingComponent,
      ),
  },
  {
    path: 'health-alerts',
    loadComponent: () =>
      import(
        './pages/health-alerts/health-alerts.component'
      ).then(
        (component) => component.HealthAlertsComponent,
      ),
  },
  {
    path: 'logs',
    loadComponent: () =>
      import('./pages/logs/logs.component').then(
        (component) => component.LogsComponent,
      ),
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./pages/security/security.component').then(
        (component) => component.SecurityComponent,
      ),
  },
  {
    path: 'load-testing',
    loadComponent: () =>
      import('./pages/load-testing/load-testing.component').then(
        (component) => component.LoadTestingComponent,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings.component').then(
        (component) => component.SettingsComponent,
      ),
  },
  {
    path: 'help',
    loadComponent: () =>
      import('./pages/help/help.component').then(
        (component) => component.HelpComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];