import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Calculator, TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface UnitEconomicsData {
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  paybackMonths: number;
  arpu: number;
  churnRate: number;
  avgTicket: number;
  purchaseFrequency: number;
  retentionMonths: number;
  customerCount: number;
  newCustomers: number;
  marketingSpend: number;
  salesSpend: number;
  contributionMargin: number;
}

export function UnitEconomics() {
  const [data, setData] = useState<UnitEconomicsData>({
    cac: 150,
    ltv: 1200,
    ltvCacRatio: 8,
    paybackMonths: 3,
    arpu: 100,
    churnRate: 5,
    avgTicket: 250,
    purchaseFrequency: 2.5,
    retentionMonths: 12,
    customerCount: 500,
    newCustomers: 50,
    marketingSpend: 5000,
    salesSpend: 2500,
    contributionMargin: 40,
  });

  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchUnitEconomicsData();
  }, []);

  const fetchUnitEconomicsData = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const { data: ueData, error } = await supabase
        .from('unit_economics')
        .select('*')
        .eq('month', currentMonth)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (ueData) {
        const cac = Number(ueData.cac) || 0;
        const ltv = Number(ueData.ltv) || 0;
        
        setData({
          cac,
          ltv,
          ltvCacRatio: cac > 0 ? ltv / cac : 0,
          paybackMonths: cac > 0 && ueData.arpu ? cac / Number(ueData.arpu) : 0,
          arpu: Number(ueData.arpu) || 0,
          churnRate: Number(ueData.churn_rate) || 0,
          avgTicket: Number(ueData.avg_ticket) || 0,
          purchaseFrequency: Number(ueData.purchase_frequency) || 0,
          retentionMonths: Number(ueData.retention_months) || 0,
          customerCount: Number(ueData.customer_count) || 0,
          newCustomers: Number(ueData.new_customers) || 0,
          marketingSpend: Number(ueData.marketing_spend) || 0,
          salesSpend: Number(ueData.sales_spend) || 0,
          contributionMargin: 40, // Calculate from other data
        });
      }
    } catch (error) {
      console.error('Error fetching unit economics:', error);
    }
  };

  const calculateMetrics = () => {
    const totalAcquisitionSpend = data.marketingSpend + data.salesSpend;
    const newCac = data.newCustomers > 0 ? totalAcquisitionSpend / data.newCustomers : 0;
    const newLtv = data.avgTicket * data.purchaseFrequency * data.retentionMonths;
    const ratio = newCac > 0 ? newLtv / newCac : 0;
    const payback = data.arpu > 0 ? newCac / data.arpu : 0;

    setData(prev => ({
      ...prev,
      cac: newCac,
      ltv: newLtv,
      ltvCacRatio: ratio,
      paybackMonths: payback,
    }));
  };

  const saveData = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      
      const { error } = await supabase
        .from('unit_economics')
        .upsert({
          month: currentMonth,
          cac: data.cac,
          ltv: data.ltv,
          arpu: data.arpu,
          churn_rate: data.churnRate,
          customer_count: data.customerCount,
          new_customers: data.newCustomers,
          marketing_spend: data.marketingSpend,
          sales_spend: data.salesSpend,
          avg_ticket: data.avgTicket,
          purchase_frequency: data.purchaseFrequency,
          retention_months: data.retentionMonths,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Unit Economics atualizado com sucesso',
      });
      setEditMode(false);
    } catch (error) {
      console.error('Error saving unit economics:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar os dados',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const pieData = [
    { name: 'CAC', value: data.cac, color: 'hsl(var(--destructive))' },
    { name: 'LTV', value: data.ltv, color: 'hsl(var(--primary))' },
  ];

  const barData = [
    { name: 'Mês 1', value: data.arpu },
    { name: 'Mês 2', value: data.arpu * 0.95 },
    { name: 'Mês 3', value: data.arpu * 0.9 },
    { name: 'Mês 4', value: data.arpu * 0.85 },
    { name: 'Mês 5', value: data.arpu * 0.8 },
    { name: 'Mês 6', value: data.arpu * 0.75 },
  ];

  const getHealthColor = (ratio: number) => {
    if (ratio >= 3) return 'text-green-600';
    if (ratio >= 1) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              CAC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.cac)}</div>
            <p className="text-xs text-muted-foreground">Custo de Aquisição</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              LTV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.ltv)}</div>
            <p className="text-xs text-muted-foreground">Lifetime Value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              LTV/CAC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(data.ltvCacRatio)}`}>
              {data.ltvCacRatio.toFixed(1)}x
            </div>
            <p className="text-xs text-muted-foreground">Ratio (Meta: ≥3x)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Payback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.paybackMonths.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Meses</p>
          </CardContent>
        </Card>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Parâmetros Unit Economics</CardTitle>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={saveData}>Salvar</Button>
                </>
              ) : (
                <Button onClick={() => setEditMode(true)}>Editar</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="avgTicket">Ticket Médio</Label>
              <Input
                id="avgTicket"
                type="number"
                value={data.avgTicket}
                onChange={(e) => setData(prev => ({ ...prev, avgTicket: Number(e.target.value) }))}
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="purchaseFrequency">Frequência de Compra</Label>
              <Input
                id="purchaseFrequency"
                type="number"
                step="0.1"
                value={data.purchaseFrequency}
                onChange={(e) => setData(prev => ({ ...prev, purchaseFrequency: Number(e.target.value) }))}
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="retentionMonths">Retenção (meses)</Label>
              <Input
                id="retentionMonths"
                type="number"
                value={data.retentionMonths}
                onChange={(e) => setData(prev => ({ ...prev, retentionMonths: Number(e.target.value) }))}
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="marketingSpend">Investimento Marketing</Label>
              <Input
                id="marketingSpend"
                type="number"
                value={data.marketingSpend}
                onChange={(e) => setData(prev => ({ ...prev, marketingSpend: Number(e.target.value) }))}
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="salesSpend">Investimento Vendas</Label>
              <Input
                id="salesSpend"
                type="number"
                value={data.salesSpend}
                onChange={(e) => setData(prev => ({ ...prev, salesSpend: Number(e.target.value) }))}
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="newCustomers">Novos Clientes</Label>
              <Input
                id="newCustomers"
                type="number"
                value={data.newCustomers}
                onChange={(e) => setData(prev => ({ ...prev, newCustomers: Number(e.target.value) }))}
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="churnRate">Taxa de Churn (%)</Label>
              <Input
                id="churnRate"
                type="number"
                step="0.1"
                value={data.churnRate}
                onChange={(e) => setData(prev => ({ ...prev, churnRate: Number(e.target.value) }))}
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="arpu">ARPU</Label>
              <Input
                id="arpu"
                type="number"
                value={data.arpu}
                onChange={(e) => setData(prev => ({ ...prev, arpu: Number(e.target.value) }))}
                disabled={!editMode}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={calculateMetrics} disabled={!editMode} className="w-full">
                <Calculator className="h-4 w-4 mr-2" />
                Recalcular Métricas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>LTV vs CAC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução ARPU</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Escalabilidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 rounded-lg bg-muted">
              <span className="font-medium">Margem de Contribuição</span>
              <span className="text-2xl font-bold">{data.contributionMargin}%</span>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2">Capacidade de Escala</h4>
                <p className="text-sm text-muted-foreground">
                  {data.contributionMargin > 30 
                    ? 'Alta capacidade de escala. Margem permite crescimento sustentável.'
                    : 'Baixa capacidade de escala. Necessário melhorar margem antes de expandir.'}
                </p>
              </div>
              
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2">Saúde do Negócio</h4>
                <p className="text-sm text-muted-foreground">
                  {data.ltvCacRatio >= 3
                    ? 'Negócio saudável. Continue investindo em aquisição.'
                    : 'Atenção: LTV/CAC abaixo do ideal. Foque em retenção e aumento de ticket.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}