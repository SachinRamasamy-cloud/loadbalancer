import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-traffic-metric-card',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './traffic-metric-card.component.html',
  styleUrl: './traffic-metric-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrafficMetricCardComponent {
  @Input({ required: true }) trafficGbps!: number;
}
