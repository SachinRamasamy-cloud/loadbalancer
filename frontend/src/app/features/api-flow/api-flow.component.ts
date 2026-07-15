import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  DatePipe,
  DecimalPipe,
  NgClass,
  NgFor,
  NgIf,
} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, interval, of, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { ApiService, BackendModel, RoutingInfo } from '../../services/api.service';
import { IconComponent } from '../../shared/icon.component';
import {
  ApiFlowCategory,
  ApiFlowEvent,
  ApiFlowNode,
  ApiFlowTarget,
} from './api-flow.models';
import { ApiFlowService } from './api-flow.service';
import { ApiFlowLiveStreamService } from './api-flow-live-stream.service';
import { ApiFlowStreamState } from './api-flow.models';

@Component({
  selector: 'app-api-flow-page',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    NgClass,
    FormsModule,
    DatePipe,
    DecimalPipe,
    RouterLink,
    IconComponent,
  ],
  template: `
    <section class="lf-page">
      <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-[24px] font-bold tracking-[-0.03em] text-[#1a2438]">Live API Neural Flow</h1>
            <span class="inline-flex items-center gap-1.5 rounded-full border border-[#bdeee8] bg-[#edfffc] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#078c82]">
              <i class="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0fbaa9]"></i>
              {{ streamState.status === 'connected' ? 'Backend live stream' : streamState.status }}
            </span>
          </div>
          <p class="mt-1 max-w-3xl text-[11px] leading-5 text-[#778196]">
            Every API request received by FastAPI is streamed live and animated, including Angular, curl, Postman, load tests, retries, backend selection, and database persistence.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button (click)="probeAllApis()" [disabled]="probeRunning" class="lf-button-primary disabled:cursor-not-allowed disabled:opacity-60">
            <app-icon name="activity" [size]="14" />
            {{ probeRunning ? 'Scanning APIs...' : 'Probe Read APIs' }}
          </button>
          <button (click)="sendDemoRequest()" class="lf-button-secondary">
            <app-icon name="request" [size]="14" /> Send Proxy Request
          </button>
          <button (click)="togglePaused()" class="lf-button-secondary">
            <app-icon [name]="paused ? 'activity' : 'close'" [size]="13" />
            {{ paused ? 'Resume Signals' : 'Pause Signals' }}
          </button>
          <button (click)="clearEvents()" class="lf-button-secondary">
            <app-icon name="logs" [size]="13" /> Clear
          </button>
          <button (click)="restartStream()" class="lf-button-secondary">
            <app-icon name="refresh" [size]="13" /> Reconnect Stream
          </button>
        </div>
      </div>

      <div *ngIf="message" class="mb-4 rounded-lg border border-[#d9e9ff] bg-[#f3f8ff] px-3 py-2.5 text-[11px] font-medium text-[#285b9f]">
        {{ message }}
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article class="lf-card p-4">
          <div class="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b8597]">Observed calls</div>
          <div class="mt-2 text-[24px] font-bold tracking-[-0.04em] text-[#202b42]">{{ events.length }}</div>
          <div class="mt-1 text-[10px] text-[#8b95a7]">Browser and external API requests</div>
        </article>
        <article class="lf-card p-4">
          <div class="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b8597]">Active</div>
          <div class="mt-2 text-[24px] font-bold tracking-[-0.04em] text-[#6d3ce8]">{{ pendingCount }}</div>
          <div class="mt-1 text-[10px] text-[#8b95a7]">Requests awaiting responses</div>
        </article>
        <article class="lf-card p-4">
          <div class="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b8597]">Successful</div>
          <div class="mt-2 text-[24px] font-bold tracking-[-0.04em] text-[#0b9f8d]">{{ successCount }}</div>
          <div class="mt-1 text-[10px] text-[#8b95a7]">HTTP responses below 400</div>
        </article>
        <article class="lf-card p-4">
          <div class="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b8597]">Errors</div>
          <div class="mt-2 text-[24px] font-bold tracking-[-0.04em] text-[#e14d62]">{{ errorCount }}</div>
          <div class="mt-1 text-[10px] text-[#8b95a7]">Transport or HTTP failures</div>
        </article>
        <article class="lf-card p-4">
          <div class="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b8597]">Average latency</div>
          <div class="mt-2 text-[24px] font-bold tracking-[-0.04em] text-[#202b42]">{{ averageLatency | number:'1.0-0' }} ms</div>
          <div class="mt-1 text-[10px] text-[#8b95a7]">Completed frontend API calls</div>
        </article>
      </div>

      <div class="mt-3 grid gap-3 2xl:grid-cols-[minmax(0,1fr)_350px]">
        <article class="lf-card min-w-0 overflow-hidden">
          <div class="flex flex-col gap-3 border-b border-[#e8ebf1] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="lf-card-title">Animated API transfer graph</h2>
              <p class="mt-1 text-[10px] text-[#8b95a7]">
                Request particles follow the exact endpoint category detected by the global HTTP interceptor.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select [(ngModel)]="categoryFilter" class="lf-select !h-8 !w-[185px] !text-[10px]">
                <option value="all">All API modules</option>
                <option *ngFor="let option of endpointNodes" [value]="option.category">
                  {{ option.label }}
                </option>
              </select>
              <span class="rounded-full border border-[#e1e5ec] bg-[#f8fafc] px-2.5 py-1.5 text-[9px] font-semibold text-[#59657a]">
                {{ routing?.algorithm || 'routing loading' }}
              </span>
            </div>
          </div>

          <div class="flow-scroll overflow-x-auto bg-[radial-gradient(circle_at_50%_40%,rgba(117,66,238,0.055),transparent_38%),linear-gradient(180deg,#fcfdff_0%,#f7f9fd_100%)]">
            <svg
              class="block h-auto min-h-[650px] w-full min-w-[1180px]"
              viewBox="0 0 1280 720"
              role="img"
              aria-label="Live API request neural network flow"
            >
              <defs>
                <linearGradient id="edgeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#86a5d8" stop-opacity="0.20" />
                  <stop offset="55%" stop-color="#8d61eb" stop-opacity="0.32" />
                  <stop offset="100%" stop-color="#41b7c2" stop-opacity="0.24" />
                </linearGradient>
                <filter id="signalGlow" x="-200%" y="-200%" width="400%" height="400%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#21335e" flood-opacity="0.10" />
                </filter>
                <marker id="arrowHead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill="#9aa8bd" opacity="0.55"></path>
                </marker>
              </defs>

              <g opacity="0.95">
                <text x="104" y="34" class="flow-layer-label">CLIENT LAYER</text>
                <text x="430" y="34" class="flow-layer-label">API GATEWAY</text>
                <text x="706" y="34" class="flow-layer-label">FASTAPI MODULES</text>
                <text x="1080" y="34" class="flow-layer-label">SERVICE TARGETS</text>
              </g>

              <g class="base-edges">
                <path [attr.d]="sourceToGatewayPath" class="flow-edge-base" marker-end="url(#arrowHead)"></path>
                <path
                  *ngFor="let node of endpointNodes"
                  [attr.d]="gatewayToEndpointPath(node)"
                  class="flow-edge-base"
                  marker-end="url(#arrowHead)"
                ></path>
                <path
                  *ngFor="let node of endpointNodes"
                  [attr.d]="endpointToTargetPath(node)"
                  class="flow-edge-base"
                  marker-end="url(#arrowHead)"
                ></path>
              </g>

              <g *ngFor="let event of animatedEvents; trackBy: trackEvent" class="active-flow">
                <path
                  [attr.d]="eventPath(event)"
                  class="flow-edge-active"
                  [ngClass]="edgeClass(event)"
                ></path>
                <circle
                  *ngIf="!paused"
                  r="5.5"
                  class="flow-signal"
                  [ngClass]="signalClass(event)"
                  filter="url(#signalGlow)"
                >
                  <animateMotion
                    [attr.path]="eventPath(event)"
                    dur="1.7s"
                    repeatCount="indefinite"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.42 0 0.2 1"
                  ></animateMotion>
                </circle>
                <circle
                  *ngIf="!paused && event.phase !== 'pending'"
                  r="3.5"
                  class="response-signal"
                  [ngClass]="signalClass(event)"
                >
                  <animateMotion
                    [attr.path]="reverseEventPath(event)"
                    dur="2.1s"
                    begin="0.35s"
                    repeatCount="indefinite"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.42 0 0.2 1"
                  ></animateMotion>
                </circle>
              </g>

              <g *ngFor="let node of fixedNodes" [attr.transform]="nodeTransform(node)" filter="url(#nodeShadow)">
                <rect
                  [attr.width]="node.width"
                  [attr.height]="node.height"
                  rx="14"
                  class="flow-node flow-node-core"
                  [ngClass]="nodeClass(node)"
                ></rect>
                <circle cx="22" [attr.cy]="node.height / 2" r="7" class="node-dot" [ngClass]="nodeDotClass(node)"></circle>
                <text x="39" [attr.y]="node.height / 2 - 3" class="node-title">{{ node.label }}</text>
                <text x="39" [attr.y]="node.height / 2 + 14" class="node-subtitle">{{ node.subtitle }}</text>
              </g>

              <g *ngFor="let node of endpointNodes" [attr.transform]="nodeTransform(node)" class="cursor-pointer" (click)="filterNode(node)">
                <rect
                  [attr.width]="node.width"
                  [attr.height]="node.height"
                  rx="10"
                  class="flow-node flow-node-endpoint"
                  [ngClass]="nodeClass(node)"
                ></rect>
                <circle cx="17" [attr.cy]="node.height / 2" r="5.5" class="node-dot" [ngClass]="nodeDotClass(node)"></circle>
                <text x="31" [attr.y]="node.height / 2 + 4" class="endpoint-title">{{ node.label }}</text>
                <text [attr.x]="node.width - 12" [attr.y]="node.height / 2 + 4" text-anchor="end" class="endpoint-count">
                  {{ categoryCount(node.category!) }}
                </text>
              </g>

              <g *ngFor="let node of targetNodes" [attr.transform]="nodeTransform(node)" filter="url(#nodeShadow)">
                <rect
                  [attr.width]="node.width"
                  [attr.height]="node.height"
                  rx="14"
                  class="flow-node flow-node-target"
                  [ngClass]="nodeClass(node)"
                ></rect>
                <circle cx="22" [attr.cy]="node.height / 2" r="7" class="node-dot" [ngClass]="nodeDotClass(node)"></circle>
                <text x="39" [attr.y]="node.height / 2 - 3" class="node-title">{{ node.label }}</text>
                <text x="39" [attr.y]="node.height / 2 + 14" class="node-subtitle">{{ node.subtitle }}</text>
              </g>

              <g transform="translate(34,660)">
                <rect width="1212" height="42" rx="11" fill="#ffffff" stroke="#e2e7ef"></rect>
                <circle cx="22" cy="21" r="4" fill="#7c4ce4"></circle>
                <text x="34" y="25" class="legend-text">Request</text>
                <circle cx="118" cy="21" r="4" fill="#0ca78f"></circle>
                <text x="130" y="25" class="legend-text">Success response</text>
                <circle cx="258" cy="21" r="4" fill="#e54e63"></circle>
                <text x="270" y="25" class="legend-text">Failed response</text>
                <text x="455" y="25" class="legend-text">
                  Backend status: {{ healthyBackends }}/{{ backends.length }} healthy
                </text>
                <text x="744" y="25" class="legend-text">
                  Database: {{ databaseAvailable ? 'connected' : 'unavailable' }}
                </text>
                <text x="1000" y="25" class="legend-text">
                  Signals: {{ paused ? 'paused' : 'live' }}
                </text>
              </g>
            </svg>
          </div>
        </article>

        <aside class="lf-card flex min-h-[650px] flex-col overflow-hidden">
          <div class="border-b border-[#e8ebf1] px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="lf-card-title">API call stream</h2>
                <p class="mt-1 text-[10px] text-[#8b95a7]">Newest calls from Angular, curl, Postman, and load tests appear first.</p>
              </div>
              <span class="rounded-full bg-[#f1ecff] px-2 py-1 text-[9px] font-bold text-[#7041d8]">
                {{ filteredEvents.length }} calls
              </span>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-3">
            <button
              *ngFor="let event of filteredEvents; trackBy: trackEvent"
              (click)="selectedEvent = event"
              class="mb-2 w-full rounded-[9px] border p-3 text-left transition hover:-translate-y-[1px] hover:shadow-sm"
              [ngClass]="eventCardClass(event)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="rounded px-1.5 py-0.5 text-[8px] font-extrabold tracking-[0.08em]" [ngClass]="methodClass(event.method)">
                      {{ event.method }}
                    </span>
                    <span class="truncate text-[10px] font-semibold text-[#2d394f]">{{ event.categoryLabel }}</span>
                  </div>
                  <div class="mt-1.5 truncate font-mono text-[9px] text-[#657087]">{{ event.path }}</div>
                </div>
                <span class="shrink-0 rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em]" [ngClass]="phaseBadgeClass(event)">
                  {{ event.phase }}
                </span>
              </div>
              <div class="mt-2 flex items-center justify-between text-[9px] text-[#8993a5]">
                <span>{{ event.startedAt | date:'HH:mm:ss.SSS' }}</span>
                <span>{{ event.statusCode || '—' }} · {{ event.durationMs === null ? 'waiting' : event.durationMs + ' ms' }}</span>
              </div>
            </button>

            <div *ngIf="filteredEvents.length === 0" class="flex min-h-[420px] flex-col items-center justify-center px-5 text-center">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1edff] text-[#7342dd]">
                <app-icon name="network" [size]="22" />
              </div>
              <h3 class="mt-3 text-[12px] font-semibold text-[#334057]">No API signals yet</h3>
              <p class="mt-1 text-[10px] leading-5 text-[#8b95a7]">
                Navigate through the dashboard or run an API probe to generate calls.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div class="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <article class="lf-card p-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="lf-card-title">Endpoint coverage</h2>
              <p class="mt-1 text-[10px] text-[#8b95a7]">All FastAPI endpoint families are mapped into the neural graph.</p>
            </div>
          </div>
          <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <button
              *ngFor="let node of endpointNodes"
              (click)="filterNode(node)"
              class="flex items-center justify-between rounded-[9px] border border-[#e6e9ef] bg-[#fbfcfe] px-3 py-2.5 text-left transition hover:border-[#cfc2f5] hover:bg-[#faf8ff]"
            >
              <div class="min-w-0">
                <div class="truncate text-[10px] font-semibold text-[#364158]">{{ node.label }}</div>
                <div class="mt-0.5 truncate text-[9px] text-[#8b95a7]">{{ node.subtitle }}</div>
              </div>
              <span class="ml-3 rounded-full bg-white px-2 py-1 text-[9px] font-bold text-[#7145d4] shadow-sm">
                {{ categoryCount(node.category!) }}
              </span>
            </button>
          </div>
        </article>

        <article class="lf-card p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="lf-card-title">Selected call</h2>
              <p class="mt-1 text-[10px] text-[#8b95a7]">Inspect one complete client-to-backend transfer.</p>
            </div>
            <a routerLink="/request-tracking" class="text-[10px] font-semibold text-[#7040dc] hover:underline">Request history</a>
          </div>

          <div *ngIf="selectedEvent; else noSelection" class="mt-4 space-y-3">
            <div class="rounded-[9px] border border-[#e4e7ed] bg-[#fafbfe] p-3">
              <div class="flex items-center justify-between gap-3">
                <span class="rounded px-2 py-1 text-[9px] font-extrabold" [ngClass]="methodClass(selectedEvent.method)">{{ selectedEvent.method }}</span>
                <span class="text-[10px] font-semibold" [ngClass]="selectedEvent.phase === 'error' ? 'text-[#d94459]' : 'text-[#138f80]'">
                  {{ selectedEvent.statusCode || selectedEvent.phase }}
                </span>
              </div>
              <div class="mt-3 break-all font-mono text-[10px] text-[#4b576d]">{{ selectedEvent.path }}</div>
            </div>

            <dl class="grid grid-cols-2 gap-3 text-[10px]">
              <div class="rounded-lg bg-[#f7f8fb] p-3">
                <dt class="text-[#8b95a7]">API module</dt>
                <dd class="mt-1 font-semibold text-[#344056]">{{ selectedEvent.categoryLabel }}</dd>
              </div>
              <div class="rounded-lg bg-[#f7f8fb] p-3">
                <dt class="text-[#8b95a7]">Destination</dt>
                <dd class="mt-1 font-semibold text-[#344056]">{{ selectedEvent.targetLabel }}</dd>
              </div>
              <div class="rounded-lg bg-[#f7f8fb] p-3">
                <dt class="text-[#8b95a7]">Duration</dt>
                <dd class="mt-1 font-semibold text-[#344056]">{{ selectedEvent.durationMs === null ? 'In progress' : selectedEvent.durationMs + ' ms' }}</dd>
              </div>
              <div class="rounded-lg bg-[#f7f8fb] p-3">
                <dt class="text-[#8b95a7]">Selected backend</dt>
                <dd class="mt-1 font-semibold text-[#344056]">{{ selectedEvent.selectedBackend || 'Not reported' }}</dd>
              </div>
              <div class="rounded-lg bg-[#f7f8fb] p-3">
                <dt class="text-[#8b95a7]">Client source</dt>
                <dd class="mt-1 font-semibold text-[#344056]">{{ selectedEvent.clientName || selectedEvent.source }}</dd>
              </div>
              <div class="rounded-lg bg-[#f7f8fb] p-3">
                <dt class="text-[#8b95a7]">Lifecycle stage</dt>
                <dd class="mt-1 break-all font-semibold text-[#344056]">{{ selectedEvent.lifecycleStage }}</dd>
              </div>
              <div class="rounded-lg bg-[#f7f8fb] p-3">
                <dt class="text-[#8b95a7]">Attempt / retries</dt>
                <dd class="mt-1 font-semibold text-[#344056]">{{ selectedEvent.attemptNumber || 1 }} / {{ selectedEvent.retryCount }}</dd>
              </div>
              <div class="rounded-lg bg-[#f7f8fb] p-3">
                <dt class="text-[#8b95a7]">History persistence</dt>
                <dd class="mt-1 font-semibold text-[#344056]">{{ selectedEvent.persisted === true ? 'Saved' : selectedEvent.persisted === false ? 'Pending / unavailable' : 'Not reported' }}</dd>
              </div>
            </dl>

            <div *ngIf="selectedEvent.errorMessage" class="rounded-lg border border-[#ffd8dd] bg-[#fff4f5] p-3 text-[10px] leading-5 text-[#c93e52]">
              {{ selectedEvent.errorMessage }}
            </div>
          </div>

          <ng-template #noSelection>
            <div class="mt-4 flex min-h-[190px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#dfe3eb] bg-[#fafbfc] px-4 text-center">
              <app-icon name="eye" [size]="21" />
              <p class="mt-2 text-[10px] text-[#7f899b]">Select a call from the stream to inspect its route and response.</p>
            </div>
          </ng-template>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .flow-layer-label { fill:#929caf; font:700 10px Inter, sans-serif; letter-spacing:.16em; }
    .flow-edge-base { fill:none; stroke:url(#edgeGradient); stroke-width:1.2; stroke-dasharray:4 7; }
    .flow-edge-active { fill:none; stroke-width:2.1; stroke-linecap:round; opacity:.62; stroke-dasharray:7 10; animation:flowDash 1.2s linear infinite; }
    .edge-pending { stroke:#7547e4; }
    .edge-success { stroke:#10a993; }
    .edge-error { stroke:#e55064; }
    .edge-warning { stroke:#e9a02d; }
    .edge-cancelled { stroke:#8f99aa; }
    .flow-signal, .response-signal { stroke:#fff; stroke-width:1.7; }
    .signal-pending { fill:#7040df; }
    .signal-success { fill:#0caa91; }
    .signal-error { fill:#e34b61; }
    .signal-warning { fill:#e9a02d; }
    .signal-cancelled { fill:#8b95a7; }
    .flow-node { stroke-width:1.2; transition:.2s ease; }
    .flow-node-core { fill:#fff; stroke:#dce2eb; }
    .flow-node-endpoint { fill:#fff; stroke:#e0e5ed; }
    .flow-node-target { fill:#fdfdff; stroke:#dbe2ee; }
    .node-active { stroke:#8354ea !important; fill:#fbf9ff !important; stroke-width:2 !important; }
    .node-success { stroke:#78d3c6 !important; fill:#f5fffc !important; }
    .node-error { stroke:#f1a0ac !important; fill:#fff7f8 !important; }
    .node-dot { fill:#a6b0c0; }
    .dot-active { fill:#7746e3; animation:nodePulse 1.2s ease-in-out infinite; }
    .dot-success { fill:#10a990; }
    .dot-error { fill:#e54e63; }
    .node-title { fill:#2d394f; font:700 12px Inter, sans-serif; }
    .node-subtitle { fill:#8a94a7; font:500 9px Inter, sans-serif; }
    .endpoint-title { fill:#39455b; font:650 10px Inter, sans-serif; }
    .endpoint-count { fill:#7950dc; font:750 9px Inter, sans-serif; }
    .legend-text { fill:#677287; font:600 9px Inter, sans-serif; }
    .flow-scroll { scrollbar-width:thin; scrollbar-color:#cdd5e1 transparent; }
    .flow-scroll::-webkit-scrollbar { height:6px; }
    .flow-scroll::-webkit-scrollbar-thumb { border-radius:999px; background:#cdd5e1; }
    @keyframes flowDash { to { stroke-dashoffset:-34; } }
    @keyframes nodePulse { 0%,100% { opacity:.55; r:5.5px; } 50% { opacity:1; r:8px; } }
    @media (prefers-reduced-motion: reduce) {
      .flow-edge-active, .dot-active { animation:none; }
    }
  `],
})
export class ApiFlowComponent implements OnInit, OnDestroy {
  events: ApiFlowEvent[] = [];
  backends: BackendModel[] = [];
  routing: RoutingInfo | null = null;
  databaseAvailable = false;
  paused = false;
  probeRunning = false;
  categoryFilter: ApiFlowCategory | 'all' = 'all';
  selectedEvent: ApiFlowEvent | null = null;
  message = '';
  now = Date.now();
  streamState: ApiFlowStreamState = {
    status: 'disconnected',
    receivedEvents: 0,
    reconnectAttempts: 0,
    lastEventAt: null,
    errorMessage: null,
  };

