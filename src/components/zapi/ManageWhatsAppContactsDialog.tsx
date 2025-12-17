import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit2, Save, X, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
}

interface ManageWhatsAppContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactsChange?: () => void;
}

export function ManageWhatsAppContactsDialog({
  open,
  onOpenChange,
  onContactsChange,
}: ManageWhatsAppContactsDialogProps) {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({ name: "", phone: "" });

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    // Format: +55 (11) 99999-9999
    if (numbers.length <= 2) return `+${numbers}`;
    if (numbers.length <= 4) return `+${numbers.slice(0, 2)} (${numbers.slice(2)}`;
    if (numbers.length <= 6) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`;
    if (numbers.length <= 11) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9)}`;
    return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
  };

  const cleanPhone = (phone: string) => phone.replace(/\D/g, "");
  
  // Validates phone has country code (55) + DDD (2 digits) + number (8-9 digits) = min 12 digits
  const isValidPhone = (phone: string) => {
    const cleaned = cleanPhone(phone);
    return cleaned.length >= 12 && cleaned.startsWith("55");
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_contacts")
        .select("*")
        .order("name");

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Erro ao carregar contatos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchContacts();
    }
  }, [open]);

  const handleAddContact = async () => {
    const cleanedPhone = cleanPhone(newContact.phone);
    if (!newContact.name.trim() || !isValidPhone(newContact.phone)) {
      toast.error("Preencha nome e telefone válido com código do país (+55)");
      return;
    }

    try {
      const { error } = await supabase.from("whatsapp_contacts").insert({
        name: newContact.name.trim(),
        phone: cleanedPhone,
      });

      if (error) throw error;

      toast.success("Contato adicionado!");
      setNewContact({ name: "", phone: "" });
      fetchContacts();
      onContactsChange?.();
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Erro ao adicionar contato");
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from("whatsapp_contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Contato removido!");
      fetchContacts();
      onContactsChange?.();
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Erro ao remover contato");
    }
  };

  const handleStartEdit = (contact: WhatsAppContact) => {
    setEditingId(contact.id);
    setEditingData({ name: contact.name, phone: contact.phone });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    const cleanedPhone = cleanPhone(editingData.phone);
    if (!editingData.name.trim() || !isValidPhone(editingData.phone)) {
      toast.error("Preencha nome e telefone válido com código do país (+55)");
      return;
    }

    try {
      const { error } = await supabase
        .from("whatsapp_contacts")
        .update({
          name: editingData.name.trim(),
          phone: cleanedPhone,
        })
        .eq("id", editingId);

      if (error) throw error;

      toast.success("Contato atualizado!");
      setEditingId(null);
      fetchContacts();
      onContactsChange?.();
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Erro ao atualizar contato");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({ name: "", phone: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciar Contatos WhatsApp
          </DialogTitle>
          <DialogDescription>
            Cadastre contatos para envio rápido de mensagens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new contact */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <Label className="text-sm font-medium">Novo Contato</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Nome"
                value={newContact.name}
                onChange={(e) =>
                  setNewContact({ ...newContact, name: e.target.value })
                }
              />
              <Input
                placeholder="+55 (11) 99999-9999"
                value={formatPhone(newContact.phone)}
                onChange={(e) =>
                  setNewContact({ ...newContact, phone: e.target.value })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Inclua o código do país (ex: +55 para Brasil)
            </p>
            <Button
              onClick={handleAddContact}
              size="sm"
              className="w-full"
              disabled={!newContact.name || !isValidPhone(newContact.phone)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {/* Contact list */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Contatos Salvos ({contacts.length})
            </Label>
            <ScrollArea className="h-[200px] border rounded-lg">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Carregando...
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nenhum contato cadastrado
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-2 border rounded-md bg-background"
                    >
                      {editingId === contact.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingData.name}
                            onChange={(e) =>
                              setEditingData({
                                ...editingData,
                                name: e.target.value,
                              })
                            }
                            className="h-8"
                          />
                          <Input
                            value={formatPhone(editingData.phone)}
                            onChange={(e) =>
                              setEditingData({
                                ...editingData,
                                phone: e.target.value,
                              })
                            }
                            className="h-8"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={handleSaveEdit}
                          >
                            <Save className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium text-sm">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatPhone(contact.phone)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleStartEdit(contact)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteContact(contact.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
