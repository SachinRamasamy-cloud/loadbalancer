import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DashboardDataService } from '../../../../core/services/dashboard-data.service';
import { ActivePoolsCardComponent } from '../../components/active-pools-card/active-pools-card.component';
import { AlertsPanelComponent } from '../../components/alerts-panel/alerts-panel.component';
import { GlobalStatusCardComponent } from '../../components/global-status-card/global-status-card.component';
import { PoolsTableComponent } from '../../components/pools-table/pools-table.component';
import { ServerHealthCardComponent } from '../../components/server-health-card/server-health-card.component';
import { TrafficChartComponent } from '../../components/traffic-chart/traffic-chart.component';
import { TrafficMetricCardComponent } from '../../components/traffic-metric-card/traffic-metric-card.component';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [
    GlobalStatusCardComponent,
    TrafficMetricCardComponent,
    ActivePoolsCardComponent,
    ServerHealthCardComponent,
    TrafficChartComponent,
    PoolsTableComponent,
    AlertsPanelComponent,
  ],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewComponent {
  readonly data = inject(DashboardDataService);
}
