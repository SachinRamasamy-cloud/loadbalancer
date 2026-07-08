import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { AlertItem } from '../../../../core/models/dashboard.models';

@Component({
  selector: 'app-alerts-panel',
  standalone: true,
  templateUrl: './alerts-panel.component.html',
  styleUrl: './alerts-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsPanelComponent {
  @Input({ required: true }) alerts!: readonly AlertItem[];
}
