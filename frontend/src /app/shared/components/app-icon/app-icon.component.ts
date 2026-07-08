import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type AppIconName =
  | 'dashboard'
  | 'server'
  | 'users'
  | 'shield'
  | 'settings'
  | 'file'
  | 'help'
  | 'search'
  | 'bell'
  | 'menu'
  | 'check'
  | 'eye'
  | 'edit'
  | 'more'
  | 'logout';

@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './app-icon.component.html',
  styleUrl: './app-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIconComponent {
  @Input({ required: true }) name!: AppIconName;
  @Input() size = 20;
}
