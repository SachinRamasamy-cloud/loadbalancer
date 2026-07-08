import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-global-status-card',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './global-status-card.component.html',
  styleUrl: './global-status-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalStatusCardComponent {}
