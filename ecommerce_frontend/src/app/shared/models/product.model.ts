export interface Product {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url?: string | null;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
}

export interface PaginatedProductsResponse {
  total: number;
  items: Product[];
}

export interface ProductUpsertPayload {
  category_id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url?: string | null;
}

export interface ProductDialogResult {
  payload: ProductUpsertPayload;
  imageFile: File | null;
}
