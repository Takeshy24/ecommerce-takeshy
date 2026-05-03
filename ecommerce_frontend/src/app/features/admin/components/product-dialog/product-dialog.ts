import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import {
  Product,
  ProductDialogResult,
  ProductUpsertPayload,
} from '../../../../shared/models/product.model';

interface ProductDialogData {
  product: Product | null;
}

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './product-dialog.html',
  styleUrl: './product-dialog.scss',
})
export class ProductDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ProductDialogComponent>);
  private imageFile: File | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    category_id: [1, [Validators.required, Validators.min(1)]],
    price: [1, [Validators.required, Validators.min(0.01)]],
    stock: [0, [Validators.required, Validators.min(0)]],
  });
  readonly selectedImageName = signal<string>('');
  readonly previewUrl = signal<string | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) readonly data: ProductDialogData) {
    if (data.product) {
      this.form.patchValue({
        name: data.product.name,
        description: data.product.description,
        category_id: data.product.category_id,
        price: data.product.price,
        stock: data.product.stock,
      });

      this.previewUrl.set(data.product.image_url ?? null);
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.imageFile = file;
    this.selectedImageName.set(file?.name ?? '');

    if (!file) {
      this.previewUrl.set(this.data.product?.image_url ?? null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    this.previewUrl.set(objectUrl);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: ProductUpsertPayload = {
      ...this.form.getRawValue(),
      image_url: this.data.product?.image_url ?? null,
    };

    const result: ProductDialogResult = {
      payload,
      imageFile: this.imageFile,
    };

    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
