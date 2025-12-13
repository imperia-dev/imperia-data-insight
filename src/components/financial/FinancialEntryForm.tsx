import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeInput } from '@/lib/validations/sanitized';

interface FinancialEntryFormProps {
  onSuccess?: () => void;
}

export function FinancialEntryForm({ onSuccess }: FinancialEntryFormProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'revenue' as 'revenue' | 'expense' | 'tax' | 'deduction',
    category: '',
    subcategory: '',
    description: '',
    amount: '',
    tax_amount: '0',
    is_fixed: false,
    is_variable: false,
    payment_method: '',
    document_ref: '',
    accounting_method: 'accrual' as 'accrual' | 'cash',
  });

  const categories = {
    revenue: ['Vendas', 'Prestação de Serviços', 'Juros Recebidos', 'Outros'],
    expense: ['Fornecedores', 'Salários', 'Aluguel', 'Marketing', 'Administrativo', 'Equipamentos'],
    tax: ['ICMS', 'ISS', 'PIS', 'COFINS', 'IRPJ', 'CSLL'],
    deduction: ['Descontos', 'Devoluções', 'Cancelamentos'],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sanitize text inputs before saving
      const sanitizedDescription = sanitizeInput(formData.description);
      const sanitizedDocumentRef = sanitizeInput(formData.document_ref);
      const sanitizedSubcategory = sanitizeInput(formData.subcategory);

      // For expenses, we save to the expenses table for better integration
      if (formData.type === 'expense') {
        const { error } = await supabase.from('expenses').insert({
          data_competencia: formData.date,
          data_emissao: formData.date,
          tipo_lancamento: 'empresa',
          description: sanitizedDescription,
          amount_original: parseFloat(formData.amount),
          amount_base: parseFloat(formData.amount),
          currency: 'BRL',
          exchange_rate: 1,
          payment_method: formData.payment_method,
          document_ref: sanitizedDocumentRef,
          status: 'lancado',
          fixo_variavel: formData.is_fixed ? 'fixo' : 'variavel',
          created_by: user?.id,
          conta_contabil_id: null,
        });
        
        if (error) throw error;
      } else {
        const { error } = await supabase.from('financial_entries').insert({
          ...formData,
          description: sanitizedDescription,
          subcategory: sanitizedSubcategory,
          amount: parseFloat(formData.amount),
          tax_amount: parseFloat(formData.tax_amount),
          created_by: user?.id,
        });
        
        if (error) throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Lançamento financeiro adicionado com sucesso',
      });

      setOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'revenue',
        category: '',
        subcategory: '',
        description: '',
        amount: '',
        tax_amount: '0',
        is_fixed: false,
        is_variable: false,
        payment_method: '',
        document_ref: '',
        accounting_method: 'accrual',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error adding financial entry:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o lançamento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Lançamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value, category: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="tax">Imposto</SelectItem>
                  <SelectItem value="deduction">Dedução</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories[formData.type].map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subcategory">Subcategoria</Label>
              <Input
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              placeholder="Descreva o lançamento"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="tax_amount">Valor do Imposto</Label>
              <Input
                id="tax_amount"
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_method">Método de Pagamento</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="accounting_method">Regime</Label>
              <Select
                value={formData.accounting_method}
                onValueChange={(value: any) => setFormData({ ...formData, accounting_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accrual">Competência</SelectItem>
                  <SelectItem value="cash">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_fixed"
                checked={formData.is_fixed}
                onChange={(e) => setFormData({ ...formData, is_fixed: e.target.checked, is_variable: false })}
              />
              <Label htmlFor="is_fixed">Despesa Fixa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_variable"
                checked={formData.is_variable}
                onChange={(e) => setFormData({ ...formData, is_variable: e.target.checked, is_fixed: false })}
              />
              <Label htmlFor="is_variable">Despesa Variável</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="document_ref">Referência do Documento</Label>
            <Input
              id="document_ref"
              value={formData.document_ref}
              onChange={(e) => setFormData({ ...formData, document_ref: e.target.value })}
              placeholder="NF, Recibo, etc."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}