  private readonly subscriptions = new Subscription();

  readonly fixedNodes: ApiFlowNode[] = [
    { id: 'frontend', label: 'API Clients', subtitle: 'Angular · curl · Postman', x: 42, y: 330, width: 150, height: 70, type: 'source' },
    { id: 'http-client', label: 'HTTP Transfer', subtitle: 'Local · remote · load test', x: 235, y: 330, width: 150, height: 70, type: 'source' },
    { id: 'fastapi', label: 'FastAPI Gateway', subtitle: 'Auth · CORS · routing', x: 430, y: 330, width: 160, height: 70, type: 'gateway' },
  ];

  readonly endpointNodes: ApiFlowNode[] = [
    this.endpoint('health', 'Platform Health', '/healthz', 635, 60),
    this.endpoint('database', 'Database Status', '/database/status', 812, 60),
    this.endpoint('overview', 'Overview API', '/overview', 635, 130),
    this.endpoint('metrics', 'Metrics API', '/metrics/*', 812, 130),
    this.endpoint('analytics', 'Analytics API', '/analytics', 635, 200),
    this.endpoint('logs', 'Logs API', '/logs', 812, 200),
    this.endpoint('history', 'Request History', '/history/requests', 635, 270),
    this.endpoint('backends', 'Backend Control', '/backends/*', 812, 270),
    this.endpoint('routing', 'Routing Control', '/routing', 635, 400),
    this.endpoint('pools', 'Server Pools', '/pools', 812, 400),
    this.endpoint('security', 'Security API', '/security/*', 635, 470),
    this.endpoint('alerts', 'Alerts API', '/alerts/*', 812, 470),
    this.endpoint('load-test', 'Load Test API', '/load-test/*', 635, 540),
    this.endpoint('proxy', 'Proxy Traffic', '/api/*', 812, 540),
    this.endpoint('other', 'Other API', 'Unmapped endpoint', 724, 610),
  ];

