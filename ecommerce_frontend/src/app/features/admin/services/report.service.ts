import { Injectable } from '@angular/core';
import { Order } from '../../../shared/models/order.model';
import { Product } from '../../../shared/models/product.model';

/** Fragmento de HookData de jspdf-autotable para didParseCell (evita implicit any en build estricto). */
interface AutotableDidParseCellData {
  section: string;
  column: { index: number };
  cell: {
    raw: unknown;
    styles: { textColor?: number[]; fontStyle?: string };
  };
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly storeName = 'Ecommerce Takeshy';

  async exportInventory(products: Product[]): Promise<void> {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF();
    this.buildHeader(doc, 'Inventario Actual');

    (doc as any).autoTable({
      startY: 36,
      head: [['ID', 'Producto', 'Categoría', 'Precio', 'Stock']],
      body: products.map((product) => [
        product.id,
        product.name,
        product.category_id,
        `S/ ${product.price.toFixed(2)}`,
        product.stock,
      ]),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [25, 118, 210] },
      didParseCell: (data: AutotableDidParseCellData) => {
        if (data.section === 'body' && data.column.index === 4) {
          const rawValue = data.cell.raw;
          if (typeof rawValue === 'number' && rawValue <= 10) {
            data.cell.styles.textColor = [220, 38, 38]; // Rojo
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    doc.save('inventario-actual.pdf');
  }

  async exportMonthlySalesSummary(orders: Order[]): Promise<void> {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF();
    this.buildHeader(doc, 'Resumen de Ventas Mensual');

    const grouped = new Map<string, { count: number; income: number }>();

    for (const order of orders) {
      const date = new Date(order.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = grouped.get(key) ?? { count: 0, income: 0 };
      grouped.set(key, {
        count: current.count + 1,
        income: current.income + order.total,
      });
    }

    (doc as any).autoTable({
      startY: 36,
      head: [['Período', 'Pedidos', 'Ingresos']],
      body: [...grouped.entries()].map(([period, values]) => [
        period,
        values.count,
        `S/ ${values.income.toFixed(2)}`,
      ]),
      theme: 'striped',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [56, 142, 60] },
    });

    doc.save('resumen-ventas-mensual.pdf');
  }

  async exportOrderDetail(order: Order): Promise<void> {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF();
    this.buildHeader(doc, `Detalle del Pedido #${order.id}`);

    (doc as any).autoTable({
      startY: 46,
      head: [['Producto', 'Cantidad', 'Precio Unitario', 'Subtotal']],
      body: order.items.map((item) => [
        item.product_name,
        item.quantity,
        `S/ ${item.unit_price.toFixed(2)}`,
        `S/ ${item.subtotal.toFixed(2)}`,
      ]),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [251, 140, 0] },
    });

    doc.setFontSize(11);
    doc.text(`Estado: ${order.status}`, 14, 38);
    doc.text(`Total: S/ ${order.total.toFixed(2)}`, 140, 38);

    doc.save(`pedido-${order.id}.pdf`);
  }

  private buildHeader(doc: import('jspdf').jsPDF, reportTitle: string): void {
    const now = new Date();
    const generatedAt = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(this.storeName, 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(reportTitle, 14, 22);
    doc.text(`Generado: ${generatedAt}`, 14, 28);
  }
}
