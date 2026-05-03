import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminMetrics, ChartSeriesResponse } from '../../../shared/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);
  private readonly dashboardUrl = `${environment.apiUrl}/admin/dashboard`;

  getMetrics(): Observable<AdminMetrics> {
    return this.http.get<AdminMetrics>(`${this.dashboardUrl}/metrics`);
  }

  getSalesSeries(): Observable<ChartSeriesResponse> {
    return this.http.get<ChartSeriesResponse>(`${this.dashboardUrl}/sales-chart`);
  }

  getCategoryDistribution(): Observable<ChartSeriesResponse> {
    return this.http.get<ChartSeriesResponse>(`${this.dashboardUrl}/category-distribution`);
  }
}
