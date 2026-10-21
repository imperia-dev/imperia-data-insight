CREATE TABLE public.confidentiality_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version text NOT NULL UNIQUE,
 title text NOT NULL,
 body text NOT NULL,
 body_sha256 text NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.confidentiality_policies TO anon, authenticated;
GRANT ALL ON public.confidentiality_policies TO service_role;
ALTER TABLE public.confidentiality_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published confidentiality policies readable" ON public.confidentiality_policies FOR SELECT TO anon, authenticated USING (published_at <= now());
CREATE FUNCTION public.hash_confidentiality_policy() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.body_sha256 := encode(sha256(convert_to(NEW.body, 'UTF8')), 'hex');
 RETURN NEW;
END; $$;
CREATE TRIGGER hash_confidentiality_policy BEFORE INSERT ON public.confidentiality_policies FOR EACH ROW EXECUTE FUNCTION public.hash_confidentiality_policy();
REVOKE ALL ON FUNCTION public.hash_confidentiality_policy() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.confidentiality_acceptances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 policy_id uuid NOT NULL REFERENCES public.confidentiality_policies(id),
 policy_sha256 text NOT NULL,
 account_email text,
 accepted_at timestamptz NOT NULL DEFAULT now(),
 user_agent text,
 authentication_method jsonb,
 declaration text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, policy_id)
);
GRANT SELECT ON public.confidentiality_acceptances TO authenticated;
GRANT ALL ON public.confidentiality_acceptances TO service_role;
ALTER TABLE public.confidentiality_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own confidentiality evidence or owner" ON public.confidentiality_acceptances FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'owner'::public.user_role);

CREATE FUNCTION public.protect_confidentiality_evidence() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 RAISE EXCEPTION 'Confidentiality policies and acceptance evidence are append-only; publish a new version instead' USING ERRCODE='42501';
END; $$;
CREATE TRIGGER immutable_confidentiality_policies BEFORE UPDATE OR DELETE ON public.confidentiality_policies FOR EACH ROW EXECUTE FUNCTION public.protect_confidentiality_evidence();
CREATE TRIGGER immutable_confidentiality_acceptances BEFORE UPDATE OR DELETE ON public.confidentiality_acceptances FOR EACH ROW EXECUTE FUNCTION public.protect_confidentiality_evidence();

