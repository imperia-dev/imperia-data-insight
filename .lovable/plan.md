# Correção: usuário do /portal vazando para o sistema interno

## O que aconteceu

O cadastro do portal (`register-trial-customer` edge function) chama `admin.auth.admin.createUser(...)`. Isso dispara o trigger legado `handle_new_user` em `auth.users`, que **sempre** insere automaticamente:

1. `public.profiles` com `role = 'operation'`, `approval_status = 'pending'`
2. `public.user_roles` com `role = 'operation'` ← **causa direta do vazamento**
3. `public.registration_requests` com `status = 'pending'`

Resultado: qualquer pessoa que se cadastra em `/portal/cadastro` recebe automaticamente a role `operation` no sistema interno. Quando ela tenta logar em `/auth`, o `useRoleAccess` lê `user_roles`, encontra `operation`, e libera acesso às rotas internas (Avisos, Produtividade etc.) — exatamente o que aparece no screenshot do Alex Teste Cliente.

A aprovação do `trial_customers` (status `approved`) é independente desse caminho — o estrago já estava feito no momento do signup.

## Correção

### 1. Atualizar o trigger `handle_new_user`

Detectar signups do portal pelo metadata `source = 'trial_portal'` (já enviado pela edge function) e **não criar** `profiles`, `user_roles` nem `registration_requests` nesses casos. Usuários do portal vivem exclusivamente em `trial_customers`.

### 2. Limpar usuários do portal já contaminados

Para todo `auth.users` cuja metadata tenha `source = 'trial_portal'` (ou que exista em `trial_customers`):

- Remover linhas indevidas em `user_roles`
- Remover linhas indevidas em `profiles`
- Remover linhas indevidas em `registration_requests`

Sem tocar em `auth.users` (mantém o login do portal funcionando).

### 3. Defesa em profundidade no `/auth` (frontend)

No `handleSignIn` do `src/pages/Auth.tsx`, após o login bem-sucedido, checar se o usuário tem registro em `trial_customers`. Se tiver e **não** tiver role válida em `user_roles` (após a limpeza), fazer `signOut` imediato com mensagem clara: "Esta conta pertence ao Portal do Cliente. Acesse em /portal/login."

Isso garante que mesmo que algum dia o trigger volte a falhar, o usuário do portal nunca consegue entrar no sistema interno.

## Detalhes técnicos

- Migração SQL: `CREATE OR REPLACE FUNCTION public.handle_new_user()` com guarda `IF NEW.raw_user_meta_data->>'source' = 'trial_portal' THEN RETURN NEW; END IF;` antes dos INSERTs.
- Limpeza: `DELETE FROM user_roles/profiles/registration_requests WHERE user_id IN (SELECT user_id FROM trial_customers)`.
- Frontend: pequena alteração em `Auth.tsx` após o `signInWithPassword` para checar `trial_customers` e abortar a sessão se aplicável.

## Fora de escopo

- Não alterar a tabela `trial_customers` nem o fluxo do portal.
- Não mexer em `auth.users` (não deleta contas).
