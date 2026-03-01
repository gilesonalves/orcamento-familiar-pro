# Guia de Diagnóstico - Bug "Despesa por Voz Não Salva"

## RESUMO EXECUTIVO
Foi adicionada instrumentação DEV (somente em `import.meta.env.DEV`) que rastreia o fluxo completo de "despesa por voz" desde o modal até o Supabase. Neste guia descrevemos:
1. O que testar
2. Quais logs devem aparecer para SUCESSO
3. Quais logs indicam FALHA e em qual ponto

## TESTE A: Salvar Despesa por Voz (Perfil Familiar)

### Pré-requisitos
- App em modo DEV (`npm run dev`)
- Browser com console aberto (F12)
- Conectado como usuário com trial ativo (não expirado) ou Pro ativo
- Nenhum erro anterior de permissão de microfone

### Passos
1. Cique no botão "🎙️ Lançar despesa por voz"  
2. Aguarde a escuta (você ouvirá um beep)
3. Fale: "gastei vinte e cinco uber" (ou similar com valor e categoria)
4. Modal deve abrir com dados preenchidos
5. Revise os campos (data, valor, categoria, descrição, forma de pagamento)
6. Clique "Confirmar e salvar"
7. Observe os logs no console

### Sequência de Logs Esperada para SUCESSO

```
[TRACE] [VOICE][modal] confirm-click VOICE-MODAL-{timestamp}-{random} payload: (5 fields)
[TRACE] [VOICE][modal] onConfirm:start VOICE-MODAL-...
[TRACE] [VOICE][form] modal-confirm:start VOICE-FORM-{timestamp}-{random} payload: (5 fields + perfil)
[TRACE] [VOICE][form] saveSingleExpense:start VOICE-FORM-... payload: (5 fields + perfil)
[TRACE] [VOICE][form] onSave:start VOICE-FORM-...
[TRACE] [VOICE][app] onSave:enter { perfilState: "familiar", dataReceivedPerfil: undefined, finalPayload: (6 fields) }
[TRACE] [VOICE][app] addDespesaVariavel:call
[TRACE] [VOICE][ctx] addDespesaVariavel:enter { userId: "xxxxxxxx", canEdit: true, hasProAccess: false, input: (6 fields) }
[TRACE] [VOICE][ctx] supabase insert:call payload: (8 fields)
[TRACE] [VOICE][ctx] supabase insert:response { dataId: "xxxxxxxx-xxxx-xxxx-xxxx", insertError: null }
[TRACE] [VOICE][ctx] RPC consume_manual_expense:call args: { p_year, p_month, p_perfil }
[TRACE] [VOICE][ctx] RPC consume_manual_expense:response consErr: null
[TRACE] [VOICE][ctx] addDespesaVariavel:success newItem.id= "xxxxxxxx-xxxx-xxxx-xxxx"
[TRACE] [VOICE][app] addDespesaVariavel:done
[TRACE] [VOICE][form] onSave:done VOICE-FORM-... ok: true
[TRACE] [VOICE][form] modal-confirm:success VOICE-FORM-...
[TRACE] [VOICE][modal] onConfirm:done VOICE-MODAL-... result: true
```

**Expectativa de UX**: Toast verde "Despesa adicionada ✅", modal fecha, item aparece na tabela.

---

### Falha A1: `canEdit` é FALSE

Se você vir:
```
[TRACE] [VOICE][ctx] EARLY_RETURN reason=canEdit_false
```

**Causa**: Trial expirado ou usuário sem Pro. A função retorna silenciosamente sem erro.

**Solução**: Verificar status do perfil no lado da app ou forçar trial Refresh.

---

### Falha A2: `userId` é NULL

Se você vir:
```
[TRACE] [VOICE][ctx] EARLY_RETURN reason=no_userId
```

**Causa**: Usuário não está logado ou sessão perdida.

**Solução**: Re-fazer login.

---

### Falha A3: RPC `can_add_manual_expense` retorna `allowed=false`

Se você vir:
```
[TRACE] [VOICE][ctx] RPC can_add_manual_expense:response { canData: [{ allowed: false, reason: "..." }], canErr: null }
```

Seguido de throw de erro, isso significa que o limite mensal foi atingido. A mensagem de erro é informativa.

**Esperado**: Toast com erro apareça (vermelho) no console.

---

### Falha A4: `insertError` não é null

Se você vir:
```
[TRACE] [VOICE][ctx] supabase insert:response { dataId: undefined, insertError: { message: "..." } }
```

**Causa**: Erro no insert do Supabase (pode ser validação, constraint, ou erro de rede).

**Análise**: Verificar qual é o erro específico no objeto `insertError`.

