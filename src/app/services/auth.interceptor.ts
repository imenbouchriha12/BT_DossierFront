import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (req.url.includes('/auth/refresh-token') || req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
    return next(req);
  }

  const token = auth.getToken();

  let cloned = req;
  if (token) {
    cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && auth.getRefreshToken()) {
        return handle401Error(auth, req, next);
      }
      if (err.status === 401) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};

function handle401Error(auth: AuthService, req: any, next: any): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    auth.refreshToken().subscribe({
      next: () => {
        isRefreshing = false;
        const newToken = auth.getToken();
        refreshTokenSubject.next(newToken);
      },
      error: () => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        auth.logout();
      }
    });
  }

  return refreshTokenSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(token => {
      const cloned = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      return next(cloned);
    })
  );
}
