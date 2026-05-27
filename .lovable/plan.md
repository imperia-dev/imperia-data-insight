
# Trial com dois caminhos (10×3 ou 1×30)

Hoje o trial bloqueia em **10 documentos com no máximo 3 páginas cada**. Vou ampliar para aceitar automaticamente qualquer um dos dois cenários, sem o cliente precisar escolher:

- **Caminho A:** até **10 documentos**, cada um com no máximo **3 páginas**
- **Caminho B:** **1 único documento** com até **30 páginas**

O sistema aceita o que vier primeiro e bloqueia quando o teto for atingido.

## Regra unificada

Para suportar os dois caminhos com uma única lógica:

- Teto global: **30 páginas no total** e **10 documentos no total** (o que ocorrer primeiro).
- Limite de páginas por documento é **condicional**:
  - Se for o **único documento** do trial → pode ter até **30 páginas**.
  - Se houver/passar a haver **mais de um documento** → cada documento precisa ter no máximo **3 páginas**.

Isso cobre exatamente os dois caminhos pedidos sem forçar o cliente a escolher modo no cadastro.

## Mudanças no banco

Novos campos em `trial_customers` (mantém compatibilidade com clientes existentes):

- `trial_pages_limit int default 30` — teto total de páginas
- `trial_single_doc_pages_limit int default 30` — limite quando é o único doc
- (mantém) `trial_doc_limit int default 10`
- (mantém) `trial_pages_per_doc_limit int default 3` — limite quando há múltiplos docs

Atualizar a função `get_trial_usage(p_customer_id uuid)` para retornar:

```json
{
  "customer_id": "…",
  "docs_used": 0,
  "docs_limit": 10,
  "pages_used": 0,
  "pages_limit": 30,
  "pages_per_doc_limit": 3,
  "single_doc_pages_limit": 30,
  "remaining_docs": 10,
  "remaining_pages": 30,
  "blocked": false
}
```

`blocked = docs_used >= docs_limit OR pages_used >= pages_limit`.
Contagem continua considerando apenas pedidos `status NOT IN ('draft','cancelled')` e arquivos `kind = 'source'`.

## Edge function `submit-trial-order`

Trocar a validação atual por:

1. Calcular `docs_used` e `pages_used` já enviados (excluindo o rascunho atual).
2. `docs_after = docs_used + sourceFiles.length`
3. `pages_after = pages_used + sum(sourceFiles.pages)`
4. Bloquear se `docs_after > 10` (`trial_doc_limit_exceeded`).
5. Bloquear se `pages_after > 30` (`trial_total_pages_exceeded`, mensagem nova).
6. Validar por documento:
   - Se `docs_after == 1` → cada arquivo pode ter até `single_doc_pages_limit` (30).
   - Se `docs_after >= 2` → cada arquivo precisa ter `pages <= pages_per_doc_limit` (3). Mensagem explica que o limite de 30 páginas vale **somente** quando o pedido tem um único documento no trial inteiro.

## Frontend

### Hook `useTrialUsage`
Estender o tipo `TrialUsage` com `pages_used`, `pages_limit`, `single_doc_pages_limit`, `remaining_pages`.

### Chip no header (`TrialUsageChip`)
Mostrar os dois saldos lado a lado:

```text
[icon] 0/10 docs · 0/30 págs
```

Cor:
- verde: ambos < 80%
- âmbar: qualquer um ≥ 80%
- vermelho/`Limite`: `blocked = true`

Popover explica os dois caminhos em linguagem natural:
> No trial você pode enviar **até 10 documentos de 3 páginas** ou **1 único documento de até 30 páginas**. Quando atingir 10 documentos ou 30 páginas no total, novos pedidos ficam bloqueados.

E mostra dois mini-progressos (docs e páginas) + CTA "Falar com a equipe".

### Card no dashboard (`PortalDashboard`)
Trocar o card "Uso do período trial" para exibir as duas barras (documentos e páginas) e o texto explicativo dos dois caminhos.

### Tela de novo pedido (`/portal/app/novo`)
- Se `blocked`, mantém a tela bloqueante atual com mensagem nova ("você atingiu o limite do período trial").
- Durante upload:
  - Se `docs_after` (incluindo arquivos do rascunho) for **1**, permite até 30 páginas por arquivo.
  - Se `docs_after` for **≥ 2**, qualquer arquivo > 3 páginas é marcado como "Acima do limite (3 págs por documento quando há mais de um)" e impede avançar.
  - Bloqueia novos uploads quando `docs_after > 10` ou `pages_after > 30`, com toast explicando qual teto foi atingido.

### Painel do owner (`Settings`, `/portal-orders`)
- Mostrar `docs_used/10` e `pages_used/30` por cliente.
- Permitir editar `trial_doc_limit`, `trial_pages_limit`, `trial_pages_per_doc_limit`, `trial_single_doc_pages_limit` por cliente.

## Fora do escopo
- Não muda preço, cobrança ou processo de aprovação.
- Não migra cliente nenhum para outro plano; só ajusta o cálculo de limite.

## Perguntas de validação (responda só se quiser ajustar)
1. Se o cliente já enviou 1 documento de 5 páginas, o próximo envio precisa respeitar 3 págs/doc (porque agora terá ≥ 2 docs no trial). Confirma essa leitura?
2. O teto total é mesmo **30 páginas** (= 10×3)? Se preferir um teto maior (ex.: 30 págs só para o caso B e até 30 págs no caso A também, sem somar entre caminhos), me diga e eu reescrevo a regra.
