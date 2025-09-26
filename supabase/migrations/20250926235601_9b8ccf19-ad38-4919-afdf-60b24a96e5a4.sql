-- Criar função para atualizar status das despesas quando protocolo é aprovado
CREATE OR REPLACE FUNCTION public.update_expenses_on_protocol_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando o protocolo é aprovado, marcar todas as despesas como pagas
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE public.expenses
    SET 
      status = 'pago',
      updated_at = NOW()
    WHERE closing_protocol_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para executar a função quando o status do protocolo muda
DROP TRIGGER IF EXISTS trigger_update_expenses_on_protocol_approval ON public.expense_closing_protocols;
CREATE TRIGGER trigger_update_expenses_on_protocol_approval
AFTER UPDATE OF status ON public.expense_closing_protocols
FOR EACH ROW
EXECUTE FUNCTION public.update_expenses_on_protocol_approval();

-- Atualizar despesas existentes onde o protocolo já está aprovado
UPDATE public.expenses e
SET 
  status = 'pago',
  updated_at = NOW()
FROM public.expense_closing_protocols p
WHERE e.closing_protocol_id = p.id
  AND p.status = 'approved'
  AND e.status != 'pago';