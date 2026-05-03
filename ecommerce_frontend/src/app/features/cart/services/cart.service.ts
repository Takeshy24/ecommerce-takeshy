import { Injectable, computed, effect, signal } from '@angular/core';

import { CartLine } from '../../../shared/models/cart.model';
import { Product } from '../../../shared/models/product.model';

const IGV_RATE = 0.18;
const CART_STORAGE_KEY = 'ecommerce_cart_lines';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly cartLines = signal<CartLine[]>(this.readFromStorage());

  readonly items = this.cartLines.asReadonly();
  readonly subtotal = computed(() =>
    this.cartLines().reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  );
  readonly tax = computed(() => this.subtotal() * IGV_RATE);
  readonly total = computed(() => this.subtotal() + this.tax());
  readonly totalItems = computed(() =>
    this.cartLines().reduce((sum, line) => sum + line.quantity, 0)
  );

  constructor() {
    effect(() => {
      const serialized = JSON.stringify(this.cartLines());
      localStorage.setItem(CART_STORAGE_KEY, serialized);
    });
  }

  addProduct(product: Product, quantity = 1): void {
    if (quantity < 1) {
      return;
    }

    this.cartLines.update((current) => {
      const index = current.findIndex((line) => line.productId === product.id);
      if (index === -1) {
        // No exceder stock inicial
        const quantityToAdd = Math.min(quantity, product.stock);
        if (quantityToAdd <= 0) return current;

        return [
          ...current,
          {
            productId: product.id,
            categoryId: product.category_id,
            name: product.name,
            imageUrl: product.image_url,
            unitPrice: product.price,
            quantity: quantityToAdd,
            stock: product.stock,
          },
        ];
      }

      const copy = [...current];
      // No exceder stock al acumular
      const newQuantity = Math.min(copy[index].quantity + quantity, product.stock);

      copy[index] = {
        ...copy[index],
        quantity: newQuantity,
        stock: product.stock // update stock just in case it changed
      };

      return copy;
    });
  }

  increaseQuantity(productId: number): void {
    this.cartLines.update((current) =>
      current.map((line) => {
        if (line.productId === productId) {
          const newQuantity = Math.min(line.quantity + 1, line.stock);
          return { ...line, quantity: newQuantity };
        }
        return line;
      })
    );
  }

  decreaseQuantity(productId: number): void {
    this.cartLines.update((current) =>
      current
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.max(0, line.quantity - 1) }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  }

  removeLine(productId: number): void {
    this.cartLines.update((current) =>
      current.filter((line) => line.productId !== productId)
    );
  }

  clear(): void {
    this.cartLines.set([]);
  }

  private readFromStorage(): CartLine[] {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as CartLine[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((line) =>
        Number.isInteger(line.productId) &&
        typeof line.name === 'string' &&
        typeof line.unitPrice === 'number' &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0
      ).map(line => ({ ...line, stock: line.stock || 999 })); // fallback if not exist
    } catch {
      return [];
    }
  }
}
