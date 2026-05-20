# Enriquecer página Financeiro (`/portal/app/financeiro`)

## Objetivo
Transformar a página Financeiro num painel mais completo, incluindo cálculo de custo estimado por documento conforme a regra:

- Documento com **até 3 páginas** → **R$ 70 (valor fixo)**
- Documento com **4 páginas ou mais** → **páginas × R$ 50**

O custo é calculado **por documento (arquivo)**, não pelo total agregado do pedido — assim 2 arquivos de 2 páginas custam R$ 140, e não R$ 70.

## Mudanças

### 1. Consulta de dados
Atualmente a página lê apenas `trial_orders`. Passaremos a buscar também `trial_order_files` (campos `order_id`, `pages`, `characters`) para calcular o custo por documento.

### 2. Função utilitária de preço
Criar `src/portal/lib/pricing.ts` com:
- `priceForDocument(pages)` → 70 se pages ≤ 3, senão pages × 50
- `priceForOrder(files)` → soma de cada documento
- Constantes exportadas (`FLAT_PRICE`, `PAGE_PRICE`, `FLAT_PAGE_LIMIT`) para reuso futuro (ex.: PortalOrderDetail).

### 3. Novos KPIs no topo (grid de 6 cards, responsivo)
- Pedidos no total
- Pedidos concluídos
- Pedidos em andamento (submitted + processing)
- Total de documentos
- Páginas traduzidas (+ caracteres como subtítulo)
- **Valor total estimado** (destaque visual: card com fundo accent)

Cards secundários abaixo:
- Valor já faturado (pedidos `completed`)
- Valor em aberto (pedidos `submitted` + `processing`)
- Ticket médio por pedido
- Preço médio por página

### 4. Tabela Histórico enriquecida
Adicionar colunas:
- Idioma (PT→IT / IT→PT)
- Documentos
- Valor estimado (R$) — por linha
- Status com Badge colorida (mesma convenção de PortalOrders)

Mostrar linha de **totais** no rodapé da tabela.

### 5. Detalhamento por documento (expansível)
Cada linha do histórico ganha um botão "Ver documentos" que abre uma área com lista dos arquivos do pedido: nome, páginas, caracteres, valor calculado. Útil para o cliente entender exatamente como o valor foi formado.

### 6. Aviso de transparência
Substituir o texto "Os valores monetários estarão disponíveis em breve" por um bloco explicando a regra de preço (até 3 páginas: R$ 70 por documento; 4+ páginas: R$ 50/página) e deixando claro que valores são **estimativas** sujeitas a confirmação pela equipe.

## Detalhes técnicos

```text
trial_orders ──1:N── trial_order_files
                       ├ pages
                       └ characters
```

Query única com join embutido do Supabase:
```ts
supabase
  .from("trial_orders")
  .select("id, order_number, status, language_pair, total_documents, total_pages, total_characters, created_at, trial_order_files(pages, characters)")
  .eq("customer_id", customer.id)
  .order("created_at", { ascending: false });
```

Cálculo (memoizado com `useMemo`):
```ts
const orderCost = order.trial_order_files.reduce(
  (sum, f) => sum + (f.pages <= 3 ? 70 : f.pages * 50), 0
);
```

Formatação monetária via `formatCurrency` de `src/lib/currency.ts` (BRL).

## Fora de escopo
- Não há alterações de schema nem de regras de RLS.
- Não há cobrança real / integração de pagamento — apenas exibição de estimativa.
- Outras páginas do portal permanecem inalteradas.
