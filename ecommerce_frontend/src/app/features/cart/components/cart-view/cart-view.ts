import { Component, computed, inject, signal } from '@angular/core';

import { CartService } from '../../services/cart.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { OrderService } from '../../../orders/services/order.service';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-cart-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatToolbarModule,
  ],
  templateUrl: './cart-view.html',
  styleUrl: './cart-view.scss',
})
export class CartViewComponent {
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);

  readonly displayedColumns = ['product', 'price', 'quantity', 'subtotal', 'actions'];
  readonly lines = this.cartService.items;
  readonly subtotal = this.cartService.subtotal;
  readonly tax = this.cartService.tax;
  readonly total = this.cartService.total;

  readonly processingCheckout = signal(false);
  readonly message = signal('');
  readonly hasItems = computed(() => this.lines().length > 0);

  increase(productId: number): void {
    this.cartService.increaseQuantity(productId);
  }

  decrease(productId: number): void {
    this.cartService.decreaseQuantity(productId);
  }

  remove(productId: number): void {
    this.cartService.removeLine(productId);
  }

  clear(): void {
    this.cartService.clear();
  }

  checkout(): void {
    if (!this.lines().length || this.processingCheckout()) {
      return;
    }

    this.processingCheckout.set(true);
    this.message.set('');

    this.orderService
      .syncCartAndCheckout(this.lines())
      .pipe(finalize(() => this.processingCheckout.set(false)))
      .subscribe({
        next: (order) => {
          this.cartService.clear();
          this.message.set(`Pedido #${order.id} procesando. Redirigiendo a MercadoPago...`);

          if (order.init_point) {
            window.location.href = order.init_point;
          } else {
             this.message.set(`Pedido #${order.id} generado con éxito.`);
          }
        },
        error: (error: unknown) => {
          const detail =
            typeof error === 'object' && error !== null && 'error' in error
              ? (error as { error?: { detail?: string } }).error?.detail
              : undefined;

          this.message.set(detail ?? 'No se pudo completar el checkout.');
        },
      });
  }
}
