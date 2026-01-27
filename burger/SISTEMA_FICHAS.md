# 🎁 Sistema de Fichas de Fidelidade - GO BURGER

## 📋 Visão Geral

Sistema digital moderno de recompensas por fidelidade integrado ao Firebase, onde clientes acumulam fichas a cada pedido e podem resgatar hambúrgueres grátis.

---

## 🎯 Funcionalidades

### ✅ Para o Cliente
- **+2 fichas** no PRIMEIRO pedido (bônus de boas-vindas) 🎁
- **+1 ficha** nos pedidos seguintes (normal)
- **10 fichas** = 1 hambúrguer grátis
- Cartela visual interativa mostrando progresso
- Notificações animadas ao ganhar fichas
- Histórico completo de ganhos e resgates
- Contador sempre visível ao lado do carrinho

### ✅ Para o Negócio
- Aumento de fidelização de clientes
- Incentivo para pedidos recorrentes
- Rastreamento automático via Firebase
- Zero manutenção manual
- Dados persistentes por telefone do cliente

---

## 🎨 Interface Visual

### Botão de Fichas
- **Localização:** Fixo no canto inferior direito (acima do carrinho)
- **Cor:** Gradiente laranja (#FF6B35 → #F7931E)
- **Ícone:** 🎁
- **Contador:** Exibe número atual de fichas

### Modal de Cartela
- Cartela com 10 slots (2 linhas x 5 colunas)
- Slots vazios: cinza com bordas tracejadas
- Slots preenchidos: gradiente laranja com ícone 🍔
- Animações ao carregar (pulso e rotação)
- Botão de resgate verde quando atinge 10 fichas

### Notificação de Ganho
- Aparece no centro da tela
- Fundo gradiente laranja
- Mostra "+2 Fichas!" com total atual
- Desaparece automaticamente após 3 segundos
- Animação de entrada (escala e fade)

---

## 🔧 Estrutura Técnica

### Firebase Database
```javascript
customers/
  {telefone}/          // Telefone sem formatação (apenas números)
    nome: string
    endereco: string
    fichas: number     // 0-10 (reseta após resgate)
    recompensasResgatadas: number  // Total de hambúrgueres resgatados
    historicoFichas: [
      {
        data: ISO timestamp
        tipo: "ganhou" | "resgatou"
        quantidade: number (2 ou -10)
        descricao: string
      }
    ]
```

### Funções JavaScript

#### `loadCustomerFichas()`
- Carrega fichas do cliente do Firebase
- Atualiza contador visual
- Executada ao iniciar a página

#### `showFichasModal()`
- Abre modal com cartela visual
- Mostra progresso atual (X/10)
- Exibe histórico dos últimos 5 eventos
- Habilita botão de resgate se fichas >= 10

#### `addFichasToCustomer(telefone, quantidadeBase, descricao)`
- Verifica se é o primeiro pedido do cliente
- **Primeiro pedido:** adiciona 2 fichas (bônus)
- **Demais pedidos:** adiciona 1 ficha (normal)
- Salva no Firebase
- Atualiza histórico
- Mostra notificação animada
- **Chamada automática:** após pedido enviado ao PDV

#### `resgatarHamburguer()`
- Valida se cliente tem 10+ fichas
- Subtrai 10 fichas
- Incrementa contador de resgates
- Salva no histórico
- Mostra confirmação
- Cliente informa resgate no próximo pedido

---

## 📱 Fluxo de Uso

### 1. Primeiro PRIMEIRO pedido
   ↓
Sistema salva dados no Firebase (cliente novo)
   ↓
Pedido enviado ao PDV com sucesso
   ↓
+2 fichas adicionadas (BÔNUS DE BOAS-VINDAS) 🎁
   ↓
Notificação: "🎁 +2 Fichas! Você agora tem 2 fichas (Bônus de boas-vindas!)"
   ↓
Contador atualizado: 🎁 2
```

### 2. Pedidos Seguintes
```
Cliente realiza 2º, 3º, 4º... pedidos
   ↓
Pedido enviado ao PDV com sucesso
   ↓
+1 ficha adicionada (normal)
   ↓
Notificação: "🎁 +1 Ficha! Você agora tem X fichas"
   ↓
Contador atualizado: 🎁 X
```

### 3. Acumulando Fichas
```
Cliente clica no botão 🎁
Exemplo de jornada completa:
  • Pedido 1: +2 fichas (bônus) = 2 total
  • Pedido 2: +1 ficha = 3 total
  • Pedido 3: +1 ficha = 4 total
  • Pedido 4: +1 ficha = 5 total
  • Pedido 5: +1 ficha = 6 total
  • Pedido 6: +1 ficha = 7 total
  • Pedido 7: +1 ficha = 8 total
  • Pedido 8: +1 ficha = 9 total
  • Pedido 9: +1 ficha = 10 total ✅
   ↓
Notificação: "🎁 +1 Fichaaranja com 🍔)
  • 6 slots vazios (cinza tracejado)
   ↓
Texto: "Faltam 6 fichas para ganhar um hambúrguer grátis!"
Info: "• Primeiro pedido = +2 fichas (🎁 bônus!)
       • Próximos pedidos = +1 ficha
   ↓
Texto: "Faltam 8 fichas para ganhar um hambúrguer grátis!"
```

### 3. Ao Atingir 10 Fichas
```
Cliente faz 5º pedido
   ↓
+2 fichas (total = 10)
   ↓
Notificação: "🎁 +2 Fichas! Você agora tem 10 fichas
             🎉 Hambúrguer grátis disponível!"
   ↓
Modal agora mostra:
  • Cartela completamente preenchida (10/10)
  • Banner verde: "🎉 Parabéns! Você tem direito a um hambúrguer grátis!"
  • Botão: "🍔 Resgatar Hambúrguer Grátis"
```

### 4. Resgatando Recompensa
```
Cliente clica em "Resgatar Hambúrguer Grátis"
   ↓
Sistema:
  • Subtrai 10 fichas (volta para 0)
  • Adiciona +1 em recompensasResgatadas
  • Salva no histórico
   ↓
   ↓
Próximo pedido será o 10º = +1 ficha normal
   (o bônus de 2 fichas é apenas no PRIMEIRO pedido de sempre)
Alerta: "🎉 Parabéns! Seu hambúrguer grátis foi liberado!
         No próximo pedido, escolha qualquer hambúrguer simples
         e informe que é seu resgate de fidelidade."
   ↓
Modal atualiza mostrando 0/10 fichas
Contador: 🎁 0
Badge: "🏆 Você já resgatou 1 hambúrguer grátis!"
```

---

## 🎨 Personalizações
Lógica interna da função addFichasToCustomer:
// - Verifica histórico de pedidos do cliente
// - Se historicoFichas.filter(tipo='ganhou').length === 0 → Primeiro pedido
//   → quantidade = 2 fichas (BÔNUS)
// - Se já tem histórico de pedidos → Pedidos seguintes
//   → quantidade = 1 ficha (NORMAL)
```css
--fichas-primary: #FF6B35
--fichas-secondary: #F7931E
--fichas-premio: #4CAF50
```

### Valores Configuráveis
```javascript
// Fichas por pedido
const FICHAS_POR_PEDIDO = 2;
Primeiro pedido = 2 fichas! Demais pedidos = 1 ficha"
- Instruções na infobox:
  - "• Primeiro pedido = +2 fichas (🎁 bônus!)"
  - "• Próximos pedidos = +1 ficha"
  - "• 10 fichas = 1 hambúrguer grátis"
const FICHAS_NECESSARIAS = 10;
```

### Textos Personalizáveis
- Header do modal: "🎁 Minhas Fichas de Fidelidade"
- Subtítulo: "A cada pedido você ganha 2 fichas!"
- Instruções na infobox
- Mensagem de parabéns ao completar

---

## 📊 Relatórios e Análises

### Métricas Disponíveis no Firebase

**Por Cliente:**
- Total de fichas ativas
- Total de recompensas resgatadas
- Histórico completo de ganhos/resgates

**Agregadas (requer query):**
- Total de fichas em circulação
- Total de hambúrgueres grátis dados
- Taxa de conversão (pedidos → resgates)
- Clientes ativos no programa

### Exemplo de Query
```javascript
// Total de recompensas resgatadas por todos os clientes
database.ref('customers').once('value', (snapshot) => {
  let totalResgates = 0;
  snapshot.forEach(customer => {
    totalResgates += customer.val().recompensasResgatadas || 0;
  });
  console.log(`Total de hambúrgueres grátis dados: ${totalResgates}`);
});
```

---

## 🔒 Segurança

### Validações Implementadas
- ✅ Verifica se cliente tem telefone salvo antes de mostrar modal
- ✅ Valida se tem 10+ fichas antes de permitir resgate
- ✅ Usa telefone (único) como chave primária
- ✅ Try-catch em todas as operações Firebase
- ✅ Histórico imutável (apenas append)

### Proteções
- Cliente não pode manipular contador (está no Firebase)
- Resgate requer confirmação e validação server-side
- Histórico completo para auditoria

---

## 🚀 Melhorias Futuras (Opcional)

### Possíveis Expansões3 fichas extras
   - Pedido acima de R$ 100: +1 ficha bônus
   - Indicação de amigo: +2 fichas extras
   - Décimo pedido (após resgate): +1 ficha bônues grátis
   - 20 fichas = hambúrguer duplo grátis
   - 30 fichas = combo completo grátis

2. **Bônus Especiais**
   - Aniversário do cliente: +5 fichas
   - Pedido acima de R$ 100: fichas dobradas
   - Indicação de amigo: +3 fichas

3. **Gamificação**
   - Badges de conquistas
   - Ranking de clientes VIP
   - Desafios mensais

4. **Integração Completa**
   - Resgate automático no checkout (desconto aplicado)
   - QR Code para verificação presencial
   - Notificações push quando próximo de completar

---

## 📝 Notas Importantes

### Para o Atendente
- Quando cliente informar resgate de fidelidade, verificar no modal de fichas se ele tem realmente direito
- Aceitar qualquer hambúrguer simples como resgate
- **Primeiro pedido do cliente:** sistema detecta automaticamente (historicoFichas vazio) e adiciona 2 fichas
- **Pedidos seguintes:** sistema detecta pedidos anteriores e adiciona 1 ficha
- Registrar no pedido: "RESGATE FIDELIDADE - GRÁTIS"

### Para o Desenvolvedor
- Fichas são adicionadas APENAS após pedido ser enviado ao PDV com sucesso
- Se Firebase estiver offline, fichas não serão adicionadas (mas WhatsApp funciona normalmente)
- Contador é atualizado em tempo real após cada operação

### Backup e Restauração
- Todos os dados estão no Firebase Realtime Database
- Exportar via console Firebase se necessário
- Histórico completo permite auditoria e resolução de problemas

---

## 📞 Suporte

**Versão:** 5.2.0-FICHAS-FIDELIDADE  
**Data:** 14/01/2026  
**Service Worker:** 5.5

**Testado em:**
- ✅ Chrome/Edge (Desktop e Mobile)
- ✅ Firefox
- ✅ Safari (iOS)
- ✅ PWA instalado

---novos clientes** com bônus de 2 fichas no primeiro pedido
2. **Incentiva compras recorrentes** (cliente volta para completar cartela)
3. **Mantém engajamento** com 1 ficha por pedido após o primeiro
4. **Cria senso de conquista** (interface visual atrativa e gamificada)
5. **Rastreia tudo** (Firebase mantém histórico completo)
6. **Zero custo adicional** (usa estrutura Firebase já existente)
7. **Fácil de usar** (cliente nem precisa fazer nada, as fichas vêm sozinhas)

**Jornada típica:** 1º pedido (2 fichas) + 8 pedidos (1 ficha cada) = 10 fichas = hambúrguer grátis no 10º pedido

**ROI Esperado:** Aumento de 25-35** (cliente volta para completar cartela)
3. **Cria engajamento** (interface visual atrativa e gamificada)
4. **Rastreia tudo** (Firebase mantém histórico completo)
5. **Zero custo adicional** (usa estrutura Firebase já existente)
6. **Fácil de usar** (cliente nem precisa fazer nada, as fichas vêm sozinhas)

**ROI Esperado:** Aumento de 20-30% em pedidos recorrentes de clientes cadastrados.

---

🍔 **GO BURGER - Fidelidade que Funciona!**
