import type { Order } from '../types/webertrack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Excel (XLSX) ─────────────────────────────────────────────────────────────
export async function exportOrdersToExcel(orders: Order[], filename = 'WeberTrack_Pedidos') {
  try {
    const XLSX = await import('xlsx');

    // Summary sheet
    const summaryData = orders.map(o => ({
      'ID': o.id.slice(0, 8),
      'Sucursal': o.branch_name ?? o.branch_id,
      'Promotor': o.promoter_name ?? o.promoter_id,
      'Estado': o.status,
      'Total Unidades': o.items.reduce((s, i) => s + i.actual_qty, 0),
      'Total Merma': o.items.reduce((s, i) => s + (i.waste ?? 0), 0),
      'Fecha': format(new Date(o.created_at), "dd/MM/yyyy HH:mm", { locale: es }),
      'Comentarios': o.supervisor_comments ?? '',
    }));

    // Detail sheet (one row per bread type)
    const detailData = orders.flatMap(o =>
      o.items.map(item => ({
        'Pedido ID': o.id.slice(0, 8),
        'Sucursal': o.branch_name ?? o.branch_id,
        'Promotor': o.promoter_name ?? o.promoter_id,
        'Estado': o.status,
        'Tipo de Pan': item.bread_type_name ?? item.bread_type_id,
        'Histórico': item.historical_sales,
        'Merma': item.waste ?? 0,
        'Sugerido': item.suggested_qty,
        'Cantidad Real': item.actual_qty,
        'Fecha': format(new Date(o.created_at), "dd/MM/yyyy", { locale: es }),
      }))
    );

    const wb = XLSX.utils.book_new();

    // Style header row helper
    const addSheet = (data: Record<string, unknown>[], sheetName: string) => {
      const ws = XLSX.utils.json_to_sheet(data);
      // Column widths
      const cols = Object.keys(data[0] ?? {}).map(k => ({ wch: Math.max(k.length, 14) }));
      ws['!cols'] = cols;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    addSheet(summaryData, 'Resumen');
    addSheet(detailData, 'Detalle');

    const date = format(new Date(), 'yyyyMMdd_HHmm');
    XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
  } catch (e) {
    console.error('Error exportando Excel:', e);
    alert('Error al exportar Excel. Verifica la instalación de xlsx.');
  }
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
export async function exportOrdersToPDF(orders: Order[], filename = 'WeberTrack_Pedidos') {
  try {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header bar
    doc.setFillColor(6, 77, 128);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('WeberTrack', 12, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporte de pedidos — ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}`, 70, 14);

    // Stats row
    const totalUnits = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.actual_qty, 0), 0);
    const approved = orders.filter(o => o.status === 'APPROVED').length;
    const pending  = orders.filter(o => o.status === 'PENDING').length;
    doc.setTextColor(6, 77, 128);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total pedidos: ${orders.length}`, 12, 30);
    doc.text(`Unidades: ${totalUnits}`, 70, 30);
    doc.text(`Aprobados: ${approved}`, 130, 30);
    doc.text(`Pendientes: ${pending}`, 190, 30);

    // Main table
    autoTable(doc, {
      startY: 35,
      head: [['Sucursal', 'Promotor', 'Estado', 'Items', 'Total Uds.', 'Merma', 'Fecha']],
      body: orders.map(o => [
        o.branch_name ?? o.branch_id,
        o.promoter_name ?? o.promoter_id,
        o.status,
        o.items.length.toString(),
        o.items.reduce((s, i) => s + i.actual_qty, 0).toString(),
        o.items.reduce((s, i) => s + (i.waste ?? 0), 0).toString(),
        format(new Date(o.created_at), "dd/MM/yy HH:mm"),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [6, 77, 128],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [240, 244, 248],
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 40 },
        2: { cellWidth: 22 },
        3: { cellWidth: 14 },
        4: { cellWidth: 20 },
        5: { cellWidth: 16 },
        6: { cellWidth: 28 },
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const status = data.cell.text[0];
          if (status === 'APPROVED') {
            doc.setFillColor(22, 163, 74);
          } else if (status === 'PENDING') {
            doc.setFillColor(245, 158, 11);
          } else if (status === 'REJECTED') {
            doc.setFillColor(220, 38, 38);
          } else {
            return;
          }
          doc.roundedRect(data.cell.x + 1, data.cell.y + 1.5, data.cell.width - 2, data.cell.height - 3, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.text(status, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 0.5, { align: 'center' });
        }
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `WeberTrack · ${format(new Date(), "dd/MM/yyyy")} · Página ${i} de ${pageCount}`,
        148.5, 205, { align: 'center' }
      );
    }

    const date = format(new Date(), 'yyyyMMdd_HHmm');
    doc.save(`${filename}_${date}.pdf`);
  } catch (e) {
    console.error('Error exportando PDF:', e);
    alert('Error al exportar PDF. Verifica la instalación de jspdf y jspdf-autotable.');
  }
}
