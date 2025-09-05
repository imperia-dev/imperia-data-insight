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
  charts?: Array<{
    title: string;
    type: 'bar' | 'pie';
    data: Array<{
      label: string;
      value: number;
      percentage?: number;
      formattedValue?: string;
    }>;
  }>;
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
  
  // Add charts if provided
  if (data.charts && data.charts.length > 0) {
    // Add new page for charts
    doc.addPage();
    
    let yPosition = 20;
    
    data.charts.forEach((chart, index) => {
      // Chart title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text(chart.title, doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      yPosition += 10;
      
      if (chart.type === 'bar') {
        // Draw bar chart
        const barWidth = 15;
        const maxBarHeight = 40;
        const chartWidth = Math.min(chart.data.length * (barWidth + 5), doc.internal.pageSize.getWidth() - 40);
        const startX = (doc.internal.pageSize.getWidth() - chartWidth) / 2;
        
        // Find max value for scaling
        const maxValue = Math.max(...chart.data.map(item => item.value));
        
        // Draw bars
        chart.data.forEach((item, i) => {
          const barHeight = (item.value / maxValue) * maxBarHeight;
          const x = startX + i * (barWidth + 5);
          const y = yPosition + maxBarHeight - barHeight;
          
          // Draw bar
          doc.setFillColor(52, 152, 219); // Blue color
          doc.rect(x, y, barWidth, barHeight, 'F');
          
          // Add value on top of bar
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(44, 62, 80);
          const formattedValue = item.formattedValue || 
            new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL',
              notation: 'compact',
              maximumFractionDigits: 1
            }).format(item.value);
          doc.text(formattedValue, x + barWidth / 2, y - 2, { align: 'center' });
          
          // Add label below bar
          doc.setFontSize(7);
          // Truncate long labels
          const label = item.label.length > 15 ? item.label.substring(0, 12) + '...' : item.label;
          doc.text(label, x + barWidth / 2, yPosition + maxBarHeight + 5, { 
            align: 'center',
            angle: 45
          });
        });
        
        yPosition += maxBarHeight + 25;
      } else if (chart.type === 'pie') {
        // Create a simple table for pie chart data
        const pieData = chart.data.map(item => [
          item.label,
          item.formattedValue || new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(item.value),
          item.percentage ? `${item.percentage}%` : ''
        ]);
        
        autoTable(doc, {
          head: [['Categoria', 'Valor', 'Percentual']],
          body: pieData,
          startY: yPosition,
          theme: 'striped',
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [52, 73, 94],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { halign: 'left', cellWidth: 'auto' },
            1: { halign: 'right', cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 30 },
          },
          margin: { left: 40, right: 40 },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }
      
      // Add spacing between charts
      if (index < data.charts!.length - 1 && yPosition > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        yPosition = 20;
      }
    });
  }
  
  // Generate filename with date
  const fileName = `${data.title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  
  // Save the PDF
  doc.save(fileName);
};