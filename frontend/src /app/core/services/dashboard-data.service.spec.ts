import { TestBed } from '@angular/core/testing';

import { DashboardDataService } from './dashboard-data.service';

describe('DashboardDataService', () => {
  let service: DashboardDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardDataService);
  });

  it('provides a valid pool summary', () => {
    const dashboard = service.overview();

    expect(dashboard.activePools).toBeLessThanOrEqual(dashboard.totalPools);
    expect(dashboard.pools.length).toBeGreaterThan(0);
  });

  it('provides server-health totals', () => {
    const dashboard = service.overview();
    const total =
      dashboard.healthyServers +
      dashboard.warningServers +
      dashboard.downServers;

    expect(total).toBeGreaterThan(0);
  });
});
