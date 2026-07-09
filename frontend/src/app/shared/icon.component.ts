import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

const ICON_PATHS: Record<string, string> = {
  dashboard: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  chart: 'M4 19V9m5 10V5m5 14v-7m5 7V3M3 21h18',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5',
  server: 'M4 5h16v5H4V5Zm0 9h16v5H4v-5ZM7 7.5h.01M7 16.5h.01M11 7.5h6M11 16.5h6',
  network: 'M12 4v4m0 8v4M4 12h4m8 0h4M9 9l-3-3m9 3 3-3M9 15l-3 3m9-3 3 3M9 9h6v6H9V9Z',
  request: 'M5 6h11m-3-3 3 3-3 3M19 18H8m3-3-3 3 3 3',
  alert: 'M12 3 2.8 19h18.4L12 3Zm0 6v4m0 3h.01',
  logs: 'M5 4h14v16H5V4Zm3 4h8M8 12h8M8 16h5',
  shield: 'M12 3 5 6v5c0 4.6 2.7 8.1 7 10 4.3-1.9 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-4',
  flask: 'M9 3h6m-5 0v5l-5 9a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 17l-5-9V3M8 14h8',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-3-13a3 3 0 1 1 5 2.2c-1 .8-2 1.2-2 2.8m0 3h.01',
  search: 'm21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4',
  plus: 'M12 5v14M5 12h14',
  filter: 'M4 5h16l-6 7v5l-4 2v-7L4 5Z',
  eye: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  edit: 'm4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Zm9.5-13.5L17 10',
  chevron: 'm9 18 6-6-6-6',
  download: 'M12 3v12m-4-4 4 4 4-4M5 19h14',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M5 5l14 14M19 5 5 19',
  logout: 'M10 5H5v14h5m4-4 4-3-4-3m4 3H9',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v6m0-10h.01',
  activity: 'M3 12h4l2-7 4 14 2-7h6',
  route: 'M5 5h5v5H5V5Zm9 9h5v5h-5v-5ZM10 7.5h2a4 4 0 0 1 4 4V14',
  lock: 'M6 10h12v10H6V10Zm3 0V7a3 3 0 0 1 6 0v3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path [attr.d]="path"></path>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  @Input({ required: true }) name = 'info';
  @Input() size = 18;
  @Input() strokeWidth = 1.8;

  get path(): string {
    return ICON_PATHS[this.name] ?? ICON_PATHS['info'];
  }
}
