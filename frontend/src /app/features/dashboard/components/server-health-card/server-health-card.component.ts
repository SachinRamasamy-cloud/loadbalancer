import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-server-health-card',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './server-health-card.component.html',
  styleUrl: './server-health-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerHealthCardComponent {
  @Input({ required: true }) healthy!: number;
  @Input({ required: true }) warning!: number;
  @Input({ required: true }) down!: number;

  get total(): number {
    return this.healthy + this.warning + this.down;
  }

  get healthyPercent(): number {
    return this.total ? (this.healthy / this.total) * 100 : 0;
  }

  get warningPercent(): number {
    return this.total ? (this.warning / this.total) * 100 : 0;
  }
}