INSERT INTO public.confidentiality_policies(version,title,body) VALUES ('1.0','Compromisso de Confidencialidade e Acesso a Informações',$policy$COMPROMISSO DE CONFIDENCIALIDADE E ACESSO A INFORMAÇÕES — IMPÉRIA
Versão 1.0 · Publicação: 21 de outubro de 2026

1. OBJETO E ABRANGÊNCIA
Este compromisso estabelece as condições de acesso, uso e proteção das informações disponíveis na plataforma da Impéria. Aplica-se a todas as pessoas com conta cadastrada, incluindo colaboradores, prestadores de serviços, tradutores, diagramadores, revisores, gestores e clientes, conforme as atribuições e permissões de cada pessoa. O acesso concedido não representa autorização para divulgar, explorar ou usar informações fora das finalidades autorizadas. Este compromisso complementa os Termos de Serviço, a Política de Privacidade e os contratos aplicáveis, sem substituí-los.

2. INFORMAÇÕES PROTEGIDAS
São confidenciais as informações não públicas acessadas na plataforma ou em razão das atividades realizadas para a Impéria: documentos originais e traduzidos, nomes, contatos, endereços, documentos de identificação, assinaturas, informações familiares, financeiras, bancárias e profissionais, dados de pedidos, credenciais e informações operacionais ou comerciais. Alguns documentos podem conter dados pessoais sensíveis, nos termos da LGPD, como informações de saúde, origem racial ou étnica, convicção religiosa, opinião política, filiação sindical, vida sexual e dados genéticos ou biométricos vinculados a pessoa natural. A ausência de marcação como confidencial não elimina o dever de cuidado. Informações legitimamente públicas, sem divulgação irregular, não são abrangidas pelo sigilo, mas seu tratamento continua sujeito à legislação aplicável.

3. USO RESTRITO E ACESSO MÍNIMO
Comprometo-me a acessar e tratar apenas as informações necessárias às minhas atividades autorizadas ou à utilização legítima dos serviços. Não consultarei dados por curiosidade, benefício pessoal ou interesse de terceiros. Não utilizarei informações para prospecção própria, contato não autorizado com clientes, fraude, discriminação, vantagem indevida ou finalidade incompatível com o serviço. Respeitarei as permissões da minha conta e não tentarei contornar controles de acesso, extrair bases em massa ou acessar contas e informações de outras pessoas sem autorização.

4. PROIBIÇÃO DE DIVULGAÇÃO E CÓPIAS NÃO AUTORIZADAS
Não compartilharei, publicarei, vendererei, cederei ou divulgarei informações protegidas a pessoas não autorizadas, inclusive por aplicativos de mensagens, redes sociais, e-mail pessoal, links públicos ou conversas. Não farei fotografias, capturas de tela, gravações, impressões, downloads ou cópias fora do necessário e expressamente autorizado para a atividade. Quando o trabalho exigir circulação ou download de documentos, utilizarei apenas destinatários, equipamentos, ferramentas e canais autorizados, preservando o sigilo e eliminando cópias de trabalho conforme as orientações aplicáveis. Não enviarei documentos ou dados a ferramentas de inteligência artificial, tradutores públicos, nuvens pessoais ou outros serviços externos não autorizados. O compartilhamento exigido por lei ou ordem válida deve limitar-se ao estritamente necessário; informarei a Impéria previamente quando legalmente permitido.

5. CREDENCIAIS E CUIDADOS DE SEGURANÇA
Minha conta é individual. Não compartilharei senha, sessão, códigos de acesso ou fatores de autenticação, nem utilizarei contas de terceiros. Protegerei dispositivos e arquivos de trabalho, bloquearei a tela ao me afastar, encerrarei sessões em equipamentos compartilhados e seguirei as orientações de segurança recebidas. Comunicarei imediatamente suspeitas de comprometimento da conta. Não alterarei, destruirei ou ocultarei registros, documentos e evidências sem autorização.

6. INCIDENTES E COOPERAÇÃO
Ao identificar ou suspeitar de perda, envio ao destinatário errado, acesso indevido, divulgação, cópia não autorizada ou comprometimento de credenciais, comunicarei imediatamente à gestão responsável da Impéria por canal institucional já utilizado, fornecendo as informações disponíveis para apuração. Interromperei a ação de risco e preservarei evidências, sem ampliar a divulgação dos dados. Cooperarei com as medidas de contenção e investigação. A comunicação aos titulares e às autoridades será avaliada e conduzida pelos responsáveis legais, conforme a legislação; este compromisso não afasta obrigações pessoais legalmente aplicáveis.

7. ENCERRAMENTO DO ACESSO E PERMANÊNCIA DO SIGILO
O dever de confidencialidade continua após o encerramento da conta, do contrato ou da relação com a Impéria, enquanto as informações permanecerem protegidas. Encerrada a necessidade de uso, devolverei ou eliminarei as cópias sob minha guarda conforme as instruções da Impéria e as obrigações legais de retenção. Não manterei documentos para portfólio, treinamento, uso pessoal ou prestação de serviços a terceiros sem autorização válida.

8. RESPONSABILIZAÇÃO E MEDIDAS CABÍVEIS
O descumprimento poderá resultar em suspensão ou revogação de acesso, medidas contratuais e, quando cabíveis, medidas disciplinares, sem prejuízo da apuração de responsabilidade civil, administrativa ou penal prevista na legislação. A reparação de danos e eventual direito de regresso dependerão dos fatos, do nexo causal e dos requisitos legais aplicáveis, com observância dos direitos de defesa. Não há multa automática fixada por este compromisso. Este documento não transfere automaticamente toda responsabilidade ao usuário, não exonera a Impéria de deveres legais próprios e não impede o exercício de direitos dos titulares.

9. REGISTRO DO ACEITE E DADOS DO COMPROVANTE
O aceite será registrado para a conta autenticada, com identificação da conta, versão do compromisso, impressão SHA-256 do texto, data e hora do servidor e informações técnicas disponíveis da autenticação e do navegador. Esses registros destinam-se à governança, segurança e comprovação da manifestação de vontade, com acesso restrito ao próprio titular e ao proprietário da plataforma. Serão conservados pelo período necessário às finalidades e obrigações legais aplicáveis, inclusive exercício regular de direitos. A impressão de integridade não equivale a certificação ICP-Brasil nem garante, isoladamente, autoria ou resultado jurídico. Direitos relativos aos dados do aceite poderão ser exercidos pelos canais institucionais de atendimento e privacidade da Impéria.

10. ATUALIZAÇÕES E ACEITE LIVRE E EXPRESSO
Novas versões relevantes serão apresentadas para novo aceite, preservando o histórico anterior. Posso consultar o texto e guardar uma cópia do compromisso e do comprovante. Se não concordar, devo sair e tratar a questão com a gestão; a plataforma não liberará suas páginas internas sem a confirmação. Ao marcar a confirmação e selecionar “Aceitar e continuar”, declaro que li, compreendi e assumo os deveres de confidencialidade e uso autorizado descritos nesta versão. Este compromisso não constitui consentimento genérico para tratamento de quaisquer dados pessoais nem renúncia a direitos assegurados por lei.

BASE LEGAL E LIMITES
Este compromisso considera os deveres de proteção e responsabilidade previstos na Lei nº 13.709/2018 (LGPD), especialmente arts. 42, 46, 47 e 48, e o regime dos documentos eletrônicos da MP nº 2.200-2/2001, art. 10. Deve ser revisado pelo jurídico da Impéria e adequado aos contratos, às relações de trabalho e às práticas efetivas de tratamento. Seu aceite eletrônico produz registros que podem auxiliar a prova, sem garantir validade jurídica em qualquer circunstância ou isenção de responsabilidade da organização.$policy$);

