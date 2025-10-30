import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';

interface MetricsData {
  totalProtocols: number;
  totalAmount: number;
  pendingCount: number;
  averageValue: number;
}

interface ProtocolData {
  protocol_number: string;
  competence_month: string;
  status: string;
  total_amount: number;
  expense_count?: number;
  provider_name?: string;
  reviewer_name?: string;
  order_count?: number;
  document_count?: number;
}

interface AdditionalData {
  errorRate: number;
  documentsByCustomer: Record<string, number>;
  providerCostsToday: number;
  providerCostsMonth: number;
}

export async function exportFinancialDashboard(
  diagramacaoData: { metrics: MetricsData; protocols: ProtocolData[] },
  revisaoData: { metrics: MetricsData; protocols: ProtocolData[] },
  despesasData: { metrics: MetricsData; protocols: ProtocolData[] },
  additionalData: AdditionalData
) {
  const doc = new jsPDF();
  let yPosition = 20;

  // Título principal
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Dashboard Financeiro - Relatório Completo', 14, yPosition);
  yPosition += 5;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, yPosition);
  yPosition += 15;

  // ========== INDICADORES GERAIS ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Indicadores Gerais do Mês', 14, yPosition);
  yPosition += 10;

  const generalMetrics = [
    ['Taxa de Erro', `${additionalData.errorRate.toFixed(2)}%`],
    ['Gasto com Prestadores (Hoje)', formatCurrency(additionalData.providerCostsToday)],
    ['Gasto com Prestadores (Mês)', formatCurrency(additionalData.providerCostsMonth)]
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Indicador', 'Valor']],
    body: generalMetrics,
    theme: 'grid',
    headStyles: { fillColor: [147, 51, 234], fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Documentos por Cliente
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Documentos Atribuídos no Mês por Cliente', 14, yPosition);
  yPosition += 5;

  const customerRows = Object.entries(additionalData.documentsByCustomer).map(([customer, count]) => [
    customer,
    count.toString()
  ]);

  if (customerRows.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [['Cliente', 'Quantidade']],
      body: customerRows,
      theme: 'striped',
      headStyles: { fillColor: [147, 51, 234], fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        1: { halign: 'center' }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Nova página se necessário
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  // ========== ABA DIAGRAMAÇÃO ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Diagramação', 14, yPosition);
  yPosition += 10;

  // Cards de métricas - Diagramação
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const diagramacaoMetrics = [
    ['Total de Protocolos', diagramacaoData.metrics.totalProtocols.toString()],
    ['Valor Total', formatCurrency(diagramacaoData.metrics.totalAmount)],
    ['Protocolos Pendentes', diagramacaoData.metrics.pendingCount.toString()],
    ['Média por Protocolo', formatCurrency(diagramacaoData.metrics.averageValue)]
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Métrica', 'Valor']],
    body: diagramacaoMetrics,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241], fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Tabela de protocolos - Diagramação
  if (diagramacaoData.protocols.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Protocolos de Diagramação', 14, yPosition);
    yPosition += 5;

    const diagramacaoRows = diagramacaoData.protocols.map(p => [
      p.protocol_number,
      p.provider_name || 'N/A',
      format(new Date(p.competence_month + "T12:00:00"), "MMM/yyyy", { locale: ptBR }),
      p.status,
      formatCurrency(p.total_amount),
      (p.expense_count || 0).toString()
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Protocolo', 'Prestador', 'Competência', 'Status', 'Valor', 'Qtd Pedidos']],
      body: diagramacaoRows,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 35 },
        4: { halign: 'right' },
        5: { halign: 'center' }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Nova página para Revisão se necessário
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  // ========== ABA REVISÃO ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Revisão', 14, yPosition);
  yPosition += 10;

  // Cards de métricas - Revisão
  const revisaoMetrics = [
    ['Total de Protocolos', revisaoData.metrics.totalProtocols.toString()],
    ['Valor Total', formatCurrency(revisaoData.metrics.totalAmount)],
    ['Protocolos Pendentes', revisaoData.metrics.pendingCount.toString()],
    ['Média de Documentos', revisaoData.metrics.averageValue.toFixed(1)]
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Métrica', 'Valor']],
    body: revisaoMetrics,
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94], fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Tabela de protocolos - Revisão
  if (revisaoData.protocols.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Protocolos de Revisão', 14, yPosition);
    yPosition += 5;

    const revisaoRows = revisaoData.protocols.map(p => [
      p.protocol_number,
      p.reviewer_name || 'N/A',
      format(new Date(p.competence_month + "T12:00:00"), "MMM/yyyy", { locale: ptBR }),
      (p.order_count || 0).toString(),
      (p.document_count || 0).toString(),
      formatCurrency(p.total_amount),
      p.status
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Protocolo', 'Revisor', 'Competência', 'Pedidos', 'Docs', 'Valor', 'Status']],
      body: revisaoRows,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 35 },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'right' }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Nova página para Despesas se necessário
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  // ========== ABA DESPESAS ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Despesas', 14, yPosition);
  yPosition += 10;

  // Cards de métricas - Despesas
  const despesasMetrics = [
    ['Total de Protocolos', despesasData.metrics.totalProtocols.toString()],
    ['Valor Total', formatCurrency(despesasData.metrics.totalAmount)],
    ['Protocolos Pendentes', despesasData.metrics.pendingCount.toString()],
    ['Média por Protocolo', formatCurrency(despesasData.metrics.averageValue)]
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Métrica', 'Valor']],
    body: despesasMetrics,
    theme: 'grid',
    headStyles: { fillColor: [234, 88, 12], fontSize: 10, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Tabela de protocolos - Despesas
  if (despesasData.protocols.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Protocolos de Despesas', 14, yPosition);
    yPosition += 5;

    const despesasRows = despesasData.protocols.map(p => [
      p.protocol_number,
      format(new Date(p.competence_month + "T12:00:00"), "MMM/yyyy", { locale: ptBR }),
      p.status,
      formatCurrency(p.total_amount),
      (p.expense_count || 0).toString()
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Protocolo', 'Competência', 'Status', 'Valor Total', 'Qtd Despesas']],
      body: despesasRows,
      theme: 'striped',
      headStyles: { fillColor: [234, 88, 12], fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 40 },
        3: { halign: 'right' },
        4: { halign: 'center' }
      }
    });
  }

  // Salvar PDF
  const fileName = `dashboard-financeiro-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(fileName);
}
