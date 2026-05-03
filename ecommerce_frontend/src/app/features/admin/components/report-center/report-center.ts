import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductService } from '../../../catalog/services/product.service';
import { OrderService } from '../../../orders/services/order.service';
import { Order } from '../../../../shared/models/order.model';
import { Product } from '../../../../shared/models/product.model';
import { ReportService } from '../../services/report.service';

@Component({
  selector: 'app-report-center',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './report-center.html',
  styleUrl: './report-center.scss',
})
export class ReportCenterComponent {
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly reportService = inject(ReportService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<Product[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly selectedOrderId = signal<number | null>(null);

  readonly selectedOrder = computed(() =>
    this.orders().find((order) => order.id === this.selectedOrderId()) ?? null
  );

  constructor() {
    this.loadData();
  }

  exportInventory(): void {
    if (!this.products().length) {
      this.snackBar.open('No hay productos para exportar.', 'Cerrar', { duration: 2600 });
      return;
    }

    void this.reportService.exportInventory(this.products());
  }

  exportMonthlySummary(): void {
    if (!this.orders().length) {
      this.snackBar.open('No hay pedidos para exportar.', 'Cerrar', { duration: 2600 });
      return;
    }

    void this.reportService.exportMonthlySalesSummary(this.orders());
  }

  exportOrderDetail(): void {
    const order = this.selectedOrder();
    if (!order) {
      this.snackBar.open('Selecciona un pedido primero.', 'Cerrar', { duration: 2600 });
      return;
    }

    void this.reportService.exportOrderDetail(order);
  }

  private loadData(): void {
    this.productService
      .getProducts(0, 300)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => this.products.set(response.items));

    this.orderService
      .getAllOrdersForAdmin()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((orders) => this.orders.set(orders));
  }
}
