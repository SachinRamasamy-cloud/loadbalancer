export type ApiFlowPhase = 'pending' | 'success' | 'error' | 'warning' | 'cancelled';

export type ApiFlowCategory =
  | 'health'
  | 'database'
  | 'overview'
  | 'metrics'
  | 'analytics'
  | 'logs'
  | 'history'
  | 'backends'
  | 'routing'
  | 'pools'
  | 'security'
  | 'alerts'
  | 'load-test'
  | 'proxy'
  | 'other';

export type ApiFlowTarget =
  | 'platform'
  | 'supabase'
  | 'metrics-store'
  | 'control-plane'
  | 'backend-pool';

export type ApiFlowSource = 'browser' | 'external';

export interface ApiFlowEvent {
  id: string;
  requestId: string;
  correlationId: string | null;
  method: string;
  url: string;
  path: string;
  category: ApiFlowCategory;
  categoryLabel: string;
  target: ApiFlowTarget;
  targetLabel: string;
  phase: ApiFlowPhase;
  statusCode: number | null;
  startedAt: number;
  completedAt: number | null;
  durationMs: number | null;
  selectedBackend: string | null;
  errorMessage: string | null;
  source: ApiFlowSource;
  clientName: string | null;
  lifecycleStage: string;
  attemptNumber: number | null;
  retryCount: number;
  algorithm: string | null;
  persisted: boolean | null;
  lastSequence: number | null;
}

export interface BackendApiFlowEvent {
  sequence?: number;
  event_id?: string;
  event_type: string;
  timestamp?: string;
  request_id?: string | null;
  correlation_id?: string | null;
  method?: string | null;
  path?: string | null;
  phase?: string | null;
  status_code?: number | null;
  duration_ms?: number | null;
  backend_id?: string | null;
  attempt_number?: number | null;
  algorithm?: string | null;
  retry_scheduled?: boolean | null;
  persisted?: boolean | null;
  client_name?: string | null;
  error_type?: string | null;
  error_message?: string | null;
}

export interface ApiFlowStreamState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  receivedEvents: number;
  reconnectAttempts: number;
  lastEventAt: number | null;
  errorMessage: string | null;
}

export interface ApiFlowNode {
  id: string;
  label: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'source' | 'gateway' | 'endpoint' | 'target';
  category?: ApiFlowCategory;
  target?: ApiFlowTarget;
}
