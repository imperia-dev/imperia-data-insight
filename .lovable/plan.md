# Auditoria completa pelo checklist de segurança enviado

Objetivo: passar item por item do checklist, provar cada um com uma checagem real (banco, código, funções) e corrigir o que falhar. No fim, um relatório "OK / corrigido / depende de você".

## O que não se aplica (e por quê)
- Flask, "gem JWT", segredos JWT separados, refresh token rotativo de uso único: o login já é do Supabase Auth, que faz isso nativamente (refresh token rotativo e revogado no logout). Vamos apenas **confirmar** que logout revoga a sessão no servidor (escopo global) e que voltar no navegador não reabre.
- CAPTCHA, confirmação de e-mail, rate limit nativo, senha vazada, redirect URLs, MFA no painel: ficam no painel do Supabase (bloqueado pelo 2FA). Listo exatamente o que ligar.

## Etapas
1. **Banco (RLS e policies)** — listar todas as tabelas: RLS ativa, nenhuma `using (true)` em dado de usuário, policies separadas para SELECT/INSERT/UPDATE/DELETE, UPDATE com `with check` que impede trocar `user_id`/papel, filtro sempre por `auth.uid()`. Rodar linter e scan e zerar críticos.
2. **Funções e views** — toda função security definer com `search_path` fixo e checagem de quem chama; views sensíveis com `security_invoker`; RPCs públicas validando ator.
3. **IDOR / mass assignment / corrida** — revisar updates feitos pelo navegador (pedidos, protocolos, pendências, prestadores) e mover regras de negócio críticas (pegar pedido, limites de demanda, aprovação) para operações atômicas no banco com trava de linha.
4. **Tamanho de entradas** — limites no banco (`check` de tamanho) nos campos de texto livres e URLs, além do limite que já existe nos formulários.
5. **Imagens e URLs (os dois casos do arquivo)** — aceitar só arquivos do próprio armazenamento (caminho interno, não URL livre), tamanho máximo de URL, bloqueio de `javascript:`/`data:` maliciosos; imagens em texto rico sanitizadas para não virarem rastreador.
6. **Uploads e storage** — buckets privados, policies por dono, links assinados com expiração curta, tipo e tamanho validados no servidor.
7. **Funções de servidor** — JWT obrigatório (exceto webhooks com segredo), autorização por registro, validação de payload, CORS restrito aos domínios da Imperia, erros sem detalhes internos, rate limit por usuário nas funções de IA.
8. **Navegador** — nenhuma chave secreta no código publicado, sem `select('*')` em tabelas sensíveis, sem HTML de usuário sem sanitizar, source maps desligados em produção, `bun audit` sem críticos.
9. **Testes de ataque automatizados** — testes que tentam: ler dados de outra conta (duas contas), trocar o próprio papel, enviar campos extras, textos gigantes, URL externa de imagem, chamar RPC sem login. Mantidos no projeto.
10. **Relatório** — atualizar `docs/SECURITY_IMPLEMENTATION.md` com o resultado de cada item.

## Depende de você (painel Supabase / externos)
Proteção de senha vazada, confirmação de e-mail, CAPTCHA, rate limits de Auth, redirect URLs restritas, limite de gasto nas APIs pagas (OpenAI, ElevenLabs, Higgsfield), projeto Lovable privado.

## Detalhes técnicos
- Migrações com `check (char_length(...) <= N)` e triggers que bloqueiam mudança de colunas protegidas.
- RPC atômica `claim_order` com `select ... for update`.
- Validação de imagem: aceitar apenas `storage path` do bucket do projeto, URL ≤ 2048, protocolo https.
- Autenticados continuam não verificáveis por aqui (Supabase externo sem sessão); testes de duas contas rodam via chamadas REST com contas de teste se você permitir criar.
