export interface AdminMetrics {
  ventas_hoy: number;
  pedidos_activos: number;
  productos_bajo_stock: number;
  ingresos_mes: number;
}

export interface ChartSeriesResponse {
  labels: string[];
  data: number[];
}
