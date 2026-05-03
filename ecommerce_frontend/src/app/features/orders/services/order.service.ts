import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, concatMap, from, switchMap, throwError, toArray } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CartLine } from '../../../shared/models/cart.model';
import { Order, OrderStatus } from '../../../shared/models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly orderUrl = `${environment.apiUrl}/orders`;
  private readonly cartUrl = `${environment.apiUrl}/cart`;

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.orderUrl}/my-orders`);
  }

  checkout(): Observable<Order> {
    return this.http.post<Order>(`${this.orderUrl}/checkout`, {});
  }

  syncCartAndCheckout(lines: CartLine[]): Observable<Order> {
    if (!lines.length) {
      return throwError(() => new Error('El carrito está vacío.'));
    }

    return from(lines).pipe(
      concatMap((line) =>
        this.http.post(`${this.cartUrl}/items`, {
          product_id: line.productId,
          quantity: line.quantity,
        })
      ),
      toArray(),
      switchMap(() => this.checkout())
    );
  }

  getAllOrdersForAdmin(): Observable<Order[]> {
    return this.http.get<Order[]>(`${environment.apiUrl}/admin/orders`).pipe(
      catchError(() => this.getMyOrders())
    );
  }

  updateOrderStatus(orderId: number, status: OrderStatus): Observable<unknown> {
    return this.http.patch(`${environment.apiUrl}/admin/orders/${orderId}/status`, { status });
  }
}
