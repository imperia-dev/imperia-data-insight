
# Plano de Correção: Controle de Demanda

## Diagnóstico do Problema

Após análise detalhada do código, identifiquei que a funcionalidade de **Controle de Demanda** está parcialmente implementada:

| Recurso | Status | Localização |
|---------|--------|-------------|
| Interface de Gestão | ✅ Funcionando | `DemandControl.tsx` |
| Limite Simultâneo | ✅ Funcionando | `MyOrders.tsx` linhas 159-165 |
| Limite Diário | ❌ **NÃO IMPLEMENTADO** | Deveria estar em `MyOrders.tsx` e `Orders.tsx` |

### Causa Raiz
O **limite diário** (`daily_limit`) é salvo no banco de dados e exibido na interface, mas **nunca é verificado** quando um usuário tenta pegar um pedido. Apenas o limite simultâneo (`concurrent_order_limit`) está sendo validado.

### Evidência
- A query no `MyOrders.tsx` (linha 97) busca apenas `concurrent_order_limit`
- Não existe nenhuma query para contar documentos atribuídos hoje
- Não há validação do limite diário no `takeOrderMutation`

---

## Solução Proposta

### 1. Atualizar Query de Limites
Modificar a busca para incluir também o `daily_limit`:
```typescript
.select("concurrent_order_limit, daily_limit")
```

### 2. Criar Query para Contar Documentos do Dia
Adicionar nova query que conta o total de documentos atribuídos ao usuário hoje:
```typescript
// Contar documentos atribuídos hoje
const { data: todayStats } = useQuery({
  queryKey: ["today-document-count", user?.id],
  queryFn: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from("orders")
      .select("document_count")
      .eq("assigned_to", user?.id)
      .gte("assigned_at", today.toISOString());
    
    if (error) throw error;
    return data?.reduce((sum, o) => sum + o.document_count, 0) || 0;
  }
});
```

### 3. Adicionar Validação no Take Order
No `takeOrderMutation`, antes de atribuir o pedido:
```typescript
// Verificar limite diário de documentos
const documentsToday = todayStats || 0;
const orderDocCount = order.document_count || 1;
const dailyLimit = userLimit?.daily_limit || 10;

if (documentsToday + orderDocCount > dailyLimit) {
  throw new Error(
    `Você já processou ${documentsToday} documento(s) hoje. ` +
    `Este pedido tem ${orderDocCount} documento(s) e ultrapassaria ` +
    `seu limite diário de ${dailyLimit}.`
  );
}
```

### 4. Melhorar Feedback Visual
Adicionar indicador do limite diário na UI do `MyOrders.tsx`:
```text
┌────────────────────────────────────┐
│  Documentos Hoje: 12/60            │
│  Pedidos em Andamento: 1/2         │
└────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/MyOrders.tsx` | Adicionar query de contagem diária, validação no mutation, indicador visual |
| `src/pages/Orders.tsx` | Adicionar mesma validação (para admins que pegam pedidos) |

---

## Detalhes Técnicos

### Lógica de Contagem
- **Limite Diário**: Soma de `document_count` de todos os pedidos onde `assigned_to = user_id` e `assigned_at >= hoje 00:00`
- **Limite Simultâneo**: Contagem de pedidos onde `status_order = 'in_progress'` e `assigned_to = user_id`

### Considerações de Fuso Horário
Usar o início do dia no fuso horário de Brasília para a contagem diária.

### Valores Default
- Se não houver registro na tabela `user_document_limits`:
  - `daily_limit`: 10 documentos
  - `concurrent_order_limit`: 2 pedidos

---

## Resultado Esperado
Após a implementação:
1. Usuários verão claramente quantos documentos já processaram no dia
2. O sistema bloqueará a tentativa de pegar pedidos que ultrapassem o limite diário
3. Mensagens de erro claras indicarão o motivo do bloqueio
