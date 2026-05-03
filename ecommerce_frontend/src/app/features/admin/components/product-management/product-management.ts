import { AfterViewInit, Component, DestroyRef, ViewChild, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Observable, of } from 'rxjs';
import {
  Product,
  ProductDialogResult,
  ProductUpsertPayload,
} from '../../../../shared/models/product.model';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProductDialogComponent } from '../product-dialog/product-dialog';
import { ProductService } from '../../../catalog/services/product.service';
import { switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  templateUrl: './product-management.html',
  styleUrl: './product-management.scss',
})
export class ProductManagementComponent implements AfterViewInit {
  private readonly productService = inject(ProductService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  readonly loading = signal(false);
  readonly displayedColumns = ['id', 'name', 'category', 'price', 'stock', 'actions'];
  readonly dataSource = new MatTableDataSource<Product>([]);

  constructor() {
    this.loadProducts();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '620px',
      data: { product: null },
    });

    dialogRef.afterClosed().subscribe((result?: ProductDialogResult) => {
      if (!result) {
        return;
      }

      this.resolvePayloadWithImage(result)
        .pipe(switchMap((payload) => this.productService.createProduct(payload)))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackBar.open('Producto creado correctamente.', 'Cerrar', { duration: 2600 });
            this.loadProducts();
          },
          error: () => {
            this.snackBar.open('No fue posible crear el producto.', 'Cerrar', { duration: 3000 });
          },
        });
    });
  }

  openEditDialog(product: Product): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '620px',
      data: { product },
    });

    dialogRef.afterClosed().subscribe((result?: ProductDialogResult) => {
      if (!result) {
        return;
      }

      this.resolvePayloadWithImage(result)
        .pipe(switchMap((payload) => this.productService.updateProduct(product.id, payload)))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackBar.open('Producto actualizado.', 'Cerrar', { duration: 2600 });
            this.loadProducts();
          },
          error: () => {
            this.snackBar.open('Tu backend aún no expone update/delete de productos.', 'Cerrar', {
              duration: 3400,
            });
          },
        });
    });
  }

  deleteProduct(product: Product): void {
    this.productService
      .deleteProduct(product.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Producto eliminado.', 'Cerrar', { duration: 2600 });
          this.loadProducts();
        },
        error: () => {
          this.snackBar.open('Tu backend aún no expone update/delete de productos.', 'Cerrar', {
            duration: 3400,
          });
        },
      });
  }

  private resolvePayloadWithImage(result: ProductDialogResult): Observable<ProductUpsertPayload> {
    if (!result.imageFile) {
      return of(result.payload);
    }

    return this.productService.uploadProductImage(result.imageFile).pipe(
      switchMap((imageUrl) =>
        of({
          ...result.payload,
          image_url: imageUrl,
        })
      )
    );
  }

  private loadProducts(): void {
    this.loading.set(true);
    this.productService
      .getProducts(0, 300)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.items;
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('No fue posible cargar el catálogo.', 'Cerrar', { duration: 3000 });
        },
      });
  }
}
