import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { PoolRow } from '../../../../core/models/dashboard.models';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-pools-table',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './pools-table.component.html',
  styleUrl: './pools-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoolsTableComponent {
  @Input({ required: true }) rows!: readonly PoolRow[];
}
