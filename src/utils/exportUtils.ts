import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import imperiaLogoVertical from '@/assets/imperia-logo-vertical.png';
import imperiaLogoIcon from '@/assets/imperia-logo-icon.png';

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
  additionalTables?: Array<{
    title: string;
    headers: string[];
    rows: any[][];
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
  
  // Add logos
  try {
    // Add company logo in the top left corner with correct aspect ratio
    const logoHeight = 22;
    const logoWidth = logoHeight * 1.8; // Correct aspect ratio for the new logo
    doc.addImage(imperiaLogoVertical, 'PNG', 15, 10, logoWidth, logoHeight);
    
    // Add watermark logos in a grid pattern across the page
    const addWatermark = () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const watermarkSize = 35; // Smaller size for each watermark
      const cols = 4; // Number of columns
      const rows = 6; // Number of rows
      const spacingX = pageWidth / cols;
      const spacingY = pageHeight / rows;
      
      // Save current graphics state
      doc.saveGraphicsState();
      // Set very low opacity for watermarks
      doc.setGState(new (doc as any).GState({ opacity: 0.03 }));
      
      // Create grid of watermarks
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = (col * spacingX) + (spacingX - watermarkSize) / 2;
          const y = (row * spacingY) + (spacingY - watermarkSize) / 2;
          doc.addImage(imperiaLogoIcon, 'PNG', x, y, watermarkSize, watermarkSize);
        }
      }
      
      // Restore graphics state
      doc.restoreGraphicsState();
    };
    
    // Add watermark to first page
    addWatermark();
    
    // Store function to add watermark on new pages
    (doc as any).addWatermark = addWatermark;
  } catch (error) {
    console.warn('Could not load logos for PDF:', error);
  }
  
  // Add title (moved down slightly to not overlap with logo)
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80); // Dark blue-gray
  doc.text(data.title, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
  
  // Add date
  doc.setFontSize(10);
  doc.setTextColor(127, 140, 141); // Gray
  doc.text(
    `Exportado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
    doc.internal.pageSize.getWidth() / 2,
    33,
    { align: 'center' }
  );
  
  let startY = 35;
  
  // Add summary cards if totals are provided (similar to the app layout)
  if (data.totals && data.totals.length > 0) {
    const isLandscape = doc.internal.pageSize.getWidth() > doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const cardsPerRow = isLandscape ? Math.min(data.totals.length, 5) : Math.min(data.totals.length, 3);
    const cardWidth = (pageWidth - 40 - ((cardsPerRow - 1) * 5)) / cardsPerRow;
    const cardHeight = 20;
    const cardY = startY;
    
    data.totals.forEach((total, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const cardX = 20 + (col * (cardWidth + 5));
      const currentCardY = cardY + (row * (cardHeight + 5));
      
      // Draw card background with rounded corners effect
      doc.setFillColor(249, 250, 251); // Light gray background
      doc.setDrawColor(229, 231, 235); // Border color
      doc.setLineWidth(0.5);
      doc.roundedRect(cardX, currentCardY, cardWidth, cardHeight, 2, 2, 'FD');
      
      // Add label - truncate if too long
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128); // Gray text
      const maxLabelLength = Math.floor(cardWidth / 2);
      const truncatedLabel = total.label.length > maxLabelLength ? 
        total.label.substring(0, maxLabelLength - 3) + '...' : 
        total.label;
      doc.text(truncatedLabel, cardX + 5, currentCardY + 7);
      
      // Add value with color based on label
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      
      // Set color based on total type
      if (total.label.toLowerCase().includes('pago') && !total.label.toLowerCase().includes('não')) {
        doc.setTextColor(34, 197, 94); // Green for paid
      } else if (total.label.toLowerCase().includes('pendente') || total.label.toLowerCase().includes('não pago')) {
        doc.setTextColor(234, 179, 8); // Yellow/orange for pending
      } else {
        doc.setTextColor(59, 130, 246); // Blue for total
      }
      
      doc.text(total.value, cardX + 5, currentCardY + 15);
    });
    
    const totalRows = Math.ceil(data.totals.length / cardsPerRow);
    startY = cardY + (totalRows * (cardHeight + 5)) + 5;
  }
  
  // Add additional tables first if provided
  if (data.additionalTables && data.additionalTables.length > 0) {
    data.additionalTables.forEach((additionalTable) => {
      // Add table title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text(additionalTable.title, 20, startY + 5);
      
      // Add table
      autoTable(doc, {
        head: [additionalTable.headers],
        body: additionalTable.rows,
        startY: startY + 10,
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
          1: { halign: 'center', cellWidth: 'auto' },
        },
        margin: { left: 20, right: 20 },
      });
      
      // Update startY for next element
      startY = (doc as any).lastAutoTable.finalY + 10;
    });
  }
  
  // Add main table
  if (data.rows && data.rows.length > 0) {
    // Add table title if there are additional tables
    if (data.additionalTables && data.additionalTables.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text('Pendências Recentes', 20, startY + 5);
      startY += 10;
    }
    
    autoTable(doc, {
      head: [data.headers],
      body: data.rows,
      startY: startY,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 1.5,
        textColor: [44, 62, 80],
        lineColor: [189, 195, 199],
        lineWidth: 0.1,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontSize: 8,
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
        3: { halign: 'center', cellWidth: 'auto' },
        4: { halign: 'center', cellWidth: 'auto' },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        // Add watermark on each new page
        if ((doc as any).addWatermark && data.pageNumber > 1) {
          (doc as any).addWatermark();
        }
        
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
  }
  
  // Add charts if provided
  if (data.charts && data.charts.length > 0) {
    // Add new page for charts
    doc.addPage();
    
    // Add watermark to charts page
    if ((doc as any).addWatermark) {
      (doc as any).addWatermark();
    }
    
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
            // Add watermark to new page
            if ((doc as any).addWatermark) {
              (doc as any).addWatermark();
            }
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
        const maxValue = Math.max(...chart.data.map(item => item.value)) || 1; // Prevent division by zero
        
        // Draw background grid
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        for (let i = 0; i <= 4; i++) {
          const gridY = chartStartY + (maxBarHeight * i / 4);
          doc.line(chartX + 5, gridY, chartX + chartWidth - 5, gridY);
        }
        
        // Draw bars with gradient effect
        chart.data.forEach((item, i) => {
          const barHeight = Math.max(0, (item.value / maxValue) * maxBarHeight) || 0;
          const x = startX + i * (barWidth + barSpacing);
          const y = chartStartY + maxBarHeight - barHeight;
          
          // Only draw bar if height is valid
          if (barHeight > 0 && !isNaN(barHeight)) {
            // Draw bar with gradient effect (simulated with multiple rectangles)
            const gradientSteps = 5;
            const stepHeight = barHeight / gradientSteps;
            
            if (stepHeight > 0 && !isNaN(stepHeight)) {
              for (let step = 0; step < gradientSteps; step++) {
                const stepY = y + (step * stepHeight);
                const blueValue = 219 - (step * 15); // Gradient from lighter to darker
                doc.setFillColor(52, 152, blueValue);
                doc.rect(x, stepY, barWidth, stepHeight, 'F');
              }
              
              // Add shadow effect (simplified without alpha)
              doc.setFillColor(230, 230, 230);
              doc.rect(x + 1, y + barHeight, barWidth, 1, 'F');
            }
          }
          
          // Add value on top of bar
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
          doc.text(formattedValue, x + barWidth / 2, y - 3, { align: 'center' });
          
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