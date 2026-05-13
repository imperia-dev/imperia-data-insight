import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTrialCustomer } from "../TrialPortalGuard";
import { sanitizeInput } from "@/lib/validations/sanitized";

type Contact = {
  id: string;
  customer_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
  created_at: string;
};

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  document: string;
  notes: string;
};

const empty: FormState = { full_name: "", email: "", phone: "", document: "", notes: "" };

export default function PortalClients() {
  const { customer } = useTrialCustomer();
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!customer) return;
    const { data } = await supabase
      .from("trial_customer_contacts")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as Contact[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({
      full_name: c.full_name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      document: c.document ?? "",
      notes: c.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!customer) return;
    const name = sanitizeInput(form.full_name).trim();
    if (!name) {
      toast.error("Informe o nome completo");
      return;
    }
    setSaving(true);
    const payload = {
      customer_id: customer.id,
      full_name: name,
      email: sanitizeInput(form.email).trim() || null,
      phone: sanitizeInput(form.phone).trim() || null,
      document: sanitizeInput(form.document).trim() || null,
      notes: sanitizeInput(form.notes).trim() || null,
    };
    const { error } = editing
      ? await supabase.from("trial_customer_contacts").update(payload).eq("id", editing.id)
      : await supabase.from("trial_customer_contacts").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success(editing ? "Cliente atualizado" : "Cliente cadastrado");
    setOpen(false);
    load();
  };

  const remove = async (c: Contact) => {
    if (!confirm(`Remover ${c.full_name}?`)) return;
    const { error } = await supabase.from("trial_customer_contacts").delete().eq("id", c.id);
    if (error) {
      toast.error("Erro ao remover", { description: error.message });
      return;
    }
    toast.success("Cliente removido");
    load();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Cadastro manual dos seus clientes.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo cliente</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Lista de clientes</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nenhum cliente cadastrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Nome</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Telefone</th>
                    <th className="py-2 pr-4">Documento</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 pr-4 font-medium">{c.full_name}</td>
                      <td className="py-3 pr-4">{c.email || "—"}</td>
                      <td className="py-3 pr-4">{c.phone || "—"}</td>
                      <td className="py-3 pr-4">{c.document || "—"}</td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome completo *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={120} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={150} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
              </div>
            </div>
            <div>
              <Label>Documento (CPF/CNPJ)</Label>
              <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} maxLength={30} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} maxLength={1000} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
