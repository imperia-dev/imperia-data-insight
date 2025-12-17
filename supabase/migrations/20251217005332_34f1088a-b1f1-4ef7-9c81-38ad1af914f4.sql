-- Tabela de templates de checklist (configurada pelo owner)
CREATE TABLE public.review_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de itens/cards do checklist
CREATE TABLE public.review_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.review_checklist_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  option_1_label TEXT NOT NULL DEFAULT 'Verifiquei',
  option_1_description TEXT,
  option_2_label TEXT NOT NULL DEFAULT 'Não verifiquei',
  option_2_description TEXT,
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de respostas do checklist
CREATE TABLE public.review_checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.review_checklist_templates(id),
  item_id UUID NOT NULL REFERENCES public.review_checklist_items(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id TEXT,
  selected_option TEXT NOT NULL CHECK (selected_option IN ('option_1', 'option_2')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, user_id, order_id)
);

-- Índices para performance
CREATE INDEX idx_checklist_items_template ON public.review_checklist_items(template_id);
CREATE INDEX idx_checklist_responses_template ON public.review_checklist_responses(template_id);
CREATE INDEX idx_checklist_responses_user ON public.review_checklist_responses(user_id);
CREATE INDEX idx_checklist_responses_order ON public.review_checklist_responses(order_id);

-- Enable RLS
ALTER TABLE public.review_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_checklist_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_checklist_templates
CREATE POLICY "Owner can manage templates"
ON public.review_checklist_templates FOR ALL
USING (public.get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Authenticated users can view active templates"
ON public.review_checklist_templates FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- RLS Policies for review_checklist_items
CREATE POLICY "Owner can manage items"
ON public.review_checklist_items FOR ALL
USING (public.get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Authenticated users can view items of active templates"
ON public.review_checklist_items FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.review_checklist_templates t
    WHERE t.id = template_id AND t.is_active = true
  )
);

-- RLS Policies for review_checklist_responses
CREATE POLICY "Owner can view all responses"
ON public.review_checklist_responses FOR SELECT
USING (public.get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Users can view own responses"
ON public.review_checklist_responses FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own responses"
ON public.review_checklist_responses FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own responses"
ON public.review_checklist_responses FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_review_checklist_templates_updated_at
BEFORE UPDATE ON public.review_checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_review_checklist_items_updated_at
BEFORE UPDATE ON public.review_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_review_checklist_responses_updated_at
BEFORE UPDATE ON public.review_checklist_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();