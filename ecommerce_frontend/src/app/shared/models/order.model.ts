export type OrderStatus = 'pendiente' | 'procesando' | 'enviado' | 'entregado' | 'cancelado';

export interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  created_at: string;
  items: OrderItem[];
  init_point?: string | null;
}