CREATE FUNCTION public.accept_confidentiality_policy(p_policy_id uuid, p_policy_sha256 text, p_confirmed boolean, p_user_agent text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_policy public.confidentiality_policies%ROWTYPE; v_receipt public.confidentiality_acceptances%ROWTYPE;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF p_confirmed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Explicit confirmation required' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_policy FROM public.confidentiality_policies WHERE published_at <= now() ORDER BY published_at DESC, created_at DESC, version DESC LIMIT 1;
 IF v_policy.id IS NULL OR p_policy_id IS DISTINCT FROM v_policy.id OR p_policy_sha256 IS DISTINCT FROM v_policy.body_sha256 THEN RAISE EXCEPTION 'Policy changed; reload and read the current version' USING ERRCODE='22023'; END IF;
 INSERT INTO public.confidentiality_acceptances(user_id,policy_id,policy_sha256,account_email,user_agent,authentication_method,declaration)
 VALUES(v_user,v_policy.id,v_policy.body_sha256,auth.jwt()->>'email',left(regexp_replace(regexp_replace(coalesce(p_user_agent,''),'<[^>]*>','','g'),'[[:cntrl:]]','','g'),500),auth.jwt()->'amr','Li, compreendi e assumo os deveres de confidencialidade e uso autorizado descritos nesta versão.')
 ON CONFLICT(user_id,policy_id) DO NOTHING;
 SELECT * INTO v_receipt FROM public.confidentiality_acceptances WHERE user_id=v_user AND policy_id=v_policy.id;
 RETURN to_jsonb(v_receipt);
END; $$;
REVOKE ALL ON FUNCTION public.accept_confidentiality_policy(uuid,text,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_confidentiality_policy(uuid,text,boolean,text) TO authenticated;
REVOKE ALL ON FUNCTION public.protect_confidentiality_evidence() FROM PUBLIC, anon, authenticated;