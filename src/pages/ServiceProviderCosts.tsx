import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ServiceProviderCost {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  cnpj: string | null;
  phone: string | null;
  days_worked: number | null;
  amount: number;
  pix_key: string | null;
  type: 'CLT' | 'Freelance';
  invoice_number: string | null;
  competence: string;
  status: 'Pago' | 'Não Pago' | 'Pendente';
  created_at: string;
  updated_at: string;
}

export default function ServiceProviderCosts() {
  const [costs, setCosts] = useState<ServiceProviderCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<ServiceProviderCost | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    cnpj: "",
    phone: "",
    days_worked: "",
    amount: "",
    pix_key: "",
    type: "Freelance" as 'CLT' | 'Freelance',
    invoice_number: "",
    competence: new Date().toISOString().slice(0, 7),
    status: "Não Pago" as 'Pago' | 'Não Pago' | 'Pendente',
  });

  useEffect(() => {
    fetchCosts();
  }, []);

  const fetchCosts = async () => {
    try {
      const { data, error } = await supabase
        .from('service_provider_costs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCosts((data || []) as ServiceProviderCost[]);
    } catch (error) {
      console.error('Error fetching service provider costs:', error);
      toast.error("Erro ao carregar custos de prestadores");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const costData = {
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf || null,
        cnpj: formData.cnpj || null,
        phone: formData.phone || null,
        days_worked: formData.days_worked ? parseInt(formData.days_worked) : null,
        amount: parseFloat(formData.amount),
        pix_key: formData.pix_key || null,
        type: formData.type,
        invoice_number: formData.invoice_number || null,
        competence: formData.competence,
        status: formData.status,
      };

      if (editingCost) {
        const { error } = await supabase
          .from('service_provider_costs')
          .update(costData)
          .eq('id', editingCost.id);

        if (error) throw error;
        toast.success("Prestador atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from('service_provider_costs')
          .insert([costData]);

        if (error) throw error;
        toast.success("Prestador adicionado com sucesso");
      }

      setIsDialogOpen(false);
      setEditingCost(null);
      setFormData({
        name: "",
        email: "",
        cpf: "",
        cnpj: "",
        phone: "",
        days_worked: "",
        amount: "",
        pix_key: "",
        type: "Freelance",
        invoice_number: "",
        competence: new Date().toISOString().slice(0, 7),
        status: "Não Pago",
      });
      fetchCosts();
    } catch (error) {
      console.error('Error saving service provider cost:', error);
      toast.error("Erro ao salvar prestador");
    }
  };

  const handleEdit = (cost: ServiceProviderCost) => {
    setEditingCost(cost);
    setFormData({
      name: cost.name,
      email: cost.email,
      cpf: cost.cpf || "",
      cnpj: cost.cnpj || "",
      phone: cost.phone || "",
      days_worked: cost.days_worked?.toString() || "",
      amount: cost.amount.toString(),
      pix_key: cost.pix_key || "",
      type: cost.type,
      invoice_number: cost.invoice_number || "",
      competence: cost.competence,
      status: cost.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este prestador?")) return;

    try {
      const { error } = await supabase
        .from('service_provider_costs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Prestador excluído com sucesso");
      fetchCosts();
    } catch (error) {
      console.error('Error deleting service provider cost:', error);
      toast.error("Erro ao excluir prestador");
    }
  };

  const totalAmount = costs.reduce((sum, cost) => sum + cost.amount, 0);
  const totalPaid = costs.filter(c => c.status === 'Pago').reduce((sum, cost) => sum + cost.amount, 0);
  const totalPending = costs.filter(c => c.status !== 'Pago').reduce((sum, cost) => sum + cost.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'Pendente':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'Não Pago':
        return <Badge variant="destructive">Não Pago</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Custos - Prestadores de Serviço</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingCost(null);
                setFormData({
                  name: "",
                  email: "",
                  cpf: "",
                  cnpj: "",
                  phone: "",
                  days_worked: "",
                  amount: "",
                  pix_key: "",
                  type: "Freelance",
                  invoice_number: "",
                  competence: new Date().toISOString().slice(0, 7),
                  status: "Não Pago",
                });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Prestador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCost ? "Editar Prestador" : "Adicionar Prestador"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'CLT' | 'Freelance') => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="Freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="days_worked">Dias Trabalhados</Label>
                    <Input
                      id="days_worked"
                      type="number"
                      value={formData.days_worked}
                      onChange={(e) => setFormData({ ...formData, days_worked: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="pix_key">Chave PIX</Label>
                  <Input
                    id="pix_key"
                    value={formData.pix_key}
                    onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                    placeholder="Chave PIX"
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_number">Número NF</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="Número da nota fiscal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="competence">Competência</Label>
                    <Input
                      id="competence"
                      type="month"
                      value={formData.competence}
                      onChange={(e) => setFormData({ ...formData, competence: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'Pago' | 'Não Pago' | 'Pendente') => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Não Pago">Não Pago</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={!formData.name || !formData.email || !formData.amount || !formData.competence}
                >
                  {editingCost ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-primary">R$ {totalAmount.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-2xl font-bold text-green-600">R$ {totalPaid.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Pendente</p>
                <p className="text-2xl font-bold text-yellow-600">R$ {totalPending.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Chave PIX</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="font-medium">{cost.name}</TableCell>
                    <TableCell>{cost.email}</TableCell>
                    <TableCell>{cost.cpf || cost.cnpj || '-'}</TableCell>
                    <TableCell>{cost.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={cost.type === 'CLT' ? 'default' : 'secondary'}>
                        {cost.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{cost.days_worked || '-'}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{cost.pix_key || '-'}</TableCell>
                    <TableCell>{cost.invoice_number || '-'}</TableCell>
                    <TableCell>{cost.competence}</TableCell>
                    <TableCell>{getStatusBadge(cost.status)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {cost.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(cost)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(cost.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}