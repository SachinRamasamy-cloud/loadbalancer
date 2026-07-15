export type ApiFlowPhase = 'pending' | 'success' | 'error' | 'cancelled';

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

export interface ApiFlowEvent {
  id: string;
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
