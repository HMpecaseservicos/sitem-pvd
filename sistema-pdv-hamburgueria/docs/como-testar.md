# 🧪 Como Testar o Sistema BurgerPDV

## 🚀 Instruções de Teste

### 1. Abrir o Sistema

1. **Navegue até a pasta do projeto:**
   ```
   c:\pvd\sistema-pdv-hamburgueria\
   ```

2. **Abra o arquivo `index.html` em um navegador moderno:**
   - Clique duas vezes no arquivo `index.html`
   - OU clique com botão direito → "Abrir com" → escolha seu navegador
   - OU arraste o arquivo para uma janela do navegador

### 2. Teste do Dashboard

**O que testar:**
- ✅ Visualização das métricas de vendas
- ✅ Pedidos recentes (inicialmente vazio)
- ✅ Gráfico de vendas por hora
- ✅ Navegação entre as seções

**Como testar:**
1. O sistema iniciará no Dashboard
2. Observe as métricas simuladas
3. Clique em "Relatório Diário" para testar impressão

### 3. Teste do PDV (Ponto de Venda)

**O que testar:**
- ✅ Navegação entre categorias
- ✅ Adição de produtos ao pedido
- ✅ Personalização de produtos
- ✅ Cálculo de totais
- ✅ Aplicação de descontos
- ✅ Finalização com pagamento

**Como testar:**

#### 3.1 Adicionar Produtos:
1. Clique em "PDV" na barra lateral
2. Selecione uma categoria (ex: "Hambúrgueres")
3. Clique em um produto (ex: "Burger Clássico")
4. Se aparecer modal de personalização:
   - Selecione opções desejadas
   - Ajuste quantidade
   - Clique "Adicionar ao Pedido"

#### 3.2 Gerenciar Pedido:
1. Observe o produto no painel direito
2. Teste os botões + e - para alterar quantidade
3. Adicione mais produtos
4. Observe o cálculo automático do total

#### 3.3 Aplicar Desconto:
1. Clique em "Desconto"
2. Escolha tipo (percentual ou valor fixo)
3. Digite um valor (ex: 10%)
4. Observe a prévia
5. Clique "Aplicar Desconto"

#### 3.4 Finalizar Pedido:
1. Clique em "Finalizar"
2. Escolha tipo de pedido (Balcão/Mesa/Delivery)
3. Se Mesa ou Delivery, preencha dados do cliente
4. Clique "Finalizar Pedido"
5. Escolha forma de pagamento
6. Clique "Confirmar Pagamento"
7. Aguarde processamento
8. Observe impressão do recibo

### 4. Teste de Funcionalidades Especiais

#### 4.1 Busca de Produtos:
1. Digite "bacon" na barra de pesquisa
2. Observe filtragem automática
3. Limpe a busca

#### 4.2 Tipos de Pedido:
1. Teste "Mesa" - deve pedir nome e telefone
2. Teste "Delivery" - deve pedir nome, telefone e endereço
3. Observe cálculo da taxa de entrega

#### 4.3 Limpeza de Pedido:
1. Adicione alguns itens
2. Clique no ícone de lixeira
3. Confirme a limpeza

### 5. Teste do Dashboard Após Vendas

**Após fazer alguns pedidos de teste:**
1. Volte ao Dashboard
2. Observe atualização das métricas
3. Veja pedidos recentes
4. Teste diferentes status de pedidos
5. Gere relatório diário

### 6. Teste de Responsividade

1. **Desktop:** Redimensione a janela do navegador
2. **Tablet:** Teste em modo desenvolvedor (F12 → Device Toolbar)
3. **Mobile:** Simule dispositivo móvel

**Observe:**
- Layout se adapta ao tamanho da tela
- Botões permanecem clicáveis
- Texto permanece legível
- Navegação funciona em todas as telas

### 7. Teste de Persistência de Dados

1. **Faça alguns pedidos**
2. **Feche o navegador**
3. **Abra novamente o sistema**
4. **Verifique se:**
   - Estatísticas foram mantidas
   - Histórico de pedidos existe
   - Configurações permanecem

### 8. Funcionalidades Avançadas

#### 8.1 Atalhos de Teclado:
- `Alt + D` = Dashboard
- `Alt + P` = PDV
- `Alt + N` = Novo Pedido
- `Esc` = Fechar modais
- `F5` = Atualizar página
- `Ctrl + R` = Gerar relatório

#### 8.2 Impressão:
- Teste impressão de recibos
- Teste relatório diário
- Verifique formatação

### 9. Dados de Teste Inclusos

**O sistema vem com:**
- ✅ Cardápio completo de hamburgueria
- ✅ 25+ produtos em 6 categorias
- ✅ Opções de personalização
- ✅ Dados de demonstração
- ✅ Configurações pré-definidas

**Produtos para testar:**
- Burger Clássico (com personalizações)
- Combo Família (produto complexo)
- Batata Frita (com tamanhos)
- Milkshake (com coberturas)
- Burger Vegetariano (opções especiais)

### 10. Problemas Comuns e Soluções

#### ❌ "Página não carrega"
**Solução:** Verifique se está usando um navegador atualizado (Chrome 80+, Firefox 75+, Edge 80+)

#### ❌ "Botões não funcionam"
**Solução:** Aguarde carregamento completo da página (veja mensagem "Sistema iniciado" no canto superior direito)

#### ❌ "Modal não abre"
**Solução:** Certifique-se que JavaScript está habilitado no navegador

#### ❌ "Dados não salvam"
**Solução:** Verifique se o navegador permite LocalStorage (não deve estar em modo incógnito)

#### ❌ "Layout quebrado"
**Solução:** Atualize a página (F5) ou limpe cache do navegador

### 11. Checklist de Teste Completo

**Básico:**
- [ ] Sistema abre sem erros
- [ ] Dashboard carrega com métricas
- [ ] PDV permite adicionar produtos
- [ ] Pedido é finalizado com sucesso
- [ ] Recibo é gerado

**Intermediário:**
- [ ] Personalização de produtos funciona
- [ ] Desconto é aplicado corretamente
- [ ] Busca encontra produtos
- [ ] Tipos de pedido diferentes funcionam
- [ ] Dados persistem após recarregar

**Avançado:**
- [ ] Responsividade em diferentes telas
- [ ] Atalhos de teclado funcionam
- [ ] Relatórios são gerados
- [ ] Performance é adequada
- [ ] Interface é intuitiva

### 12. Simulação de Uso Real

**Cenário: Rush de almoço**
1. **Faça 5-10 pedidos seguidos**
2. **Varie tipos:** balcão, mesa, delivery
3. **Use diferentes personalizações**
4. **Aplique descontos variados**
5. **Teste velocidade de operação**

**Cenário: Final do dia**
1. **Gere relatório diário**
2. **Verifique métricas acumuladas**
3. **Teste backup de dados**
4. **Verifique consistência**

### 13. Feedback e Melhorias

**Durante o teste, anote:**
- ⭐ Funcionalidades que mais gostou
- 🐛 Bugs encontrados
- 💡 Sugestões de melhoria
- 🚀 Ideias para novas funcionalidades

### 🎉 Parabéns!

Se chegou até aqui, você testou um sistema PDV completo e profissional!

**Próximos passos:**
1. **Customize** para sua marca
2. **Configure** seu cardápio
3. **Treine** sua equipe
4. **Comece a vender!**

---

**💡 Dica Pro:** Use este sistema como base para desenvolver soluções para outros tipos de negócio (pizzarias, açaí, coffee shops, etc.)