import {
  Category,
  PaginatedProductsResponse,
  Product,
  ProductUpsertPayload,
} from '../../../shared/models/product.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/catalog/products`;

  getProducts(skip = 0, limit = 100): Observable<PaginatedProductsResponse> {
    const params = new HttpParams()
      .set('skip', skip)
      .set('limit', limit);

    return this.http.get<PaginatedProductsResponse>(this.apiUrl, { params });
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${environment.apiUrl}/catalog/categories`);
  }

  uploadProductImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<{ image_url: string }>(`${this.apiUrl}/upload-image`, formData)
      .pipe(map((response) => response.image_url));
  }

  createProduct(payload: ProductUpsertPayload): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, payload);
  }

  updateProduct(productId: number, payload: ProductUpsertPayload): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${productId}`, payload);
  }

  deleteProduct(productId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${productId}`);
  }
}
