import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, DollarSign, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RevenueEntryFormProps {
  onSuccess?: () => void;
}

export function RevenueEntryForm({ onSuccess }: RevenueEntryFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [protocolData, setProtocolData] = useState<any>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    category: 'sales',
    subcategory: '',
    document_ref: '',
    payment_method: 'transfer',
    accounting_method: 'accrual',
  });

  const revenueCategories = {
    sales: 'Vendas de Produtos/Serviços',
    services: 'Prestação de Serviços',
    recurring: 'Receitas Recorrentes',
    commissions: 'Comissões',
    investments: 'Rendimentos de Investimentos',
    other: 'Outras Receitas',
  };

  useEffect(() => {
    const fetchProtocolData = async () => {
      if (!protocol) {
        setProtocolData(null);
        setFormData(prev => ({ ...prev, amount: '' }));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('closing_protocols')
          .select('*')
          .eq('protocol_number', protocol)
          .single();

        if (error) throw error;

        if (data) {
          setProtocolData(data);
          setFormData(prev => ({ 
            ...prev, 
            amount: data.total_value.toString(),
            description: `Fechamento ${protocol} - ${data.total_ids} documentos processados`
          }));
          
          toast({
            title: 'Protocolo encontrado',
            description: `Valor total: R$ ${data.total_value.toFixed(2)}`,
          });
        }
      } catch (error) {
        console.error('Error fetching protocol:', error);
        toast({
          title: 'Protocolo não encontrado',
          description: 'Verifique o número do protocolo e tente novamente.',
          variant: 'destructive',
        });
        setProtocolData(null);
      }
    };

    fetchProtocolData();
  }, [protocol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('financial_entries').insert({
        date: formData.date,
        type: 'revenue',
        category: formData.category,
        subcategory: formData.subcategory || null,
        description: formData.description,
        amount: parseFloat(formData.amount),
        document_ref: formData.document_ref || null,
        payment_method: formData.payment_method,
        accounting_method: formData.accounting_method,
        status: 'confirmed',
        protocol_id: protocolData?.id || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Receita adicionada',
        description: 'A receita foi registrada com sucesso.',
      });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        category: 'sales',
        subcategory: '',
        document_ref: '',
        payment_method: 'transfer',
        accounting_method: 'accrual',
      });
      setProtocol('');
      setProtocolData(null);
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding revenue:', error);
      toast({
        title: 'Erro ao adicionar receita',
        description: 'Ocorreu um erro ao salvar a receita.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <DollarSign className="mr-2 h-4 w-4" />
          Adicionar Receita
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Receita</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="protocol">Protocolo de Fechamento (Opcional)</Label>
            <Input
              id="protocol"
              placeholder="Ex: 2025-01-comp-01"
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
            />
            {protocolData && (
              <Alert className="mt-2">
                <AlertDescription>
                  Protocolo vinculado: {protocolData.total_ids} documentos, 
                  valor total de R$ {protocolData.total_value.toFixed(2)}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">
                Valor (R$) 
                {protocolData && <Lock className="inline ml-1 h-3 w-3" />}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.amount}
                onChange={(e) => !protocolData && setFormData({ ...formData, amount: e.target.value })}
                required
                disabled={!!protocolData}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(revenueCategories).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva a origem da receita..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document_ref">Nº Documento</Label>
              <Input
                id="document_ref"
                placeholder="NF, Recibo, etc."
                value={formData.document_ref}
                onChange={(e) => setFormData({ ...formData, document_ref: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="payment_method">Forma de Pagamento</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="accounting_method">Regime</Label>
            <Select
              value={formData.accounting_method}
              onValueChange={(value) => setFormData({ ...formData, accounting_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accrual">Regime de Competência</SelectItem>
                <SelectItem value="cash">Regime de Caixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Receita'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}