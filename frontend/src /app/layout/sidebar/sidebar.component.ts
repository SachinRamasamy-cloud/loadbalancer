import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import {
  AppIconComponent,
  AppIconName,
} from '../../shared/components/app-icon/app-icon.component';

interface NavigationItem {
  readonly label: string;
  readonly icon: AppIconName;
  readonly route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AppIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  @Input() mobileOpen = false;
  @Output() readonly navigate = new EventEmitter<void>();

  readonly navigation: readonly NavigationItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Server Pools', icon: 'server', route: '/server-pools' },
    { label: 'Real Servers', icon: 'users', route: '/real-servers' },
    { label: 'Security', icon: 'shield', route: '/security' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
    { label: 'Logs', icon: 'file', route: '/logs' },
    { label: 'Help', icon: 'help', route: '/help' },
  ];
}
