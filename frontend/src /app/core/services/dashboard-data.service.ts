import { Injectable, signal } from '@angular/core';

import { DashboardOverview } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardDataService {
  readonly overview = signal<DashboardOverview>({
    trafficGbps: 5.4,
    activePools: 22,
    totalPools: 25,
    bandwidth: '163B',
    trend: 0,
    healthyServers: 98,
    warningServers: 2,
    downServers: 0,
    pools: [
      {
        name: 'App-Web-Pool',
        statusColor: '#12aaa9',
        servers: 22,
        throughput: '15 Gbps',
        errorRate: '0%',
      },
      {
        name: 'Payments-Pool',
        statusColor: '#ff8a20',
        servers: 22,
        throughput: '24 Gbps',
        errorRate: '0%',
      },
      {
        name: 'Database-Pool',
        statusColor: '#ff8a20',
        servers: 3,
        throughput: '10 tps',
        errorRate: '0%',
      },
      {
        name: 'API-Pool',
        statusColor: '#9824dc',
        servers: 3,
        throughput: '10 Gbps',
        errorRate: '0%',
      },
      {
        name: 'Media-Pool',
        statusColor: '#12aaa9',
        servers: 3,
        throughput: '10 Gbps',
        errorRate: '0%',
      },
    ],
    alerts: [
      {
        source: 'Pool Web-App-1',
        message: 'Node recovered',
        tone: 'healthy',
      },
      {
        source: 'Node Web-App-3',
        message: 'High CPU usage',
        tone: 'warning',
      },
      {
        source: 'Node API-2',
        message: 'Latency threshold exceeded',
        tone: 'info',
      },
      {
        source: 'Pool Web-App-1',
        message: 'Node recovered',
        tone: 'healthy',
      },
      {
        source: 'Pool Web-App-2',
        message: 'Node recovered',
        tone: 'healthy',
      },
    ],
    trafficSeries: [
      {
        name: 'App-Web-Pool',
        color: '#12aaa9',
        points: [
          { x: 0, y: 150 },
          { x: 40, y: 70 },
          { x: 80, y: 90 },
          { x: 120, y: 35 },
          { x: 160, y: 100 },
          { x: 200, y: 55 },
          { x: 240, y: 25 },
          { x: 280, y: 80 },
          { x: 320, y: 35 },
        ],
      },
      {
        name: 'Database-Pool',
        color: '#ff8a20',
        points: [
          { x: 0, y: 155 },
          { x: 40, y: 105 },
          { x: 80, y: 115 },
          { x: 120, y: 78 },
          { x: 160, y: 95 },
          { x: 200, y: 105 },
          { x: 240, y: 112 },
          { x: 280, y: 95 },
          { x: 320, y: 92 },
        ],
      },
      {
        name: 'API-Pool',
        color: '#9824dc',
        points: [
          { x: 0, y: 165 },
          { x: 40, y: 115 },
          { x: 80, y: 120 },
          { x: 120, y: 130 },
          { x: 160, y: 98 },
          { x: 200, y: 100 },
          { x: 240, y: 120 },
          { x: 280, y: 95 },
          { x: 320, y: 72 },
        ],
      },
    ],
  });
}
