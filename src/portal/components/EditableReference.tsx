import { useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  orderId: string;
  value: string | null;
  onChange?: (next: string | null) => void;
  className?: string;
  /** Placeholder text shown when no reference is set */
  placeholder?: string;
  /** Read-only display (no edit button) */
  readOnly?: boolean;
}

const MAX = 120;

export function EditableReference({
  orderId,
  value,
  onChange,
  className,
  placeholder = "Adicionar referência…",
  readOnly = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = draft.trim();
    if (trimmed.length > MAX) {
      toast.error(`Máximo ${MAX} caracteres`);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("trial_orders")
      .update({ customer_reference: trimmed || null })
      .eq("id", orderId);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar a referência");
      return;
    }
    onChange?.(trimmed || null);
    setEditing(false);
    toast.success("Referência atualizada");
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          maxLength={MAX}
          placeholder={placeholder}
          className="h-9"
        />
        <Button size="icon" variant="ghost" onClick={save} disabled={saving} title="Salvar">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={cancel} disabled={saving} title="Cancelar">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 group", className)}>
      <span className={cn("truncate", !value && "text-muted-foreground italic")}>
        {value || placeholder}
      </span>
      {!readOnly && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 opacity-60 hover:opacity-100"
          onClick={() => setEditing(true)}
          title="Editar referência"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
