import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';

export type UserRole = 'admin' | 'cliente';

export interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        if (res.access_token) {
          localStorage.setItem('token', res.access_token);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getUserRole(): UserRole | null {
    const payload = this.getTokenPayload();
    const role = payload?.role;
    return role === 'admin' || role === 'cliente' ? role : null;
  }

  private getTokenPayload(): { role?: string } | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      return JSON.parse(decoded) as { role?: string };
    } catch {
      return null;
    }
  }
}