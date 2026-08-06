import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

export interface UserDto {
  id: number;
  matricule: string;
  username: string;
  email: string;
  isActive: boolean;
  roles: string[];
  photoUrl?: string;
}

export interface LoginRequest {
  matricule: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'accessToken';
  private readonly REFRESH_KEY = 'refreshToken';
  private readonly USER_KEY = 'currentUser';
  private readonly REMEMBER_KEY = 'rememberMe';
  private readonly MATRICULE_KEY = 'rememberedMatricule';

  private currentUserSignal = signal<UserDto | null>(this.loadUser());
  public currentUser = this.currentUserSignal.asReadonly();
  public isLoggedIn = computed(() => this.currentUserSignal() !== null);
  public userRoles = computed(() => this.currentUserSignal()?.roles ?? []);

  constructor(private http: HttpClient, private router: Router) {}

  /** Stockage actif : persistant (localStorage) si « se souvenir de moi », sinon session. */
  private get storage(): Storage {
    return this.isRemembered() ? window.localStorage : window.sessionStorage;
  }

  setRememberMe(value: boolean): void {
    window.localStorage.setItem(this.REMEMBER_KEY, String(value));
    if (!value) window.localStorage.removeItem(this.MATRICULE_KEY);
  }

  isRemembered(): boolean {
    const raw = window.localStorage.getItem(this.REMEMBER_KEY);
    return raw === null ? true : raw === 'true';
  }

  getRememberedMatricule(): string {
    return window.localStorage.getItem(this.MATRICULE_KEY) ?? '';
  }

  saveMatricule(matricule: string): void {
    if (this.isRemembered()) {
      window.localStorage.setItem(this.MATRICULE_KEY, matricule);
    } else {
      window.localStorage.removeItem(this.MATRICULE_KEY);
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(tap(res => this.saveSession(res)));
  }

  register(data: RegisterRequest): Observable<{ user: UserDto; message: string }> {
    return this.http.post<{ user: UserDto; message: string }>(`${environment.apiUrl}/auth/register`, data);
  }

  refreshToken(): Observable<AuthResponse> {
    const accessToken = this.getToken();
    const refreshToken = this.getRefreshToken();
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh-token`, { accessToken, refreshToken })
      .pipe(tap(res => this.saveSession(res)));
  }

  getMe(): Observable<UserDto> {
    return this.http.get<UserDto>(`${environment.apiUrl}/auth/me`);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/connexion']);
  }

  getPendingUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${environment.apiUrl}/users/pending`);
  }

  approveUser(userId: number, roleId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/users/${userId}/approve`, { roleId });
  }

  rejectUser(userId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/users/${userId}`);
  }

  getRoles(): Observable<{ id: number; name: string; isActive: boolean }[]> {
    return this.http.get<{ id: number; name: string; isActive: boolean }[]>(`${environment.apiUrl}/roles`);
  }

  getAllUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${environment.apiUrl}/users`);
  }

  activateUser(userId: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${environment.apiUrl}/users/${userId}/activate`, {});
  }

  deactivateUser(userId: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${environment.apiUrl}/users/${userId}/deactivate`, {});
  }

  assignRole(userId: number, roleId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/users/${userId}/roles/${roleId}`, {});
  }

  removeRole(userId: number, roleId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/users/${userId}/roles/${roleId}`);
  }

  sendEmail(userId: number, subject: string, body: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/users/${userId}/send-email`, { subject, body });
  }

  changePassword(oldPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/change-password`, { oldPassword, newPassword });
  }

  getProfile(): Observable<UserDto> {
    return this.http.get<UserDto>(`${environment.apiUrl}/auth/profile`);
  }

  updateProfile(data: { username: string; email: string }): Observable<UserDto> {
    return this.http.put<UserDto>(`${environment.apiUrl}/auth/profile`, data)
      .pipe(tap(user => {
        const updated: UserDto = { ...user };
        this.storage.setItem(this.USER_KEY, JSON.stringify(updated));
        this.currentUserSignal.set(updated);
      }));
  }

  uploadPhoto(file: File): Observable<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ photoUrl: string }>(`${environment.apiUrl}/auth/profile/photo`, formData)
      .pipe(tap(res => {
        const current = this.loadUser();
        if (current) {
          const updated: UserDto = { ...current, photoUrl: res.photoUrl };
          this.storage.setItem(this.USER_KEY, JSON.stringify(updated));
          this.currentUserSignal.set(updated);
        }
      }));
  }

  serverLogout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/logout`, {});
  }

  hasRole(role: string): boolean {
    return this.userRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(r => this.userRoles().includes(r));
  }

  getToken(): string | null {
    return window.localStorage.getItem(this.TOKEN_KEY) ?? window.sessionStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return window.localStorage.getItem(this.REFRESH_KEY) ?? window.sessionStorage.getItem(this.REFRESH_KEY);
  }

  private saveSession(res: AuthResponse): void {
    this.storage.setItem(this.TOKEN_KEY, res.accessToken);
    this.storage.setItem(this.REFRESH_KEY, res.refreshToken);
    this.storage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this.currentUserSignal.set(res.user);
  }

  private clearSession(): void {
    window.localStorage.removeItem(this.TOKEN_KEY);
    window.localStorage.removeItem(this.REFRESH_KEY);
    window.localStorage.removeItem(this.USER_KEY);
    window.sessionStorage.removeItem(this.TOKEN_KEY);
    window.sessionStorage.removeItem(this.REFRESH_KEY);
    window.sessionStorage.removeItem(this.USER_KEY);
    this.currentUserSignal.set(null);
  }

  private loadUser(): UserDto | null {
    const raw = window.localStorage.getItem(this.USER_KEY) ?? window.sessionStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
