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
}

export const exportBTGPayments = (protocols: BTGProtocol[], sourceAgency: string = '0050', sourceAccount: string = '823953-8') => {
  const data = {
    pixPayments: []
  };

  let protocolsWithoutPix = 0;

  // Organizar protocolos por tipo de pagamento
  protocols.forEach(protocol => {
    const cpfCnpj = protocol.cpf || protocol.cnpj || '';
    const paymentDate = new Date();
    const formattedDate = paymentDate.toLocaleDateString('pt-BR');
    const description = `Pagamento ${protocol.protocol_number} - ${new Date(protocol.competence_month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;

    // Adicionar na aba PIX apenas se tiver chave PIX
    if (protocol.pix_key) {
      data.pixPayments.push({
        'Chave PIX ou Copia e Cola': protocol.pix_key,
        'Nome / Razão Social do Favorecido': protocol.provider_name,
        'CPF/CNPJ do Favorecido': cpfCnpj,
        'Valor': protocol.total_amount,
        'Data de Pagamento (dd/mm/aaaa)': formattedDate,
        'Descrição (Opcional)': description,
        'Identificação Interna (Opcional)': protocol.protocol_number,
        'Agência de Origem': sourceAgency,
        'Conta de Origem': sourceAccount
      });
    } else {
      protocolsWithoutPix++;
    }
  });

  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Aba PIX
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

  // Gerar arquivo
  const fileName = `BTG_Pagamentos_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return {
    pixCount: data.pixPayments.length,
    protocolsWithoutPix,
    fileName
  };
};
