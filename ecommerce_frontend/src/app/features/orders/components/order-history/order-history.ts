import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Order } from '../../../../shared/models/order.model';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatToolbarModule,
  ],
  templateUrl: './order-history.html',
  styleUrl: './order-history.scss',
})
export class OrderHistoryComponent {
  private readonly orderService = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly displayedColumns = ['id', 'status', 'items', 'total', 'date'];

  constructor() {
    this.loadOrders();
  }

  private loadOrders(): void {
    this.loading.set(true);
    this.orderService
      .getMyOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.orders.set(orders);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No fue posible cargar tu historial de pedidos.');
          this.loading.set(false);
        },
      });
  }
}
