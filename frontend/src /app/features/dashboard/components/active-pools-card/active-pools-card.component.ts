import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-active-pools-card',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './active-pools-card.component.html',
  styleUrl: './active-pools-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivePoolsCardComponent {
  @Input({ required: true }) activePools!: number;
  @Input({ required: true }) totalPools!: number;
  @Input({ required: true }) bandwidth!: string;
  @Input({ required: true }) trend!: number;

  get activePercentage(): number {
    if (!this.totalPools) {
      return 0;
    }

    return Math.round((this.activePools / this.totalPools) * 100);
  }
}
