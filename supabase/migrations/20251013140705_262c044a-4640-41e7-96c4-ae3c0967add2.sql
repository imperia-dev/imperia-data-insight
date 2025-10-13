-- Adicionar campos de pagamento à tabela expense_closing_protocols
ALTER TABLE public.expense_closing_protocols
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS payment_receipt_url text,
ADD COLUMN IF NOT EXISTS payment_amount numeric;

-- Atualizar a trigger para marcar despesas como pagas quando o protocolo for marcado como pago
CREATE OR REPLACE FUNCTION public.update_expenses_on_protocol_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When protocol is marked as paid, update all expenses to paid status
  IF NEW.paid_at IS NOT NULL AND (OLD.paid_at IS NULL OR OLD.paid_at IS DISTINCT FROM NEW.paid_at) THEN
    UPDATE public.expenses
    SET 
      status = 'pago',
      data_pagamento = NEW.paid_at::date,
      updated_at = NOW()
    WHERE closing_protocol_id = NEW.id
      AND status != 'pago'; -- Only update if not already paid
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger para expense_closing_protocols
DROP TRIGGER IF EXISTS trigger_update_expenses_on_payment ON public.expense_closing_protocols;

CREATE TRIGGER trigger_update_expenses_on_payment
  AFTER UPDATE ON public.expense_closing_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expenses_on_protocol_payment();

-- Comentários para documentação
COMMENT ON COLUMN public.expense_closing_protocols.paid_at IS 'Data e hora em que o protocolo foi marcado como pago';
COMMENT ON COLUMN public.expense_closing_protocols.paid_by IS 'Usuário que marcou o protocolo como pago';
COMMENT ON COLUMN public.expense_closing_protocols.payment_receipt_url IS 'URL do comprovante de pagamento';
COMMENT ON COLUMN public.expense_closing_protocols.payment_amount IS 'Valor efetivamente pago';