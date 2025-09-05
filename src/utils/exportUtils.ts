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
    
    // Main title for charts section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text('Análise Gráfica', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    let yPosition = 35;
    const pageWidth = doc.internal.pageSize.getWidth();
    const chartAreaWidth = pageWidth - 40; // 20mm margin on each side
    const halfWidth = (chartAreaWidth - 10) / 2; // Space for two charts side by side with gap
    
    // Check if we have two charts to display side by side
    const hasMultipleCharts = data.charts.length > 1;
    
    data.charts.forEach((chart, index) => {
      const isLeftChart = index === 0 && hasMultipleCharts;
      const isRightChart = index === 1 && hasMultipleCharts;
      const isSingleChart = !hasMultipleCharts || index > 1;
      
      // Determine chart position and dimensions
      let chartX: number;
      let chartWidth: number;
      let chartHeight = 80;
      
      if (isLeftChart) {
        chartX = 20;
        chartWidth = halfWidth;
      } else if (isRightChart) {
        chartX = 20 + halfWidth + 10;
        chartWidth = halfWidth;
      } else {
        chartX = 20;
        chartWidth = chartAreaWidth;
        if (index > 1) {
          yPosition += 100; // Add space for new row of charts
          if (yPosition > doc.internal.pageSize.getHeight() - 100) {
            doc.addPage();
            yPosition = 35;
          }
        }
      }
      
      // Chart title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text(chart.title, chartX + chartWidth / 2, yPosition, { align: 'center' });
      
      if (chart.type === 'bar') {
        // Enhanced bar chart with better styling
        const chartStartY = yPosition + 10;
        const maxBarHeight = 50;
        const barSpacing = 3;
        const availableWidth = chartWidth - 10;
        const barWidth = Math.min(20, (availableWidth - (chart.data.length - 1) * barSpacing) / chart.data.length);
        const totalBarsWidth = (barWidth * chart.data.length) + (barSpacing * (chart.data.length - 1));
        const startX = chartX + (chartWidth - totalBarsWidth) / 2;
        
        // Find max value for scaling
        const maxValue = Math.max(...chart.data.map(item => item.value));
        
        // Draw background grid
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        for (let i = 0; i <= 4; i++) {
          const gridY = chartStartY + (maxBarHeight * i / 4);
          doc.line(chartX + 5, gridY, chartX + chartWidth - 5, gridY);
        }
        
        // Draw bars with gradient effect
        chart.data.forEach((item, i) => {
          const barHeight = (item.value / maxValue) * maxBarHeight;
          const x = startX + i * (barWidth + barSpacing);
          const y = chartStartY + maxBarHeight - barHeight;
          
          // Draw bar with gradient effect (simulated with multiple rectangles)
          const gradientSteps = 5;
          for (let step = 0; step < gradientSteps; step++) {
            const stepHeight = barHeight / gradientSteps;
            const stepY = y + (step * stepHeight);
            const blueValue = 219 - (step * 15); // Gradient from lighter to darker
            doc.setFillColor(52, 152, blueValue);
            doc.rect(x, stepY, barWidth, stepHeight, 'F');
          }
          
          // Add shadow effect (simplified without alpha)
          doc.setFillColor(230, 230, 230);
          doc.rect(x + 1, y + barHeight, barWidth, 1, 'F');
          
          // Add value on top of bar with background
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(x - 5, y - 12, barWidth + 10, 10, 2, 2, 'F');
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 152, 219);
          const formattedValue = item.formattedValue || 
            new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL',
              notation: 'compact',
              maximumFractionDigits: 1
            }).format(item.value);
          doc.text(formattedValue, x + barWidth / 2, y - 5, { align: 'center' });
          
          // Add label below bar
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          const label = item.label.length > 12 ? item.label.substring(0, 10) + '...' : item.label;
          
          // Save current state and rotate for label
          doc.saveGraphicsState();
          doc.text(label, x + barWidth / 2, chartStartY + maxBarHeight + 8, { 
            align: 'center',
            angle: 30
          });
          doc.restoreGraphicsState();
        });
        
      } else if (chart.type === 'pie') {
        // Draw pie chart as visual representation
        const centerX = chartX + chartWidth / 2;
        const centerY = yPosition + 45;
        const radius = 25;
        
        // Calculate angles
        const total = chart.data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -Math.PI / 2; // Start from top
        
        // Colors for pie slices (matching web colors)
        const colors = [
          [139, 92, 246],  // Purple
          [236, 72, 153],  // Pink
          [59, 130, 246],  // Blue
          [34, 197, 94],   // Green
          [251, 146, 60],  // Orange
          [239, 68, 68],   // Red
        ];
        
        // Draw pie slices
        chart.data.forEach((item, i) => {
          const sliceAngle = (item.value / total) * Math.PI * 2;
          const endAngle = currentAngle + sliceAngle;
          
          // Draw slice
          const color = colors[i % colors.length];
          doc.setFillColor(color[0], color[1], color[2]);
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(1);
          
          // Create pie slice path
          const segments = 30;
          const points: Array<[number, number]> = [[centerX, centerY]];
          
          for (let j = 0; j <= segments; j++) {
            const angle = currentAngle + (sliceAngle * j / segments);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            points.push([x, y]);
          }
          
          // Draw the slice
          const sliceColor = colors[i % colors.length];
          doc.setFillColor(sliceColor[0], sliceColor[1], sliceColor[2]);
          for (let j = 1; j < points.length - 1; j++) {
            doc.triangle(
              points[0][0], points[0][1],
              points[j][0], points[j][1],
              points[j + 1][0], points[j + 1][1],
              'F'
            );
          }
          
          currentAngle = endAngle;
        });
        
        // Draw legend below pie chart
        let legendY = centerY + radius + 15;
        doc.setFontSize(7);
        
        chart.data.forEach((item, i) => {
          const legendX = chartX + 10;
          
          // Color box
          const legendColor = colors[i % colors.length];
          doc.setFillColor(legendColor[0], legendColor[1], legendColor[2]);
          doc.rect(legendX, legendY - 2, 3, 3, 'F');
          
          // Label and value
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          const label = item.label.length > 20 ? item.label.substring(0, 18) + '...' : item.label;
          doc.text(label, legendX + 5, legendY);
          
          // Percentage
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          const percentage = item.percentage ? `${item.percentage}%` : `${((item.value / total) * 100).toFixed(1)}%`;
          doc.text(percentage, chartX + chartWidth - 10, legendY, { align: 'right' });
          
          legendY += 5;
        });
      }
    });
  }
  
  // Generate filename with date
  const fileName = `${data.title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  
  // Save the PDF
  doc.save(fileName);
};