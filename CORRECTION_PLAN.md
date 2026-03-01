# Plano de Correção Mínima - Passo 3

## Baseado em: Hipótese de "Sucesso Falso" (Early Return Silencioso)

Após executar os testes do DIAGNOSTIC_GUIDE.md, esperamos que a causa raiz seja:

### **CAUSA RAIZ PROVÁVEL:**
Em `BudgetContext.tsx`, a função `addDespesaVariavel` faz early returns silenciosos (`return` sem `throw`) quando:
- `!userId` (usuário não autenticado)
- `!canEdit` (trial expirado ou acesso restrito)

Esses retornos causam:
1. A Promise resolve com `undefined` (nicht um erro)
2. No `App.tsx`, `await addDespesaVariavel(...)` completa "com sucesso"
3. O `toast.success()` é exibido mesmo sem salvar nada
4. O componente VoiceExpenseConfirmModal recebe `return true` (sucesso falso)
5. O modal fecha como se a despesa tivesse sido salva
6. O item NUNCA foi inserido no BD, mas a UX simula sucesso

---

## CORREÇÃO #1: BudgetContext.tsx

**Arquivo**: [src/context/BudgetContext.tsx](src/context/BudgetContext.tsx)

**Localização**: Função `addDespesaVariavel` (linha ~664)

**Antes**:
```tsx
const addDespesaVariavel = async (input: DespesaVariavelInput) => {
  if (!userId) return
  if (!canEdit) {
    console.warn('Trial expirado')
    return
  }
  // ... resto da função
}
```

**Depois**:
```tsx
const addDespesaVariavel = async (input: DespesaVariavelInput) => {
  if (!userId) {
    throw new Error('Sessão inválida. Faça login novamente.')
  }
  if (!canEdit) {
    console.warn('Trial expirado')
    throw new Error('Trial expirado. Assine o Pro para continuar.')
  }
  // ... resto da função
}
```

**Justificativa**:
- Transforma early returns silenciosos em erros explícitos
- O `catch` no `App.tsx` irá capturar, exibir `toast.error()` e retornar `false`
- O modal NOT fecha como sucesso falso
- A UX reflete a realidade: "não salvou porque trial expirou" (com mensagem clara)

---

## CORREÇÃO #2: App.tsx (Opcional, mas Recomendado)

**Arquivo**: [src/App.tsx](src/App.tsx)

**Localização**: Callback `onSave` (linha ~478)

**Situação atual**:
```tsx
onSave={async data => {
  try {
    // ...
    await addDespesaVariavel({ ...data, perfil })
    toast.success('Despesa adicionada ✅')
    return true
  } catch (error) {
    const ui = humanizeBillingError(error)
    toast.error(ui.title, { description: ui.description })
    return false
  }
}}
```

**Refinamento (para documentar intenção)**:
```tsx
onSave={async data => {
  try {
    // ...
    await addDespesaVariavel({ ...data, perfil })
    // Só chega aqui se addDespesaVariavel NÃO lançou erro
    toast.success('Despesa adicionada ✅')
    return true
  } catch (error) {
    // Qualquer erro em addDespesaVariavel (inclusive early return transformado em throw) cai aqui
    const ui = humanizeBillingError(error)
    toast.error(ui.title, { description: ui.description })
    return false
  }
}}
```

**Justificativa**:
- O código já está correto (catch existe e mostra toast.error)
- A Correção #1 torna este catch "disparável", evitando sucesso falso
- Não há mudança de lógica, apenas formalização

---

## REMOVAL DE INSTRUMENTAÇÃO

Após validação da correção, remover os seguintes logs:
- `src/lib/debugTrace.ts` (pode deixar arquivo para futuros debugs)
- Remover chamadas de `devLog(...)` em:
  - `src/components/VoiceExpenseConfirmModal.tsx`
  - `src/components/DespesasVariaveisForm.tsx`
  - `src/App.tsx`
  - `src/context/BudgetContext.tsx`

OU manter `devLog()` calls (elas são no-op em production, só ativadas em DEV).

---

## VALIDAÇÃO PÓS-CORREÇÃO

01. Build deve passar: `npx tsc --noEmit && npm run build`
02. Teste A deve voltar a funcionar (item salva em voz)
03. Teste A com trial expirado deve mostrar erro claro (não sucesso falso)
04. Teste C deve continuarem funcionando (regressão zero)

---

## TEMPO DE IMPLEMENTAÇÃO

- Correção #1: 1 linha de mudança → 10s
- Correção #2: Já presente, formalizar → 0s
- Validação: `tsc` + `build` → 10-20s

**Total**: ~30s

---

## CONFIRMAÇÃO DE CAUSA ANTE DE APLICAR

**NÃO APLIQUE ESTA CORREÇÃO ATÉ QUE:**

O diagnóstico (Teste A, B, C) confirme que:
1. Voz falha mas manual funciona
2. Log mostra `EARLY_RETURN reason=canEdit_false` OU `reason=no_userId`
3. Nenhum outro erro (insertError, RPC error) aparece

Se a causa for DIFERENTE (ex.: insertError no Supabase), a correção #1 é ineficaz.

---

