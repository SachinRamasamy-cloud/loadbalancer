import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardShellComponent {
  readonly mobileNavigationOpen = signal(false);

  toggleNavigation(): void {
    this.mobileNavigationOpen.update((open) => !open);
  }

  closeNavigation(): void {
    this.mobileNavigationOpen.set(false);
  }
}
