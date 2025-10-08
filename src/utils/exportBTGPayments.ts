import * as XLSX from 'xlsx';

interface BTGProtocol {
  id: string;
  protocol_number: string;
  provider_name: string;
  cpf?: string;
  cnpj?: string;
  pix_key?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  account_type?: string;
  total_amount: number;
  competence_month: string;
}

interface BTGExportData {
  pixPayments: any[];
  tedPayments: any[];
  boletoPayments: any[];
}

export const exportBTGPayments = (protocols: BTGProtocol[], sourceAgency?: string, sourceAccount?: string) => {
  const data: BTGExportData = {
    pixPayments: [],
    tedPayments: [],
    boletoPayments: []
  };

  // Organizar protocolos por tipo de pagamento
  protocols.forEach(protocol => {
    const cpfCnpj = protocol.cpf || protocol.cnpj || '';
    const paymentDate = new Date();
    const formattedDate = paymentDate.toLocaleDateString('pt-BR');
    const description = `Pagamento ${protocol.protocol_number} - ${new Date(protocol.competence_month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;

    // Se tem PIX, adicionar na aba PIX
    if (protocol.pix_key) {
      data.pixPayments.push({
        'Chave PIX ou Copia e Cola': protocol.pix_key,
        'Nome / Razão Social do Favorecido': protocol.provider_name,
        'CPF/CNPJ do Favorecido': cpfCnpj,
        'Valor': protocol.total_amount,
        'Data de Pagamento (dd/mm/aaaa)': formattedDate,
        'Descrição (Opcional)': description,
        'Identificação Interna (Opcional)': protocol.protocol_number,
        'Agência de Origem': sourceAgency || '',
        'Conta de Origem': sourceAccount || ''
      });
    }
    // Se tem dados bancários completos, adicionar na aba TED/DOC
    else if (protocol.bank_name && protocol.bank_agency && protocol.bank_account) {
      data.tedPayments.push({
        'Banco do Favorecido': protocol.bank_name,
        'Agência do Favorecido': protocol.bank_agency,
        'Conta do Favorecido': protocol.bank_account,
        'Tipo de Conta do Favorecido': protocol.account_type || 'Corrente',
        'Nome / Razão Social do Favorecido': protocol.provider_name,
        'CPF/CNPJ do Favorecido': cpfCnpj,
        'Tipo de Transferência': 'TED',
        'Valor': protocol.total_amount,
        'Data de Pagamento (dd/mm/aaaa)': formattedDate,
        'Descrição (Opcional)': description,
        'Identificação Interna (Opcional)': protocol.protocol_number,
        'Agência de Origem': sourceAgency || '',
        'Conta de Origem': sourceAccount || ''
      });
    }
  });

  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Aba 1: TED/DOC
  const wsTED = XLSX.utils.json_to_sheet(data.tedPayments, {
    header: [
      'Banco do Favorecido',
      'Agência do Favorecido',
      'Conta do Favorecido',
      'Tipo de Conta do Favorecido',
      'Nome / Razão Social do Favorecido',
      'CPF/CNPJ do Favorecido',
      'Tipo de Transferência',
      'Valor',
      'Data de Pagamento (dd/mm/aaaa)',
      'Descrição (Opcional)',
      'Identificação Interna (Opcional)',
      'Agência de Origem',
      'Conta de Origem'
    ]
  });
  XLSX.utils.book_append_sheet(wb, wsTED, 'TED-DOC');

  // Aba 2: PIX
  const wsPIX = XLSX.utils.json_to_sheet(data.pixPayments, {
    header: [
      'Chave PIX ou Copia e Cola',
      'Nome / Razão Social do Favorecido',
      'CPF/CNPJ do Favorecido',
      'Valor',
      'Data de Pagamento (dd/mm/aaaa)',
      'Descrição (Opcional)',
      'Identificação Interna (Opcional)',
      'Agência de Origem',
      'Conta de Origem'
    ]
  });
  XLSX.utils.book_append_sheet(wb, wsPIX, 'PIX');

  // Aba 3: Boleto (vazia por enquanto, mas mantém estrutura)
  const wsBoleto = XLSX.utils.json_to_sheet([], {
    header: [
      'Código de Barras',
      'Valor',
      'Data de Pagamento (dd/mm/aaaa)',
      'Identificação Interna (Opcional)',
      'Agência de Origem',
      'Conta de Origem'
    ]
  });
  XLSX.utils.book_append_sheet(wb, wsBoleto, 'Boleto');

  // Gerar arquivo
  const fileName = `BTG_Pagamentos_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return {
    pixCount: data.pixPayments.length,
    tedCount: data.tedPayments.length,
    boletoCount: data.boletoPayments.length,
    fileName
  };
};
