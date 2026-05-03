import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { catchError, finalize, forkJoin, of, timer } from 'rxjs';

import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { AdminMetrics } from '../../../../shared/models/dashboard.model';
import { BaseChartDirective } from 'ng2-charts';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private readonly dashboardService = inject(AdminDashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refreshIntervalMs = 15000;

  readonly loading = signal(false);
  readonly refreshing = signal(false);
  readonly lastUpdated = signal<Date | null>(null);

  readonly metrics = signal<AdminMetrics>({
    ventas_hoy: 0,
    pedidos_activos: 0,
    productos_bajo_stock: 0,
    ingresos_mes: 0,
  });

  readonly barChartData = signal<ChartConfiguration<'bar'>['data']>({
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Ventas por período',
        backgroundColor: '#1e88e5',
      },
    ],
  });

  readonly barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  readonly pieChartData = signal<ChartConfiguration<'pie'>['data']>({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: ['#0f8b8d', '#f4a261', '#457b9d', '#e63946', '#2a9d8f', '#ffb703'],
      },
    ],
  });

  readonly pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  constructor() {
    this.setupAutoRefresh();
  }

  refreshNow(): void {
    this.loadDashboard(true);
  }

  private setupAutoRefresh(): void {
    timer(0, this.refreshIntervalMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadDashboard(false));
  }

  private loadDashboard(forceRefreshIndicator: boolean): void {
    const isInitialLoad = this.lastUpdated() === null;

    if (isInitialLoad) {
      this.loading.set(true);
    } else if (forceRefreshIndicator) {
      this.refreshing.set(true);
    }

    forkJoin({
      metrics: this.dashboardService.getMetrics().pipe(
        catchError(() =>
          of({
            ventas_hoy: 0,
            pedidos_activos: 0,
            productos_bajo_stock: 0,
            ingresos_mes: 0,
          })
        )
      ),
      sales: this.dashboardService.getSalesSeries().pipe(
        catchError(() => of({ labels: [], data: [] }))
      ),
      categories: this.dashboardService.getCategoryDistribution().pipe(
        catchError(() => of({ labels: [], data: [] }))
      ),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        })
      )
      .subscribe(({ metrics, sales, categories }) => {
        this.metrics.set(metrics);
        this.barChartData.set({
          labels: sales.labels,
          datasets: [
            {
              data: sales.data,
              label: 'Ventas por período',
              backgroundColor: '#1e88e5',
            },
          ],
        });

        this.pieChartData.set({
          labels: categories.labels,
          datasets: [
            {
              data: categories.data,
              backgroundColor: ['#0f8b8d', '#f4a261', '#457b9d', '#e63946', '#2a9d8f', '#ffb703'],
            },
          ],
        });

        this.lastUpdated.set(new Date());
      });
  }
}
