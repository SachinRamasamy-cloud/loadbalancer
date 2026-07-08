import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/dashboard-shell/dashboard-shell.component')
        .then((component) => component.DashboardShellComponent),
    children: [
      {
        path: 'dashboard',
        title: 'LoadFlow | Dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/overview/overview.component')
            .then((component) => component.OverviewComponent),
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];
