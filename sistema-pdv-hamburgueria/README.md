# 🍔 Sistema PDV para Hamburgueria

Sistema de Ponto de Venda (PDV) completo e moderno para hamburguerias, desenvolvido com **ES6 Modules**, **IndexedDB** e arquitetura modular profissional.

## ✨ Características Principais

- 🎨 **Interface Moderna e Intuitiva** - Design responsivo e fácil de usar
- 🗄️ **IndexedDB** - Banco de dados local profissional com backup/restore
- 📦 **Arquitetura Modular ES6** - Código organizado e manutenível
- 💾 **Persistência de Dados** - Todos os dados salvos localmente
- 🚀 **Performance Otimizada** - Carregamento rápido e operações eficientes
- 📱 **Responsivo** - Funciona em desktop, tablet e mobile

## 🏗️ Estrutura do Projeto

```text
sistema-pdv-hamburgueria/
├── app.js                          # Inicializador principal
├── index.html                      # Interface HTML única
├── README.md                       # Este arquivo
│
├── assets/
│   ├── css/
│   │   └── styles.css             # Estilos únicos do sistema
│   └── images/                    # Imagens e recursos
│
├── data/
│   └── products.js                # Dados de produtos (fallback)
│
├── docs/
│   ├── como-testar.md            # Guia de testes
│   └── guia-comercializacao.md   # Guia comercial
│
└── modules/                       # Módulos ES6
    ├── module-manager.js         # Gerenciador central
    │
    ├── shared/                   # Módulos compartilhados
    │   ├── database-manager.js   # Gerenciador IndexedDB
    │   └── utils.js              # Funções utilitárias
    │
    ├── dashboard/
    │   └── dashboard.js          # Painel principal
    │
    ├── pdv/
    │   └── pdv.js                # Sistema de vendas
    │
    ├── cardapio/
    │   └── cardapio.js           # Gestão de cardápio
    │
    ├── pedidos/
    │   └── pedidos.js            # Gestão de pedidos
    │
    ├── clientes/
    │   └── clientes.js           # Gestão de clientes
    │
    ├── estoque/
    │   └── estoque.js            # Controle de estoque
    │
    ├── financeiro/
    │   └── financeiro.js         # Gestão financeira
    │
    ├── relatorios/
    │   └── relatorios.js         # Relatórios e análises
    │
    └── configuracao/
        └── configuracao.js       # Configurações do sistema
```

## 🎯 Funcionalidades por Módulo

### 🏠 Dashboard

- Visão geral de vendas e métricas
- Gráficos e estatísticas em tempo real
- Resumo financeiro do dia
- Pedidos recentes

### 💰 PDV (Ponto de Venda)

- Interface de vendas rápida e intuitiva
- Seleção de produtos por categoria
- Customização de pedidos
- Múltiplos métodos de pagamento
- Cálculo automático de troco
- Finalização e impressão de pedidos

### 📋 Cardápio

- CRUD completo de produtos
- Categorização inteligente
- Controle de disponibilidade
- Gestão de preços e descrições
- Upload de imagens (planejado)
- Filtros e busca avançada

### 🛍️ Pedidos

- Visualização de todos os pedidos
- Status de pedidos (Pendente, Em Preparo, Pronto, Entregue)
- Histórico completo
- Filtros por data e status
- Detalhes do pedido

### 👥 Clientes

- Cadastro de clientes
- Histórico de compras
- Programa de fidelidade (planejado)
- Gerenciamento de endereços

### 📦 Estoque

- Controle de inventário
- Alertas de estoque baixo
- Movimentações de entrada/saída
- Relatórios de estoque

### 💵 Financeiro

- Controle de receitas e despesas
- Fluxo de caixa
- Relatórios financeiros
- Métodos de pagamento

### 📊 Relatórios

- Relatórios de vendas
- Produtos mais vendidos
- Performance por período
- Análise de faturamento
- Exportação de dados

### ⚙️ Configurações

- Personalização do sistema
- Gerenciamento de usuários (planejado)
- Backup e restauração
- Preferências do sistema

## 🚀 Como Usar

### Instalação

1. **Clone ou baixe o repositório**

```bash
git clone [url-do-repositorio]
cd sistema-pdv-hamburgueria
```

1. **Inicie um servidor HTTP local**

**Opção 1 - Python:**

```bash
python -m http.server 8000
```

**Opção 2 - Node.js:**

```bash
npx http-server -p 8000
```

**Opção 3 - PHP:**

```bash
php -S localhost:8000
```

