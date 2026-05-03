import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Order, OrderStatus } from '../../../../shared/models/order.model';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { OrderService } from '../../../orders/services/order.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-orders-management',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  templateUrl: './orders-management.html',
  styleUrl: './orders-management.scss',
})
export class OrdersManagementComponent {
  private readonly orderService = inject(OrderService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly orders = signal<Order[]>([]);

  readonly displayedColumns = ['id', 'date', 'items', 'total', 'status'];

  private readonly transitions: Record<OrderStatus, OrderStatus[]> = {
    pendiente: ['procesando', 'enviado', 'cancelado'],
    procesando: ['enviado', 'cancelado'],
    enviado: ['entregado'],
    entregado: [],
    cancelado: [],
  };

  constructor() {
    this.loadOrders();
  }

  updateStatus(order: Order, status: OrderStatus): void {
    const previous = order.status;
    order.status = status;

    this.orderService
      .updateOrderStatus(order.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Estado actualizado.', 'Cerrar', { duration: 2600 });
        },
        error: (error: unknown) => {
          order.status = previous;
          const detail =
            typeof error === 'object' && error !== null && 'error' in error
              ? (error as { error?: { detail?: string } }).error?.detail
              : undefined;

          this.snackBar.open(detail ?? 'No fue posible actualizar el estado.', 'Cerrar', {
            duration: 3600,
          });
        },
      });
  }

  getAvailableStatuses(order: Order): OrderStatus[] {
    return [order.status, ...this.transitions[order.status]];
  }

  private loadOrders(): void {
    this.loading.set(true);
    this.orderService
      .getAllOrdersForAdmin()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.orders.set(orders);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('No fue posible cargar los pedidos.', 'Cerrar', { duration: 3000 });
        },
      });
  }
}