  readonly targetNodes: ApiFlowNode[] = [
    this.target('platform', 'Platform Runtime', 'Health and app state', 1065, 70),
    this.target('supabase', 'Supabase', 'History and durable logs', 1065, 200),
    this.target('metrics-store', 'Metrics Store', 'Traffic and analytics', 1065, 330),
    this.target('control-plane', 'Control Plane', 'Configuration and workers', 1065, 460),
    this.target('backend-pool', 'Backend Pool', 'Fast · slow · unstable', 1065, 590),
  ];

  readonly sourceToGatewayPath = this.pathThrough([
    this.center(this.fixedNodes[0]),
    this.center(this.fixedNodes[1]),
    this.center(this.fixedNodes[2]),
  ]);

  constructor(
    private readonly flowService: ApiFlowService,
    private readonly liveStream: ApiFlowLiveStreamService,
    private readonly apiService: ApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.liveStream.state$.subscribe((state) => {
        this.streamState = state;
        if (state.status === 'error' && state.errorMessage) {
          this.message = `Live API stream: ${state.errorMessage}`;
        }
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.add(
      this.flowService.events$.subscribe((events) => {
        this.events = events;
        if (!this.selectedEvent && events.length) this.selectedEvent = events[0];
        if (this.selectedEvent) {
          this.selectedEvent = events.find((event) => event.id === this.selectedEvent?.id) ?? this.selectedEvent;
        }
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.add(
      interval(1000).pipe(startWith(0)).subscribe(() => {
        this.now = Date.now();
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.add(
      interval(7000)
        .pipe(
          startWith(0),
          switchMap(() =>
            forkJoin({
              backends: this.apiService.getBackends().pipe(catchError(() => of([] as BackendModel[]))),
              routing: this.apiService.getRouting().pipe(catchError(() => of(null))),
              database: this.apiService.getDatabaseStatus().pipe(catchError(() => of(null))),
            })
          )
        )
        .subscribe((result) => {
          this.backends = result.backends;
          this.routing = result.routing;
          this.databaseAvailable = Boolean(result.database?.database?.available);
          this.cdr.detectChanges();
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get filteredEvents(): ApiFlowEvent[] {
    const source = this.categoryFilter === 'all'
      ? this.events
      : this.events.filter((event) => event.category === this.categoryFilter);
    return source.slice(0, 40);
  }

  get animatedEvents(): ApiFlowEvent[] {
    return this.filteredEvents
      .filter((event) => event.phase === 'pending' || this.now - (event.completedAt ?? event.startedAt) < 9000)
      .slice(0, 18);
  }

  get pendingCount(): number {
    return this.events.filter((event) => event.phase === 'pending').length;
  }

  get successCount(): number {
    return this.events.filter((event) => event.phase === 'success').length;
  }

  get errorCount(): number {
    return this.events.filter((event) => event.phase === 'error').length;
  }

  get averageLatency(): number {
    const values = this.events
      .map((event) => event.durationMs)
      .filter((value): value is number => value !== null);
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  get healthyBackends(): number {
    return this.backends.filter((backend) => backend.status === 'healthy').length;
  }

  probeAllApis(): void {
    if (this.probeRunning) return;
    this.probeRunning = true;
    this.message = 'Sending safe read requests through every available dashboard API family.';

    const safe = <T>(observable: import('rxjs').Observable<T>) => observable.pipe(catchError(() => of(null)));

    forkJoin([
      safe(this.apiService.getHealth()),
      safe(this.apiService.getDatabaseStatus()),
      safe(this.apiService.getOverview()),
      safe(this.apiService.getTimeseries()),
      safe(this.apiService.getAnalytics()),
      safe(this.apiService.getLogs(10)),
      safe(this.apiService.getRequestHistory(10)),
      safe(this.apiService.getBackends()),
      safe(this.apiService.getRouting()),
      safe(this.apiService.getPools()),
      safe(this.apiService.getSecurityStats()),
      safe(this.apiService.getAlerts()),
      safe(this.apiService.getLoadTestActive()),
    ]).subscribe({
      next: () => {
        this.probeRunning = false;
        this.message = 'API probe completed. The neural graph captured each frontend call and response.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.probeRunning = false;
        this.message = 'API probe finished with one or more unavailable endpoints. Failed calls remain visible in red.';
        this.cdr.detectChanges();
      },
    });
  }

  sendDemoRequest(): void {
    this.message = 'Sending one request through the public load-balancing proxy.';
    this.apiService.sendDemoRequest().subscribe({
      next: () => {
        this.message = 'Proxy request completed. The selected backend is shown when the response exposes its backend header.';
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.message = this.apiService.getErrorMessage(error);
        this.cdr.detectChanges();
      },
    });
  }

  restartStream(): void {
    this.message = 'Reconnecting to the FastAPI live event stream.';
    this.liveStream.restart();
  }

  togglePaused(): void {
    this.paused = !this.paused;
  }

  clearEvents(): void {
    this.flowService.clear();
    this.selectedEvent = null;
    this.message = 'The local API-flow window was cleared. Database request history was not deleted.';
  }

  filterNode(node: ApiFlowNode): void {
    if (!node.category) return;
    this.categoryFilter = node.category;
  }

  categoryCount(category: ApiFlowCategory): number {
    return this.events.filter((event) => event.category === category).length;
  }

  trackEvent(_index: number, event: ApiFlowEvent): string {
    return event.id;
  }

  nodeTransform(node: ApiFlowNode): string {
    return `translate(${node.x}, ${node.y})`;
  }

  gatewayToEndpointPath(node: ApiFlowNode): string {
    return this.pathThrough([
      this.center(this.fixedNodes[2]),
      { x: 605, y: 365 },
      this.center(node),
    ]);
  }

  endpointToTargetPath(node: ApiFlowNode): string {
    const target = this.targetNodes.find((candidate) => candidate.target === this.targetForCategory(node.category!))!;
    return this.pathThrough([this.center(node), this.center(target)]);
  }

  eventPath(event: ApiFlowEvent): string {
    const endpoint = this.endpointNodes.find((node) => node.category === event.category) ?? this.endpointNodes[this.endpointNodes.length - 1];
    const target = this.targetNodes.find((node) => node.target === event.target) ?? this.targetNodes[0];
    return this.pathThrough([
      this.center(this.fixedNodes[0]),
      this.center(this.fixedNodes[1]),
      this.center(this.fixedNodes[2]),
      this.center(endpoint),
      this.center(target),
    ]);
  }

  reverseEventPath(event: ApiFlowEvent): string {
    const endpoint = this.endpointNodes.find((node) => node.category === event.category) ?? this.endpointNodes[this.endpointNodes.length - 1];
    const target = this.targetNodes.find((node) => node.target === event.target) ?? this.targetNodes[0];
    return this.pathThrough([
      this.center(target),
      this.center(endpoint),
      this.center(this.fixedNodes[2]),
      this.center(this.fixedNodes[1]),
      this.center(this.fixedNodes[0]),
    ]);
  }

  nodeClass(node: ApiFlowNode): Record<string, boolean> {
    const related = this.events.filter((event) => {
      if (node.category) return event.category === node.category;
      if (node.target) return event.target === node.target;
      if (node.id === 'frontend' || node.id === 'http-client' || node.id === 'fastapi') return true;
      return false;
    });
    const pending = related.some((event) => event.phase === 'pending');
    const recent = related.find((event) => this.now - (event.completedAt ?? event.startedAt) < 5500);
    return {
      'node-active': pending,
      'node-error': !pending && recent?.phase === 'error',
      'node-success': !pending && recent?.phase === 'success',
    };
  }

  nodeDotClass(node: ApiFlowNode): Record<string, boolean> {
    const classes = this.nodeClass(node);
    return {
      'dot-active': classes['node-active'],
      'dot-error': classes['node-error'],
      'dot-success': classes['node-success'],
    };
  }

  edgeClass(event: ApiFlowEvent): string {
    return `edge-${event.phase}`;
  }

  signalClass(event: ApiFlowEvent): string {
    return `signal-${event.phase}`;
  }

  eventCardClass(event: ApiFlowEvent): Record<string, boolean> {
    return {
      'border-[#ddd3f7] bg-[#fbf9ff]': event.phase === 'pending',
      'border-[#d9eee9] bg-[#f8fffd]': event.phase === 'success',
      'border-[#f3d6db] bg-[#fff9fa]': event.phase === 'error',
      'border-[#f6dfb8] bg-[#fffaf1]': event.phase === 'warning',
      'border-[#e4e7ed] bg-white': event.phase === 'cancelled',
    };
  }

  methodClass(method: string): string {
    const value = method.toUpperCase();
    if (value === 'GET') return 'bg-[#e9f4ff] text-[#2371b8]';
    if (value === 'POST') return 'bg-[#eafbf5] text-[#15876f]';
    if (value === 'PUT' || value === 'PATCH') return 'bg-[#fff5e5] text-[#b36a0c]';
    if (value === 'DELETE') return 'bg-[#fff0f2] text-[#cc4054]';
    return 'bg-[#f0edfa] text-[#7040cc]';
  }

  phaseBadgeClass(event: ApiFlowEvent): string {
    if (event.phase === 'pending') return 'bg-[#efe9ff] text-[#7041d6]';
    if (event.phase === 'success') return 'bg-[#e8faf5] text-[#138b76]';
    if (event.phase === 'error') return 'bg-[#fff0f2] text-[#cf4054]';
    if (event.phase === 'warning') return 'bg-[#fff5df] text-[#a76708]';
    return 'bg-[#f0f2f5] text-[#6f798a]';
  }

  private endpoint(category: ApiFlowCategory, label: string, subtitle: string, x: number, y: number): ApiFlowNode {
    return { id: `endpoint-${category}`, label, subtitle, x, y, width: 150, height: 46, type: 'endpoint', category };
  }

  private target(target: ApiFlowTarget, label: string, subtitle: string, x: number, y: number): ApiFlowNode {
    return { id: `target-${target}`, label, subtitle, x, y, width: 170, height: 66, type: 'target', target };
  }

  private center(node: ApiFlowNode): { x: number; y: number } {
    return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  }

  private targetForCategory(category: ApiFlowCategory): ApiFlowTarget {
    if (category === 'database' || category === 'logs' || category === 'history') return 'supabase';
    if (category === 'overview' || category === 'metrics' || category === 'analytics' || category === 'pools') return 'metrics-store';
    if (category === 'backends' || category === 'routing' || category === 'security' || category === 'alerts' || category === 'load-test') return 'control-plane';
    if (category === 'proxy') return 'backend-pool';
    return 'platform';
  }

  private pathThrough(points: Array<{ x: number; y: number }>): string {
    if (!points.length) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const midpoint = (previous.x + current.x) / 2;
      path += ` C ${midpoint} ${previous.y}, ${midpoint} ${current.y}, ${current.x} ${current.y}`;
    }
    return path;
  }
}
