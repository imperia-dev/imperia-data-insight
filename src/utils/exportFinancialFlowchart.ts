import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function exportFinancialFlowchartPDF() {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Colors
  const primaryColor = { r: 147, g: 51, b: 234 }; // Purple
  const secondaryColor = { r: 59, g: 130, b: 246 }; // Blue
  const successColor = { r: 34, g: 197, b: 94 }; // Green
  const warningColor = { r: 251, g: 146, b: 60 }; // Orange
  const textColor = { r: 71, g: 85, b: 105 };

  // Helper function to add page header
  const addPageHeader = (title: string, pageNum: number) => {
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${pageNum}`, pageWidth - margin, 20, { align: 'right' });
  };

  // Helper function to draw a box
  const drawBox = (x: number, y: number, w: number, h: number, title: string, color: any, items: string[] = []) => {
    doc.setFillColor(color.r, color.g, color.b);
    doc.setDrawColor(color.r, color.g, color.b);
    doc.roundedRect(x, y, w, h, 3, 3, 'FD');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + w/2, y + 8, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    items.forEach((item, index) => {
      doc.text(`• ${item}`, x + 5, y + 15 + (index * 5));
    });
  };

  // Helper function to draw arrow
  const drawArrow = (x1: number, y1: number, x2: number, y2: number) => {
    doc.setDrawColor(textColor.r, textColor.g, textColor.b);
    doc.setLineWidth(0.5);
    doc.line(x1, y1, x2, y2);
    
    // Arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 5;
    const arrowAngle = Math.PI / 6;
    
    doc.line(x2, y2, x2 - arrowLength * Math.cos(angle - arrowAngle), y2 - arrowLength * Math.sin(angle - arrowAngle));
    doc.line(x2, y2, x2 - arrowLength * Math.cos(angle + arrowAngle), y2 - arrowLength * Math.sin(angle + arrowAngle));
  };

  // Page 1: Overview
  addPageHeader('Arquitetura Financeira - Imperia Traduções', 1);
  
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Visão Geral do Sistema Financeiro', margin, 35);
  
  // Main flowchart
  drawBox(20, 45, 60, 35, 'ENTRADA DE DADOS', primaryColor, [
    'Company Costs',
    'Service Providers',
    'Fechamento Despesas',
    'Plano de Contas'
  ]);
  
  drawBox(100, 45, 60, 35, 'PROCESSAMENTO', secondaryColor, [
    'Dashboard Financeiro',
    'DRE / Balanço',
    'Fluxo de Caixa',
    'Unit Economics'
  ]);
  
  drawBox(180, 45, 60, 35, 'SAÍDAS', successColor, [
    'Relatórios PDF/Excel',
    'WhatsApp Reports',
    'Análise AI',
    'Indicadores'
  ]);
  
  drawBox(60, 95, 60, 30, 'FECHAMENTO', warningColor, [
    'Protocolo Mensal',
    'Validações',
    'Aprovações'
  ]);
  
  drawBox(140, 95, 60, 30, 'INTEGRAÇÕES', primaryColor, [
    'BTG Pactual',
    'Pagamentos',
    'Documentos'
  ]);
  
  // Draw arrows
  drawArrow(80, 62, 100, 62);
  drawArrow(160, 62, 180, 62);
  drawArrow(90, 80, 90, 95);
  drawArrow(150, 80, 170, 95);
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin, pageHeight - 10);

  // Page 2: Data Entry Details
  doc.addPage();
  addPageHeader('Detalhamento - Entrada de Dados', 2);
  
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Company Costs (Custos da Empresa)', margin, 40);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const companyCostsText = [
    '• Cadastro de despesas operacionais e administrativas',
    '• Campos: Data, Valor, Categoria, Subcategoria, Descrição',
    '• Plano de Contas e Centro de Custo obrigatórios',
    '• Status de pagamento e protocolo',
    '• Importação via Excel/CSV',
    '• Validações automáticas de dados'
  ];
  
  companyCostsText.forEach((text, index) => {
    doc.text(text, margin + 5, 50 + (index * 6));
  });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Service Provider Costs (Prestadores de Serviço)', margin, 95);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const serviceProviderText = [
    '• Gestão de pagamentos a prestadores PJ e PF',
    '• Campos: Nome, CPF/CNPJ, PIX, Valor, Competência',
    '• Cálculo automático de impostos',
    '• Status de pagamento e aprovação',
    '• Geração de relatórios para contabilidade',
    '• Integração com sistema de pagamentos'
  ];
  
  serviceProviderText.forEach((text, index) => {
    doc.text(text, margin + 5, 105 + (index * 6));
  });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Plano de Contas e Centro de Custo', margin, 150);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const planText = [
    '• Estrutura hierárquica de contas contábeis',
    '• Centros de custo por departamento/projeto',
    '• Categorização automática de despesas',
    '• Rastreabilidade completa'
  ];
  
  planText.forEach((text, index) => {
    doc.text(text, margin + 5, 160 + (index * 6));
  });

  // Page 3: Financial Dashboard
  doc.addPage();
  addPageHeader('Dashboard Financeiro e Relatórios', 3);
  
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Dashboard Principal', margin, 40);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const dashboardFeatures = [
    '• Visão consolidada de receitas e despesas',
    '• KPIs em tempo real: Faturamento, Custos, Margem',
    '• Gráficos interativos de evolução mensal',
    '• Comparativos período anterior',
    '• Alertas de desvios orçamentários'
  ];
  
  dashboardFeatures.forEach((text, index) => {
    doc.text(text, margin + 5, 50 + (index * 6));
  });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Demonstrativos Financeiros', margin, 90);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const demonstrativos = [
    'DRE (Demonstração de Resultados):',
    '  - Receita Bruta, Deduções, Receita Líquida',
    '  - Custos dos Serviços, Margem Bruta',
    '  - Despesas Operacionais, EBITDA',
    '',
    'Balanço Patrimonial:',
    '  - Ativos: Circulante e Não Circulante',
    '  - Passivos: Obrigações e Patrimônio Líquido',
    '',
    'Fluxo de Caixa:',
    '  - Entradas e Saídas por categoria',
    '  - Projeção de caixa futuro',
    '  - Análise de liquidez'
  ];
  
  demonstrativos.forEach((text, index) => {
    doc.text(text, margin + 5, 100 + (index * 5));
  });

  // Page 4: Closing and Payments
  doc.addPage();
  addPageHeader('Protocolo de Fechamento e Pagamentos', 4);
  
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Fechamento Mensal', margin, 40);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const fechamentoSteps = [
    '1. Revisão de todos os lançamentos do mês',
    '2. Conferência de documentos fiscais',
    '3. Conciliação bancária',
    '4. Cálculo de impostos e provisões',
    '5. Geração de relatórios gerenciais',
    '6. Aprovação da diretoria',
    '7. Envio para contabilidade'
  ];
  
  fechamentoSteps.forEach((text, index) => {
    doc.text(text, margin + 5, 50 + (index * 6));
  });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Gestão de Pagamentos', margin, 100);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const pagamentosFlow = [
    'Fluxo de Aprovação:',
    '  1. Solicitação de pagamento',
    '  2. Validação dos dados (PIX, valores)',
    '  3. Aprovação do gestor',
    '  4. Processamento via BTG ou manual',
    '  5. Confirmação e registro',
    '',
    'Tipos de Pagamento:',
    '  • PIX instantâneo',
    '  • TED/DOC programado',
    '  • Boleto bancário',
    '  • Cartão corporativo'
  ];
  
  pagamentosFlow.forEach((text, index) => {
    doc.text(text, margin + 5, 110 + (index * 5));
  });

  // Page 5: Integrations
  doc.addPage();
  addPageHeader('Integrações e Automações', 5);
  
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BTG Pactual Integration', margin, 40);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const btgIntegration = [
    '• Autenticação OAuth2 segura',
    '• Sincronização de fornecedores',
    '• Processamento batch de pagamentos',
    '• Consulta de status em tempo real',
    '• Reconciliação automática',
    '• Logs de auditoria completos'
  ];
  
  btgIntegration.forEach((text, index) => {
    doc.text(text, margin + 5, 50 + (index * 6));
  });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('WhatsApp Reports', margin, 90);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const whatsappFeatures = [
    '• Envio automático de relatórios diários',
    '• Resumo executivo personalizado',
    '• KPIs principais em formato mobile-friendly',
    '• Alertas de anomalias e desvios',
    '• Comandos interativos via chat'
  ];
  
  whatsappFeatures.forEach((text, index) => {
    doc.text(text, margin + 5, 100 + (index * 6));
  });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Outras Integrações', margin, 140);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const otherIntegrations = [
    '• Google Sheets: Exportação de dados',
    '• Email: Notificações automáticas',
    '• API REST: Integração com sistemas externos',
    '• Webhooks: Eventos em tempo real',
    '• Backup automático: Segurança de dados'
  ];
  
  otherIntegrations.forEach((text, index) => {
    doc.text(text, margin + 5, 150 + (index * 6));
  });

  // Page 6: Complete Text Description
  doc.addPage();
  addPageHeader('Descrição Completa do Sistema', 6);
  
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const fullDescription = `
O Sistema Financeiro da Imperia Traduções é uma plataforma completa de gestão financeira que integra todos os aspectos 
das operações financeiras da empresa. Desenvolvido com tecnologias modernas (React, TypeScript, Supabase), oferece uma 
experiência fluida e segura para o controle total das finanças.

MÓDULOS PRINCIPAIS:

1. ENTRADA DE DADOS
   - Company Costs: Gestão completa de despesas operacionais com categorização, plano de contas e centro de custo
   - Service Providers: Controle de pagamentos a prestadores PJ/PF com cálculo automático de impostos
   - Importação de Dados: Suporte para Excel/CSV com validação automática

2. PROCESSAMENTO E ANÁLISE
   - Dashboard Financeiro: Visão 360° com KPIs, gráficos e análises em tempo real
   - DRE Gerencial: Demonstração de resultados com drill-down por categoria
   - Balanço Patrimonial: Posição financeira atualizada
   - Fluxo de Caixa: Projeções e análise de liquidez
   - Unit Economics: Métricas unitárias e análise de rentabilidade

3. FECHAMENTO E CONTROLE
   - Protocolo de Fechamento Mensal: Checklist completo com validações
   - Conciliação: Conferência automática de lançamentos
   - Auditoria: Trilha completa de alterações

4. INTEGRAÇÕES
   - BTG Pactual: Processamento automatizado de pagamentos
   - WhatsApp: Relatórios mobile-friendly
   - APIs: Integração com sistemas externos

5. SEGURANÇA E COMPLIANCE
   - Autenticação multifator
   - Criptografia de dados sensíveis
   - Logs de auditoria
   - Backup automático
   - Conformidade LGPD

O sistema foi projetado para escalar com o crescimento da empresa, mantendo a performance e confiabilidade mesmo com 
grandes volumes de dados. A arquitetura modular permite adicionar novos recursos sem impactar funcionalidades existentes.`;

  // Split text into lines that fit the page width
  const lines = doc.splitTextToSize(fullDescription, pageWidth - (2 * margin));
  
  let yPosition = 35;
  lines.forEach((line: string) => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      addPageHeader('Descrição Completa do Sistema (continuação)', 7);
      yPosition = 35;
    }
    doc.text(line, margin, yPosition);
    yPosition += 5;
  });

  // Save the PDF
  doc.save(`flowchart-financeiro-imperia-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}