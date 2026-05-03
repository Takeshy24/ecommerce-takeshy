export interface CartLine {
  productId: number;
  categoryId: number;
  name: string;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  stock: number;
}

export interface CartSummary {
  subtotal: number;
  tax: number;
  total: number;
}

export interface CartItemServerPayload {
  product_id: number;
  quantity: number;
}
