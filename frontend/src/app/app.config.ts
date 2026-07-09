import {
  ApplicationConfig,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import {
  Activity,
  BellRing,
  ChartNoAxesCombined,
  CircleHelp,
  FlaskConical,
  Gauge,
  Layers3,
  ListTree,
  Logs,
  Network,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  provideLucideIcons,
} from 'lucide-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({
      eventCoalescing: true,
    }),

    provideRouter(routes),

    provideLucideIcons({
      Activity,
      BellRing,
      ChartNoAxesCombined,
      CircleHelp,
      FlaskConical,
      Gauge,
      Layers3,
      ListTree,
      Logs,
      Network,
      Server,
      Settings,
      ShieldCheck,
      SlidersHorizontal,
    }),
  ],
};