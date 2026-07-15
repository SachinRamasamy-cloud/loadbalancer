import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, tap } from 'rxjs/operators';
import { ApiFlowService } from './api-flow.service';

export const apiFlowInterceptor: HttpInterceptorFn = (request, next) => {
  const flow = inject(ApiFlowService);
  const eventId = flow.beginRequest(request.method, request.urlWithParams);
  let settled = false;

  return next(request).pipe(
    tap({
      next: (event) => {
        if (!(event instanceof HttpResponse)) return;
        settled = true;
        const selectedBackend =
          event.headers.get('x-selected-backend') ??
          event.headers.get('x-backend-id') ??
          event.headers.get('x-upstream-backend');
        flow.completeRequest(eventId, event.status, selectedBackend);
      },
      error: (error: unknown) => {
        settled = true;
        if (error instanceof HttpErrorResponse) {
          const message =
            typeof error.error?.detail === 'string'
              ? error.error.detail
              : error.message || 'API request failed';
          flow.failRequest(eventId, error.status || null, message);
        } else {
          flow.failRequest(eventId, null, error instanceof Error ? error.message : 'API request failed');
        }
      },
    }),
    finalize(() => {
      if (!settled) flow.cancelRequest(eventId);
    })
  );
};