---

### Falha A5: Modal fecha como "sucesso" mas item NÃO aparece

Se você vir:
```
[TRACE] [VOICE][ctx] addDespesaVariavel:success newItem.id= ...
[VOICE][form] modal-confirm:success ...
```

Mas o item não aparece na tabela:

**Causa**: Possível erro de state update ou o item foi inserido mas não refletiu na UI.

**Análise**: Verificar se há erro de permissão no banco ou se o state update falhou (raro).

---

## TESTE B: Salvar Despesa por Voz (Perfil Pessoal)

### Passos
1. Mude o seletor de perfil para "Pessoal" (botão no topo)
2. Repita os passos do Teste A

### Saída Esperada
Idêntica ao Teste A, **exceto**:
```
[TRACE] [VOICE][app] onSave:enter { perfilState: "pessoal", ... }
[TRACE] [VOICE][ctx] addDespesaVariavel:enter { ..., input: { ..., perfil: "pessoal" } }
```

**Observação**: O campo `perfil` deve ser "pessoal" em todos os logs.

---

## TESTE C: Salvar Despesa Manual (mesmo perfil)

### Passos
1. Garanta que perfil está no mesmo (ex.: "Familiar")
2. Preencha o formulário manual com:
   - Data: hoje
   - Valor: 25
   - Categoria: Uber
   - Descrição: Uber
   - Forma de pagamento: Pix
3. Clique "Adicionar"
4. Observe os logs

### Saída Esperada para SUCESSO

```
[TRACE] [VOICE][app] onSave:enter { perfilState: "familiar", dataReceivedPerfil: undefined, finalPayload: (6 fields) }
[TRACE] [VOICE][app] addDespesaVariavel:call
[TRACE] [VOICE][ctx] addDespesaVariavel:enter { userId: "xxxxxxxx", canEdit: true, hasProAccess: false, input: (6 fields, perfil: "familiar") }
[caminhar igual ao Teste A]
```

**Saída Esperada de UX**: Toast verde, item aparece na tabela.

---

## COMPARAÇÃO VOZ vs MANUAL

Se Teste A e B falham mas Teste C sucede:

| Ponto         | Voz     | Manual  | Significado           |
|---------------|---------|---------|------------------------|
| Modal abre?   | ✅ Sim  | N/A     |                        |
| Payload mostra perfil? | ✅ Sim  | ✅ Sim  | Ambos recebem perfil  |
| onSave é chamado? | ✅ Sim (logs) | ✅ Sim (logs) | Ambos chamam |
| addDespesaVariavel é chamado? | ❌ Não | ✅ Sim | **DIVERGÊNCIA** |

**Possível causa**: `onSave` prop do Form não é a mesma para ambos, ou há closing scope issue.

---

## INTERPRETAÇÃO DE LOGS

### Log "EARLY_RETURN"
Se aparecer, a função foi derrotada por guarda (guard clause). **Não é erro SQL/RPC**, mas lógica de app.

**Ação**: Verificar `userId`, `canEdit`, `hasProAccess` no Redux/state.

### Log "insertError"
O Supabase retornou erro. Verificar a mensagem de erro para causa específica (constraint, validação, permissão).

### Log Incompleto
Se você vê `onSave:start` mas não vê `onSave:done`, significa a Promise está travada ou falhou sem ser capturada.

**Aação**: Abrir Network tab (F12 > Network) e procurar por requisição POST pendente ou erro.

---

## LÓGICA DE TESTE (Decision Tree)

```
Teste A (voz) com trial ativo?
├─ Não vê logs [VOICE][...] no console
│  └─ import.meta.env.DEV não está true (verificar build)
├─ Vê EARLY_RETURN canEdit_false
│  └─ Trial expirado (status de profile)
├─ Vê insertError
│  └─ Supabase rejeitou insert (verificar constraint/permissão)
├─ Todos os logs aparecem até sucesso
│  ├─ Item aparece na tabela after 1-2s
│  │  └─ ✅ BUG CORRIGIDO (ou nunca existiu)
│  └─ Item NÃO aparece, mas logs dizem sucesso
│     └─ Bug de state/UI update
└─ Teste A sucede, Teste C falha
   └─ Bug no fluxo manual (não nosso foco)
```

---

## PRÓXIMOS PASSOS (após diagnóstico)

1. Se encontrar EARLY_RETURN: implementar throw de erro com mensagem clara
2. Se encontrar insertError: analisar constraints do DB
3. Se encontrar sucesso falso (logs ok, item não aparece): debugar state update
4. Se tudo funcionar: remover instrumentação DEV e fazer merge

