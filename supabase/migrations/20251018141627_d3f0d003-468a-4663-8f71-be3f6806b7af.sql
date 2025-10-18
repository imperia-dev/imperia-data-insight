-- Create tables for Contas a Pagar and Contas a Receber module

-- Enum for status of Contas a Pagar
CREATE TYPE public.conta_pagar_status AS ENUM ('novo', 'aguardando_pagamento', 'aguardando_nf', 'finalizado');

-- Contas a Pagar table
CREATE TABLE public.contas_a_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo TEXT UNIQUE,
  pedido_ids TEXT[] DEFAULT '{}',
  prestador_id UUID REFERENCES public.profiles(id),
  prestador_nome TEXT NOT NULL,
  prestador_cpf TEXT,
  prestador_cnpj TEXT,
  prestador_funcao TEXT,
  meio_pagamento_digital TEXT,
  meio_pagamento_agencia TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  status public.conta_pagar_status NOT NULL DEFAULT 'novo',
  anexos TEXT[] DEFAULT '{}',
  observacoes TEXT,
  nota_fiscal_url TEXT,
  pago_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Contas a Receber table
CREATE TABLE public.contas_a_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.profiles(id),
  cliente_nome TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  pix TEXT,
  prestacoes JSONB DEFAULT '[]',
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_por_produto JSONB DEFAULT '{}',
  produto_1_vendido INTEGER DEFAULT 0,
  total_ids INTEGER DEFAULT 0,
  total_paginas INTEGER DEFAULT 0,
  media_por_documento NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Variáveis Esporádicas table
CREATE TABLE public.variaveis_esporadicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('pagar', 'receber')),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  arquivo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.contas_a_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_a_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variaveis_esporadicas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Contas a Pagar
CREATE POLICY "Financeiro and owner can view contas a pagar"
ON public.contas_a_pagar
FOR SELECT
USING (
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  get_user_role(auth.uid()) = 'owner'::user_role
);

CREATE POLICY "Financeiro and owner can manage contas a pagar"
ON public.contas_a_pagar
FOR ALL
USING (
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  get_user_role(auth.uid()) = 'owner'::user_role
)
WITH CHECK (
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  get_user_role(auth.uid()) = 'owner'::user_role
);

-- RLS Policies for Contas a Receber
CREATE POLICY "Financeiro and owner can view contas a receber"
ON public.contas_a_receber
FOR SELECT
USING (
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  get_user_role(auth.uid()) = 'owner'::user_role
);

CREATE POLICY "Financeiro and owner can manage contas a receber"
ON public.contas_a_receber
FOR ALL
USING (
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  get_user_role(auth.uid()) = 'owner'::user_role
)
WITH CHECK (
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  get_user_role(auth.uid()) = 'owner'::user_role
);

-- RLS Policies for Variáveis Esporádicas
CREATE POLICY "Financeiro and owner can view variaveis esporadicas"
ON public.variaveis_esporadicas
FOR SELECT
USING (
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  get_user_role(auth.uid()) = 'owner'::user_role
);

CREATE POLICY "Financeiro and owner can manage variaveis esporadicas"
ON public.variaveis_esporadicas
FOR ALL
USING (
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  get_user_role(auth.uid()) = 'owner'::user_role
)
WITH CHECK (
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  get_user_role(auth.uid()) = 'owner'::user_role
);

-- Triggers for updated_at
CREATE TRIGGER update_contas_a_pagar_updated_at
BEFORE UPDATE ON public.contas_a_pagar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contas_a_receber_updated_at
BEFORE UPDATE ON public.contas_a_receber
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_variaveis_esporadicas_updated_at
BEFORE UPDATE ON public.variaveis_esporadicas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_contas_a_pagar_status ON public.contas_a_pagar(status);
CREATE INDEX idx_contas_a_pagar_created_at ON public.contas_a_pagar(created_at DESC);
CREATE INDEX idx_contas_a_receber_cliente ON public.contas_a_receber(cliente_nome);
CREATE INDEX idx_variaveis_esporadicas_tipo ON public.variaveis_esporadicas(tipo);