1. **Acesse no navegador**

```text
http://localhost:8000
```

### Primeiro Uso

1. O sistema inicializará automaticamente o banco de dados IndexedDB
2. Produtos de exemplo serão criados na primeira execução
3. Navegue pelos módulos usando o menu lateral
4. Comece a cadastrar produtos no módulo **Cardápio**
5. Use o **PDV** para realizar vendas

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estrutura semântica
- **CSS3** - Estilização moderna com Flexbox/Grid
- **JavaScript ES6+** - Módulos, Classes, Async/Await
- **IndexedDB** - Banco de dados local
- **Font Awesome** - Ícones
- **Chart.js** (planejado) - Gráficos e visualizações

## 📦 Banco de Dados

O sistema utiliza **IndexedDB** para armazenamento local com as seguintes stores:

- `products` - Produtos do cardápio
- `categories` - Categorias de produtos
- `orders` - Pedidos realizados
- `customers` - Cadastro de clientes
- `inventory` - Controle de estoque
- `financial` - Registros financeiros
- `settings` - Configurações do sistema

### Backup e Restauração

O sistema oferece funcionalidades de backup e restauração:

```javascript
// Criar backup
const backup = await db.backup();

// Restaurar backup
await db.restore(backupData);
```

## 🧪 Testando o Sistema

Consulte o arquivo `docs/como-testar.md` para um guia completo de testes.

### Testes Rápidos

1. **Adicionar Produto:**
   - Acesse o módulo **Cardápio**
   - Clique em **Adicionar Produto**
   - Preencha os dados e salve

2. **Realizar Venda:**
   - Acesse o módulo **PDV**
   - Selecione produtos
   - Finalize o pedido

3. **Visualizar Relatórios:**
   - Acesse o módulo **Dashboard**
   - Visualize estatísticas e gráficos

## 🔧 Desenvolvimento

### Estrutura de Módulos

Cada módulo segue o padrão:

```javascript
export class NomeModule {
    constructor() {
        this.moduleName = 'nome';
    }
    
    async init() {
        // Inicialização do módulo
    }
    
    async render() {
        // Renderização da UI
    }
    
    destroy() {
        // Limpeza ao sair do módulo
    }
}
```

### Adicionando Novo Módulo

1. Crie arquivo em `modules/novo-modulo/novo-modulo.js`
2. Implemente a classe seguindo o padrão
3. Registre em `modules/module-manager.js`
4. Adicione item no menu em `index.html`

## 📋 Arquivos Principais

### app.js

Arquivo principal que inicializa o sistema e carrega o ModuleManager.

### modules/module-manager.js

Gerenciador central que coordena todos os módulos, inicializa o banco de dados e controla a navegação.

### modules/shared/database-manager.js

Sistema completo de gerenciamento IndexedDB com:

- Inicialização automática do banco
- Operações CRUD
- Sistema de índices
- Backup e restauração
- Migração de dados

### modules/shared/utils.js

Funções utilitárias compartilhadas:

- Formatação de dados
- Validações
- Helpers de UI
- Integração com banco de dados

## 🗑️ Arquivos Removidos na Limpeza

Os seguintes arquivos foram removidos por serem obsoletos:

- ❌ `assets/js/*.js` - Scripts legados (11 arquivos)
- ❌ `modules/shared/database.js` - Duplicata não utilizada
- ❌ `debug-inject.js` - Script temporário de debug
- ❌ `ANALISE_COMPLETA.md` - Documentação obsoleta
- ❌ `PROJETO_COMPLETO.md` - Documentação obsoleta
- ❌ `docs/IMPLEMENTACAO_COMPLETA.md` - Duplicata
- ❌ `docs/MODULARIZACAO_STATUS.md` - Status de migração concluída
- ❌ `docs/modular-structure.md` - Estrutura já implementada

## 📝 Licença

Este projeto é de código aberto para fins educacionais e comerciais.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para:

- Reportar bugs
- Sugerir melhorias
- Enviar pull requests
- Melhorar a documentação

## 📞 Suporte

Para dúvidas e suporte, consulte a documentação em `docs/` ou abra uma issue.

---

### Desenvolvido com ❤️ para hamburguerias modernas

## 📊 Estatísticas do Projeto

- **Total de Arquivos:** 19 arquivos
- **Linhas de Código:** ~5.000+ linhas
- **Módulos:** 9 módulos funcionais
- **Banco de Dados:** 7 stores IndexedDB
- **Tamanho:** ~500KB (sem dependências externas)
