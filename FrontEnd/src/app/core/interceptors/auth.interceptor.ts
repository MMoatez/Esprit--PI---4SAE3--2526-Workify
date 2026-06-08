import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const PUBLIC_PATH_PREFIXES = [
  '/api/auth/',
  '/api/registration/',
];

const PUBLIC_EVENT_GET_PATHS = [
  '/api/events/published',
  '/api/events/category/',
];

const isPublicEventRead = (url: string, method: string) => {
  if (method !== 'GET') {
    return false;
  }
  if (PUBLIC_EVENT_GET_PATHS.some((path) => url.includes(path))) {
    return true;
  }
  return /\/api\/events\/\d+(\/(content|ical|stats))?$/.test(url);
};

const withAuthHeader = (req: HttpRequest<unknown>, token: string | null, isPublic: boolean) => {
  if (token && !isPublic) {
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return req;
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isPublic =
    PUBLIC_PATH_PREFIXES.some(prefix => req.url.includes(prefix)) ||
    isPublicEventRead(req.url, req.method);

  const sendRequest = (token: string | null) =>
    next(withAuthHeader(req, token, isPublic)).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !isPublic && auth.getRefreshToken()) {
          return auth.refreshTokenIfNeeded().pipe(
            switchMap((newToken) => {
              if (!newToken) {
                auth.logout();
                return throwError(() => error);
              }
              return next(withAuthHeader(req, newToken, isPublic));
            }),
            catchError((refreshError) => {
              auth.logout();
              return throwError(() => refreshError);
            })
          );
        }

        if (error.status === 401 && !isPublic && !auth.getRefreshToken()) {
          auth.logout();
        }

        return throwError(() => error);
      })
    );

  if (!isPublic && auth.isTokenExpired()) {
    return auth.refreshTokenIfNeeded().pipe(
      switchMap((token) => sendRequest(token)),
      catchError((error) => {
        if (!auth.getRefreshToken()) {
          auth.logout();
        }
        return throwError(() => error);
      })
    );
  }

  return sendRequest(auth.getToken());
};
