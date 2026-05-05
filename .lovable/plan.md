
## Diagnóstico — por que duplicou

Investigando o fluxo, encontrei dois problemas que se combinam:

**1. Frontend dispara N invocações em paralelo**
Em `GenerateProtocolsCard.tsx` (`generateProtocols`), quando o usuário seleciona vários prestadores no preview, o código faz:
```ts
Promise.all(Array.from(selectedProviders).map(async (providerId) => {
  await supabase.functions.invoke('generate-provider-protocols', {
    body: { competence, preview: false, provider_id: providerId }
  });
}));
```
Ou seja, dispara uma chamada por prestador selecionado, em paralelo.

**2. A edge function ignora `provider_id`**
A função `generate-provider-protocols/index.ts` **não lê o parâmetro `provider_id`**. Cada invocação processa **todos** os prestadores da competência. A checagem de duplicidade (`SELECT ... .single()`) ocorre antes do INSERT, mas como as N invocações rodam em paralelo, há corrida: ambas leem "não existe" e ambas inserem.

**Evidência no banco** (competência abr/2026):
- `001-ANA` e `002-ANA` → mesma Ana, mesmo total, criados com 230ms de diferença
- `003-HEL` e `004-HEL` → mesma Hellem
- `005-MAT` e `006-MAT` → mesmo Matheus
- `007-MAR` e `008-ALI` → únicos (a corrida só pegou os 3 primeiros antes do `existing` começar a achar)

Os pedidos (`orders.service_provider_protocol_id`) acabaram apontando para o protocolo de número **maior** (último UPDATE vence), então o protocolo "bom" a manter é o de número maior — ou alternativamente, religar para o menor. Vou manter o **menor** (001, 003, 005) por convenção de ordem e religar os pedidos.

---

## Plano de correção

### 1. Edge function `generate-provider-protocols`
- Ler `provider_id` do body. Se presente, filtrar `orders` por `assigned_to = provider_id`, garantindo que cada invocação processa só aquele prestador.
- Trocar a checagem `.single()` por `.maybeSingle()` (evita erro quando 0 linhas).
- Após o `RPC generate_protocol_number`, fazer o INSERT dentro de um bloco que tolere violação de unicidade (ver passo 2): se UNIQUE violation, recarregar o existente e pular.

### 2. Migração: índice único anti-corrida
Criar índice único parcial em `service_provider_protocols` para tornar impossível duplicar mesmo sob corrida:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_protocol_per_month
  ON public.service_provider_protocols (supplier_id, competence_month)
  WHERE status <> 'cancelled';
```
(Permite recriar após cancelamento, mas bloqueia duplicados ativos.)

### 3. Frontend `GenerateProtocolsCard.generateProtocols`
- Trocar o `Promise.all` por loop **sequencial** (`for...of`) para serializar as chamadas e evitar bursts paralelos.
- Continuar passando `provider_id` (já passa) — agora a edge function vai respeitar.

### 4. Limpeza dos duplicados existentes (abr/2026)
Migração de dados que, para cada par duplicado, mantém o protocolo de **menor** numeração e:
- Religa todos os `orders.service_provider_protocol_id` do duplicado para o protocolo mantido.
- Deleta o duplicado.

Pares identificados (todos `status='draft'`, competência 2026-04-01):
```text
manter 001-ANA (de1b8cd2…)  →  deletar 002-ANA (695663f8…)
manter 003-HEL (567d4d27…)  →  deletar 004-HEL (bd05cc07…)
manter 005-MAT (d47785aa…)  →  deletar 006-MAT (2e8767ad…)
```
Após isso, a listagem mostrará 5 protocolos (001-ANA, 003-HEL, 005-MAT, 007-MAR, 008-ALI). A numeração 002/004/006 ficará "pulada" — isso é inerente ao `generate_protocol_number` (números são consumidos no momento da geração e não reaproveitam). Se preferir renumerar para 001/002/003/004/005, me avise — exige uma renumeração manual extra.

---

## Arquivos afetados
- `supabase/functions/generate-provider-protocols/index.ts` — honrar `provider_id`, `maybeSingle`, tolerar UNIQUE violation
- `src/components/fechamentoPrestadores/GenerateProtocolsCard.tsx` — serializar chamadas
- Migração SQL — índice único + limpeza dos 3 duplicados de abr/2026 (religando orders)
