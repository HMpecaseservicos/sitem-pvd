/**
 * Módulo Financeiro - Sistema PDV Hamburgueria
 * Controle completo de receitas, despesas e fluxo de caixa
 * Com especialistas integrados: Analista, Consultor, Planejador e Contador
 */

import {
    formatCurrency,
    formatDate,
    formatDateTime,
    generateId,
    showToast,
    getFromDatabase,
    saveToDatabase,
    updateInDatabase,
    deleteFromDatabase
} from '../shared/utils.js';

// Importar especialistas financeiros
import { FinancialAnalyst } from './financial-analyst.js';
import { FinancialConsultant } from './financial-consultant.js';
import { FinancialPlanner } from './financial-planner.js';
import { Accountant } from './accountant.js';

export default class FinanceiroModule {
    constructor() {
        this.isInitialized = false;
        this.transactions = [];
        this.bills = []; // Contas a pagar
        this.debts = []; // Dívidas pendentes
        this.currentView = 'transactions'; // transactions, bills, debts, health
        this.currentPeriod = 'month'; // Padrão: mês atual
        this.currentFilter = 'all'; // all, income, expense
        this.customCategories = []; // Categorias personalizadas
        this.isAuthenticated = false; // Controle de acesso
        this.PASSWORD = '219520'; // Senha do admin
        
        // Especialistas Financeiros
        this.analyst = null;
        this.consultant = null;
        this.planner = null;
        this.accountant = null;
        
        // Sistema de prioridades
        this.priorities = {
            'CRITICA': { level: 1, color: '#dc3545', icon: '🔴', label: 'CRÍTICA' },
            'ALTA': { level: 2, color: '#fd7e14', icon: '🟠', label: 'ALTA' },
            'MEDIA': { level: 3, color: '#ffc107', icon: '🟡', label: 'MÉDIA' },
            'BAIXA': { level: 4, color: '#28a745', icon: '🟢', label: 'BAIXA' }
        };
        
        // Categorias obrigatórias com prioridades pré-definidas
        this.mandatoryCategories = [
            { name: 'Aluguel', priority: 'CRITICA', description: 'Aluguel do estabelecimento' },
            { name: 'Insumos', priority: 'CRITICA', description: 'Ingredientes e matéria-prima' },
            { name: 'Fornecedores', priority: 'ALTA', description: 'Pagamento de fornecedores' },
            { name: 'Água/Luz/Gás', priority: 'ALTA', description: 'Contas básicas' },
            { name: 'Funcionários', priority: 'CRITICA', description: 'Salários e encargos' },
            { name: 'Impostos', priority: 'CRITICA', description: 'Obrigações fiscais' },
            { name: 'Manutenção', priority: 'MEDIA', description: 'Reparos e manutenção' },
            { name: 'Marketing', priority: 'BAIXA', description: 'Divulgação e propaganda' },
            { name: 'Melhorias', priority: 'BAIXA', description: 'Investimentos em melhorias' }
        ];
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('💰 Inicializando módulo Financeiro...');
            
            // Limpar qualquer modal anterior que possa estar aberto
            document.querySelectorAll('.modal').forEach(m => m.remove());
            
            // Expor o módulo globalmente ANTES de configurar event listeners
            window.financeiroModule = this;
            
            // Verificar autenticação
            if (!this.checkAuthentication()) {
                this.showPasswordModal();
                return;
            }
            
            // Carregar categorias personalizadas
            await this.loadCustomCategories();
            
            // Carregar dados
            await this.loadTransactions();
            await this.loadBills();
            await this.loadDebts();
            
            // Inicializar especialistas financeiros
            this.initializeSpecialists();
            
            this.renderInterface();
            if (this.currentView === 'bills') {
                await this.loadBills();
            } else if (this.currentView === 'debts') {
                await this.loadDebts();
            } else if (this.currentView === 'health') {
                this.renderProfessionalHealthDashboard();
            }
            this.setupEventListeners();
            
            this.isInitialized = true;
            
            console.log('✅ Financeiro Module inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar Financeiro:', error);
        }
    }
    
    /**
     * Inicializa especialistas financeiros
     */
    initializeSpecialists() {
        console.log('👔 Inicializando especialistas financeiros...');
        
        this.analyst = new FinancialAnalyst(this.transactions, this.bills, this.debts);
        this.consultant = new FinancialConsultant(this.transactions, this.bills, this.debts);
        this.planner = new FinancialPlanner(this.transactions);
        this.accountant = new Accountant(this.transactions, this.bills, this.debts);
        
        // Atualizar especialistas sempre que dados mudarem
        this.updateSpecialists();
        
        console.log('✅ Especialistas inicializados:', {
            analista: this.analyst ? '✓' : '✗',
            consultor: this.consultant ? '✓' : '✗',
            planejador: this.planner ? '✓' : '✗',
            contador: this.accountant ? '✓' : '✗'
        });
    }
    
    /**
     * Atualiza dados dos especialistas
     */
    updateSpecialists() {
        if (this.analyst) {
            this.analyst.transactions = this.transactions;
            this.analyst.bills = this.bills;
            this.analyst.debts = this.debts;
        }
        
        if (this.consultant) {
            this.consultant.transactions = this.transactions;
            this.consultant.bills = this.bills;
            this.consultant.debts = this.debts;
        }
        
        if (this.planner) {
            this.planner.updateTransactions(this.transactions);
        }
        
        if (this.accountant) {
            this.accountant.transactions = this.transactions;
            this.accountant.bills = this.bills;
            this.accountant.debts = this.debts;
        }
    }
    
    checkAuthentication() {
        const authTime = sessionStorage.getItem('financeiro_auth_time');
        if (authTime) {
            const elapsed = Date.now() - parseInt(authTime);
            // Sessão válida por 4 horas
            if (elapsed < 4 * 60 * 60 * 1000) {
                this.isAuthenticated = true;
                return true;
            }
        }
        return false;
    }
    
    showPasswordModal() {
        console.log('🔒 Criando modal de senha...');
        
        // Remove qualquer modal antigo (previne duplicação)
        const oldModal = document.getElementById('financial-auth-modal');
        if (oldModal) {
            console.log('🗑️ Removendo modal antigo...');
            oldModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.id = 'financial-auth-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modalContent = `
            <div style="
                background: white;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 400px;
                width: 90%;
            ">
                <div style="font-size: 4rem; margin-bottom: 20px;">🔒</div>
                <h2 style="margin-bottom: 15px; color: #333;">Acesso Restrito</h2>
                <p style="color: #666; margin-bottom: 25px;">
                    Este módulo é protegido.<br>
                    Apenas o administrador pode acessar.
                </p>
                <input 
                    type="password" 
                    id="financial-password"
                    placeholder="Digite a senha"
                    style="
                        width: 100%;
                        padding: 15px;
                        border: 2px solid #ddd;
                        border-radius: 8px;
                        font-size: 16px;
                        text-align: center;
                        margin-bottom: 20px;
                        box-sizing: border-box;
                    "
                />
                <button 
                    id="verify-password"
                    style="
                        width: 100%;
                        padding: 15px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: transform 0.2s;
                    "
                >
                    Acessar
                </button>
                <button 
                    id="cancel-access"
                    style="
                        width: 100%;
                        padding: 15px;
                        background: transparent;
                        color: #999;
                        border: none;
                        font-size: 14px;
                        cursor: pointer;
                        margin-top: 10px;
                    "
                >
                    Voltar
                </button>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
        
        console.log('✅ Modal adicionado ao DOM');
        
        // Aguardar o DOM estar pronto
        setTimeout(() => {
            const passwordInput = document.getElementById('financial-password');
            const verifyBtn = document.getElementById('verify-password');
            const cancelBtn = document.getElementById('cancel-access');
            
            console.log('🔍 Elementos encontrados:', {
                passwordInput: !!passwordInput,
                verifyBtn: !!verifyBtn,
                cancelBtn: !!cancelBtn
            });
            
            if (!passwordInput || !verifyBtn || !cancelBtn) {
                console.error('❌ Elementos não encontrados!');
                return;
            }
            
            passwordInput.focus();
            
            const verifyPassword = () => {
                console.log('🔐 Verificando senha...');
                const password = passwordInput.value;
                console.log('📝 Senha digitada:', password ? '***' : '(vazio)');
                
                if (password === this.PASSWORD) {
                    console.log('✅ Senha correta!');
                    this.isAuthenticated = true;
                    sessionStorage.setItem('financeiro_auth_time', Date.now().toString());
                    modal.remove();
                    
                    alert('✅ Acesso autorizado! Carregando módulo...');
                    
                    // Aguardar um pouco antes de reiniciar
                    setTimeout(() => {
                        this.init();
                    }, 100);
                } else {
                    console.warn('❌ Senha incorreta');
                    alert('❌ Senha incorreta! A senha é: 219520');
                    passwordInput.value = '';
                    passwordInput.style.borderColor = '#dc3545';
                    passwordInput.placeholder = 'Senha incorreta! Tente novamente';
                    passwordInput.focus();
                    
                    if (navigator.vibrate) {
                        navigator.vibrate([100, 50, 100]);
                    }
                    
                    setTimeout(() => {
                        passwordInput.style.borderColor = '#ddd';
                        passwordInput.placeholder = 'Digite a senha';
                    }, 2000);
                }
            };
            
            console.log('🔗 Anexando event listeners...');
            
            verifyBtn.onclick = (e) => {
                console.log('🖱️ Botão Acessar clicado');
                e.preventDefault();
                e.stopPropagation();
                verifyPassword();
            };
            
            passwordInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    console.log('⌨️ Enter pressionado');
                    e.preventDefault();
                    verifyPassword();
                }
            };
            
            cancelBtn.onclick = () => {
                console.log('❌ Botão Voltar clicado');
                modal.remove();
                if (window.moduleManager) {
                    window.moduleManager.navigateTo('dashboard');
                }
            };
            
            console.log('✅ Event listeners anexados');
        }, 50);
    }
    
    async loadCustomCategories() {
        try {
            const saved = localStorage.getItem('financial_custom_categories');
            if (saved) {
                this.customCategories = JSON.parse(saved);
                console.log('📂 Categorias personalizadas carregadas:', this.customCategories);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar categorias:', error);
            this.customCategories = [];
        }
    }
    
    async saveCustomCategory(category) {
        try {
            if (!category || category.trim() === '') return;
            
            const cleanCategory = category.trim();
            
            // Verificar se já existe
            if (this.customCategories.includes(cleanCategory)) {
                console.log('ℹ️ Categoria já existe:', cleanCategory);
                return;
            }
            
            // Adicionar e salvar
            this.customCategories.push(cleanCategory);
            localStorage.setItem('financial_custom_categories', JSON.stringify(this.customCategories));
            console.log('✅ Categoria salva:', cleanCategory);
        } catch (error) {
            console.error('❌ Erro ao salvar categoria:', error);
        }
    }

    renderInterface() {
        const container = document.getElementById('financeiro-page');
        if (!container) return;

        container.innerHTML = `
            <div class="financeiro-container">
                <div class="page-header">
                    <h2>Gestão Financeira</h2>
                    <div class="page-actions">
                        <button class="btn btn-danger" id="delete-all-transactions" title="Excluir todas as transações">
                            <i class="fas fa-trash-alt"></i> Excluir Tudo
                        </button>
                        <button class="btn btn-secondary" id="export-financial">
                            <i class="fas fa-download"></i> Exportar
                        </button>
                        <button class="btn btn-primary" id="add-transaction">
                            <i class="fas fa-plus"></i> Nova Transação
                        </button>
                    </div>
                </div>

                <!-- Abas de Navegação -->
                <div class="financial-tabs">
                    <button class="tab-btn ${this.currentView === 'transactions' ? 'active' : ''}" data-tab="transactions">
                        <i class="fas fa-exchange-alt"></i> Transações
                    </button>
                    <button class="tab-btn ${this.currentView === 'bills' ? 'active' : ''}" data-tab="bills">
                        <i class="fas fa-file-invoice-dollar"></i> Contas a Pagar
                        <span class="badge" id="bills-badge">0</span>
                    </button>
                    <button class="tab-btn ${this.currentView === 'debts' ? 'active' : ''}" data-tab="debts">
                        <i class="fas fa-exclamation-triangle"></i> Dívidas Pendentes
                        <span class="badge badge-danger" id="debts-badge">0</span>
                    </button>
                    <button class="tab-btn ${this.currentView === 'health' ? 'active' : ''}" data-tab="health">
                        <i class="fas fa-heartbeat"></i> Saúde Financeira
                    </button>
                </div>

                <!-- Conteúdo da Aba Transações -->
                <div class="tab-content ${this.currentView === 'transactions' ? 'active' : ''}" id="transactions-tab">
                    ${this.renderTransactionsTab()}
                </div>

                <!-- Conteúdo da Aba Contas a Pagar -->
                <div class="tab-content ${this.currentView === 'bills' ? 'active' : ''}" id="bills-tab">
                    ${this.renderBillsTab()}
                </div>

                <!-- Conteúdo da Aba Dívidas -->
                <div class="tab-content ${this.currentView === 'debts' ? 'active' : ''}" id="debts-tab">
                    ${this.renderDebtsTab()}
                </div>

                <!-- Conteúdo da Aba Saúde Financeira -->
                <div class="tab-content ${this.currentView === 'health' ? 'active' : ''}" id="health-tab">
                    ${this.renderHealthTab()}
                </div>
            </div>
        `;
        
        // Adicionar estilos
        this.addFinancialStyles();
    }

    renderTransactionsTab() {
        return ` Cards de resumo -->
                <div class="financial-summary">
                    <div class="stat-card income">
                        <div class="stat-icon"><i class="fas fa-arrow-up"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Receitas Hoje</span>
                            <span class="stat-value" id="income-today">R$ 0,00</span>
                            <span class="stat-change" id="income-change">+0%</span>
                        </div>
                    </div>
                    
                    <div class="stat-card expense">
                        <div class="stat-icon"><i class="fas fa-arrow-down"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Despesas Hoje</span>
                            <span class="stat-value" id="expense-today">R$ 0,00</span>
                            <span class="stat-change" id="expense-change">+0%</span>
                        </div>
                    </div>
                    
                    <div class="stat-card balance">
                        <div class="stat-icon"><i class="fas fa-wallet"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Lucro Líquido</span>
                            <span class="stat-value" id="balance-today">R$ 0,00</span>
                            <span class="stat-change" id="balance-change">+0%</span>
                        </div>
                    </div>
                    
                    <div class="stat-card margin">
                        <div class="stat-icon"><i class="fas fa-percentage"></i></div>
                        <div class="stat-info">
                            <span class="stat-label">Margem de Lucro</span>
                            <span class="stat-value" id="margin-today">0%</span>
                            <span class="stat-change" id="margin-change">+0%</span>
                        </div>
                    </div>
                </div>

                <!-- Filtros -->
                <div class="financial-filters">
                    <div class="filter-group">
                        <label>Período:</label>
                        <select id="period-filter">
                            <option value="today">Hoje</option>
                            <option value="week">Esta Semana</option>
                            <option value="month" selected>Este Mês</option>
                            <option value="year">Este Ano</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label>Tipo:</label>
                        <select id="type-filter">
                            <option value="all">Todos</option>
                            <option value="income">Receitas</option>
                            <option value="expense">Despesas</option>
                        </select>
                    </div>

                    <div class="filter-group" id="custom-dates" style="display: none;">
                        <input type="date" id="start-date">
                        <input type="date" id="end-date">
                        <button class="btn btn-sm btn-primary" id="apply-custom-dates">Aplicar</button>
                    </div>
                </div>

                <!-- Gráfico -->
                <div class="financial-chart">
                    <canvas id="financial-canvas" width="800" height="300"></canvas>
                </div>

                <!-- Tabela de transações -->
                <div class="transactions-section">
                    <h3>Transações Recentes</h3>
                    <div class="transactions-table-container">
                        <table class="transactions-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Tipo</th>
                                    <th>Descrição</th>
                                    <th>Categoria</th>
                                    <th>Valor</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="transactions-tbody">
                                <tr>
                                    <td colspan="6" class="text-center">Carregando...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Resumo por forma de pagamento -->
                <div class="payment-methods-summary">
                    <h3>Receitas por Forma de Pagamento</h3>
                    <div id="payment-methods-chart"></div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        console.log('🔧 Configurando event listeners do Financeiro...');
        
        // Event delegation para botões
        document.addEventListener('click', (e) => {
            // Navegação entre tabs
            if (e.target.classList.contains('tab-btn') || e.target.closest('.tab-btn')) {
                const btn = e.target.classList.contains('tab-btn') ? e.target : e.target.closest('.tab-btn');
                const tab = btn.dataset.tab;
                if (tab) this.switchTab(tab);
            }
            
            // Botão adicionar transação
            if (e.target.id === 'add-transaction' || e.target.closest('#add-transaction')) {
                e.preventDefault();
                console.log('🆕 Botão Nova Transação clicado!');
                if (window.financeiroModule) {
                    window.financeiroModule.showTransactionModal();
                } else {
                    console.error('❌ financeiroModule não encontrado');
                }
            }
            
            // Botão adicionar conta
            if (e.target.id === 'add-bill' || e.target.closest('#add-bill')) {
                e.preventDefault();
                if (window.financeiroModule) {
                    window.financeiroModule.showBillModal();
                }
            }
            
            // Botão adicionar dívida
            if (e.target.id === 'add-debt' || e.target.closest('#add-debt')) {
                e.preventDefault();
                if (window.financeiroModule) {
                    window.financeiroModule.showDebtModal();
                }
            }
            
            // Botão exportar
            if (e.target.id === 'export-financial' || e.target.closest('#export-financial')) {
                e.preventDefault();
                console.log('📥 Botão Exportar clicado!');
                if (window.financeiroModule) {
                    window.financeiroModule.exportData();
                } else {
                    console.error('❌ financeiroModule não encontrado');
                }
            }
            
            // Botão excluir todas as transações
            if (e.target.id === 'delete-all-transactions' || e.target.closest('#delete-all-transactions')) {
                e.preventDefault();
                console.log('🗑️ Botão Excluir Tudo clicado!');
                if (window.financeiroModule) {
                    window.financeiroModule.deleteAllTransactions();
                } else {
                    console.error('❌ financeiroModule não encontrado');
                }
            }
        });

        // Filtro de período
        const periodFilter = document.getElementById('period-filter');
        if (periodFilter) {
            periodFilter.addEventListener('change', (e) => {
                this.currentPeriod = e.target.value;
                if (e.target.value === 'custom') {
                    document.getElementById('custom-dates').style.display = 'flex';
                } else {
                    document.getElementById('custom-dates').style.display = 'none';
                    this.loadTransactions();
                }
            });
        }

        // Filtro de tipo
        const typeFilter = document.getElementById('type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.renderTransactions();
                this.updateStats();
            });
        }

        // Datas personalizadas
        const applyCustomDates = document.getElementById('apply-custom-dates');
        if (applyCustomDates) {
            applyCustomDates.addEventListener('click', () => this.loadTransactions());
        }
        
        // Filtro de status de contas
        const billsStatusFilter = document.getElementById('bills-status-filter');
        if (billsStatusFilter) {
            billsStatusFilter.addEventListener('change', (e) => {
                this.renderBillsList(e.target.value);
            });
        }
        
        // Event delegation para botões de dívidas
        const self = this;
        document.addEventListener('click', function(e) {
            const target = e.target.closest('.btn-add-payment');
            if (target) {
                console.log('🎯 Botão Adicionar Pagamento clicado!', target);
                e.preventDefault();
                e.stopPropagation();
                const debtId = target.dataset.debtId;
                console.log('📋 Debt ID:', debtId);
                if (debtId) {
                    console.log('✅ Chamando showPartialPaymentModal...');
                    self.showPartialPaymentModal(debtId);
                } else {
                    console.error('❌ Debt ID não encontrado!');
                }
            }
        });

        console.log('✅ Event listeners configurados (incluindo delegação)');
    }

    async loadTransactions() {
        try {
            // Carregar pedidos como receitas
            const orders = await getFromDatabase('orders');
            const financial = await getFromDatabase('financial') || [];
            
            // Filtrar apenas transações (não contas a pagar) E que não foram deletadas
            const financialTransactions = financial.filter(item => 
                item.recordType !== 'bill' && !item.deleted && item.status !== 'deleted'
            );
            
            // Converter pedidos em transações de receita
            const orderTransactions = orders.map(order => ({
                id: order.id,
                type: 'income',
                date: order.createdAt || order.date,
                description: `Pedido #${order.number || order.id.slice(-6)}`,
                category: 'Vendas',
                amount: order.total || 0,
                paymentMethod: order.paymentMethod,
                isOrder: true
            }));

            this.transactions = [...orderTransactions, ...financialTransactions];
            this.renderTransactions();
            this.updateStats();
            this.drawChart();
            
            // Renderizar gráfico Chart.js se disponível
            if (typeof Chart !== 'undefined') {
                this.renderFinancialChart();
            }
            
            console.log(`💰 ${this.transactions.length} transações carregadas (deletadas filtradas)`);
        } catch (error) {
            console.error('Erro ao carregar transações:', error);
        }
    }

    renderTransactions() {
        const tbody = document.getElementById('transactions-tbody');
        if (!tbody) return;

        const filtered = this.filterTransactions();
        
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-receipt"></i>
                            <p>Nenhuma transação encontrada</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(t => `
            <tr class="${t.type}">
                <td>${formatDateTime(t.date)}</td>
                <td>
                    <span class="badge badge-${t.type === 'income' ? 'success' : 'danger'}">
                        <i class="fas fa-arrow-${t.type === 'income' ? 'up' : 'down'}"></i>
                        ${t.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                </td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td class="amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                </td>
                <td>
                    ${!t.isOrder ? `
                        <button class="btn btn-sm btn-secondary" onclick="financeiroModule.editTransaction('${t.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="financeiroModule.deleteTransaction('${t.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : '<span class="text-muted">Pedido</span>'}
                </td>
            </tr>
        `).join('');
    }

    filterTransactions() {
        let filtered = [...this.transactions];

        // Filtrar por tipo
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(t => t.type === this.currentFilter);
        }

        // Filtrar por período
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (this.currentPeriod) {
            case 'today':
                filtered = filtered.filter(t => {
                    const tDate = new Date(t.date);
                    return tDate >= today;
                });
                break;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                filtered = filtered.filter(t => new Date(t.date) >= weekAgo);
                break;
            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                filtered = filtered.filter(t => new Date(t.date) >= monthStart);
                break;
            case 'year':
                const yearStart = new Date(now.getFullYear(), 0, 1);
                filtered = filtered.filter(t => new Date(t.date) >= yearStart);
                break;
        }

        // Ordenar por data (mais recente primeiro)
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        return filtered;
    }

    updateStats() {
        const filtered = this.filterTransactions();
        
        const income = filtered
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expense = filtered
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const balance = income - expense;
        const margin = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;

        // Atualizar UI
        this.updateElement('income-today', formatCurrency(income));
        this.updateElement('expense-today', formatCurrency(expense));
        this.updateElement('balance-today', formatCurrency(balance));
        this.updateElement('margin-today', `${margin}%`);

        console.log('📊 Stats atualizadas:', { income, expense, balance, margin });
    }

    updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    drawChart() {
        const canvas = document.getElementById('financial-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Limpar canvas
        ctx.clearRect(0, 0, width, height);

        // Agrupar transações por dia dos últimos 7 dias
        const days = [];
        const incomeByDay = [];
        const expenseByDay = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            
            const dayTransactions = this.transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate >= date && tDate < nextDay;
            });
            
            days.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
            incomeByDay.push(dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0));
            expenseByDay.push(dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));
        }

        // Desenhar gráfico de barras
        const maxValue = Math.max(...incomeByDay, ...expenseByDay, 100);
        const barWidth = (width / days.length) / 2 - 20;
        const padding = 50;

        // Título
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Receitas vs Despesas (7 dias)', 20, 30);

        // Linhas de grade
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (height - padding * 2) * (i / 5);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - 20, y);
            ctx.stroke();
        }

        // Barras
        days.forEach((day, index) => {
            const x = padding + (index * (width - padding - 20) / days.length);
            
            // Receita (verde)
            const incomeHeight = (incomeByDay[index] / maxValue) * (height - padding * 2);
            ctx.fillStyle = '#28a745';
            ctx.fillRect(x, height - padding - incomeHeight, barWidth, incomeHeight);
            
            // Despesa (vermelha)
            const expenseHeight = (expenseByDay[index] / maxValue) * (height - padding * 2);
            ctx.fillStyle = '#dc3545';
            ctx.fillRect(x + barWidth + 5, height - padding - expenseHeight, barWidth, expenseHeight);
            
            // Label do dia
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.fillText(day, x, height - padding + 20);
        });

        // Legenda
        ctx.fillStyle = '#28a745';
        ctx.fillRect(width - 150, 20, 20, 20);
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText('Receitas', width - 125, 35);

        ctx.fillStyle = '#dc3545';
        ctx.fillRect(width - 150, 45, 20, 20);
        ctx.fillStyle = '#333';
        ctx.fillText('Despesas', width - 125, 60);

        console.log('📈 Gráfico desenhado');
    }

    showTransactionModal(transaction = null) {
        console.log('🎯 showTransactionModal chamado!', transaction);
        
        // CRÍTICO: Remover qualquer modal anterior
        const existingModals = document.querySelectorAll('.modal');
        existingModals.forEach(m => {
            console.log('🗑️ Removendo modal anterior');
            m.remove();
        });
        
        // Formatar data para input type="date" (YYYY-MM-DD)
        const getDateValue = () => {
            if (transaction?.date) {
                const d = new Date(transaction.date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const dateValue = getDateValue();
        
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        console.log('📦 Modal createElement criado:', modal);
        
        modal.innerHTML = `
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>${transaction ? 'Editar Transação' : 'Nova Transação'}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <form id="transaction-form" class="modal-body">
                    <div class="form-group">
                        <label>Tipo *</label>
                        <select id="transaction-type" name="type" required>
                            <option value="income" ${transaction?.type === 'income' ? 'selected' : ''}>Receita</option>
                            <option value="expense" ${transaction?.type === 'expense' ? 'selected' : ''}>Despesa</option>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Descrição *</label>
                            <input type="text" name="description" value="${transaction?.description || ''}" placeholder="Ex: Compra de ingredientes">
                        </div>
                        <div class="form-group">
                            <label>Valor *</label>
                            <input type="number" name="amount" step="0.01" min="0" value="${transaction?.amount || ''}" placeholder="0.00">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Categoria *</label>
                            <select id="category-select" name="categorySelect">
                                <option value="">Selecione ou digite abaixo...</option>
                                <optgroup label="Categorias Padrão">
                                    <option value="Vendas" ${transaction?.category === 'Vendas' ? 'selected' : ''}>Vendas</option>
                                    <option value="Fornecedores" ${transaction?.category === 'Fornecedores' ? 'selected' : ''}>Fornecedores</option>
                                    <option value="Salários" ${transaction?.category === 'Salários' ? 'selected' : ''}>Salários</option>
                                    <option value="Aluguel" ${transaction?.category === 'Aluguel' ? 'selected' : ''}>Aluguel</option>
                                    <option value="Energia" ${transaction?.category === 'Energia' ? 'selected' : ''}>Energia</option>
                                    <option value="Água" ${transaction?.category === 'Água' ? 'selected' : ''}>Água</option>
                                    <option value="Internet" ${transaction?.category === 'Internet' ? 'selected' : ''}>Internet</option>
                                    <option value="Marketing" ${transaction?.category === 'Marketing' ? 'selected' : ''}>Marketing</option>
                                    <option value="Manutenção" ${transaction?.category === 'Manutenção' ? 'selected' : ''}>Manutenção</option>
                                    <option value="Outros" ${transaction?.category === 'Outros' ? 'selected' : ''}>Outros</option>
                                </optgroup>
                                ${this.customCategories.length > 0 ? `
                                    <optgroup label="Minhas Categorias">
                                        ${this.customCategories.map(cat => `
                                            <option value="${cat}" ${transaction?.category === cat ? 'selected' : ''}>${cat}</option>
                                        `).join('')}
                                    </optgroup>
                                ` : ''}
                            </select>
                            <input type="text" id="category-input" name="category" placeholder="Ou digite uma categoria personalizada..." value="${transaction?.category || ''}" style="margin-top: 8px;">
                        </div>
                        <div class="form-group">
                            <label>Data *</label>
                            <input type="date" name="date" value="${dateValue}">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Observações</label>
                        <textarea name="notes" rows="3">${transaction?.notes || ''}</textarea>
                    </div>
                </form>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="submit" form="transaction-form" class="btn btn-primary">
                        ${transaction ? 'Atualizar' : 'Salvar'}
                    </button>
                </div>
            </div>
        `;

        console.log('✅ Modal HTML definido, adicionando ao body...');
        document.body.appendChild(modal);
        console.log('✅ Modal adicionado ao DOM!');

        // Event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Sincronizar select e input de categoria
        const categorySelect = modal.querySelector('#category-select');
        const categoryInput = modal.querySelector('#category-input');
        
        // Quando selecionar no dropdown, atualiza o input
        categorySelect.addEventListener('change', (e) => {
            if (e.target.value) {
                categoryInput.value = e.target.value;
            }
        });
        
        // Quando digitar no input, limpa o select
        categoryInput.addEventListener('input', (e) => {
            if (e.target.value) {
                categorySelect.value = '';
            }
        });

        const form = document.getElementById('transaction-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🔵 Formulário submetido!');
            
            // Debug do form
            const formData = new FormData(form);
            console.log('📋 Campos do form:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}: ${value}`);
            }
            
            await this.saveTransaction(form, transaction?.id);
        });
    }

    async saveTransaction(form, transactionId = null) {
        try {
            console.log('💾 Iniciando saveTransaction...');
            const formData = new FormData(form);
            
            // Pegar valores dos campos
            const type = formData.get('type');
            const description = formData.get('description');
            const amount = formData.get('amount');
            const categoryInput = formData.get('category'); // Input tem prioridade
            const categorySelect = formData.get('categorySelect');
            const category = categoryInput && categoryInput.trim() ? categoryInput.trim() : categorySelect;
            const date = formData.get('date');
            
            console.log('📝 Dados do formulário:', {
                type, 
                description, 
                amount, 
                categoryInput, 
                categorySelect, 
                category, 
                date
            });
            
            // Validar campos obrigatórios
            if (!type) {
                console.error('❌ Tipo não selecionado');
                showToast('Selecione o tipo (Receita ou Despesa)', 'error');
                return false;
            }
            
            if (!description || description.trim() === '') {
                console.error('❌ Descrição vazia:', description);
                showToast('Preencha a descrição', 'error');
                return false;
            }
            
            if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
                console.error('❌ Valor inválido:', amount);
                showToast('Preencha um valor maior que zero', 'error');
                return false;
            }
            
            if (!category || category.trim() === '') {
                console.error('❌ Categoria vazia:', category);
                showToast('Selecione ou digite uma categoria', 'error');
                return false;
            }
            
            if (!date) {
                console.error('❌ Data vazia:', date);
                showToast('Selecione a data', 'error');
                return false;
            }
            
            // Salvar categoria personalizada se foi digitada
            if (categoryInput && categoryInput.trim()) {
                await this.saveCustomCategory(categoryInput.trim());
            }
            
            // Converter data mantendo timezone local (YYYY-MM-DD → ISO com hora local)
            const dateObj = new Date(date + 'T12:00:00'); // Meio-dia para evitar mudança de dia
            
            const data = {
                id: transactionId || generateId(),
                type: type,
                description: description.trim(),
                amount: parseFloat(amount),
                category: category,
                date: dateObj.toISOString(),
                notes: formData.get('notes') || '',
                createdAt: transactionId ? undefined : new Date().toISOString()
            };
            
            console.log('💾 Salvando transação:', data);
            console.log('📅 Data original:', date, '→ ISO:', dateObj.toISOString());

            if (transactionId) {
                await updateInDatabase('financial', data);
                console.log('✅ Transação atualizada:', transactionId);
                showToast('Transação atualizada!', 'success');
            } else {
                await saveToDatabase('financial', data);
                console.log('✅ Transação criada:', data.id);
                showToast('Transação criada!', 'success');
            }

            // Fechar modal após sucesso
            console.log('🔒 Fechando modal...');
            const modals = document.querySelectorAll('.modal');
            console.log(`📋 Modals encontrados: ${modals.length}`);
            modals.forEach(m => {
                console.log('🗑️ Removendo modal');
                m.remove();
            });
            
            await this.loadTransactions();
            return true; // Retorna sucesso
        } catch (error) {
            console.error('❌ Erro ao salvar transação:', error);
            console.error('Stack:', error.stack);
            showToast('Erro ao salvar transação: ' + error.message, 'error');
            return false; // Retorna falha
        }
    }

    async deleteTransaction(id) {
        if (!confirm('Deseja realmente excluir esta transação?')) return;

        try {
            await deleteFromDatabase('financial', id);
            showToast('Transação excluída!', 'success');
            await this.loadTransactions();
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            showToast('Erro ao excluir transação', 'error');
        }
    }

    async deleteAllTransactions() {
        // Confirmação dupla para segurança
        const firstConfirm = confirm('⚠️ ATENÇÃO! Você está prestes a EXCLUIR TODAS as transações financeiras.\n\nEsta ação é IRREVERSÍVEL!\n\nDeseja continuar?');
        if (!firstConfirm) {
            console.log('❌ Exclusão cancelada pelo usuário (1ª confirmação)');
            return;
        }

        const secondConfirm = confirm('🚨 ÚLTIMA CONFIRMAÇÃO!\n\nTodas as transações serão PERMANENTEMENTE excluídas.\n\nTem certeza?');
        if (!secondConfirm) {
            console.log('❌ Exclusão cancelada pelo usuário (2ª confirmação)');
            return;
        }

        try {
            console.log('🗑️ Iniciando exclusão de todas as transações...');
            
            // Buscar usando getFromDatabase (já tem permissão)
            console.log('📡 Buscando dados via getFromDatabase...');
            const allData = await getFromDatabase('financial');
            
            console.log('📊 Dados encontrados:', allData);
            
            if (!allData || allData.length === 0) {
                console.log('⚠️ Nenhuma transação encontrada');
                alert('Nenhuma transação encontrada para excluir');
                return;
            }

            const totalRecords = allData.length;
            console.log(`📋 Total de registros a excluir: ${totalRecords}`);

            // Excluir cada registro usando deleteFromDatabase
            let deleteCount = 0;
            const batchSize = 10;
            
            for (let i = 0; i < allData.length; i += batchSize) {
                const batch = allData.slice(i, i + batchSize);
                const promises = batch.map(async (item) => {
                    try {
                        console.log(`🗑️ Excluindo ${deleteCount + 1}/${totalRecords}: ${item.id}`);
                        await deleteFromDatabase('financial', item.id);
                        deleteCount++;
                        console.log(`✅ Excluído: ${item.id}`);
                    } catch (err) {
                        console.error(`❌ Erro ao excluir ${item.id}:`, err);
                    }
                });
                
                await Promise.all(promises);
                console.log(`📊 Progresso: ${deleteCount}/${totalRecords}`);
            }

            console.log('✅ Todos os dados excluídos!');

            // Limpar cache local
            if (window.firebaseService && typeof window.firebaseService.clearCache === 'function') {
                console.log('🧹 Limpando cache local...');
                await window.firebaseService.clearCache('financial');
            }

            // Limpar arrays locais
            this.transactions = [];
            this.bills = [];
            this.debts = [];

            // Recarregar interface
            console.log('🔄 Recarregando interface...');
            await this.loadTransactions();
            await this.loadBills();
            await this.loadDebts();

            console.log(`✅ ${deleteCount} transações excluídas!`);
            alert(`✅ ${deleteCount} transações excluídas com sucesso!`);
            showToast(`✅ ${deleteCount} transações excluídas!`, 'success');
            
        } catch (error) {
            console.error('❌ Erro ao excluir transações:', error);
            alert('❌ Erro ao excluir transações: ' + error.message);
            showToast('Erro ao excluir transações', 'error');
        }
    }

    editTransaction(id) {
        const transaction = this.transactions.find(t => t.id === id && !t.isOrder);
        if (transaction) {
            this.showTransactionModal(transaction);
        }
    }

    exportData() {
        const filtered = this.filterTransactions();
        const csv = [
            ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor'].join(';'),
            ...filtered.map(t => [
                formatDateTime(t.date),
                t.type === 'income' ? 'Receita' : 'Despesa',
                t.description,
                t.category,
                t.amount.toFixed(2)
            ].join(';'))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `financeiro_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showToast('Dados exportados!', 'success');
    }

    // ============ SISTEMA DE CONTAS A PAGAR ============
    
    switchTab(tabName) {
        this.currentView = tabName;
        
        // Atualizar botões
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Atualizar conteúdo
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        // Recarregar dados
        if (tabName === 'bills') {
            this.loadBills();
        } else if (tabName === 'debts') {
            this.loadDebts();
        } else if (tabName === 'health') {
            this.renderHealthDashboard();
        } else {
            this.loadTransactions();
        }
    }
    
    async loadBills() {
        try {
            // Buscar contas do tipo 'bill' na store financial (excluindo deletadas)
            const financial = await getFromDatabase('financial') || [];
            this.bills = financial.filter(item => 
                item.recordType === 'bill' && !item.deleted && item.status !== 'deleted'
            );
            
            // Atualizar status de contas atrasadas E CONVERTER EM DÍVIDAS
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const billsToConvert = [];
            
            this.bills.forEach(async bill => {
                if (bill.status === 'pending') {
                    const dueDate = new Date(bill.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    
                    // Se passou mais de 3 dias, converter em dívida
                    const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff > 3) {
                        billsToConvert.push(bill);
                    } else if (dueDate < today) {
                        bill.status = 'overdue';
                        await updateInDatabase('financial', bill);
                    }
                }
            });
            
            // Converter contas atrasadas em dívidas
            for (const bill of billsToConvert) {
                await this.convertBillToDebt(bill);
            }
            
            this.updateBillsBadge();
            this.renderBillsList();
            this.updateBillsStats();
            this.checkOverdueBills();
            
            console.log(`📋 ${this.bills.length} contas carregadas`);
        } catch (error) {
            console.error('Erro ao carregar contas:', error);
        }
    }
    
    async loadDebts() {
        try {
            const financial = await getFromDatabase('financial') || [];
            this.debts = financial.filter(item => 
                item.recordType === 'debt' && !item.deleted && item.status !== 'deleted'
            );
            
            // Atualizar status de dívidas vencidas
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            this.debts.forEach(async debt => {
                if (debt.status !== 'paid') {
                    const dueDate = new Date(debt.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    
                    if (dueDate < today) {
                        debt.status = 'overdue';
                        await updateInDatabase('financial', debt);
                    }
                }
            });
            
            this.renderDebtsList();
            this.updateDebtsStats();
            this.updateDebtsBadge();
            
            console.log(`⚠️ ${this.debts.length} dívidas carregadas`);
        } catch (error) {
            console.error('Erro ao carregar dívidas:', error);
        }
    }
    
    updateDebtsBadge() {
        const badge = document.getElementById('debts-badge');
        if (badge) {
            const unpaidCount = this.debts.filter(d => d.status !== 'paid').length;
            badge.textContent = unpaidCount;
            badge.style.display = unpaidCount > 0 ? 'inline-block' : 'none';
        }
    }
    
    updateBillsBadge() {
        const badge = document.getElementById('bills-badge');
        if (badge) {
            const pendingCount = this.bills.filter(b => b.status === 'pending' || b.status === 'overdue').length;
            badge.textContent = pendingCount;
            badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }
    }
    
    showBillModal(bill = null) {
        const existingModals = document.querySelectorAll('.modal');
        existingModals.forEach(m => m.remove());
        
        const getDateValue = () => {
            if (bill?.dueDate) {
                return new Date(bill.dueDate).toISOString().slice(0, 10);
            }
            return new Date().toISOString().slice(0, 10);
        };
        
        // Gerar options de prioridade
        const priorityOptions = Object.entries(this.priorities).map(([key, data]) => 
            `<option value="${key}" ${bill?.priority === key ? 'selected' : ''}>
                ${data.icon} ${data.label}
            </option>`
        ).join('');
        
        // Gerar options de categorias obrigatórias
        const mandatoryCategoriesOptions = this.mandatoryCategories.map(cat =>
            `<option value="${cat.name}" data-priority="${cat.priority}">
                ${this.priorities[cat.priority].icon} ${cat.name} (${cat.description})
            </option>`
        ).join('');
        
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        
        modal.innerHTML = `
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
                    <h3 style="margin: 0;">${bill ? '✏️ Editar Conta' : '➕ Nova Conta a Pagar'}</h3>
                    <button class="close-modal" style="background: none; border: none; font-size: 28px; cursor: pointer;">&times;</button>
                </div>
                <form id="bill-form" style="display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Categoria *</label>
                        <select id="bill-category-select" name="category" required
                                style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                            <option value="">Selecione uma categoria</option>
                            <optgroup label="📌 Categorias Obrigatórias">
                                ${mandatoryCategoriesOptions}
                            </optgroup>
                            <optgroup label="📁 Outras Categorias">
                                ${this.customCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                                <option value="NOVA">+ Nova Categoria</option>
                            </optgroup>
                        </select>
                    </div>
                    
                    <div id="custom-category-input" style="display: none;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Nome da Nova Categoria</label>
                        <input type="text" id="new-category-name" placeholder="Digite o nome da categoria"
                               style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Prioridade *</label>
                        <select name="priority" id="bill-priority" required
                                style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                            ${priorityOptions}
                        </select>
                        <small style="color: #666; display: block; margin-top: 5px;">
                            🔴 CRÍTICA: Despesas essenciais para o funcionamento<br>
                            🟠 ALTA: Importantes mas com alguma flexibilidade<br>
                            🟡 MÉDIA: Podem ser adiadas se necessário<br>
                            🟢 BAIXA: Melhorias e investimentos não urgentes
                        </small>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Descrição *</label>
                        <input type="text" name="description" value="${bill?.description || ''}" required 
                               placeholder="Ex: Aluguel - Janeiro/2025"
                               style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Valor *</label>
                            <input type="number" name="amount" value="${bill?.amount || ''}" step="0.01" min="0.01" required 
                                   placeholder="0,00"
                                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Vencimento *</label>
                            <input type="date" name="dueDate" value="${getDateValue()}" required
                                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                        </div>
                    </div>
                    
                    <div>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" name="recurring" ${bill?.recurring ? 'checked' : ''}>
                            <span>Conta recorrente (repetir mensalmente)</span>
                        </label>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Observações</label>
                        <textarea name="notes" rows="3" placeholder="Observações adicionais..."
                                  style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; resize: vertical;">${bill?.notes || ''}</textarea>
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
                        <button type="button" class="btn btn-outline close-modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary">${bill ? '💾 Salvar' : '➕ Adicionar'}</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-select priority based on category
        const categorySelect = document.getElementById('bill-category-select');
        const prioritySelect = document.getElementById('bill-priority');
        const customCategoryInput = document.getElementById('custom-category-input');
        const newCategoryName = document.getElementById('new-category-name');
        
        if (bill?.category) {
            categorySelect.value = bill.category;
        }
        
        categorySelect.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            const priority = selectedOption.dataset.priority;
            
            if (e.target.value === 'NOVA') {
                customCategoryInput.style.display = 'block';
                newCategoryName.required = true;
                newCategoryName.focus();
            } else {
                customCategoryInput.style.display = 'none';
                newCategoryName.required = false;
                
                if (priority) {
                    prioritySelect.value = priority;
                }
            }
        });
        
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        
        document.getElementById('bill-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            let categoryValue = categorySelect.value;
            if (categoryValue === 'NOVA') {
                categoryValue = newCategoryName.value.trim();
                if (!categoryValue) {
                    showToast('Digite o nome da nova categoria', 'error');
                    return;
                }
                await this.saveCustomCategory(categoryValue);
            }
            
            // Update form with actual category
            const tempInput = document.createElement('input');
            tempInput.type = 'hidden';
            tempInput.name = 'actualCategory';
            tempInput.value = categoryValue;
            e.target.appendChild(tempInput);
            
            await this.saveBill(e.target, bill?.id);
        });
    }
    
    async saveBill(form, billId = null) {
        try {
            const formData = new FormData(form);
            
            const description = formData.get('description');
            const amount = formData.get('amount');
            let category = formData.get('actualCategory') || formData.get('category');
            const dueDate = formData.get('dueDate');
            const priority = formData.get('priority');
            const recurring = formData.get('recurring') === 'on';
            const notes = formData.get('notes') || '';
            
            if (!description || !amount || !category || !dueDate || !priority) {
                showToast('Preencha todos os campos obrigatórios', 'error');
                return;
            }
            
            const dueDateObj = new Date(dueDate + 'T12:00:00');
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const dueDay = new Date(dueDateObj);
            dueDay.setHours(0, 0, 0, 0);
            
            let status = 'pending';
            if (dueDay < now) status = 'overdue';
            
            const data = {
                id: billId || generateId(),
                recordType: 'bill', // Identifica como conta a pagar
                description: description.trim(),
                amount: parseFloat(amount),
                originalAmount: parseFloat(amount), // Valor original para controle de pagamentos parciais
                remainingAmount: parseFloat(amount), // Saldo devedor inicial
                payments: [], // Histórico de pagamentos parciais
                category: category.trim(),
                priority: priority,
                dueDate: dueDateObj.toISOString(),
                status: status,
                recurring: recurring,
                notes: notes,
                createdAt: billId ? undefined : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            if (billId) {
                await updateInDatabase('financial', data);
                showToast('Conta atualizada!', 'success');
            } else {
                await saveToDatabase('financial', data);
                showToast('Conta criada!', 'success');
            }
            
            document.querySelectorAll('.modal').forEach(m => m.remove());
            await this.loadBills();
        } catch (error) {
            console.error('Erro ao salvar conta:', error);
            showToast('Erro ao salvar conta', 'error');
        }
    }
    
    renderBillsList(filter = 'all') {
        const container = document.getElementById('bills-list');
        if (!container) return;
        
        let bills = [...this.bills];
        
        if (filter !== 'all') {
            bills = bills.filter(b => b.status === filter);
        }
        
        // Ordenar por prioridade primeiro, depois por data
        bills.sort((a, b) => {
            const priorityA = this.priorities[a.priority || 'MEDIA'].level;
            const priorityB = this.priorities[b.priority || 'MEDIA'].level;
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB; // Menor level = maior prioridade
            }
            
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
        
        if (bills.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">Nenhuma conta encontrada</p>';
            return;
        }
        
        container.innerHTML = bills.map(bill => {
            const dueDate = new Date(bill.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(dueDate);
            due.setHours(0, 0, 0, 0);
            const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
            
            let statusClass = bill.status;
            let statusText = 'Pendente';
            let statusIcon = '⏱️';
            
            if (bill.status === 'paid') {
                statusText = 'Paga';
                statusIcon = '✅';
            } else if (bill.status === 'partial') {
                statusText = 'Pagamento Parcial';
                statusIcon = '💰';
            } else if (bill.status === 'overdue') {
                statusText = 'Atrasada';
                statusIcon = '⚠️';
            } else if (daysUntilDue <= 3 && daysUntilDue >= 0) {
                statusText = `Vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'}`;
                statusIcon = '⏰';
            }
            
            // Obter prioridade
            const priority = this.priorities[bill.priority || 'MEDIA'];
            
            // Calcular progresso de pagamentos se existirem
            const hasPartialPayments = bill.payments && bill.payments.length > 0;
            const originalAmount = bill.originalAmount || bill.amount;
            const remainingAmount = bill.remainingAmount !== undefined ? bill.remainingAmount : bill.amount;
            const paidAmount = originalAmount - remainingAmount;
            const paymentProgress = originalAmount > 0 ? (paidAmount / originalAmount) * 100 : 0;
            
            return `
                <div class="bill-card ${statusClass}" style="border-left: 4px solid ${priority.color};">
                    <div class="bill-header">
                        <div class="bill-title">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <span style="
                                    display: inline-flex;
                                    align-items: center;
                                    padding: 4px 12px;
                                    background: ${priority.color}15;
                                    border-radius: 20px;
                                    font-size: 12px;
                                    font-weight: bold;
                                    color: ${priority.color};
                                ">
                                    ${priority.icon} ${priority.label}
                                </span>
                                <span class="bill-category" style="background: #f0f0f0; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${bill.category}</span>
                            </div>
                            <h4 style="margin: 5px 0 0 0;">${bill.description}</h4>
                        </div>
                        <span class="bill-status ${statusClass}">
                            ${statusIcon} ${statusText}
                        </span>
                    </div>
                    
                    <div class="bill-details">
                        <div class="bill-info">
                            <span class="bill-amount">${formatCurrency(originalAmount)}</span>
                            ${hasPartialPayments ? `
                                <div style="margin-top: 10px;">
                                    <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px;">
                                        <span style="color: #2e7d32; font-weight: 600;">Pago: ${formatCurrency(paidAmount)}</span>
                                        <span style="color: #d32f2f; font-weight: 600;">Restante: ${formatCurrency(remainingAmount)}</span>
                                    </div>
                                    <div style="background: #e0e0e0; height: 8px; border-radius: 10px; overflow: hidden;">
                                        <div style="background: linear-gradient(90deg, #4caf50, #8bc34a); height: 100%; width: ${paymentProgress}%; transition: width 0.3s;"></div>
                                    </div>
                                    <small style="color: #666; display: block; margin-top: 5px;">
                                        ${bill.payments.length} pagamento${bill.payments.length > 1 ? 's' : ''} realizado${bill.payments.length > 1 ? 's' : ''}
                                    </small>
                                </div>
                            ` : ''}
                            <span class="bill-due">Vencimento: ${formatDate(bill.dueDate)}</span>
                            ${bill.recurring ? '<span class="bill-recurring">🔄 Recorrente</span>' : ''}
                        </div>
                        ${bill.notes ? `<p style="margin: 10px 0 0; padding: 10px; background: #f9f9f9; border-radius: 5px; font-size: 13px; color: #666;">${bill.notes}</p>` : ''}
                    </div>
                    
                    <div class="bill-actions">
                        ${bill.status !== 'paid' ? `
                            <button class="btn btn-primary btn-sm" onclick="financeiroModule.showBillPartialPaymentModal('${bill.id}')" style="background: #1976d2;">
                                <i class="fas fa-coins"></i> Pagamento Parcial
                            </button>
                            <button class="btn btn-success btn-sm" onclick="financeiroModule.markBillAsPaid('${bill.id}')">
                                <i class="fas fa-check"></i> Marcar como Paga
                            </button>
                        ` : ''}
                        <button class="btn btn-outline btn-sm" onclick='financeiroModule.showBillModal(${JSON.stringify(bill).replace(/'/g, "\\'")})'>
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="financeiroModule.deleteBill('${bill.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async markBillAsPaid(billId) {
        try {
            const bill = this.bills.find(b => b.id === billId);
            if (!bill) return;
            
            // Inicializar campos se não existirem (para contas antigas)
            if (!bill.originalAmount) bill.originalAmount = bill.amount;
            if (!bill.payments) bill.payments = [];
            
            // Se já tem pagamentos parciais, adicionar o pagamento final
            if (bill.payments.length > 0 && bill.remainingAmount > 0) {
                const finalPayment = {
                    date: new Date().toISOString(),
                    amount: bill.remainingAmount,
                    notes: 'Pagamento final'
                };
                bill.payments.push(finalPayment);
            }
            
            bill.status = 'paid';
            bill.remainingAmount = 0;
            bill.paidAt = new Date().toISOString();
            bill.updatedAt = new Date().toISOString();
            
            await updateInDatabase('financial', bill);
            
            // Registrar como despesa automaticamente
            const paymentAmount = bill.payments && bill.payments.length > 0 ? bill.remainingAmount : (bill.originalAmount || bill.amount);
            await this.registerPaymentAsExpense(
                `Pagamento: ${bill.description}`,
                paymentAmount,
                bill.category || 'Contas a Pagar',
                `Conta paga em ${formatDate(new Date())}${bill.notes ? ' - ' + bill.notes : ''}`
            );
            
            showToast('Conta marcada como paga e registrada como despesa!', 'success');
            
            if (bill.recurring) {
                const nextDueDate = new Date(bill.dueDate);
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                
                const nextBill = {
                    id: generateId(),
                    recordType: 'bill',
                    description: bill.description,
                    amount: bill.originalAmount || bill.amount,
                    originalAmount: bill.originalAmount || bill.amount,
                    remainingAmount: bill.originalAmount || bill.amount,
                    payments: [],
                    category: bill.category,
                    dueDate: nextDueDate.toISOString(),
                    status: 'pending',
                    recurring: true,
                    notes: bill.notes,
                    createdAt: new Date().toISOString()
                };
                
                await saveToDatabase('financial', nextBill);
                showToast('Próxima conta recorrente criada!', 'info');
            }
            
            await this.loadBills();
            await this.loadTransactions(); // Recarregar transações para mostrar despesa
        } catch (error) {
            console.error('Erro ao marcar conta:', error);
            showToast('Erro ao marcar conta como paga', 'error');
        }
    }
    
    async deleteBill(billId) {
        if (!confirm('Deseja realmente excluir esta conta?')) return;
        
        try {
            await deleteFromDatabase('financial', billId);
            showToast('Conta excluída!', 'success');
            await this.loadBills();
        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            showToast('Erro ao excluir conta', 'error');
        }
    }
    
    // Função auxiliar para registrar pagamentos como despesas automaticamente
    async registerPaymentAsExpense(description, amount, category, notes = '') {
        try {
            const expenseData = {
                id: generateId(),
                type: 'expense',
                description: description,
                amount: amount,
                category: category,
                date: new Date().toISOString(),
                notes: notes,
                autoGenerated: true, // Flag para identificar despesas geradas automaticamente
                createdAt: new Date().toISOString()
            };
            
            await saveToDatabase('financial', expenseData);
            console.log('✅ Despesa registrada automaticamente:', expenseData);
            return true;
        } catch (error) {
            console.error('❌ Erro ao registrar despesa automática:', error);
            return false;
        }
    }
    
    // Adicionar pagamento parcial a conta
    showBillPartialPaymentModal(billId) {
        console.log('🚀 showBillPartialPaymentModal chamada com ID:', billId);
        
        // Remover modais anteriores
        document.querySelectorAll('.modal').forEach(m => m.remove());
        
        const bill = this.bills.find(b => b.id === billId);
        console.log('🔍 Conta encontrada:', bill);
        
        if (!bill) {
            console.error('❌ Conta não encontrada!');
            showToast('Conta não encontrada!', 'error');
            return;
        }
        
        // Inicializar campos se não existirem (para contas antigas)
        if (!bill.originalAmount) bill.originalAmount = bill.amount;
        if (!bill.remainingAmount && bill.remainingAmount !== 0) bill.remainingAmount = bill.amount;
        if (!bill.payments) bill.payments = [];
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 style="margin: 0; color: #1976d2;">💵 Adicionar Pagamento Parcial</h2>
                    <button class="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <form id="bill-payment-form" style="padding: 20px 25px;">
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div><strong>Categoria:</strong> ${bill.category || 'Não especificada'}</div>
                        <div style="margin-top: 8px;"><strong>Descrição:</strong> ${bill.description}</div>
                        <div style="margin-top: 8px; font-size: 18px; color: #1976d2;">
                            <strong>Valor Original:</strong> ${formatCurrency(bill.originalAmount || bill.amount)}
                        </div>
                        <div style="margin-top: 8px; font-size: 20px; color: #0d47a1; font-weight: bold;">
                            <strong>Saldo Restante:</strong> ${formatCurrency(bill.remainingAmount || bill.amount)}
                        </div>
                    </div>
                    
                    ${bill.payments && bill.payments.length > 0 ? `
                        <div style="margin-bottom: 20px;">
                            <strong style="display: block; margin-bottom: 10px;">📜 Histórico de Pagamentos:</strong>
                            <div style="max-height: 150px; overflow-y: auto; background: #f5f5f5; padding: 10px; border-radius: 6px;">
                                ${bill.payments.map(p => `
                                    <div style="padding: 8px; background: white; margin-bottom: 5px; border-radius: 4px; display: flex; justify-content: space-between;">
                                        <span>${formatDate(p.date)}</span>
                                        <strong style="color: #2e7d32;">${formatCurrency(p.amount)}</strong>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;"><span style="color: red;">*</span> Valor do Pagamento:</label>
                        <input type="number" name="paymentAmount" step="0.01" min="0.01" 
                               max="${bill.remainingAmount || bill.amount}"
                               placeholder="Ex: 50.00" required
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px;">
                        <small style="color: #666; display: block; margin-top: 5px;">Máximo: ${formatCurrency(bill.remainingAmount || bill.amount)}</small>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Observações:</label>
                        <textarea name="paymentNotes" rows="3" placeholder="Forma de pagamento, observações..."
                                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
                        <button type="button" class="btn btn-outline close-modal">Cancelar</button>
                        <button type="submit" class="btn btn-success">✅ Confirmar Pagamento</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        
        document.getElementById('bill-payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addBillPartialPayment(e.target, billId);
            modal.remove();
        });
    }
    
    async addBillPartialPayment(form, billId) {
        try {
            const formData = new FormData(form);
            const paymentAmount = parseFloat(formData.get('paymentAmount'));
            const paymentNotes = formData.get('paymentNotes') || '';
            
            if (!paymentAmount || paymentAmount <= 0) {
                showToast('Valor de pagamento inválido!', 'error');
                return;
            }
            
            const bill = this.bills.find(b => b.id === billId);
            if (!bill) {
                showToast('Conta não encontrada!', 'error');
                return;
            }
            
            // Inicializar estrutura de pagamentos se não existir (para contas antigas)
            if (!bill.payments) bill.payments = [];
            if (!bill.originalAmount) bill.originalAmount = bill.amount;
            if (!bill.remainingAmount && bill.remainingAmount !== 0) bill.remainingAmount = bill.amount;
            
            // Verificar se o pagamento não excede o saldo restante
            if (paymentAmount > bill.remainingAmount) {
                showToast(`Valor maior que o saldo restante (${formatCurrency(bill.remainingAmount)})!`, 'error');
                return;
            }
            
            // Adicionar o pagamento
            const payment = {
                date: new Date().toISOString(),
                amount: paymentAmount,
                notes: paymentNotes
            };
            bill.payments.push(payment);
            
            // Recalcular saldo restante
            const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
            bill.remainingAmount = bill.originalAmount - totalPaid;
            
            // Atualizar status se totalmente pago
            if (bill.remainingAmount <= 0.01) { // Tolerância para arredondamento
                bill.status = 'paid';
                bill.remainingAmount = 0;
                bill.paidAt = new Date().toISOString();
            } else if (bill.payments.length > 0 && bill.status === 'pending') {
                bill.status = 'partial'; // Status para pagamento parcial
            }
            
            bill.updatedAt = new Date().toISOString();
            
            // Salvar no Firebase
            await updateInDatabase('financial', bill);
            
            // Registrar pagamento parcial como despesa automaticamente
            await this.registerPaymentAsExpense(
                `Pagamento Parcial: ${bill.description}`,
                paymentAmount,
                bill.category || 'Contas a Pagar',
                `${paymentNotes ? paymentNotes + ' - ' : ''}Saldo restante: ${formatCurrency(bill.remainingAmount)}`
            );
            
            showToast(`💰 Pagamento de ${formatCurrency(paymentAmount)} registrado como despesa! Saldo: ${formatCurrency(bill.remainingAmount)}`, 'success');
            
            // Recarregar lista
            await this.loadBills();
            await this.loadTransactions(); // Recarregar transações para mostrar despesa
            
        } catch (error) {
            console.error('❌ Erro ao adicionar pagamento:', error);
            showToast('Erro ao adicionar pagamento!', 'error');
        }
    }

    
    // Converter conta atrasada em dívida
    async convertBillToDebt(bill) {
        try {
            console.log(`🔄 Convertendo conta atrasada em dívida: ${bill.description}`);
            
            // Criar dívida a partir da conta
            const debt = {
                id: generateId(),
                recordType: 'debt',
                creditorName: bill.category || 'Não especificado',
                description: `${bill.description} (Vencida em ${formatDate(bill.dueDate)})`,
                originalAmount: bill.amount,
                remainingAmount: bill.amount,
                dueDate: bill.dueDate,
                status: 'pending',
                priority: bill.priority || 'MEDIA',
                payments: [], // Histórico de pagamentos parciais
                notes: `Convertida automaticamente de conta a pagar.\n${bill.notes || ''}`,
                convertedFrom: bill.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Salvar dívida
            await saveToDatabase('financial', debt);
            
            // Marcar conta original como convertida
            bill.status = 'converted';
            bill.convertedToDebt = debt.id;
            bill.updatedAt = new Date().toISOString();
            await updateInDatabase('financial', bill);
            
            console.log(`✅ Conta convertida em dívida: ${debt.id}`);
            showToast(`Conta "${bill.description}" convertida em dívida`, 'warning');
            
        } catch (error) {
            console.error('Erro ao converter conta em dívida:', error);
        }
    }
    
    // ==================== MÉTODOS DE DÍVIDAS ====================
    
    showDebtModal(debt = null) {
        const existingModals = document.querySelectorAll('.modal');
        existingModals.forEach(m => m.remove());
        
        const getDateValue = () => {
            if (debt?.dueDate) {
                return new Date(debt.dueDate).toISOString().slice(0, 10);
            }
            return new Date().toISOString().slice(0, 10);
        };
        
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        
        modal.innerHTML = `
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
                    <h3 style="margin: 0;">${debt ? '✏️ Editar Dívida' : '⚠️ Nova Dívida Pendente'}</h3>
                    <button class="close-modal" style="background: none; border: none; font-size: 28px; cursor: pointer;">&times;</button>
                </div>
                <form id="debt-form" style="display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Credor (Para quem devo?) *</label>
                        <input type="text" name="creditorName" value="${debt?.creditorName || ''}" required 
                               placeholder="Ex: Fornecedor, Banco, etc"
                               style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Descrição da Dívida *</label>
                        <input type="text" name="description" value="${debt?.description || ''}" required 
                               placeholder="Ex: Compra de insumos - Nota 1234"
                               style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Valor Original *</label>
                            <input type="number" name="originalAmount" value="${debt?.originalAmount || debt?.remainingAmount || ''}" step="0.01" min="0.01" required 
                                   placeholder="0,00" ${debt ? 'readonly' : ''}
                                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; ${debt ? 'background: #f5f5f5;' : ''}">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #dc3545;">Saldo Devedor</label>
                            <input type="number" value="${debt?.remainingAmount || debt?.originalAmount || '0.00'}" readonly
                                   style="width: 100%; padding: 10px; border: 2px solid #dc3545; border-radius: 6px; background: #fff5f5; font-weight: bold; color: #dc3545;">
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Vencimento *</label>
                            <input type="date" name="dueDate" value="${getDateValue()}" required
                                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Prioridade *</label>
                            <select name="priority" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px;">
                                <option value="CRITICA" ${debt?.priority === 'CRITICA' ? 'selected' : ''}>🔴 CRÍTICA</option>
                                <option value="ALTA" ${debt?.priority === 'ALTA' ? 'selected' : ''}>🟠 ALTA</option>
                                <option value="MEDIA" ${debt?.priority === 'MEDIA' ? 'selected' : ''}>🟡 MÉDIA</option>
                                <option value="BAIXA" ${debt?.priority === 'BAIXA' ? 'selected' : ''}>🟢 BAIXA</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Observações</label>
                        <textarea name="notes" rows="3" placeholder="Detalhes importantes sobre esta dívida..."
                                  style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; resize: vertical;">${debt?.notes || ''}</textarea>
                    </div>
                    
                    ${debt && debt.payments && debt.payments.length > 0 ? `
                        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
                            <h4 style="margin: 0 0 10px 0; font-size: 16px;">💰 Histórico de Pagamentos</h4>
                            ${debt.payments.map(p => `
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #c8e6c9;">
                                    <span style="font-size: 14px;">${formatDate(p.date)}</span>
                                    <span style="font-weight: bold; color: #2e7d32;">${formatCurrency(p.amount)}</span>
                                </div>
                            `).join('')}
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; margin-top: 10px; font-weight: bold; font-size: 16px;">
                                <span>Total Pago:</span>
                                <span style="color: #2e7d32;">${formatCurrency(debt.payments.reduce((sum, p) => sum + p.amount, 0))}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <p style="margin: 0; font-size: 14px; color: #856404;">
                            ⚠️ <strong>Importante:</strong> Use o botão "Adicionar Pagamento" para registrar pagamentos parciais e manter controle total das dívidas.
                        </p>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; gap: 10px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
                        <div>
                            ${debt ? `<button type="button" class="btn btn-success" id="add-payment-btn">💵 Adicionar Pagamento</button>` : ''}
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="btn btn-outline close-modal">Cancelar</button>
                            <button type="submit" class="btn btn-danger">${debt ? '💾 Salvar' : '➕ Adicionar Dívida'}</button>
                        </div>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        
        // Adicionar listener para o botão de adicionar pagamento
        if (debt) {
            const addPaymentBtn = document.getElementById('add-payment-btn');
            if (addPaymentBtn) {
                addPaymentBtn.addEventListener('click', () => {
                    modal.remove();
                    this.showPartialPaymentModal(debt.id);
                });
            }
        }
        
        document.getElementById('debt-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveDebt(e.target, debt?.id);
        });
    }
    
    // Modal para adicionar pagamento parcial
    showPartialPaymentModal(debtId) {
        console.log('🚀 showPartialPaymentModal chamada com ID:', debtId);
        console.log('📊 Total de dívidas carregadas:', this.debts ? this.debts.length : 0);
        
        // Remover modais anteriores que possam existir
        document.querySelectorAll('.modal').forEach(m => m.remove());
        console.log('🧹 Modais antigos removidos');
        
        const debt = this.debts.find(d => d.id === debtId);
        console.log('🔍 Dívida encontrada:', debt);
        
        if (!debt) {
            console.error('❌ Dívida não encontrada!');
            showToast('Dívida não encontrada!', 'error');
            return;
        }
        
        console.log('✅ Criando modal...');
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 style="margin: 0; color: #c62828;">💵 Adicionar Pagamento Parcial</h2>
                    <button class="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <form id="payment-form" style="padding: 20px 25px;">
                    <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div><strong>Credor:</strong> ${debt.creditorName || debt.creditor || 'Não especificado'}</div>
                        <div style="margin-top: 8px;"><strong>Descrição:</strong> ${debt.description}</div>
                        <div style="margin-top: 8px; font-size: 18px; color: #c62828;">
                            <strong>Valor Original:</strong> ${formatCurrency(debt.originalAmount || debt.totalAmount)}
                        </div>
                        <div style="margin-top: 8px; font-size: 20px; color: #d32f2f; font-weight: bold;">
                            <strong>Saldo Devedor:</strong> ${formatCurrency(debt.remainingAmount || debt.originalAmount || debt.totalAmount)}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;"><span style="color: red;">*</span> Valor do Pagamento:</label>
                        <input type="number" name="paymentAmount" step="0.01" min="0.01" 
                               max="${debt.remainingAmount || debt.originalAmount || debt.totalAmount}"
                               placeholder="Ex: 50.00" required
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px;">
                        <small style="color: #666; display: block; margin-top: 5px;">Máximo: ${formatCurrency(debt.remainingAmount || debt.originalAmount || debt.totalAmount)}</small>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Observações:</label>
                        <textarea name="paymentNotes" rows="3" placeholder="Forma de pagamento, observações..."
                                  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
                        <button type="button" class="btn btn-outline close-modal">Cancelar</button>
                        <button type="submit" class="btn btn-success">✅ Confirmar Pagamento</button>
                    </div>
                </form>
            </div>
        `;
        
        console.log('📝 HTML do modal criado, adicionando ao body...');
        document.body.appendChild(modal);
        console.log('✅ Modal adicionado ao DOM');
        
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        
        console.log('🎯 Configurando submit do formulário...');
        document.getElementById('payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('💾 Formulário submetido!');
            await this.addPartialPayment(e.target, debtId);
            modal.remove();
        });
        console.log('✅ Modal totalmente configurado!');
    }
    
    async addPartialPayment(form, debtId) {
        try {
            const formData = new FormData(form);
            const paymentAmount = parseFloat(formData.get('paymentAmount'));
            const paymentNotes = formData.get('paymentNotes') || '';
            
            if (!paymentAmount || paymentAmount <= 0) {
                showToast('Valor de pagamento inválido!', 'error');
                return;
            }
            
            const debt = this.debts.find(d => d.id === debtId);
            if (!debt) {
                showToast('Dívida não encontrada!', 'error');
                return;
            }
            
            // Inicializar estrutura de pagamentos se não existir
            if (!debt.payments) debt.payments = [];
            if (!debt.originalAmount) debt.originalAmount = debt.totalAmount || debt.installmentAmount || 0;
            if (!debt.remainingAmount) debt.remainingAmount = debt.originalAmount;
            
            // Verificar se o pagamento não excede o saldo devedor
            if (paymentAmount > debt.remainingAmount) {
                showToast(`Valor maior que o saldo devedor (${formatCurrency(debt.remainingAmount)})!`, 'error');
                return;
            }
            
            // Adicionar o pagamento
            const payment = {
                date: new Date().toISOString(),
                amount: paymentAmount,
                notes: paymentNotes
            };
            debt.payments.push(payment);
            
            // Recalcular saldo devedor
            const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0);
            debt.remainingAmount = debt.originalAmount - totalPaid;
            
            // Atualizar status se totalmente pago
            if (debt.remainingAmount <= 0) {
                debt.status = 'paid';
                debt.remainingAmount = 0;
            }
            
            debt.updatedAt = new Date().toISOString();
            
            // Salvar no Firebase
            await updateInDatabase('financial', debt);
            
            // Registrar pagamento parcial como despesa automaticamente
            await this.registerPaymentAsExpense(
                `Pagamento Parcial de Dívida: ${debt.description || debt.creditorName}`,
                paymentAmount,
                'Dívidas',
                `${paymentNotes ? paymentNotes + ' - ' : ''}Credor: ${debt.creditorName || 'Não especificado'} - Saldo: ${formatCurrency(debt.remainingAmount)}`
            );
            
            showToast(`💰 Pagamento de ${formatCurrency(paymentAmount)} registrado como despesa! Saldo: ${formatCurrency(debt.remainingAmount)}`, 'success');
            
            // Recarregar lista
            await this.loadDebts();
            await this.loadTransactions(); // Recarregar transações para mostrar despesa
            
        } catch (error) {
            console.error('❌ Erro ao adicionar pagamento:', error);
            showToast('Erro ao adicionar pagamento!', 'error');
        }
    }
    
    async saveDebt(form, debtId = null) {
        try {
            const formData = new FormData(form);
            
            const description = formData.get('description');
            const creditorName = formData.get('creditorName');
            const originalAmount = formData.get('originalAmount');
            const dueDate = formData.get('dueDate');
            const priority = formData.get('priority') || 'MEDIA';
            const notes = formData.get('notes') || '';
            
            if (!description || !creditorName || !originalAmount || !dueDate) {
                showToast('Preencha todos os campos obrigatórios', 'error');
                return;
            }
            
            const dueDateObj = new Date(dueDate + 'T12:00:00');
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const dueDay = new Date(dueDateObj);
            dueDay.setHours(0, 0, 0, 0);
            
            let status = 'pending';
            if (dueDay < now) status = 'overdue';
            
            // Se estiver editando, preservar dados de pagamento existentes
            const existingDebt = debtId ? this.debts.find(d => d.id === debtId) : null;
            
            const data = {
                id: debtId || generateId(),
                recordType: 'debt',
                description: description.trim(),
                creditorName: creditorName.trim(),
                originalAmount: parseFloat(originalAmount),
                remainingAmount: existingDebt ? existingDebt.remainingAmount : parseFloat(originalAmount),
                payments: existingDebt ? existingDebt.payments || [] : [],
                dueDate: dueDateObj.toISOString(),
                status: status,
                priority: priority,
                notes: notes,
                createdAt: debtId ? undefined : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            if (debtId) {
                await updateInDatabase('financial', data);
                showToast('Dívida atualizada!', 'success');
            } else {
                await saveToDatabase('financial', data);
                showToast('Dívida registrada!', 'warning');
            }
            
            document.querySelector('.modal').remove();
            await this.loadDebts();
        } catch (error) {
            console.error('Erro ao salvar dívida:', error);
            showToast('Erro ao salvar dívida', 'error');
        }
    }
    
    renderDebtsList() {
        const container = document.getElementById('debts-list');
        if (!container) return;
        
        const debts = [...this.debts].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        if (debts.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">Nenhuma dívida cadastrada</p>';
            return;
        }
        
        container.innerHTML = debts.map(debt => {
            const dueDate = new Date(debt.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(dueDate);
            due.setHours(0, 0, 0, 0);
            const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
            
            let statusClass = debt.status === 'paid' ? 'paid' : (daysUntilDue < 0 ? 'overdue' : 'pending');
            let statusText = debt.status === 'paid' ? 'Paga' : (daysUntilDue < 0 ? `Atrasada ${Math.abs(daysUntilDue)} dias` : `Vence em ${daysUntilDue} dias`);
            let statusIcon = debt.status === 'paid' ? '✅' : (daysUntilDue < 0 ? '🚨' : '⚠️');
            
            // Compatibilidade com formato antigo e novo
            const originalAmount = debt.originalAmount || debt.totalAmount || 0;
            const remainingAmount = debt.remainingAmount ?? originalAmount;
            const creditorName = debt.creditorName || debt.creditor || 'Não especificado';
            const hasPayments = debt.payments && debt.payments.length > 0;
            const totalPaid = hasPayments ? debt.payments.reduce((sum, p) => sum + (p.amount || 0), 0) : 0;
            const paymentProgress = originalAmount > 0 ? (totalPaid / originalAmount) * 100 : 0;
            
            // Ícone de prioridade
            const priorityIcons = {
                'CRITICA': '🔴',
                'ALTA': '🟠',
                'MEDIA': '🟡',
                'BAIXA': '🟢'
            };
            const priorityIcon = priorityIcons[debt.priority] || '🟡';
            
            const progress = debt.installments > 1 ? 
                `<div style="margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                        <span>Parcela ${debt.currentInstallment || 1}/${debt.installments}</span>
                        <span>${Math.round(((debt.currentInstallment || 1) / debt.installments) * 100)}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${((debt.currentInstallment || 1) / debt.installments) * 100}%; height: 100%; background: linear-gradient(90deg, #ff6b6b 0%, #ee5a6f 100%);"></div>
                    </div>
                </div>` : '';
            
            // Barra de progresso de pagamentos
            const paymentBar = hasPayments ? 
                `<div style="margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                        <span>💰 Pago: ${formatCurrency(totalPaid)} de ${formatCurrency(originalAmount)}</span>
                        <span>${Math.round(paymentProgress)}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${paymentProgress}%; height: 100%; background: linear-gradient(90deg, #4caf50 0%, #66bb6a 100%);"></div>
                    </div>
                </div>` : '';
            
            return `
                <div class="bill-card ${statusClass}" style="border-left: 4px solid #dc3545;">
                    <div class="bill-header">
                        <div class="bill-title">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <span style="background: #dc3545; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                                    ⚠️ DÍVIDA
                                </span>
                                <span style="background: #f0f0f0; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${priorityIcon} ${creditorName}</span>
                            </div>
                            <h4 style="margin: 5px 0 0 0;">${debt.description}</h4>
                        </div>
                        <span class="bill-status ${statusClass}">
                            ${statusIcon} ${statusText}
                        </span>
                    </div>
                    
                    <div class="bill-details">
                        <div class="bill-info">
                            ${hasPayments ? `
                                <span class="bill-amount" style="color: #d32f2f; font-weight: bold;">Saldo: ${formatCurrency(remainingAmount)}</span>
                                <span style="color: #666; font-size: 13px;">Total Original: ${formatCurrency(originalAmount)}</span>
                            ` : `
                                <span class="bill-amount" style="color: #dc3545;">${formatCurrency(originalAmount)}</span>
                            `}
                            ${debt.installmentAmount ? `<span>Parcela: ${formatCurrency(debt.installmentAmount)}</span>` : ''}
                            <span class="bill-due">Vencimento: ${formatDate(debt.dueDate)}</span>
                        </div>
                        ${progress}
                        ${paymentBar}
                        ${debt.notes ? `<p style="margin: 10px 0 0; padding: 10px; background: #fff3cd; border-radius: 5px; font-size: 13px; color: #856404;">${debt.notes}</p>` : ''}
                    </div>
                    
                    <div class="bill-actions">
                        ${debt.status !== 'paid' && remainingAmount > 0 ? `
                            <button class="btn btn-success btn-sm btn-add-payment" data-debt-id="${debt.id}">
                                <i class="fas fa-dollar-sign"></i> Adicionar Pagamento
                            </button>
                            ${remainingAmount === originalAmount ? `
                                <button class="btn btn-success btn-sm" onclick="financeiroModule.markDebtAsPaid('${debt.id}')">
                                    <i class="fas fa-check"></i> Marcar como Paga
                                </button>
                            ` : ''}
                        ` : ''}
                        <button class="btn btn-outline btn-sm" onclick='financeiroModule.showDebtModal(${JSON.stringify(debt).replace(/'/g, "\\'")})'>
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="financeiroModule.deleteDebt('${debt.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Adicionar event listeners para os botões de adicionar pagamento
        setTimeout(() => {
            const addPaymentButtons = container.querySelectorAll('.btn-add-payment');
            console.log(`🔍 Encontrados ${addPaymentButtons.length} botões de adicionar pagamento`);
            
            addPaymentButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const debtId = btn.dataset.debtId;
                    console.log('💰 Clicou em adicionar pagamento para dívida:', debtId);
                    if (debtId) {
                        this.showPartialPaymentModal(debtId);
                    } else {
                        console.error('❌ Debt ID não encontrado no botão');
                    }
                });
            });
        }, 100);
    }
    
    async markDebtAsPaid(debtId) {
        if (!confirm('Confirma o pagamento desta dívida?')) return;
        
        try {
            const debt = this.debts.find(d => d.id === debtId);
            if (!debt) return;
            
            debt.status = 'paid';
            debt.paidAt = new Date().toISOString();
            debt.updatedAt = new Date().toISOString();
            
            await updateInDatabase('financial', debt);
            
            // Registrar como despesa automaticamente
            const paymentAmount = debt.remainingAmount || debt.originalAmount || debt.totalAmount || 0;
            await this.registerPaymentAsExpense(
                `Pagamento de Dívida: ${debt.description || debt.creditorName}`,
                paymentAmount,
                'Dívidas',
                `Dívida paga em ${formatDate(new Date())} - Credor: ${debt.creditorName || 'Não especificado'}`
            );
            
            showToast('Dívida marcada como paga e registrada como despesa!', 'success');
            await this.loadDebts();
            await this.loadTransactions(); // Recarregar transações para mostrar despesa
        } catch (error) {
            console.error('Erro ao marcar dívida:', error);
            showToast('Erro ao marcar dívida como paga', 'error');
        }
    }
    
    async deleteDebt(debtId) {
        if (!confirm('Deseja realmente excluir esta dívida?')) return;
        
        try {
            await deleteFromDatabase('financial', debtId);
            showToast('Dívida excluída!', 'success');
            await this.loadDebts();
        } catch (error) {
            console.error('Erro ao excluir dívida:', error);
            showToast('Erro ao excluir dívida', 'error');
        }
    }
    
    updateDebtsStats() {
        // Calcular total usando remainingAmount (valor ainda devido)
        const total = this.debts
            .filter(d => d.status !== 'paid')
            .reduce((sum, d) => sum + (d.remainingAmount || d.originalAmount || 0), 0);
        
        const overdue = this.debts
            .filter(d => d.status === 'overdue')
            .reduce((sum, d) => sum + (d.remainingAmount || d.originalAmount || 0), 0);
        
        const today = new Date();
        const in30Days = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
        const upcoming = this.debts.filter(d => {
            if (d.status === 'paid' || d.status === 'overdue') return false;
            const due = new Date(d.dueDate);
            return due >= today && due <= in30Days;
        }).reduce((sum, d) => sum + (d.remainingAmount || d.originalAmount || 0), 0);
        
        const totalEl = document.getElementById('debts-total');
        const countEl = document.getElementById('debts-count');
        const overdueEl = document.getElementById('debts-overdue');
        const overdueCountEl = document.getElementById('debts-overdue-count');
        const upcomingEl = document.getElementById('debts-upcoming');
        const upcomingCountEl = document.getElementById('debts-upcoming-count');
        
        if (totalEl) totalEl.textContent = formatCurrency(total);
        if (countEl) countEl.textContent = `${this.debts.filter(d => d.status !== 'paid').length} dívidas`;
        if (overdueEl) overdueEl.textContent = formatCurrency(overdue);
        if (overdueCountEl) overdueCountEl.textContent = `${this.debts.filter(d => d.status === 'overdue').length} dívidas`;
        if (upcomingEl) upcomingEl.textContent = formatCurrency(upcoming);
        if (upcomingCountEl) upcomingCountEl.textContent = `${this.debts.filter(d => {
            if (d.status === 'paid' || d.status === 'overdue') return false;
            const due = new Date(d.dueDate);
            return due >= today && due <= in30Days;
        }).length} dívidas`;
        
        console.log('📊 Stats de dívidas atualizadas:', {
            total: formatCurrency(total),
            overdue: formatCurrency(overdue),
            upcoming: formatCurrency(upcoming),
            totalCount: this.debts.filter(d => d.status !== 'paid').length
        });
    }
    
    // ==================== SAÚDE FINANCEIRA PROFISSIONAL ====================
    
    /**
     * Renderiza Dashboard Profissional com todos os especialistas
     */
    async renderProfessionalHealthDashboard() {
        // Aguardar carregamento de dados
        if (this.bills.length === 0) await this.loadBills();
        if (this.debts.length === 0) await this.loadDebts();
        if (this.transactions.length === 0) await this.loadTransactions();
        
        // Atualizar especialistas com dados mais recentes
        this.updateSpecialists();
        
        // Obter análises dos especialistas
        const diagnosis = this.consultant.generateDiagnosis();
        const kpis = this.analyst.calculateKPIs('month');
        const trends = this.analyst.identifyTrends();
        const dre = this.accountant.generateDRE('month');
        const balanceSheet = this.accountant.generateBalanceSheet();
        const cashFlow = this.accountant.generateCashFlow('month');
        
        const container = document.getElementById('health-dashboard');
        if (!container) return;
        
        container.innerHTML = `
            <div style="padding: 30px; background: #f5f7fa;">
                <!-- Header com Score -->
                <div style="background: linear-gradient(135deg, ${diagnosis.status.color} 0%, ${diagnosis.status.color}dd 100%); 
                            border-radius: 15px; padding: 40px; text-align: center; color: white; margin-bottom: 30px;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                    <div style="font-size: 5rem; margin-bottom: 15px;">${diagnosis.status.emoji}</div>
                    <h1 style="margin: 0 0 10px 0; font-size: 4rem; font-weight: bold;">${diagnosis.score}%</h1>
                    <p style="margin: 0; font-size: 1.5rem; opacity: 0.95;">Saúde Financeira ${diagnosis.status.label}</p>
                    <p style="margin: 10px 0 0 0; font-size: 1.1rem; opacity: 0.85;">Análise realizada por especialistas financeiros</p>
                </div>
                
                <!-- Abas de Especialistas -->
                <div style="background: white; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; border-bottom: 2px solid #f0f0f0; overflow-x: auto;">
                        <button class="specialist-tab active" data-specialist="overview" 
                                style="flex: 1; padding: 20px; border: none; background: none; cursor: pointer; 
                                       font-weight: 600; font-size: 1rem; transition: all 0.3s; min-width: 150px;">
                            📊 Visão Geral
                        </button>
                        <button class="specialist-tab" data-specialist="consultant" 
                                style="flex: 1; padding: 20px; border: none; background: none; cursor: pointer; 
                                       font-weight: 600; font-size: 1rem; transition: all 0.3s; min-width: 150px;">
                            💼 Consultor
                        </button>
                        <button class="specialist-tab" data-specialist="analyst"
                                style="flex: 1; padding: 20px; border: none; background: none; cursor: pointer;
                                       font-weight: 600; font-size: 1rem; transition: all 0.3s; min-width: 150px;">
                            📈 Analista
                        </button>
                        <button class="specialist-tab" data-specialist="accountant"
                                style="flex: 1; padding: 20px; border: none; background: none; cursor: pointer;
                                       font-weight: 600; font-size: 1rem; transition: all 0.3s; min-width: 150px;">
                            📚 Contador
                        </button>
                        <button class="specialist-tab" data-specialist="planner"
                                style="flex: 1; padding: 20px; border: none; background: none; cursor: pointer;
                                       font-weight: 600; font-size: 1rem; transition: all 0.3s; min-width: 150px;">
                            🎯 Planejador
                        </button>
                    </div>
                    
                    <div id="specialist-content" style="padding: 30px;">
                        ${this.renderOverviewTab(diagnosis, kpis, trends)}
                    </div>
                </div>
            </div>
        `;
        
        // Configurar event listeners das abas
        document.querySelectorAll('.specialist-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remover active de todas
                document.querySelectorAll('.specialist-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'none';
                    t.style.color = '#666';
                    t.style.borderBottom = 'none';
                });
                
                // Adicionar active na clicada
                e.target.classList.add('active');
                e.target.style.background = 'linear-gradient(to bottom, #f8f9fa 0%, white 100%)';
                e.target.style.color = '#007bff';
                e.target.style.borderBottom = '3px solid #007bff';
                
                // Renderizar conteúdo
                const specialist = e.target.dataset.specialist;
                const contentDiv = document.getElementById('specialist-content');
                
                switch(specialist) {
                    case 'overview':
                        contentDiv.innerHTML = this.renderOverviewTab(diagnosis, kpis, trends);
                        break;
                    case 'consultant':
                        contentDiv.innerHTML = this.renderConsultantTab(diagnosis);
                        break;
                    case 'analyst':
                        contentDiv.innerHTML = this.renderAnalystTab(kpis, trends);
                        break;
                    case 'accountant':
                        contentDiv.innerHTML = this.renderAccountantTab(dre, balanceSheet, cashFlow);
                        break;
                    case 'planner':
                        (async () => {
                            const html = await this.renderPlannerTab();
                            contentDiv.innerHTML = html;
                            
                            // Renderizar gráfico após inserir HTML
                            const budgets = this.planner.getBudgetsStatus();
                            if (budgets.length > 0) {
                                this.renderBudgetsChart(budgets);
                            }
                        })();
                        break;
                }
            });
        });
        
        // Estilizar aba ativa inicial
        document.querySelector('.specialist-tab.active').style.background = 'linear-gradient(to bottom, #f8f9fa 0%, white 100%)';
        document.querySelector('.specialist-tab.active').style.color = '#007bff';
        document.querySelector('.specialist-tab.active').style.borderBottom = '3px solid #007bff';
    }
    
    /**
     * Renderiza aba de Visão Geral
     */
    renderOverviewTab(diagnosis, kpis, trends) {
        return `
            <div style="padding: 20px;">
                <!-- KPIs Principais -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, #28a745 0%, #218838 100%); border-radius: 10px; padding: 25px; color: white; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
                        <div style="font-size: 2.5rem; margin-bottom: 10px;">💰</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Receitas do Mês</div>
                        <div style="font-size: 2rem; font-weight: bold; margin: 10px 0;">${formatCurrency(kpis.totalRevenue)}</div>
                        <div style="font-size: 0.85rem; opacity: 0.8;">${kpis.revenueGrowth > 0 ? '📈' : '📉'} ${kpis.revenueGrowth.toFixed(1)}% vs mês anterior</div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 10px; padding: 25px; color: white; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);">
                        <div style="font-size: 2.5rem; margin-bottom: 10px;">📉</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Despesas do Mês</div>
                        <div style="font-size: 2rem; font-weight: bold; margin: 10px 0;">${formatCurrency(kpis.totalExpenses)}</div>
                        <div style="font-size: 0.85rem; opacity: 0.8;">${kpis.expenseGrowth > 0 ? '📈' : '📉'} ${kpis.expenseGrowth.toFixed(1)}% vs mês anterior</div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); border-radius: 10px; padding: 25px; color: white; box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);">
                        <div style="font-size: 2.5rem; margin-bottom: 10px;">📊</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Lucro Líquido</div>
                        <div style="font-size: 2rem; font-weight: bold; margin: 10px 0;">${formatCurrency(kpis.netProfit)}</div>
                        <div style="font-size: 0.85rem; opacity: 0.8;">Margem: ${kpis.profitMargin.toFixed(1)}%</div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); border-radius: 10px; padding: 25px; color: white; box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);">
                        <div style="font-size: 2.5rem; margin-bottom: 10px;">🎯</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Fluxo de Caixa</div>
                        <div style="font-size: 2rem; font-weight: bold; margin: 10px 0;">${formatCurrency(kpis.cashFlow)}</div>
                        <div style="font-size: 0.85rem; opacity: 0.8;">${kpis.cashFlow >= 0 ? 'Positivo ✅' : 'Negativo ⚠️'}</div>
                    </div>
                </div>
                
                <!-- Riscos Identificados -->
                ${diagnosis.risks.length > 0 ? `
                    <div style="background: white; border-radius: 10px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #dc3545; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 20px 0; color: #dc3545; display: flex; align-items: center; gap: 10px;">
                            <span>⚠️</span> Riscos Identificados (${diagnosis.risks.length})
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            ${diagnosis.risks.map(risk => `
                                <div style="border: 1px solid #f0f0f0; border-radius: 8px; padding: 15px; background: ${risk.level === 'critical' ? '#fee' : '#fff3cd'};">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                                        <div style="font-weight: bold; font-size: 1.1rem;">${risk.title}</div>
                                        <span style="background: ${risk.level === 'critical' ? '#dc3545' : risk.level === 'high' ? '#fd7e14' : '#ffc107'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; text-transform: uppercase;">
                                            ${risk.level === 'critical' ? 'CRÍTICO' : risk.level === 'high' ? 'ALTO' : 'MÉDIO'}
                                        </span>
                                    </div>
                                    <div style="color: #666; margin-bottom: 10px;">${risk.description}</div>
                                    <div style="background: white; padding: 10px; border-radius: 5px; border-left: 3px solid #007bff;">
                                        <strong>💡 Ação:</strong> ${risk.action}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Oportunidades -->
                ${diagnosis.opportunities.length > 0 ? `
                    <div style="background: white; border-radius: 10px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #28a745; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 20px 0; color: #28a745; display: flex; align-items: center; gap: 10px;">
                            <span>💡</span> Oportunidades Identificadas (${diagnosis.opportunities.length})
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
                            ${diagnosis.opportunities.map(opp => `
                                <div style="border: 1px solid #d4edda; border-radius: 8px; padding: 15px; background: #f0f9f4;">
                                    <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 8px; color: #28a745;">${opp.title}</div>
                                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 8px;">${opp.description}</div>
                                    <div style="background: white; padding: 8px; border-radius: 5px; font-size: 0.85rem;">
                                        <strong>🎯 Ação:</strong> ${opp.action}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Recomendações Prioritárias -->
                <div style="background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 20px 0; color: #007bff;">📋 Recomendações Prioritárias</h3>
                    ${diagnosis.recommendations.map((rec, index) => `
                        <div style="border-left: 4px solid ${rec.priority === 'URGENTE' ? '#dc3545' : rec.priority === 'IMPORTANTE' ? '#fd7e14' : '#007bff'}; padding: 15px; margin-bottom: 15px; background: #f8f9fa; border-radius: 0 8px 8px 0;">
                            <div style="font-weight: bold; margin-bottom: 10px; color: ${rec.priority === 'URGENTE' ? '#dc3545' : rec.priority === 'IMPORTANTE' ? '#fd7e14' : '#007bff'};">
                                ${rec.title}
                            </div>
                            <ul style="margin: 0; padding-left: 20px; color: #666;">
                                ${rec.actions.map(action => `<li style="margin-bottom: 5px;">${action}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Renderiza aba do Consultor
     */
    renderConsultantTab(diagnosis) {
        return `
            <div style="padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 30px; color: white; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);">
                    <div style="font-size: 4rem; margin-bottom: 15px;">💼</div>
                    <h2 style="margin: 0 0 10px 0; font-size: 2rem;">Consultor Financeiro</h2>
                    <p style="margin: 0; font-size: 1.1rem; opacity: 0.9;">Análise estratégica e recomendações personalizadas</p>
                </div>
                
                ${this.renderOverviewTab(diagnosis, this.analyst.calculateKPIs('month'), this.analyst.identifyTrends())}
            </div>
        `;
    }
    
    /**
     * Renderiza aba do Analista
     */
    renderAnalystTab(kpis, trends) {
        return `
            <div style="padding: 20px;">
                <div style="background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%); border-radius: 15px; padding: 30px; color: white; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0, 210, 255, 0.3);">
                    <div style="font-size: 4rem; margin-bottom: 15px;">📈</div>
                    <h2 style="margin: 0 0 10px 0; font-size: 2rem;">Analista Financeiro</h2>
                    <p style="margin: 0; font-size: 1.1rem; opacity: 0.9;">KPIs e indicadores de performance</p>
                </div>
                
                <!-- KPIs Avançados -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                    <div style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-top: 4px solid #007bff;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Capital de Giro</div>
                        <div style="font-size: 1.8rem; font-weight: bold; color: #007bff;">${formatCurrency(kpis.workingCapital)}</div>
                    </div>
                    
                    <div style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-top: 4px solid #28a745;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Índice de Liquidez</div>
                        <div style="font-size: 1.8rem; font-weight: bold; color: #28a745;">${kpis.currentRatio.toFixed(2)}</div>
                    </div>
                    
                    <div style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-top: 4px solid #ffc107;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Ticket Médio</div>
                        <div style="font-size: 1.8rem; font-weight: bold; color: #ffc107;">${formatCurrency(kpis.averageTicket)}</div>
                    </div>
                    
                    <div style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-top: 4px solid #dc3545;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Taxa de Queima</div>
                        <div style="font-size: 1.8rem; font-weight: bold; color: #dc3545;">${formatCurrency(kpis.burnRate)}</div>
                    </div>
                </div>
                
                <!-- Tendências -->
                <div style="background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 20px 0; color: #333;">📊 Tendências Identificadas</h3>
                    ${trends.length > 0 ? `
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            ${trends.map(trend => `
                                <div style="border-left: 4px solid ${trend.type === 'success' ? '#28a745' : trend.type === 'warning' ? '#ffc107' : '#dc3545'}; padding: 15px; background: ${trend.type === 'success' ? '#f0f9f4' : trend.type === 'warning' ? '#fff3cd' : '#fee'}; border-radius: 0 8px 8px 0;">
                                    <div style="font-weight: bold; margin-bottom: 8px; color: ${trend.type === 'success' ? '#28a745' : trend.type === 'warning' ? '#856404' : '#dc3545'};">
                                        ${trend.category}
                                    </div>
                                    <div style="color: #666;">${trend.message}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="text-align: center; color: #999;">Nenhuma tendência significativa identificada</p>'}
                </div>
            </div>
        `;
    }
    
    /**
     * Renderiza aba do Contador
     */
    renderAccountantTab(dre, balanceSheet, cashFlow) {
        return `
            <div style="padding: 20px;">
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 15px; padding: 30px; color: white; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(240, 147, 251, 0.3);">
                    <div style="font-size: 4rem; margin-bottom: 15px;">📚</div>
                    <h2 style="margin: 0 0 10px 0; font-size: 2rem;">Contador Digital</h2>
                    <p style="margin: 0; font-size: 1.1rem; opacity: 0.9;">Demonstrativos contábeis profissionais</p>
                </div>
                
                <!-- DRE -->
                <div style="background: white; border-radius: 10px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 20px 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
                        📊 DRE - Demonstração do Resultado do Exercício
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #f0f0f0;">
                            <td style="padding: 15px 0; font-weight: bold;">Receitas Brutas</td>
                            <td style="text-align: right; padding: 15px 0; color: #28a745; font-weight: bold;">${formatCurrency(dre.revenues.total)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f0f0f0;">
                            <td style="padding: 15px 0; padding-left: 20px;">(-) Custos</td>
                            <td style="text-align: right; padding: 15px 0; color: #dc3545;">${formatCurrency(dre.costs.total)}</td>
                        </tr>
                        <tr style="border-bottom: 2px solid #007bff; background: #f8f9fa;">
                            <td style="padding: 15px 0; font-weight: bold;">Lucro Bruto</td>
                            <td style="text-align: right; padding: 15px 0; color: #007bff; font-weight: bold; font-size: 1.2rem;">${formatCurrency(dre.grossProfit.value)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f0f0f0;">
                            <td style="padding: 15px 0; padding-left: 20px;">(-) Despesas Operacionais</td>
                            <td style="text-align: right; padding: 15px 0; color: #dc3545;">${formatCurrency(dre.operationalExpenses.total)}</td>
                        </tr>
                        <tr style="border-bottom: 2px solid #28a745; background: #f0f9f4;">
                            <td style="padding: 15px 0; font-weight: bold;">Lucro Líquido</td>
                            <td style="text-align: right; padding: 15px 0; color: #28a745; font-weight: bold; font-size: 1.3rem;">${formatCurrency(dre.netProfit.value)}</td>
                        </tr>
                    </table>
                    <div style="margin-top: 20px; padding: 15px; background: ${dre.summary.status === 'excellent' ? '#d4edda' : dre.summary.status === 'warning' ? '#fff3cd' : '#fee'}; border-radius: 8px; border-left: 4px solid ${dre.summary.status === 'excellent' ? '#28a745' : dre.summary.status === 'warning' ? '#ffc107' : '#dc3545'};">
                        <strong>Análise:</strong> ${dre.summary.message}
                    </div>
                </div>
                
                <!-- Balanço Patrimonial -->
                <div style="background: white; border-radius: 10px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 20px 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
                        💼 Balanço Patrimonial Simplificado
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                        <div>
                            <h4 style="color: #28a745; margin-bottom: 15px;">ATIVO</h4>
                            <div style="font-size: 0.9rem;">
                                <div style="margin-bottom: 10px;">
                                    <div style="color: #666;">Ativo Circulante</div>
                                    <div style="font-weight: bold;">${formatCurrency(balanceSheet.assets.current.total)}</div>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <div style="color: #666;">Ativo Fixo</div>
                                    <div style="font-weight: bold;">${formatCurrency(balanceSheet.assets.fixed.total)}</div>
                                </div>
                                <div style="padding-top: 10px; border-top: 2px solid #28a745;">
                                    <div style="color: #666;">Total do Ativo</div>
                                    <div style="font-weight: bold; font-size: 1.2rem; color: #28a745;">${formatCurrency(balanceSheet.assets.total)}</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 style="color: #dc3545; margin-bottom: 15px;">PASSIVO</h4>
                            <div style="font-size: 0.9rem;">
                                <div style="margin-bottom: 10px;">
                                    <div style="color: #666;">Passivo Circulante</div>
                                    <div style="font-weight: bold;">${formatCurrency(balanceSheet.liabilities.current.total)}</div>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <div style="color: #666;">Passivo Longo Prazo</div>
                                    <div style="font-weight: bold;">${formatCurrency(balanceSheet.liabilities.longTerm.total)}</div>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <div style="color: #666;">Patrimônio Líquido</div>
                                    <div style="font-weight: bold;">${formatCurrency(balanceSheet.equity.total)}</div>
                                </div>
                                <div style="padding-top: 10px; border-top: 2px solid #dc3545;">
                                    <div style="color: #666;">Total</div>
                                    <div style="font-weight: bold; font-size: 1.2rem; color: #dc3545;">${formatCurrency(balanceSheet.liabilities.total + balanceSheet.equity.total)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${balanceSheet.analysis.length > 0 ? `
                        <div style="margin-top: 20px;">
                            <h4 style="margin-bottom: 15px;">Insights:</h4>
                            ${balanceSheet.analysis.map(insight => `
                                <div style="padding: 10px; background: ${insight.type === 'success' ? '#d4edda' : insight.type === 'warning' ? '#fff3cd' : '#fee'}; border-radius: 5px; margin-bottom: 10px; font-size: 0.9rem;">
                                    <strong>${insight.area}:</strong> ${insight.message}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Renderiza aba do Planejador
     */
    async renderPlannerTab() {
        // Carregar orçamentos
        await this.planner.loadBudgets();
        const budgets = this.planner.getBudgetsStatus();
        
        return `
            <div style="padding: 20px;">
                <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); border-radius: 15px; padding: 30px; color: white; text-align: center; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(250, 112, 154, 0.3);">
                    <div style="font-size: 4rem; margin-bottom: 15px;">🎯</div>
                    <h2 style="margin: 0 0 10px 0; font-size: 2rem;">Planejador Financeiro</h2>
                    <p style="margin: 0; font-size: 1.1rem; opacity: 0.9;">Metas, orçamentos e planejamento estratégico</p>
                </div>
                
                <!-- Botões de ação -->
                <div style="display: flex; gap: 10px; margin-bottom: 30px;">
                    <button class="btn btn-primary" onclick="window.financeiroModule.showBudgetModal()">
                        <i class="fas fa-plus"></i> Novo Orçamento
                    </button>
                    <button class="btn btn-outline" onclick="window.financeiroModule.syncBudgets()">
                        <i class="fas fa-sync"></i> Sincronizar com Transações
                    </button>
                </div>
                
                <!-- Lista de orçamentos -->
                <div style="background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 20px 0; color: #333;">📊 Orçamentos Ativos</h3>
                    
                    ${budgets.length === 0 ? `
                        <div style="text-align: center; padding: 40px; color: #999;">
                            <div style="font-size: 3rem; margin-bottom: 15px;">📈</div>
                            <p>Nenhum orçamento criado ainda</p>
                            <p style="font-size: 0.9rem;">Clique em "Novo Orçamento" para começar</p>
                        </div>
                    ` : `
                        <div style="display: grid; gap: 20px;">
                            ${budgets.map(budget => `
                                <div style="border: 2px solid ${budget.status === 'exceeded' ? '#dc3545' : budget.status === 'critical' ? '#fd7e14' : budget.status === 'warning' ? '#ffc107' : '#e0e0e0'}; border-radius: 12px; padding: 20px; background: ${budget.status === 'exceeded' ? '#fee' : budget.status === 'critical' ? '#fff3cd' : 'white'};">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                                        <div>
                                            <h4 style="margin: 0 0 5px 0; color: #333;">${budget.category}</h4>
                                            <span style="font-size: 0.85rem; color: #666;">Período: ${budget.period === 'month' ? 'Mensal' : budget.period}</span>
                                        </div>
                                        <button class="btn btn-sm btn-danger" onclick="window.financeiroModule.deleteBudget('${budget.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                    
                                    <!-- Barra de progresso -->
                                    <div style="background: #f0f0f0; border-radius: 10px; height: 30px; overflow: hidden; margin-bottom: 10px; position: relative;">
                                        <div style="background: linear-gradient(90deg, ${budget.status === 'exceeded' ? '#dc3545' : budget.status === 'critical' ? '#fd7e14' : budget.status === 'warning' ? '#ffc107' : '#28a745'} 0%, ${budget.status === 'exceeded' ? '#c82333' : budget.status === 'critical' ? '#e8590c' : budget.status === 'warning' ? '#e0a800' : '#218838'} 100%); height: 100%; width: ${Math.min(budget.percentage, 100)}%; transition: width 0.3s ease;"></div>
                                        <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; font-size: 0.9rem; color: ${budget.percentage > 50 ? 'white' : '#333'};">
                                            ${budget.percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    
                                    <!-- Valores -->
                                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                                        <div>
                                            <span style="color: #666;">Gasto:</span>
                                            <strong style="color: ${budget.status === 'exceeded' ? '#dc3545' : '#333'};">${formatCurrency(budget.spent)}</strong>
                                        </div>
                                        <div>
                                            <span style="color: #666;">Limite:</span>
                                            <strong>${formatCurrency(budget.amount)}</strong>
                                        </div>
                                        <div>
                                            <span style="color: #666;">Restante:</span>
                                            <strong style="color: ${budget.remaining >= 0 ? '#28a745' : '#dc3545'};">${formatCurrency(budget.remaining)}</strong>
                                        </div>
                                    </div>
                                    
                                    ${budget.status === 'exceeded' ? `
                                        <div style="margin-top: 10px; padding: 10px; background: #dc3545; color: white; border-radius: 5px; font-size: 0.85rem;">
                                            ⚠️ Orçamento excedido em ${formatCurrency(Math.abs(budget.remaining))}
                                        </div>
                                    ` : budget.status === 'critical' ? `
                                        <div style="margin-top: 10px; padding: 10px; background: #fd7e14; color: white; border-radius: 5px; font-size: 0.85rem;">
                                            🔴 Atenção: 90% do orçamento utilizado
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
                
                <!-- Gráfico de orçamentos -->
                ${budgets.length > 0 ? `
                    <div style="background: white; border-radius: 10px; padding: 25px; margin-top: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 20px 0; color: #333;">📊 Visualização</h3>
                        <canvas id="budgets-chart" style="max-height: 300px;"></canvas>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Dashboard de saúde antigo (fallback)
     */
    async renderHealthDashboard() {
        // Aguardar carregamento de dados
        if (this.bills.length === 0) await this.loadBills();
        if (this.debts.length === 0) await this.loadDebts();
        if (this.transactions.length === 0) await this.loadTransactions();
        
        // Calcular métricas
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const income = this.transactions
            .filter(t => t.type === 'income' && new Date(t.date) >= firstDay && new Date(t.date) <= lastDay)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = this.transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= firstDay && new Date(t.date) <= lastDay)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const cashflow = income - expenses;
        
        const criticalBills = this.bills.filter(b => b.priority === 'CRITICA' && b.status !== 'paid');
        const overdueBills = this.bills.filter(b => b.status === 'overdue');
        const overdueDebts = this.debts.filter(d => d.status === 'overdue');
        const totalDebts = this.debts
            .filter(d => d.status !== 'paid')
            .reduce((sum, d) => sum + (d.remainingAmount || d.originalAmount || 0), 0);
        
        // Calcular score de saúde (0-100)
        let score = 100;
        if (overdueBills.length > 0) score -= 20;
        if (overdueDebts.length > 0) score -= 20;
        if (criticalBills.length > 0) score -= 15;
        if (cashflow < 0) score -= 25;
        if (totalDebts > income * 2) score -= 20;
        
        score = Math.max(0, score);
        
        const scoreColor = score >= 80 ? '#28a745' : score >= 60 ? '#ffc107' : '#dc3545';
        const scoreEmoji = score >= 80 ? '💚' : score >= 60 ? '🟡' : '🔴';
        const scoreText = score >= 80 ? 'Excelente' : score >= 60 ? 'Boa' : 'Crítica';
        
        // Atualizar score
        const healthScore = document.getElementById('health-score');
        if (healthScore) {
            healthScore.style.background = `linear-gradient(135deg, ${scoreColor} 0%, ${scoreColor}dd 100%)`;
            healthScore.innerHTML = `
                <div style="font-size: 4rem; margin-bottom: 15px;">${scoreEmoji}</div>
                <h2 style="margin: 0 0 10px 0; font-size: 3rem; font-weight: bold;">${score}%</h2>
                <p style="margin: 0; font-size: 1.2rem; opacity: 0.9;">Saúde Financeira ${scoreText}</p>
            `;
        }
        
        // Alertas críticos
        const alerts = [];
        if (overdueBills.length > 0) {
            alerts.push({
                type: 'danger',
                icon: '🚨',
                title: `${overdueBills.length} ${overdueBills.length === 1 ? 'Conta Atrasada' : 'Contas Atrasadas'}`,
                message: `Total de R$ ${overdueBills.reduce((sum, b) => sum + b.amount, 0).toFixed(2)} em atraso`
            });
        }
        if (overdueDebts.length > 0) {
            alerts.push({
                type: 'danger',
                icon: '⚠️',
                title: `${overdueDebts.length} ${overdueDebts.length === 1 ? 'Dívida Vencida' : 'Dívidas Vencidas'}`,
                message: `Total de R$ ${overdueDebts.reduce((sum, d) => sum + d.totalAmount, 0).toFixed(2)} vencido`
            });
        }
        if (criticalBills.length > 0) {
            alerts.push({
                type: 'warning',
                icon: '🔴',
                title: `${criticalBills.length} ${criticalBills.length === 1 ? 'Conta Crítica Pendente' : 'Contas Críticas Pendentes'}`,
                message: 'Pagamentos essenciais para o funcionamento do negócio'
            });
        }
        if (cashflow < 0) {
            alerts.push({
                type: 'warning',
                icon: '📉',
                title: 'Fluxo de Caixa Negativo',
                message: `Despesas superaram receitas em R$ ${Math.abs(cashflow).toFixed(2)} este mês`
            });
        }
        
        const criticalAlerts = document.getElementById('critical-alerts');
        if (criticalAlerts) {
            if (alerts.length === 0) {
                criticalAlerts.innerHTML = '<p style="text-align: center; padding: 20px; color: #28a745;">✅ Nenhum alerta crítico</p>';
            } else {
                criticalAlerts.innerHTML = alerts.map(alert => `
                    <div style="background: ${alert.type === 'danger' ? '#fee' : '#fff3cd'}; padding: 15px; border-radius: 8px; border-left: 4px solid ${alert.type === 'danger' ? '#dc3545' : '#ffc107'};">
                        <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 5px;">
                            ${alert.icon} ${alert.title}
                        </div>
                        <div style="font-size: 0.9rem; color: #666;">${alert.message}</div>
                    </div>
                `).join('');
            }
        }
        
        // Atualizar métricas
        const cashflowMetric = document.getElementById('cashflow-metric');
        const cashflowTrend = document.getElementById('cashflow-trend');
        if (cashflowMetric) cashflowMetric.textContent = formatCurrency(cashflow);
        if (cashflowTrend) {
            cashflowTrend.textContent = cashflow >= 0 ? '✅ Positivo' : '⚠️ Negativo';
            cashflowTrend.style.color = cashflow >= 0 ? '#28a745' : '#dc3545';
        }
        
        const priorityBillsMetric = document.getElementById('priority-bills-metric');
        const priorityBillsStatus = document.getElementById('priority-bills-status');
        if (priorityBillsMetric) priorityBillsMetric.textContent = criticalBills.length;
        if (priorityBillsStatus) {
            priorityBillsStatus.textContent = criticalBills.length === 0 ? '✅ Todas pagas' : '⚠️ Pendentes';
            priorityBillsStatus.style.color = criticalBills.length === 0 ? '#28a745' : '#dc3545';
        }
        
        const riskMetric = document.getElementById('risk-metric');
        const riskDetails = document.getElementById('risk-details');
        const riskLevel = totalDebts > income * 2 ? 'Alto' : totalDebts > income ? 'Médio' : 'Baixo';
        const riskColor = riskLevel === 'Baixo' ? '#28a745' : riskLevel === 'Médio' ? '#ffc107' : '#dc3545';
        if (riskMetric) {
            riskMetric.textContent = riskLevel;
            riskMetric.style.color = riskColor;
        }
        if (riskDetails) {
            riskDetails.textContent = `Dívidas: ${formatCurrency(totalDebts)}`;
        }
        
        const paymentRate = document.getElementById('payment-rate');
        const paymentTrend = document.getElementById('payment-trend');
        const paidOnTime = this.bills.filter(b => b.status === 'paid' && b.paidAt && new Date(b.paidAt) <= new Date(b.dueDate)).length;
        const totalPaid = this.bills.filter(b => b.status === 'paid').length;
        const rate = totalPaid > 0 ? Math.round((paidOnTime / totalPaid) * 100) : 0;
        if (paymentRate) paymentRate.textContent = `${rate}%`;
        if (paymentTrend) {
            paymentTrend.textContent = rate >= 90 ? '✅ Excelente' : rate >= 70 ? '⚠️ Bom' : '❌ Melhorar';
        }
        
        // Recomendações inteligentes
        const recommendations = [];
        
        if (overdueBills.length > 0) {
            recommendations.push('🔴 <strong>Urgente:</strong> Pague as contas atrasadas o mais rápido possível para evitar juros e multas.');
        }
        if (criticalBills.length > 0) {
            recommendations.push('⚠️ <strong>Prioridade Alta:</strong> Foque primeiro nas contas críticas (aluguel, insumos, funcionários) para manter o negócio funcionando.');
        }
        if (cashflow < 0) {
            recommendations.push('📉 <strong>Atenção ao Caixa:</strong> Suas despesas estão maiores que as receitas. Revise custos e busque aumentar vendas.');
        }
        if (totalDebts > income) {
            recommendations.push('💰 <strong>Gestão de Dívidas:</strong> Suas dívidas são altas. Considere renegociar prazos e taxas.');
        }
        if (score >= 80) {
            recommendations.push('💚 <strong>Parabéns!</strong> Sua gestão financeira está excelente. Continue assim!');
        }
        if (this.bills.filter(b => b.status === 'pending').length > 10) {
            recommendations.push('📊 <strong>Organize-se:</strong> Você tem muitas contas pendentes. Use o sistema de prioridades para não perder o controle.');
        }
        
        const recommendationsList = document.getElementById('recommendations-list');
        if (recommendationsList) {
            recommendationsList.innerHTML = recommendations.map(rec => 
                `<div style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">${rec}</div>`
            ).join('');
        }
    }
    
    updateBillsStats() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const pending = this.bills.filter(b => b.status === 'pending');
        const overdue = this.bills.filter(b => b.status === 'overdue');
        const paidThisMonth = this.bills.filter(b => 
            b.status === 'paid' && 
            b.paidAt &&
            new Date(b.paidAt) >= firstDay && 
            new Date(b.paidAt) <= lastDay
        );
        
        const pendingTotal = pending.reduce((sum, b) => sum + b.amount, 0);
        const overdueTotal = overdue.reduce((sum, b) => sum + b.amount, 0);
        const paidTotal = paidThisMonth.reduce((sum, b) => sum + b.amount, 0);
        
        const els = {
            pendingTotal: document.getElementById('bills-pending-total'),
            pendingCount: document.getElementById('bills-pending-count'),
            overdueTotal: document.getElementById('bills-overdue-total'),
            overdueCount: document.getElementById('bills-overdue-count'),
            paidTotal: document.getElementById('bills-paid-total'),
            paidCount: document.getElementById('bills-paid-count')
        };
        
        if (els.pendingTotal) els.pendingTotal.textContent = `R$ ${pendingTotal.toFixed(2)}`;
        if (els.pendingCount) els.pendingCount.textContent = `${pending.length} ${pending.length === 1 ? 'conta' : 'contas'}`;
        if (els.overdueTotal) els.overdueTotal.textContent = `R$ ${overdueTotal.toFixed(2)}`;
        if (els.overdueCount) els.overdueCount.textContent = `${overdue.length} ${overdue.length === 1 ? 'conta' : 'contas'}`;
        if (els.paidTotal) els.paidTotal.textContent = `R$ ${paidTotal.toFixed(2)}`;
        if (els.paidCount) els.paidCount.textContent = `${paidThisMonth.length} ${paidThisMonth.length === 1 ? 'conta' : 'contas'}`;
    }
    
    checkOverdueBills() {
        const overdue = this.bills.filter(b => b.status === 'overdue');
        const dueSoon = this.bills.filter(b => {
            if (b.status !== 'pending') return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(b.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            return daysUntilDue >= 0 && daysUntilDue <= 3;
        });
        
        const alertsContainer = document.getElementById('bills-alerts');
        if (!alertsContainer) return;
        
        let alertsHTML = '';
        
        if (overdue.length > 0) {
            alertsHTML += `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Atenção!</strong> Você tem ${overdue.length} ${overdue.length === 1 ? 'conta atrasada' : 'contas atrasadas'}.
                </div>
            `;
        }
        
        if (dueSoon.length > 0) {
            alertsHTML += `
                <div class="alert alert-warning">
                    <i class="fas fa-clock"></i>
                    <strong>Lembrete:</strong> Você tem ${dueSoon.length} ${dueSoon.length === 1 ? 'conta vencendo' : 'contas vencendo'} nos próximos 3 dias.
                </div>
            `;
        }
        
        alertsContainer.innerHTML = alertsHTML;
    }
    
    renderBillsTab() {
        return `
            <div class="bills-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>📋 Contas a Pagar</h3>
                <button class="btn btn-primary" id="add-bill">
                    <i class="fas fa-plus"></i> Nova Conta
                </button>
            </div>
            
            <div class="bills-alerts" id="bills-alerts"></div>
            
            <div class="bills-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="stat-card" style="background: #fff3cd; border-left: 4px solid #ffc107;">
                    <div class="stat-info">
                        <span class="stat-label">Contas Pendentes</span>
                        <span class="stat-value" id="bills-pending-total">R$ 0,00</span>
                        <span class="stat-count" id="bills-pending-count">0 contas</span>
                    </div>
                </div>
                
                <div class="stat-card" style="background: #fee; border-left: 4px solid #dc3545;">
                    <div class="stat-info">
                        <span class="stat-label">Contas Atrasadas</span>
                        <span class="stat-value" id="bills-overdue-total">R$ 0,00</span>
                        <span class="stat-count" id="bills-overdue-count">0 contas</span>
                    </div>
                </div>
                
                <div class="stat-card" style="background: #d4edda; border-left: 4px solid #28a745;">
                    <div class="stat-info">
                        <span class="stat-label">Pagas Este Mês</span>
                        <span class="stat-value" id="bills-paid-total">R$ 0,00</span>
                        <span class="stat-count" id="bills-paid-count">0 contas</span>
                    </div>
                </div>
            </div>
            
            <div class="bills-filters" style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                <div class="filter-group">
                    <label>Status:</label>
                    <select id="bills-status-filter">
                        <option value="all">Todas</option>
                        <option value="pending">Pendentes</option>
                        <option value="overdue">Atrasadas</option>
                        <option value="paid">Pagas</option>
                    </select>
                </div>
            </div>
            
            <div class="bills-list" id="bills-list" style="display: flex; flex-direction: column; gap: 15px;">
                <p style="text-align: center; padding: 40px; color: #999;">Nenhuma conta cadastrada</p>
            </div>
        `;
    }

    renderDebtsTab() {
        return `
            <div class="debts-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>⚠️ Dívidas Pendentes</h3>
                <button class="btn btn-danger" id="add-debt">
                    <i class="fas fa-plus"></i> Adicionar Dívida
                </button>
            </div>
            
            <div class="debts-alert" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                <h4 style="margin: 0 0 10px 0; font-size: 1.2rem;">🚨 Gestão de Dívidas</h4>
                <p style="margin: 0; opacity: 0.95;">Controle todas as dívidas pendentes e evite comprometer a saúde financeira do negócio. Priorize pagamentos para manter o fluxo de caixa saudável.</p>
            </div>
            
            <div class="debts-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
                    <div class="stat-info">
                        <span class="stat-label" style="color: rgba(255,255,255,0.9);">Total em Dívidas</span>
                        <span class="stat-value" id="debts-total" style="color: white; font-size: 2rem;">R$ 0,00</span>
                        <span class="stat-count" id="debts-count" style="color: rgba(255,255,255,0.8);">0 dívidas</span>
                    </div>
                </div>
                
                <div class="stat-card" style="background: #fee; border-left: 4px solid #dc3545;">
                    <div class="stat-info">
                        <span class="stat-label">Vencidas</span>
                        <span class="stat-value" id="debts-overdue" style="color: #dc3545;">R$ 0,00</span>
                        <span class="stat-count" id="debts-overdue-count">0 dívidas</span>
                    </div>
                </div>
                
                <div class="stat-card" style="background: #fff3cd; border-left: 4px solid #ffc107;">
                    <div class="stat-info">
                        <span class="stat-label">A Vencer (30 dias)</span>
                        <span class="stat-value" id="debts-upcoming" style="color: #ffc107;">R$ 0,00</span>
                        <span class="stat-count" id="debts-upcoming-count">0 dívidas</span>
                    </div>
                </div>
            </div>
            
            <div class="debts-list" id="debts-list" style="display: flex; flex-direction: column; gap: 15px;">
                <p style="text-align: center; padding: 40px; color: #999;">Nenhuma dívida cadastrada</p>
            </div>
        `;
    }

    renderHealthTab() {
        // Retornar container vazio e renderizar profissionalmente via método assíncrono
        setTimeout(() => this.renderProfessionalHealthDashboard(), 100);
        return `<div id="health-dashboard" style="min-height: 400px;"></div>`;
    }

    addFinancialStyles() {
        if (document.getElementById('financial-custom-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'financial-custom-styles';
        style.textContent = `
            .financial-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                border-bottom: 2px solid #e0e0e0;
            }
            .tab-btn {
                padding: 12px 20px;
                background: transparent;
                border: none;
                border-bottom: 3px solid transparent;
                color: #666;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .tab-btn:hover {
                color: #007bff;
                background: rgba(0, 123, 255, 0.05);
            }
            .tab-btn.active {
                color: #007bff;
                border-bottom-color: #007bff;
                font-weight: 600;
            }
            .tab-btn .badge {
                background: #dc3545;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            .tab-content {
                display: none;
            }
            .tab-content.active {
                display: block;
                animation: fadeIn 0.3s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .bill-card {
                background: white;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border-left: 4px solid #ddd;
                transition: all 0.3s;
            }
            .bill-card:hover {
                transform: translateX(5px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .bill-card.pending {
                border-left-color: #ffc107;
            }
            .bill-card.partial {
                border-left-color: #1976d2;
                background: rgba(25, 118, 210, 0.02);
            }
            .bill-card.overdue {
                border-left-color: #dc3545;
                background: rgba(220, 53, 69, 0.02);
            }
            .bill-card.paid {
                border-left-color: #28a745;
                opacity: 0.8;
            }
            .bill-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 15px;
            }
            .bill-title h4 {
                margin: 0 0 5px 0;
                font-size: 18px;
                color: #333;
            }
            .bill-category {
                display: inline-block;
                padding: 4px 10px;
                background: #f0f0f0;
                border-radius: 5px;
                font-size: 12px;
                color: #666;
            }
            .bill-status {
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
            }
            .bill-status.pending {
                background: rgba(255, 193, 7, 0.15);
                color: #f57c00;
            }
            .bill-status.partial {
                background: rgba(25, 118, 210, 0.15);
                color: #1976d2;
            }
            .bill-status.overdue {
                background: rgba(220, 53, 69, 0.15);
                color: #dc3545;
            }
            .bill-status.paid {
                background: rgba(40, 167, 69, 0.15);
                color: #28a745;
            }
            .bill-details {
                margin-bottom: 15px;
            }
            .bill-info {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                align-items: center;
                margin-bottom: 10px;
            }
            .bill-amount {
                font-size: 22px;
                font-weight: 700;
                color: #007bff;
            }
            .bill-due {
                font-size: 14px;
                color: #666;
            }
            .bill-recurring {
                padding: 3px 8px;
                background: #e3f2fd;
                color: #1976d2;
                border-radius: 5px;
                font-size: 12px;
                font-weight: 600;
            }
            .bill-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .alert {
                padding: 15px 20px;
                border-radius: 8px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
            }
            .alert-danger {
                background: #fee;
                border-left: 4px solid #dc3545;
                color: #721c24;
            }
            .alert-warning {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                color: #856404;
            }
            
            /* Modal Styles */
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
            }
            .modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                animation: slideUp 0.3s ease;
            }
            .modal-header {
                padding: 20px 25px;
                border-bottom: 2px solid #f0f0f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            @keyframes slideUp {
                from {
                    transform: translateY(50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    activate() {
        console.log('💰 Reativando módulo Financeiro...');
        this.loadTransactions();
    }
    
    /**
     * Modal de criação/edição de orçamento
     */
    showBudgetModal(budget = null) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>${budget ? 'Editar Orçamento' : 'Novo Orçamento'}</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <form id="budget-form">
                    <div class="form-group">
                        <label>Categoria *</label>
                        <select name="category" required>
                            <option value="">Selecione...</option>
                            ${this.mandatoryCategories.map(cat => `
                                <option value="${cat.name}" ${budget?.category === cat.name ? 'selected' : ''}>${cat.name}</option>
                            `).join('')}
                            ${this.customCategories.map(cat => `
                                <option value="${cat}" ${budget?.category === cat ? 'selected' : ''}>${cat}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Valor Limite *</label>
                        <input type="number" name="amount" value="${budget?.amount || ''}" step="0.01" min="0.01" required placeholder="0.00">
                    </div>
                    
                    <div class="form-group">
                        <label>Período</label>
                        <select name="period">
                            <option value="month" ${!budget || budget.period === 'month' ? 'selected' : ''}>Mensal</option>
                            <option value="quarter" ${budget?.period === 'quarter' ? 'selected' : ''}>Trimestral</option>
                            <option value="year" ${budget?.period === 'year' ? 'selected' : ''}>Anual</option>
                        </select>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary close-modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            ${budget ? 'Salvar' : 'Criar Orçamento'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.getElementById('budget-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveBudget(e.target, budget?.id);
        });
    }
    
    /**
     * Salvar orçamento
     */
    async saveBudget(form, budgetId = null) {
        try {
            const formData = new FormData(form);
            
            const budget = {
                id: budgetId || generateId(),
                recordType: 'budget',
                category: formData.get('category'),
                amount: parseFloat(formData.get('amount')),
                spent: 0,
                period: formData.get('period'),
                status: 'active',
                alerts: {
                    at50: false,
                    at75: false,
                    at90: false,
                    exceeded: false
                },
                createdAt: budgetId ? undefined : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await this.planner.saveBudget(budget);
            
            showToast(`✅ Orçamento ${budgetId ? 'atualizado' : 'criado'} com sucesso!`, 'success');
            
            // Fechar modal
            document.querySelector('.modal')?.remove();
            
            // Recarregar interface
            await this.renderProfessionalHealthDashboard();
            
        } catch (error) {
            console.error('Erro ao salvar orçamento:', error);
            showToast('Erro ao salvar orçamento!', 'error');
        }
    }
    
    /**
     * Deletar orçamento
     */
    async deleteBudget(budgetId) {
        if (!confirm('Deseja realmente excluir este orçamento?')) return;
        
        try {
            await this.planner.deleteBudget(budgetId);
            showToast('✅ Orçamento excluído!', 'success');
            
            // Recarregar interface
            await this.renderProfessionalHealthDashboard();
            
        } catch (error) {
            console.error('Erro ao deletar orçamento:', error);
            showToast('Erro ao deletar orçamento!', 'error');
        }
    }
    
    /**
     * Sincronizar orçamentos com transações
     */
    async syncBudgets() {
        try {
            this.planner.updateTransactions(this.transactions);
            showToast('✅ Orçamentos sincronizados!', 'success');
            
            // Recarregar interface
            await this.renderProfessionalHealthDashboard();
            
        } catch (error) {
            console.error('Erro ao sincronizar:', error);
            showToast('Erro ao sincronizar!', 'error');
        }
    }
    
    /**
     * Renderizar gráfico de orçamentos
     */
    renderBudgetsChart(budgets) {
        setTimeout(() => {
            const canvas = document.getElementById('budgets-chart');
            if (!canvas || typeof Chart === 'undefined') return;
            
            const ctx = canvas.getContext('2d');
            
            // Destruir gráfico anterior se existir
            if (this.budgetsChart) {
                this.budgetsChart.destroy();
            }
            
            this.budgetsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: budgets.map(b => b.category),
                    datasets: [{
                        label: 'Gasto',
                        data: budgets.map(b => b.spent),
                        backgroundColor: budgets.map(b => 
                            b.status === 'exceeded' ? 'rgba(220, 53, 69, 0.8)' :
                            b.status === 'critical' ? 'rgba(253, 126, 20, 0.8)' :
                            b.status === 'warning' ? 'rgba(255, 193, 7, 0.8)' :
                            'rgba(40, 167, 69, 0.8)'
                        ),
                        borderColor: budgets.map(b => 
                            b.status === 'exceeded' ? '#dc3545' :
                            b.status === 'critical' ? '#fd7e14' :
                            b.status === 'warning' ? '#ffc107' :
                            '#28a745'
                        ),
                        borderWidth: 2
                    }, {
                        label: 'Limite',
                        data: budgets.map(b => b.amount),
                        backgroundColor: 'rgba(0, 123, 255, 0.3)',
                        borderColor: '#007bff',
                        borderWidth: 2,
                        borderDash: [5, 5]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': R$ ' + context.parsed.y.toFixed(2);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'R$ ' + value.toFixed(0);
                                }
                            }
                        }
                    }
                }
            });
        }, 100);
    }
    
    /**
     * Renderizar gráfico de receitas vs despesas
     */
    renderFinancialChart() {
        setTimeout(() => {
            const canvas = document.getElementById('financial-canvas');
            if (!canvas || typeof Chart === 'undefined') return;
            
            const ctx = canvas.getContext('2d');
            
            // Preparar dados dos últimos 6 meses
            const months = [];
            const revenues = [];
            const expenses = [];
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                
                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                
                const monthTransactions = this.transactions.filter(t => {
                    const tDate = new Date(t.date);
                    return tDate >= monthStart && tDate <= monthEnd;
                });
                
                const monthRevenue = monthTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                
                const monthExpense = monthTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);
                
                months.push(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
                revenues.push(monthRevenue);
                expenses.push(monthExpense);
            }
            
            // Destruir gráfico anterior se existir
            if (this.financialChart) {
                this.financialChart.destroy();
            }
            
            this.financialChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Receitas',
                        data: revenues,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }, {
                        label: 'Despesas',
                        data: expenses,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': R$ ' + context.parsed.y.toFixed(2);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'R$ ' + value.toFixed(0);
                                }
                            }
                        }
                    }
                }
            });
        }, 100);
    }

    destroy() {
        this.isInitialized = false;
        console.log('Financeiro Module destroyed');
    }
}
