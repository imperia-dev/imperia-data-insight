# Máscaras no formulário de cadastro do portal

Adicionar formatação automática enquanto o cliente digita os campos **Telefone** e **CPF / CNPJ** em `src/portal/pages/PortalSignup.tsx`.

## Comportamento

**Telefone (BR)**
- Aceita apenas dígitos digitados; tudo o resto é descartado.
- Limite: 11 dígitos (DDD + 9 dígitos do celular).
- Formatação progressiva conforme digita:
  - `(47)`
  - `(47) 9`
  - `(47) 99728`
  - `(47) 99728-1184`
- Fixo (10 dígitos) também suportado: `(47) 3333-4444`.

**CPF / CNPJ**
- Aceita apenas dígitos; limite 14.
- Detecta automaticamente pelo número de dígitos:
  - ≤ 11 → CPF: `117.540.239-75`
  - \> 11 → CNPJ: `12.345.678/0001-90`
- Formatação progressiva durante a digitação.

## Implementação

1. Criar duas funções utilitárias no próprio arquivo (ou em `src/portal/utils/masks.ts` se preferir reuso):
   - `formatPhoneBR(value: string): string`
   - `formatCpfCnpj(value: string): string`
   Ambas removem não-dígitos, truncam ao máximo permitido e aplicam o template.

2. Atualizar os handlers dos inputs:
   - Telefone: `onChange={(e) => setForm(f => ({ ...f, phone: formatPhoneBR(e.target.value) }))}`
   - CPF/CNPJ: idem com `formatCpfCnpj`.
   - Adicionar `inputMode="numeric"` e `maxLength` apropriado em cada input.
   - Atualizar `placeholder` do telefone para `(11) 90000-0000`.

3. Validação Zod (mantida client-side):
   - `phone`: aceitar a string formatada; ajustar regex para `/^\(\d{2}\) \d{4,5}-\d{4}$/`.
   - `cpf_cnpj`: opcional; quando preenchido, exigir formato `xxx.xxx.xxx-xx` ou `xx.xxx.xxx/xxxx-xx`.

4. Persistência:
   - Salvar o valor **formatado** em `trial_customers.phone` e `cpf_cnpj` (mais legível na tela admin). Sem mudança de schema.

## Fora de escopo

- Não validar dígito verificador de CPF/CNPJ (pode ser adicionado depois se quiser).
- Não alterar o restante do formulário nem o fluxo de aprovação.
