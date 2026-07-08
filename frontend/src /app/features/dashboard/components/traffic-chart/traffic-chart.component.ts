import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { TrafficSeries } from '../../../../core/models/dashboard.models';

@Component({
  selector: 'app-traffic-chart',
  standalone: true,
  templateUrl: './traffic-chart.component.html',
  styleUrl: './traffic-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrafficChartComponent {
  @Input({ required: true }) series!: readonly TrafficSeries[];

  toPath(points: TrafficSeries['points']): string {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
      .join(' ');
  }
}
