import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, tap } from 'rxjs/operators';
import { ApiFlowService } from './api-flow.service';

export const apiFlowInterceptor: HttpInterceptorFn = (request, next) => {
  const flow = inject(ApiFlowService);
  const requestId = request.headers.get('x-request-id') || flow.createRequestId();
  const tracedRequest = request.clone({
    setHeaders: {
      'X-Request-ID': requestId,
      'X-Correlation-ID': request.headers.get('x-correlation-id') || requestId,
    },
  });
  const eventId = flow.beginRequest(
    tracedRequest.method,
    tracedRequest.urlWithParams,
    requestId
  );
  let settled = false;

  return next(tracedRequest).pipe(
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
          flow.failRequest(
            eventId,
            null,
            error instanceof Error ? error.message : 'API request failed'
          );
        }
      },
    }),
    finalize(() => {
      if (!settled) flow.cancelRequest(eventId);
    })
  );
};
