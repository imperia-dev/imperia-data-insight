import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportData {
  headers: string[];
  rows: any[][];
  title: string;
  totals?: { label: string; value: string }[];
}

export const exportToExcel = (data: ExportData) => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Create worksheet data with title and spacing
  const wsData: any[][] = [];
  
  // Add title with styling
  wsData.push([data.title]);
  wsData.push([]); // Empty row for spacing
  
  // Add date of export
  wsData.push([`Data de Exportação: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`]);
  wsData.push([]); // Empty row for spacing
  
  // Add headers
  wsData.push(data.headers);
  
  // Add data rows
  data.rows.forEach(row => {
    wsData.push(row);
  });
  
  // Add totals if provided
  if (data.totals && data.totals.length > 0) {
    wsData.push([]); // Empty row for spacing
    data.totals.forEach(total => {
      const totalRow = new Array(data.headers.length).fill('');
      totalRow[data.headers.length - 2] = total.label;
      totalRow[data.headers.length - 1] = total.value;
      wsData.push(totalRow);
    });
  }
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  const colWidths = data.headers.map((header, index) => {
    const maxLength = Math.max(
      header.length,
      ...data.rows.map(row => String(row[index] || '').length)
    );
    return { wch: Math.min(maxLength + 5, 50) };
  });
  ws['!cols'] = colWidths;
  
  // Merge title cell
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: data.headers.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: data.headers.length - 1 } }
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  
  // Generate filename with date
  const fileName = `${data.title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  
  // Write the file
  XLSX.writeFile(wb, fileName);
};

export const exportToPDF = (data: ExportData, forceOrientation?: 'portrait' | 'landscape') => {
  // Create new PDF document
  const doc = new jsPDF({
    orientation: forceOrientation || (data.headers.length > 6 ? 'landscape' : 'portrait'),
    unit: 'mm',
    format: 'a4'
  });
  
  // Set fonts and colors
  doc.setFont('helvetica');
  
  // Add title
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80); // Dark blue-gray
  doc.text(data.title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  
  // Add date
  doc.setFontSize(10);
  doc.setTextColor(127, 140, 141); // Gray
  doc.text(
    `Exportado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
    doc.internal.pageSize.getWidth() / 2,
    28,
    { align: 'center' }
  );
  
  // Add table
  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: 35,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: [44, 62, 80],
      lineColor: [189, 195, 199],
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [52, 73, 94],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [245, 248, 250],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'left', cellWidth: 'auto' },
      3: { halign: 'left', cellWidth: 'auto' },
      4: { halign: 'center', cellWidth: 'auto' },
      5: { halign: 'center', cellWidth: 'auto' },
      6: { halign: 'left', cellWidth: 'auto' },
      7: { halign: 'center', cellWidth: 'auto' },
      8: { halign: 'center', cellWidth: 'auto' },
      9: { halign: 'center', cellWidth: 'auto' },
      [data.headers.length - 1]: { halign: 'right', cellWidth: 'auto' },
    },
    margin: { top: 35, left: 10, right: 10 },
    didDrawPage: (data) => {
      // Add page number
      const pageCount = doc.internal.pages.length - 1;
      doc.setFontSize(8);
      doc.setTextColor(127, 140, 141);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });
  
  // Add totals if provided
  if (data.totals && data.totals.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 50;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    
    let yPosition = finalY + 10;
    data.totals.forEach(total => {
      doc.text(total.label, 14, yPosition);
      doc.text(total.value, doc.internal.pageSize.getWidth() - 14, yPosition, { align: 'right' });
      yPosition += 6;
    });
  }
  
  // Generate filename with date
  const fileName = `${data.title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  
  // Save the PDF
  doc.save(fileName);
};