import { Category, Product } from '../../../../shared/models/product.model';
import { Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';

import { BreakpointObserver } from '@angular/cdk/layout';
import { CartService } from '../../../cart/services/cart.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ProductService } from '../../services/product.service';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSidenavModule,
    MatDividerModule,
    MatToolbarModule,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductListComponent {
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<Product[]>([]);
  readonly categoryOptions = signal<Category[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly searchTerm = signal('');
  readonly selectedCategory = signal<number | 'all'>('all');
  readonly gridCols = signal(4);
  readonly gridRowHeight = signal('460px');
  readonly cartLines = this.cartService.items;
  readonly cartSubtotal = this.cartService.subtotal;
  readonly cartTax = this.cartService.tax;
  readonly cartTotal = this.cartService.total;
  readonly hasItemsInCart = computed(() => this.cartLines().length > 0);

  @ViewChild('cartDrawer') private cartDrawer?: MatDrawer;

  readonly categories = computed(() => this.categoryOptions());

  readonly filteredProducts = computed(() => {
    const normalizedTerm = this.searchTerm().trim().toLowerCase();
    const categoryFilter = this.selectedCategory();

    return this.products().filter((product) => {
      const matchesSearch =
        !normalizedTerm ||
        product.name.toLowerCase().includes(normalizedTerm) ||
        product.description.toLowerCase().includes(normalizedTerm);

      const matchesCategory =
        categoryFilter === 'all' || product.category_id === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  });

  readonly totalItemsInCart = this.cartService.totalItems;

  constructor() {
    this.loadCategories();
    this.loadProducts();
    this.observeGrid();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onCategoryChange(value: number | 'all'): void {
    this.selectedCategory.set(value);
  }

  addToCart(product: Product): void {
    this.cartService.addProduct(product, 1);
    this.openCartDrawer();
  }

  toggleCartDrawer(): void {
    this.cartDrawer?.toggle();
  }

  openCartDrawer(): void {
    this.cartDrawer?.open();
  }

  closeCartDrawer(): void {
    this.cartDrawer?.close();
  }

  increaseQuantity(productId: number): void {
    this.cartService.increaseQuantity(productId);
  }

  decreaseQuantity(productId: number): void {
    this.cartService.decreaseQuantity(productId);
  }

  removeLine(productId: number): void {
    this.cartService.removeLine(productId);
  }

  getCategoryName(categoryId: number): string {
    const found = this.categoryOptions().find((category) => category.id === categoryId);
    return found ? found.name : `Categoría ${categoryId}`;
  }

  private loadCategories(): void {
    this.productService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.categoryOptions.set(categories),
        error: () => {
          this.categoryOptions.set([]);
        },
      });
  }

  private loadProducts(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.productService
      .getProducts(0, 120)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.products.set(response.items);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los productos.');
          this.loading.set(false);
        },
      });
  }

  private observeGrid(): void {
    this.breakpointObserver
      .observe(['(max-width: 599px)', '(max-width: 959px)', '(max-width: 1279px)'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result.breakpoints['(max-width: 599px)']) {
          this.gridCols.set(1);
          this.gridRowHeight.set('520px');
          return;
        }

        if (result.breakpoints['(max-width: 959px)']) {
          this.gridCols.set(2);
          this.gridRowHeight.set('500px');
          return;
        }

        if (result.breakpoints['(max-width: 1279px)']) {
          this.gridCols.set(3);
          this.gridRowHeight.set('480px');
          return;
        }

        this.gridCols.set(4);
        this.gridRowHeight.set('460px');
      });
  }
}
