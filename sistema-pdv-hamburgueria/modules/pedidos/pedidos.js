/**
 * ================================================================
 * MÓDULO DE GESTÃO DE PEDIDOS - SISTEMA PDV HAMBURGUERIA
 * Sistema completo de gestão de pedidos com funcionalidades avançadas
 * 
 * Características:
 * - Gestão completa do ciclo de vida dos pedidos
 * - Sistema de status avançado com timeline
 * - Notificações em tempo real
 * - Busca e filtros inteligentes
 * - Relatórios e métricas detalhadas
 * - Interface responsiva e intuitiva
 * ================================================================
 */

import { 
    formatCurrency, 
    formatDateTime, 
    showToast, 
    getDatabase, 
    initDatabase,
    generateId,
    debounce 
} from '../shared/utils.js';

export class PedidosModule {
    constructor() {
        this.db = null;
        this.currentOrders = [];
        this.filteredOrders = [];
        this.selectedOrder = null;
        this.filters = {
            status: 'all',
            dateRange: 'today',
            customer: '',
            paymentMethod: 'all'
        };
        this.sortBy = 'createdAt';
        this.sortOrder = 'desc';
        this.currentPage = 1;
        this.ordersPerPage = 20;
        
        // CORREÇÃO CRÍTICA: Adicionar controle de timers
        this.updateInterval = null;
        
        // Sistema de rastreamento de event listeners
        this.eventListeners = [];
        
        // Status dos pedidos
        this.orderStatus = {
            pending: { label: 'Pendente', color: '#ffc107', icon: '⏳' },
            confirmed: { label: 'Confirmado', color: '#17a2b8', icon: '✅' },
            preparing: { label: 'Preparando', color: '#fd7e14', icon: '👨‍🍳' },
            ready: { label: 'Pronto', color: '#28a745', icon: '🍽️' },
            delivered: { label: 'Entregue', color: '#6c757d', icon: '📦' },
            cancelled: { label: 'Cancelado', color: '#dc3545', icon: '❌' }
        };

        this.initEventListeners();
        
        // Proteção contra múltiplas inicializações
        this.isInitialized = false;
    }

    /**
     * Sistema de rastreamento de event listeners para prevenir vazamentos de memória
     */
    addEventListener(element, event, handler, options = false) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }

    /**
     * Remove todos os event listeners rastreados
     */
    removeAllEventListeners() {
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];
    }

    /**
     * Inicializa o módulo
     */
    async init() {
        // Proteção contra inicialização duplicada
        if (this.isInitialized) {
            console.warn('⚠️ Módulo Pedidos já foi inicializado, ignorando chamada duplicada');
            return;
        }
        
        try {
            console.log('📋 Inicializando módulo Pedidos...');
            
            // Marcar como inicializado imediatamente
            this.isInitialized = true;
            
            this.renderOrdersInterface();
            await this.loadOrders();
            this.setupRealTimeUpdates();
            
            // Expor globalmente
            window.pedidosModule = this;
            
            console.log('✅ Módulo Pedidos inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar módulo de pedidos:', error);
            this.isInitialized = false; // Resetar em caso de erro
        }
    }

    /**
     * Carrega pedidos do banco
     */
    async loadOrders() {
        try {
            // OTIMIZAÇÃO: Carregar apenas pedidos dos últimos 30 dias
            const allOrders = await window.getFromDatabase('orders') || [];
            
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            // PROTEÇÃO: Filtrar pedidos FANTASMA automaticamente
            const validOrders = allOrders.filter(order => {
                // Ignorar pedidos inválidos (criados por bug do system-cleaner)
                if (!order || typeof order !== 'object') return false;
                if (Array.isArray(order)) return false; // Array salvo como objeto
                if (order.status === undefined && order.total === undefined) return false;
                if (order.id && (order.id.includes('yq202') || order.id.includes('i4jh'))) return false;
                return true;
            });
            
            // Log de pedidos fantasma removidos
            const phantomCount = allOrders.length - validOrders.length;
            if (phantomCount > 0) {
                console.warn(`⚠️ ${phantomCount} pedidos fantasma ignorados (serão limpos automaticamente)`);
                // Limpar pedidos fantasma do banco em background
                this.cleanPhantomOrdersInBackground(allOrders, validOrders);
            }
            
            // PROTEÇÃO: Limitar a 1000 pedidos mais recentes e validar status
            this.currentOrders = validOrders
                .filter(order => {
                    const orderDate = new Date(order.date || order.createdAt);
                    return orderDate >= thirtyDaysAgo;
                })
                .map(order => {
                    // CORREÇÃO CRÍTICA: Validar e corrigir status inválidos
                    if (!order.status || !this.orderStatus[order.status]) {
                        order.status = 'pending';
                    }
                    return order;
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 1000);
            
            console.log(`📦 ${this.currentOrders.length} pedidos carregados (últimos 30 dias)`);
            this.applyFilters();
            this.updateMetrics();
            this.updateOrdersList();
        } catch (error) {
            console.error('❌ Erro ao carregar pedidos:', error);
            this.currentOrders = [];
        }
    }
    
    /**
     * Limpa pedidos fantasma em background
     */
    async cleanPhantomOrdersInBackground(allOrders, validOrders) {
        try {
            const phantomOrders = allOrders.filter(order => !validOrders.includes(order));
            
            for (const phantom of phantomOrders) {
                if (phantom && phantom.id) {
                    try {
                        await window.deleteFromDatabase('orders', phantom.id);
                        console.log(`🗑️ Pedido fantasma ${phantom.id} removido`);
                    } catch (e) {
                        // Ignorar erros de deleção
                    }
                }
            }
            
            if (phantomOrders.length > 0) {
                console.log(`✅ ${phantomOrders.length} pedidos fantasma limpos em background`);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao limpar pedidos fantasma:', error);
        }
    }

    /**
     * Renderiza interface principal
     */
    renderOrdersInterface() {
        const content = document.getElementById('pedidos-page');
        if (!content) {
            console.error('❌ Container #pedidos-page não encontrado');
            return;
        }

        content.innerHTML = `
            <div class="orders-module">
                <!-- Cabeçalho -->
                <div class="orders-header">
                    <div class="header-title">
                        <h2><i class="fas fa-clipboard-list"></i> Gestão de Pedidos</h2>
                        <p>Controle completo do ciclo de vida dos pedidos</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="pedidosModule.showNewOrderModal()">
                            <i class="fas fa-plus"></i> Novo Pedido
                        </button>
                        <button class="btn btn-danger" onclick="pedidosModule.deleteAllTestOrders()" title="Excluir Pedidos de Teste">
                            <i class="fas fa-trash-alt"></i> Limpar Testes
                        </button>
                        <div class="btn-group">
                            <button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown">
                                <i class="fas fa-download"></i> Exportar
                            </button>
                            <div class="dropdown-menu dropdown-menu-right">
                                <a class="dropdown-item" onclick="pedidosModule.exportOrders('csv')">
                                    <i class="fas fa-file-csv"></i> Exportar CSV
                                </a>
                                <a class="dropdown-item" onclick="pedidosModule.exportOrders('pdf')">
                                    <i class="fas fa-file-pdf"></i> Exportar PDF
                                </a>
                                <div class="dropdown-divider"></div>
                                <a class="dropdown-item" onclick="pedidosModule.exportOrders('print')">
                                    <i class="fas fa-print"></i> Imprimir Relatório
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Métricas -->
                <div class="orders-metrics" id="ordersMetrics">
                    ${this.renderMetrics()}
                </div>

                <!-- Filtros -->
                <div class="orders-filters">
                    <div class="filters-row">
                        <div class="filter-group">
                            <label>Status:</label>
                            <select id="statusFilter" onchange="pedidosModule.updateFilter('status', this.value)">
                                <option value="all">Todos os Status</option>
                                ${Object.entries(this.orderStatus).map(([key, status]) => 
                                    `<option value="${key}">${status.icon} ${status.label}</option>`
                                ).join('')}
                            </select>
                        </div>

                        <div class="filter-group">
                            <label>Período:</label>
                            <select id="dateFilter" onchange="pedidosModule.updateFilter('dateRange', this.value)">
                                <option value="today">Hoje</option>
                                <option value="yesterday">Ontem</option>
                                <option value="week">Esta Semana</option>
                                <option value="month">Este Mês</option>
                                <option value="all">Todos</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label>Pagamento:</label>
                            <select id="paymentFilter" onchange="pedidosModule.updateFilter('paymentMethod', this.value)">
                                <option value="all">Todos</option>
                                <option value="dinheiro">Dinheiro</option>
                                <option value="cartao">Cartão</option>
                                <option value="pix">PIX</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label>Buscar:</label>
                            <input 
                                type="text" 
                                id="customerSearch" 
                                placeholder="Cliente, ID do pedido..."
                                onkeyup="pedidosModule.debouncedSearch(this.value)"
                            >
                        </div>
                    </div>

                    <div class="filters-actions">
                        <button class="btn btn-outline-secondary" onclick="pedidosModule.clearFilters()">
                            <i class="fas fa-eraser"></i> Limpar Filtros
                        </button>
                        <div class="sort-controls">
                            <label>Ordenar por:</label>
                            <select id="sortBy" onchange="pedidosModule.updateSort(this.value)">
                                <option value="createdAt">Data</option>
                                <option value="total">Valor</option>
                                <option value="status">Status</option>
                                <option value="customerName">Cliente</option>
                            </select>
                            <button class="btn-sort" onclick="pedidosModule.toggleSortOrder()" id="sortOrderBtn">
                                <i class="fas fa-sort-amount-down"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Lista de Pedidos -->
                <div class="orders-container">
                    <div class="orders-list" id="ordersList">
                        ${this.renderOrdersList()}
                    </div>

                    <!-- Paginação -->
                    <div class="pagination" id="ordersPagination">
                        ${this.renderPagination()}
                    </div>
                </div>

                <!-- Modal de Detalhes do Pedido -->
                <div class="modal fade" id="orderDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Detalhes do Pedido</h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body" id="orderDetailsContent">
                                <!-- Conteúdo carregado dinamicamente -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal de Novo Pedido -->
                <div class="modal fade" id="newOrderModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Novo Pedido</h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <div id="newOrderContent">
                                    <!-- Interface de criação de pedido -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal de Edição de Pedido -->
                <div class="modal fade" id="editOrderModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fas fa-edit"></i> Editar Pedido
                                </h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <div id="editOrderContent">
                                    <!-- Interface de edição carregada dinamicamente -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Aplica estilos específicos
        this.addOrdersStyles();
    }

    /**
     * Renderiza métricas dos pedidos
     */
    renderMetrics() {
        // Usar pedidos FILTRADOS para calcular as métricas
        const ordersToCalculate = this.filteredOrders;
        
        // Total de vendas dos pedidos filtrados
        const totalSales = ordersToCalculate.reduce((sum, order) => sum + order.total, 0);
        
        // Contadores por status dos pedidos filtrados
        const pendingCount = ordersToCalculate.filter(order => order.status === 'pending').length;
        const preparingCount = ordersToCalculate.filter(order => order.status === 'preparing').length;
        
        // Ticket médio dos pedidos filtrados
        const avgTicket = ordersToCalculate.length > 0 ? 
            totalSales / ordersToCalculate.length : 0;

        return `
            <div class="metric-card">
                <div class="metric-icon">📊</div>
                <div class="metric-info">
                    <h3>${formatCurrency(totalSales)}</h3>
                    <p>Vendas${this.filterPeriod === 'today' ? ' Hoje' : ''}</p>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">📋</div>
                <div class="metric-info">
                    <h3>${ordersToCalculate.length}</h3>
                    <p>Pedidos${this.filterPeriod === 'today' ? ' Hoje' : ''}</p>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">⏳</div>
                <div class="metric-info">
                    <h3>${pendingCount}</h3>
                    <p>Pendentes</p>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">👨‍🍳</div>
                <div class="metric-info">
                    <h3>${preparingCount}</h3>
                    <p>Preparando</p>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">💰</div>
                <div class="metric-info">
                    <h3>${formatCurrency(avgTicket)}</h3>
                    <p>Ticket Médio</p>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza lista de pedidos
     */
    renderOrdersList() {
        if (this.filteredOrders.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list fa-3x"></i>
                    <h3>Nenhum pedido encontrado</h3>
                    <p>Não há pedidos que correspondam aos filtros selecionados.</p>
                    <button class="btn btn-primary" onclick="pedidosModule.showNewOrderModal()">
                        <i class="fas fa-plus"></i> Criar Primeiro Pedido
                    </button>
                </div>
            `;
        }

        const startIndex = (this.currentPage - 1) * this.ordersPerPage;
        const endIndex = startIndex + this.ordersPerPage;
        const pageOrders = this.filteredOrders.slice(startIndex, endIndex);

        return pageOrders.map(order => this.renderOrderCard(order)).join('');
    }

    /**
     * Renderiza card individual do pedido
     */
    renderOrderCard(order) {
        // CORREÇÃO CRÍTICA: Verificação de segurança para status
        const status = this.orderStatus[order.status] || this.orderStatus['pending'];
        const timeAgo = this.getTimeAgo(order.createdAt);
        const itemsCount = order.items ? order.items.length : 0;
        const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        const isOnlineOrder = order.source === 'online';

        return `
            <div class="order-card ${isOnlineOrder ? 'online-order' : ''}" onclick="pedidosModule.showOrderDetails('${order.id}')">
                <div class="order-header">
                    <div class="order-id">
                        <strong>#${order.id.slice(-8).toUpperCase()}</strong>
                        <span class="order-time">${timeAgo}</span>
                        ${isOnlineOrder ? '<span class="online-badge">🌐 ONLINE</span>' : ''}
                    </div>
                    <div class="order-status" style="background-color: ${status.color}">
                        <span>${status.icon} ${status.label}</span>
                    </div>
                </div>

                <div class="order-customer">
                    <i class="fas fa-user"></i>
                    <span>${order.customerName || order.customer?.name || 'Cliente Não Identificado'}</span>
                    ${order.customerPhone || order.customer?.phone ? `<small>${order.customerPhone || order.customer?.phone}</small>` : ''}
                </div>

                <div class="order-items">
                    <div class="items-summary">
                        <span>${totalItems} ${totalItems === 1 ? 'item' : 'itens'} (${itemsCount} ${itemsCount === 1 ? 'produto' : 'produtos'})</span>
                    </div>
                    <div class="items-preview">
                        ${order.items ? order.items.slice(0, 2).map(item => 
                            `<span class="item-tag">${item.quantity}x ${item.name}</span>`
                        ).join('') : ''}
                        ${itemsCount > 2 ? `<span class="more-items">+${itemsCount - 2} mais</span>` : ''}
                    </div>
                </div>

                <div class="order-footer">
                    <div class="order-payment">
                        <i class="fas fa-credit-card"></i>
                        <span>${this.getPaymentMethodName(order.paymentMethod)}</span>
                    </div>
                    <div class="order-total">
                        <strong>${formatCurrency(order.total)}</strong>
                    </div>
                </div>

                <div class="order-actions">
                    ${this.renderOrderActions(order)}
                </div>
            </div>
        `;
    }

    /**
     * Renderiza ações do pedido
     */
    renderOrderActions(order) {
        const actions = [];
        const isOnlineOrder = order.source === 'online';

        switch (order.status) {
            case 'pending':
                actions.push(`
                    <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); pedidosModule.updateOrderStatus('${order.id}', 'confirmed')">
                        <i class="fas fa-check"></i> Confirmar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); pedidosModule.cancelOrder('${order.id}')">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    ${isOnlineOrder ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); pedidosModule.deleteOrder('${order.id}')" title="Excluir Pedido Online">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                `);
                break;

            case 'confirmed':
                actions.push(`
                    <button class="btn btn-sm btn-warning" onclick="event.stopPropagation(); pedidosModule.updateOrderStatus('${order.id}', 'preparing')">
                        <i class="fas fa-utensils"></i> Iniciar Preparo
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); pedidosModule.cancelOrder('${order.id}')">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    ${isOnlineOrder ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); pedidosModule.deleteOrder('${order.id}')" title="Excluir Pedido Online">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                `);
                break;

            case 'preparing':
                actions.push(`
                    <button class="btn btn-sm btn-info" onclick="event.stopPropagation(); pedidosModule.updateOrderStatus('${order.id}', 'ready')">
                        <i class="fas fa-bell"></i> Marcar Pronto
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); pedidosModule.cancelOrder('${order.id}')">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    ${isOnlineOrder ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); pedidosModule.deleteOrder('${order.id}')" title="Excluir Pedido Online">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                `);
                break;

            case 'ready':
                actions.push(`
                    <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); pedidosModule.updateOrderStatus('${order.id}', 'delivered')">
                        <i class="fas fa-truck"></i> Entregar
                    </button>
                    ${isOnlineOrder ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); pedidosModule.deleteOrder('${order.id}')" title="Excluir Pedido Online">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                `);
                break;
                
            case 'cancelled':
                // Pedidos cancelados podem ser excluídos permanentemente
                actions.push(`
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); pedidosModule.deleteOrder('${order.id}')" title="Excluir Pedido">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                `);
                break;
                
            case 'delivered':
                // Pedidos entregues também podem ser excluídos
                actions.push(`
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); pedidosModule.deleteOrder('${order.id}')" title="Excluir Pedido">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                `);
                break;
        }

        // Ações comuns para todos os status (exceto cancelados e entregues)
        if (order.status !== 'cancelled' && order.status !== 'delivered') {
            // Botão de EDITAR - Disponível para todos os pedidos não finalizados
            actions.push(`
                <button class="btn btn-sm btn-warning" onclick="event.stopPropagation(); pedidosModule.editOrder('${order.id}')" title="Editar Pedido">
                    <i class="fas fa-edit"></i> Editar
                </button>
            `);
            
            actions.push(`
                <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); pedidosModule.printOrder('${order.id}')">
                    <i class="fas fa-print"></i>
                </button>
            `);
        }

        // Duplicar pedido (disponível para todos)
        actions.push(`
            <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); pedidosModule.duplicateOrder('${order.id}')" title="Duplicar Pedido">
                <i class="fas fa-copy"></i>
            </button>
        `);

        return actions.join('');
    }

    /**
     * Atualiza status do pedido
     */
    async updateOrderStatus(orderId, newStatus) {
        try {
            console.log('🔄 [PEDIDOS] Atualizando status:', { orderId, newStatus });
            
            // Buscar pedido usando função global
            const orders = await window.getFromDatabase('orders');
            const order = orders.find(o => o.id === orderId);
            
            if (!order) {
                console.error('❌ [PEDIDOS] Pedido não encontrado:', orderId);
                if (window.showToast) window.showToast('Pedido não encontrado', 'error');
                return;
            }

            console.log('📦 [PEDIDOS] Pedido encontrado:', {
                id: order.id,
                currentStatus: order.status,
                newStatus: newStatus,
                source: order.source
            });

            // Valida transição de status
            if (!this.isValidStatusTransition(order.status, newStatus)) {
                console.warn('⚠️ [PEDIDOS] Transição de status inválida:', {
                    from: order.status,
                    to: newStatus
                });
                if (window.showToast) window.showToast('Transição de status inválida', 'error');
                return;
            }

            // Armazena status anterior
            const previousStatus = order.status;

            // Atualiza status
            order.status = newStatus;
            order.updatedAt = new Date().toISOString();

            console.log('💾 [PEDIDOS] Status atualizado no objeto:', {
                id: order.id,
                previousStatus,
                newStatus: order.status,
                updatedAt: order.updatedAt
            });

            // Adiciona ao histórico
            if (!order.statusHistory) {
                order.statusHistory = [];
            }

            order.statusHistory.push({
                status: newStatus,
                previousStatus: previousStatus,
                timestamp: new Date().toISOString(),
                user: 'Sistema'
            });

            // Salva no banco usando função global
            console.log('💾 [PEDIDOS] Salvando ordem no banco de dados...', order.id);
            
            const savedOrder = await window.updateInDatabase('orders', order);
            
            console.log('✅ [PEDIDOS] Ordem salva:', {
                id: savedOrder.id,
                status: savedOrder.status,
                updatedAt: savedOrder.updatedAt
            });
            
            // 🔥 SINCRONIZAR COM FIREBASE (se for pedido online)
            if (order.source === 'online' && window.firebaseManager) {
                try {
                    console.log('🔥 [PEDIDOS] Sincronizando status com Firebase:', orderId);
                    await window.firebaseManager.updateData(`online-orders/${orderId}`, {
                        status: newStatus,
                        updatedAt: order.updatedAt,
                        statusHistory: order.statusHistory
                    });
                    console.log('✅ [PEDIDOS] Status sincronizado com Firebase');
                } catch (fbError) {
                    console.warn('⚠️ [PEDIDOS] Erro ao sincronizar com Firebase:', fbError);
                    // Não bloquear o fluxo se Firebase falhar
                }
            }
            
            // Verificar se realmente salvou
            const verifyOrders = await window.getFromDatabase('orders');
            const verifyOrder = verifyOrders.find(o => o.id === orderId);
            console.log('🔍 [PEDIDOS] Verificação pós-salvamento:', {
                id: verifyOrder?.id,
                status: verifyOrder?.status,
                updatedAt: verifyOrder?.updatedAt,
                found: !!verifyOrder,
                match: verifyOrder?.status === newStatus
            });

            // Atualiza interface
            await this.loadOrders();

            if (window.showToast) {
                // CORREÇÃO: Verificação de segurança
                window.showToast(`Pedido ${(this.orderStatus[newStatus] || this.orderStatus['pending']).label.toLowerCase()} com sucesso! ✓`, 'success');
            }

            // Enviar WhatsApp para cada mudança de status
            console.log('📱 Verificando WhatsApp:', {
                status: newStatus,
                customerPhone: order.customerPhone,
                customerName: order.customerName,
                customer: order.customer
            });
            
            // Tentar pegar telefone do campo direto ou do objeto customer
            const phone = order.customerPhone || order.customer?.phone;
            
            if (phone) {
                this.sendWhatsAppByStatus(order, newStatus);
            } else {
                console.log('⚠️ Pedido sem telefone do cliente');
            }

            // Notificação do sistema (se suportado)
            this.sendNotification(order, newStatus);

        } catch (error) {
            console.error('[PEDIDOS] Erro ao atualizar status:', error);
            if (window.showToast) window.showToast('Erro ao atualizar status do pedido', 'error');
        }
    }

    /**
     * Valida se a transição de status é permitida
     */
    isValidStatusTransition(currentStatus, newStatus) {
        // Permitir todas as transições por enquanto
        // Pode adicionar lógica específica se necessário
        const validTransitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['preparing', 'cancelled'],
            'preparing': ['ready', 'cancelled'],
            'ready': ['delivered', 'cancelled'],
            'delivered': [],
            'cancelled': []
        };

        // Se não há regras definidas, permite qualquer transição
        if (!validTransitions[currentStatus]) return true;

        // Verifica se a transição é válida
        return validTransitions[currentStatus].includes(newStatus);
    }

    /**
     * Aplica filtros
     */
    applyFilters() {
        this.filteredOrders = this.currentOrders.filter(order => {
            // Filtro por status
            if (this.filters.status !== 'all' && order.status !== this.filters.status) {
                return false;
            }

            // Filtro por período
            if (!this.matchesDateFilter(order.createdAt, this.filters.dateRange)) {
                return false;
            }

            // Filtro por método de pagamento
            if (this.filters.paymentMethod !== 'all' && order.paymentMethod !== this.filters.paymentMethod) {
                return false;
            }

            // Filtro por busca de cliente
            if (this.filters.customer) {
                const searchTerm = this.filters.customer.toLowerCase();
                return (
                    (order.customerName && order.customerName.toLowerCase().includes(searchTerm)) ||
                    (order.customerPhone && order.customerPhone.includes(searchTerm)) ||
                    order.id.toLowerCase().includes(searchTerm)
                );
            }

            return true;
        });

        // Aplica ordenação
        this.sortOrders();
    }

    /**
     * Ordena pedidos
     */
    sortOrders() {
        this.filteredOrders.sort((a, b) => {
            let aValue = a[this.sortBy];
            let bValue = b[this.sortBy];

            // Tratamento especial para diferentes tipos
            if (this.sortBy === 'createdAt') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }

            if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Verifica se a data corresponde ao filtro
     */
    matchesDateFilter(dateString, filter) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        switch (filter) {
            case 'today':
                return date.toDateString() === today.toDateString();
            
            case 'yesterday':
                return date.toDateString() === yesterday.toDateString();
            
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                return date >= weekStart;
            
            case 'month':
                return date.getMonth() === today.getMonth() && 
                       date.getFullYear() === today.getFullYear();
            
            case 'all':
            default:
                return true;
        }
    }

    /**
     * Funções de filtro e busca
     */
    updateFilter(filterType, value) {
        this.filters[filterType] = value;
        this.currentPage = 1;
        this.applyFilters();
        this.updateOrdersDisplay();
    }

    debouncedSearch = debounce((searchTerm) => {
        this.filters.customer = searchTerm;
        this.currentPage = 1;
        this.applyFilters();
        this.updateOrdersDisplay();
    }, 300);

    clearFilters() {
        this.filters = {
            status: 'all',
            dateRange: 'today',
            customer: '',
            paymentMethod: 'all'
        };
        
        // Reseta elementos do formulário
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('dateFilter').value = 'today';
        document.getElementById('paymentFilter').value = 'all';
        document.getElementById('customerSearch').value = '';

        this.currentPage = 1;
        this.applyFilters();
        this.updateOrdersDisplay();
    }

    /**
     * Atualiza exibição dos pedidos
     */
    updateOrdersDisplay() {
        const ordersList = document.getElementById('ordersList');
        const pagination = document.getElementById('ordersPagination');
        const metrics = document.getElementById('ordersMetrics');

        if (ordersList) ordersList.innerHTML = this.renderOrdersList();
        if (pagination) pagination.innerHTML = this.renderPagination();
        if (metrics) metrics.innerHTML = this.renderMetrics();
    }

    /**
     * Sistema de paginação
     */
    renderPagination() {
        const totalPages = Math.ceil(this.filteredOrders.length / this.ordersPerPage);
        
        if (totalPages <= 1) return '';

        let pagination = '<div class="pagination-controls">';
        
        // Botão anterior
        pagination += `
            <button class="btn-pagination ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="pedidosModule.goToPage(${this.currentPage - 1})"
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Números das páginas
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            pagination += `<button class="btn-pagination" onclick="pedidosModule.goToPage(1)">1</button>`;
            if (startPage > 2) {
                pagination += '<span class="pagination-ellipsis">...</span>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pagination += `
                <button class="btn-pagination ${i === this.currentPage ? 'active' : ''}" 
                        onclick="pedidosModule.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pagination += '<span class="pagination-ellipsis">...</span>';
            }
            pagination += `<button class="btn-pagination" onclick="pedidosModule.goToPage(${totalPages})">${totalPages}</button>`;
        }

        // Botão próximo
        pagination += `
            <button class="btn-pagination ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="pedidosModule.goToPage(${this.currentPage + 1})"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        pagination += '</div>';

        // Informações da paginação
        const startItem = (this.currentPage - 1) * this.ordersPerPage + 1;
        const endItem = Math.min(this.currentPage * this.ordersPerPage, this.filteredOrders.length);
        
        pagination += `
            <div class="pagination-info">
                Mostrando ${startItem} a ${endItem} de ${this.filteredOrders.length} pedidos
            </div>
        `;

        return pagination;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredOrders.length / this.ordersPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.updateOrdersDisplay();
        }
    }

    /**
     * Funções auxiliares
     */
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays < 7) return `${diffDays}d atrás`;
        
        return formatDateTime(date).split(' ')[0];
    }

    getPaymentMethodName(method) {
        const methods = {
            dinheiro: 'Dinheiro',
            cartao: 'Cartão',
            pix: 'PIX',
            credito: 'Crédito',
            debito: 'Débito'
        };
        return methods[method] || method;
    }

    /**
     * Atualiza lista de pedidos
     */
    updateOrdersList() {
        const ordersList = document.getElementById('ordersList');
        if (ordersList) {
            ordersList.innerHTML = this.renderOrdersList();
        }
        
        const pagination = document.getElementById('ordersPagination');
        if (pagination) {
            pagination.innerHTML = this.renderPagination();
        }
    }

    /**
     * Event listeners
     */
    initEventListeners() {
        // Eventos de teclado para atalhos
        this.addEventListener(document, 'keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.showNewOrderModal();
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('customerSearch')?.focus();
                        break;
                }
            }
            // ESC para fechar modais
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Event delegation para botões de fechar modal
        this.addEventListener(document, 'click', (e) => {
            // Fechar modal com data-dismiss
            if (e.target.matches('[data-dismiss="modal"]') || e.target.closest('[data-dismiss="modal"]')) {
                this.closeAllModals();
            }
            
            // Fechar modal clicando fora (no backdrop)
            if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
                this.closeAllModals();
            }
        });
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal.active, .modal.fade.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
    }

    /**
     * Métodos de ação
     */
    async showNewOrderModal() {
        // Criar modal para novo pedido manual
        this.createNewOrderModal();
    }

    createNewOrderModal() {
        // Remover modal existente se houver
        const existingModal = document.getElementById('newOrderModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Criar modal
        const modal = document.createElement('div');
        modal.id = 'newOrderModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> Novo Pedido Manual</h3>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="newOrderForm" class="modal-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="customerName">Nome do Cliente *</label>
                            <input type="text" id="customerName" required placeholder="Digite o nome do cliente">
                        </div>
                        
                        <div class="form-group">
                            <label for="customerPhone">Telefone</label>
                            <input type="tel" id="customerPhone" placeholder="(11) 99999-9999">
                        </div>
                        
                        <div class="form-group">
                            <label for="orderType">Tipo de Pedido *</label>
                            <select id="orderType" required>
                                <option value="">Selecione o tipo</option>
                                <option value="balcao">Balcão</option>
                                <option value="mesa">Mesa</option>
                                <option value="delivery">Delivery</option>
                                <option value="retirada">Retirada</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="tableNumber">Número da Mesa</label>
                            <input type="number" id="tableNumber" placeholder="Ex: 5" min="1">
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="customerAddress">Endereço (para delivery)</label>
                            <textarea id="customerAddress" rows="2" placeholder="Digite o endereço completo"></textarea>
                        </div>
                    </div>
                    
                    <div class="order-items-section">
                        <h4>Itens do Pedido</h4>
                        <div class="items-header">
                            <button type="button" class="btn btn-secondary" onclick="pedidosModule.addOrderItem()">
                                <i class="fas fa-plus"></i> Adicionar Item
                            </button>
                        </div>
                        <div id="orderItemsList" class="order-items-list">
                            <!-- Itens serão adicionados aqui -->
                        </div>
                    </div>
                    
                    <div class="order-summary">
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span id="orderSubtotal">R$ 0,00</span>
                        </div>
                        <div class="summary-row">
                            <label for="discountValue">Desconto (R$):</label>
                            <input type="number" id="discountValue" step="0.01" min="0" value="0" onchange="pedidosModule.calculateOrderTotal()">
                        </div>
                        <div class="summary-row total">
                            <span><strong>Total:</strong></span>
                            <span id="orderTotal"><strong>R$ 0,00</strong></span>
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="paymentMethod">Método de Pagamento *</label>
                        <select id="paymentMethod" required>
                            <option value="">Selecione o método</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="cartao_credito">Cartão de Crédito</option>
                            <option value="cartao_debito">Cartão de Débito</option>
                            <option value="pix">PIX</option>
                            <option value="vale_refeicao">Vale Refeição</option>
                        </select>
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="orderNotes">Observações</label>
                        <textarea id="orderNotes" rows="3" placeholder="Observações especiais do pedido"></textarea>
                    </div>
                </form>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Cancelar
                    </button>
                    <button type="button" class="btn btn-primary" onclick="pedidosModule.saveNewOrder()">
                        <i class="fas fa-save"></i> Criar Pedido
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Mostrar modal
        setTimeout(() => {
            modal.classList.add('active');
            document.getElementById('customerName').focus();
        }, 100);

        // Adicionar primeiro item automaticamente
        setTimeout(async () => {
            await this.addOrderItem();
        }, 200);
    }

    async addOrderItem() {
        const container = document.getElementById('orderItemsList');
        if (!container) return;

        const itemId = 'item_' + Date.now();
        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-item';
        itemDiv.id = itemId;
        itemDiv.innerHTML = `
            <div class="item-row">
                <div class="item-field">
                    <label>Produto *</label>
                    <div class="product-search-container">
                        <input type="text" class="item-name product-search" placeholder="Digite para buscar produto..." required autocomplete="off">
                        <div class="product-suggestions" style="display: none;"></div>
                    </div>
                </div>
                <div class="item-field small">
                    <label>Qtd *</label>
                    <input type="number" class="item-quantity" min="1" value="1" onchange="setTimeout(() => pedidosModule.calculateOrderTotal(), 10)" required>
                </div>
                <div class="item-field small">
                    <label>Preço Unit. *</label>
                    <input type="number" class="item-price" step="0.01" min="0" placeholder="0.00" onchange="setTimeout(() => pedidosModule.calculateOrderTotal(), 10)" required>
                </div>
                <div class="item-field small">
                    <label>Total</label>
                    <input type="text" class="item-total" readonly placeholder="R$ 0,00">
                </div>
                <div class="item-actions">
                    <button type="button" class="btn-icon btn-danger" onclick="this.closest('.order-item').remove(); pedidosModule.calculateOrderTotal();" title="Remover item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="item-notes">
                <textarea placeholder="Observações do item (opcional)" rows="1"></textarea>
            </div>
        `;

        container.appendChild(itemDiv);
        
        // Aguardar DOM renderizar antes de configurar autocomplete e calcular totais
        setTimeout(async () => {
            await this.setupProductAutocomplete(itemDiv);
            this.calculateOrderTotal();
        }, 50);
    }

    calculateOrderTotal() {
        const items = document.querySelectorAll('.order-item');
        
        // Se não há itens, resetar totais
        if (items.length === 0) {
            if (document.getElementById('orderSubtotal')) {
                document.getElementById('orderSubtotal').textContent = 'R$ 0,00';
            }
            if (document.getElementById('orderTotal')) {
                document.getElementById('orderTotal').innerHTML = '<strong>R$ 0,00</strong>';
            }
            return;
        }
        
        let subtotal = 0;
        let validItems = 0;

        items.forEach((item, index) => {
            const quantityEl = item.querySelector('.item-quantity');
            const priceEl = item.querySelector('.item-price');
            const totalEl = item.querySelector('.item-total');
            
            // Verificar se os elementos existem antes de acessar .value
            if (!quantityEl || !priceEl || !totalEl) {
                console.warn(`⚠️ Elementos de item ${index + 1} não encontrados:`, {
                    quantityEl: !!quantityEl,
                    priceEl: !!priceEl,
                    totalEl: !!totalEl,
                    itemId: item.id
                });
                return;
            }
            
            const quantity = parseFloat(quantityEl.value) || 0;
            const price = parseFloat(priceEl.value) || 0;
            const total = quantity * price;
            
            totalEl.value = `R$ ${total.toFixed(2)}`;
            subtotal += total;
            validItems++;
        });

        // Log para debug
        console.log(`📊 Calculando total: ${validItems}/${items.length} itens válidos, subtotal: R$ ${subtotal.toFixed(2)}`);

        const discount = parseFloat(document.getElementById('discountValue')?.value) || 0;
        const total = Math.max(0, subtotal - discount);

        if (document.getElementById('orderSubtotal')) {
            document.getElementById('orderSubtotal').textContent = `R$ ${subtotal.toFixed(2)}`;
        }
        if (document.getElementById('orderTotal')) {
            document.getElementById('orderTotal').innerHTML = `<strong>R$ ${total.toFixed(2)}</strong>`;
        }
    }

    async setupProductAutocomplete(itemDiv) {
        const input = itemDiv.querySelector('.product-search');
        const suggestions = itemDiv.querySelector('.product-suggestions');
        const priceInput = itemDiv.querySelector('.item-price');

        if (!input || !suggestions) {
            console.warn('⚠️ Elementos de autocomplete não encontrados');
            return;
        }

        console.log('🔧 Configurando autocomplete para item...');

        // Carregar produtos do cardápio
        const products = await this.loadMenuProducts();
        console.log('📋 Produtos carregados para autocomplete:', products.length);

        let debounceTimer;

        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            
            // Verificar se o target e value existem
            if (!e.target || !e.target.value) {
                suggestions.style.display = 'none';
                return;
            }
            
            const query = e.target.value.trim();
            
            console.log('🔍 Busca por:', query);
            
            debounceTimer = setTimeout(() => {
                if (query.length < 2) {
                    suggestions.style.display = 'none';
                    return;
                }

                const filtered = products.filter(product => 
                    product.name.toLowerCase().includes(query.toLowerCase()) ||
                    (product.description && product.description.toLowerCase().includes(query.toLowerCase()))
                ).slice(0, 8); // Limite de 8 sugestões

                console.log('📋 Produtos filtrados:', filtered.length);
                this.showProductSuggestions(suggestions, filtered, input, priceInput);
            }, 300);
        });

        // Evento para mostrar todas as opções ao focar no campo vazio
        input.addEventListener('focus', (e) => {
            if (!e.target || !e.target.value) return;
            
            if (e.target.value.trim() === '') {
                const topProducts = products.slice(0, 8);
                this.showProductSuggestions(suggestions, topProducts, input, priceInput);
            }
        });

        // Fechar sugestões ao clicar fora
        document.addEventListener('click', (e) => {
            if (!itemDiv.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });

        // Fechar sugestões ao pressionar Escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                suggestions.style.display = 'none';
            }
        });
    }

    async loadMenuProducts() {
        try {
            console.log('🔍 Carregando produtos do cardápio...');
            
            // Primeiro, tentar carregar do módulo cardápio se estiver disponível
            let products = [];
            
            if (window.cardapioModule && window.cardapioModule.getProducts) {
                products = window.cardapioModule.getProducts();
                console.log('📦 Produtos carregados do módulo cardápio:', products.length);
            } else {
                // Fallback: carregar diretamente do banco de dados
                products = await window.getFromDatabase('products') || [];
                console.log('📦 Produtos carregados do banco de dados:', products.length);
            }
            
            // Se ainda não tiver produtos, criar alguns exemplos
            if (products.length === 0) {
                console.warn('⚠️ Nenhum produto encontrado, usando produtos de exemplo');
                products = [
                    { id: 'ex1', name: 'Hambúrguer Clássico', price: 15.90, description: 'Hambúrguer tradicional com carne, queijo e salada', available: true },
                    { id: 'ex2', name: 'Cheeseburger', price: 17.90, description: 'Hambúrguer com queijo extra', available: true },
                    { id: 'ex3', name: 'Batata Frita', price: 8.90, description: 'Batata frita crocante', available: true },
                    { id: 'ex4', name: 'Refrigerante', price: 4.90, description: 'Bebida gelada 350ml', available: true },
                    { id: 'ex5', name: 'Milkshake', price: 12.90, description: 'Milkshake cremoso', available: true }
                ];
            }
            
            // Filtrar apenas produtos disponíveis
            const availableProducts = products.filter(product => 
                product.available !== false && 
                product.name && 
                product.price && 
                product.price > 0
            );
            
            console.log('✅ Produtos disponíveis para pedidos:', availableProducts.length);
            return availableProducts;
            
        } catch (error) {
            console.error('❌ Erro ao carregar produtos:', error);
            // Retornar produtos de exemplo em caso de erro
            return [
                { id: 'ex1', name: 'Hambúrguer Clássico', price: 15.90, description: 'Hambúrguer tradicional', available: true },
                { id: 'ex2', name: 'Batata Frita', price: 8.90, description: 'Batata frita crocante', available: true },
                { id: 'ex3', name: 'Refrigerante', price: 4.90, description: 'Bebida 350ml', available: true }
            ];
        }
    }

    showProductSuggestions(container, products, input, priceInput) {
        console.log('💡 Mostrando sugestões:', products.length);
        
        if (products.length === 0) {
            container.innerHTML = '<div class="no-products">Nenhum produto encontrado</div>';
            container.style.display = 'block';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-suggestion" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}">
                <div class="suggestion-name">${product.name}</div>
                <div class="suggestion-price">R$ ${parseFloat(product.price).toFixed(2)}</div>
                ${product.description ? `<div class="suggestion-description">${product.description}</div>` : ''}
            </div>
        `).join('');

        // Adicionar eventos de clique
        container.querySelectorAll('.product-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const name = suggestion.dataset.productName;
                const price = parseFloat(suggestion.dataset.productPrice);

                console.log('✅ Produto selecionado:', name, 'Preço:', price);

                // Verificar se os inputs ainda existem antes de definir valores
                if (input && input.value !== undefined) {
                    input.value = name;
                }
                if (priceInput && priceInput.value !== undefined) {
                    priceInput.value = price.toFixed(2);
                }
                
                container.style.display = 'none';
                
                // Recalcular totais com um pequeno delay
                setTimeout(() => {
                    this.calculateOrderTotal();
                }, 10);

                // Focar no próximo campo (quantidade)
                const quantityInput = input.closest('.order-item').querySelector('.item-quantity');
                if (quantityInput) {
                    quantityInput.focus();
                    quantityInput.select();
                }
            });
        });

        container.style.display = 'block';
        console.log('📋 Container de sugestões exibido');
    }

    async saveNewOrder() {
        const form = document.getElementById('newOrderForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Coletar dados do formulário
        const customerName = document.getElementById('customerName').value.trim();
        const customerPhone = document.getElementById('customerPhone').value.trim();
        const orderType = document.getElementById('orderType').value;
        const tableNumber = document.getElementById('tableNumber').value;
        const customerAddress = document.getElementById('customerAddress').value.trim();
        const paymentMethod = document.getElementById('paymentMethod').value;
        const orderNotes = document.getElementById('orderNotes').value.trim();
        const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;

        // Coletar itens
        const itemElements = document.querySelectorAll('.order-item');
        const items = [];
        let hasValidItems = false;

        itemElements.forEach(itemEl => {
            const name = itemEl.querySelector('.item-name').value.trim();
            const quantity = parseInt(itemEl.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(itemEl.querySelector('.item-price').value) || 0;
            const notes = itemEl.querySelector('textarea').value.trim();

            if (name && quantity > 0 && price > 0) {
                items.push({
                    id: `item_${Date.now()}_${Math.random()}`,
                    name: name,
                    quantity: quantity,
                    price: price,
                    total: quantity * price,
                    notes: notes || null
                });
                hasValidItems = true;
            }
        });

        if (!hasValidItems) {
            showToast('Adicione pelo menos um item válido ao pedido', 'error');
            return;
        }

        // Calcular totais
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const total = Math.max(0, subtotal - discountValue);

        // Criar objeto do pedido
        const newOrder = {
            id: `ORD${Date.now()}`,
            number: Date.now().toString().slice(-6),
            status: 'confirmed',
            type: orderType,
            date: new Date().toISOString(),
            customer: {
                name: customerName,
                phone: customerPhone || null,
                address: orderType === 'delivery' ? customerAddress : null
            },
            table: orderType === 'mesa' ? tableNumber : null,
            items: items,
            subtotal: subtotal,
            discount: discountValue,
            total: total,
            paymentMethod: paymentMethod,
            notes: orderNotes || null,
            source: 'manual',
            createdBy: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            // Salvar novo pedido INDIVIDUALMENTE no banco de dados
            // CORREÇÃO: Usar saveToDatabase com pedido único, não array
            await window.saveToDatabase('orders', newOrder);

            // Fechar modal
            document.getElementById('newOrderModal').remove();

            // Atualizar lista de pedidos
            await this.loadOrders();

            // Mostrar sucesso
            showToast(`Pedido #${newOrder.number} criado com sucesso!`, 'success');

            console.log('✅ Novo pedido criado:', newOrder);

        } catch (error) {
            console.error('❌ Erro ao salvar pedido:', error);
            showToast('Erro ao salvar pedido. Tente novamente.', 'error');
        }
    }

    async showOrderDetails(orderId) {
        try {
            const orders = await window.getFromDatabase('orders');
            const order = orders.find(o => o.id === orderId);
            if (!order) {
                if (window.showToast) window.showToast('Pedido não encontrado', 'error');
                return;
            }

            this.selectedOrder = order;
            this.renderOrderDetailsModal(order);
            
            // Aguarda processamento do DOM
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Abre modal
            const modal = document.getElementById('orderDetailsModal');
            if (modal) {
                modal.classList.add('active');
            }

        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            showToast('Erro ao carregar detalhes do pedido', 'error');
        }
    }

    renderOrderDetailsModal(order) {
        const content = document.getElementById('orderDetailsContent');
        if (!content) return;

        // CORREÇÃO CRÍTICA: Verificação de segurança para status
        const status = this.orderStatus[order.status] || this.orderStatus['pending'];

        // CRÍTICO: Remove conteúdo anterior
        content.innerHTML = '';

        // Cria HTML usando DOMParser (pattern do Cardápio)
        const htmlString = `
            <div class="order-details">
                <!-- Cabeçalho do pedido -->
                <div class="order-detail-header">
                    <div class="order-info">
                        <h4>Pedido #${order.id.slice(-8).toUpperCase()}</h4>
                        <div class="order-meta">
                            <div class="order-date-edit">
                                <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">
                                    📅 Data/Hora do Pedido:
                                </label>
                                <input 
                                    type="datetime-local" 
                                    id="orderDateTime_${order.id}"
                                    value="${new Date(order.createdAt).toISOString().slice(0, 16)}"
                                    onchange="pedidosModule.updateOrderDateTime('${order.id}', this.value)"
                                    style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;"
                                />
                                <small style="display: block; margin-top: 4px; color: #666;">
                                    Clique para editar e ajustar a data
                                </small>
                            </div>
                            <span class="order-status-badge" style="background-color: ${status.color}">
                                ${status.icon} ${status.label}
                            </span>
                        </div>
                    </div>
                    <div class="order-actions-modal">
                        ${this.renderOrderActions(order)}
                        <button class="btn btn-outline-secondary" onclick="pedidosModule.printOrder('${order.id}')">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                    </div>
                </div>

                <!-- Informações do cliente -->
                ${order.customerName ? `
                    <div class="customer-info">
                        <h5><i class="fas fa-user"></i> Cliente</h5>
                        <div class="customer-details">
                            <p><strong>Nome:</strong> ${order.customerName}</p>
                            ${order.customerPhone ? `<p><strong>Telefone:</strong> ${order.customerPhone}</p>` : ''}
                            ${order.customerEmail ? `<p><strong>E-mail:</strong> ${order.customerEmail}</p>` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Itens do pedido -->
                <div class="order-items-detail">
                    <h5><i class="fas fa-list"></i> Itens do Pedido</h5>
                    <div class="items-table">
                        ${order.items ? order.items.map(item => `
                            <div class="item-row">
                                <div class="item-info">
                                    <strong>${item.name}</strong>
                                    ${item.description ? `<small>${item.description}</small>` : ''}
                                    ${item.customizations && item.customizations.length > 0 ? `
                                        <div class="item-customizations">
                                            ${item.customizations.map(custom => 
                                                `<span class="customization-tag">${custom}</span>`
                                            ).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="item-quantity">${item.quantity}x</div>
                                <div class="item-price">${formatCurrency(item.price)}</div>
                                <div class="item-total">${formatCurrency(item.price * item.quantity)}</div>
                            </div>
                        `).join('') : ''}
                    </div>
                </div>

                <!-- Resumo financeiro -->
                <div class="order-summary">
                    <h5><i class="fas fa-calculator"></i> Resumo Financeiro</h5>
                    <div class="summary-table">
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span>${formatCurrency(order.subtotal || order.total)}</span>
                        </div>
                        ${order.discount ? `
                            <div class="summary-row discount">
                                <span>Desconto:</span>
                                <span>-${formatCurrency(order.discount)}</span>
                            </div>
                        ` : ''}
                        ${order.tax ? `
                            <div class="summary-row">
                                <span>Taxa:</span>
                                <span>${formatCurrency(order.tax)}</span>
                            </div>
                        ` : ''}
                        <div class="summary-row total">
                            <strong>
                                <span>Total:</span>
                                <span>${formatCurrency(order.total)}</span>
                            </strong>
                        </div>
                    </div>
                    
                    <div class="payment-info">
                        <p><strong>Método de Pagamento:</strong> ${this.getPaymentMethodName(order.paymentMethod)}</p>
                        ${order.change ? `<p><strong>Troco:</strong> ${formatCurrency(order.change)}</p>` : ''}
                    </div>
                </div>

                <!-- Histórico de status -->
                ${order.statusHistory && order.statusHistory.length > 0 ? `
                    <div class="status-history">
                        <h5><i class="fas fa-history"></i> Histórico</h5>
                        <div class="timeline">
                            ${order.statusHistory.map(history => {
                                // Suporta tanto 'status' quanto 'action' no histórico
                                const statusKey = history.status || history.action;
                                const historyStatus = this.orderStatus[statusKey];
                                
                                // Se não encontrar status, usar valores padrão
                                if (!historyStatus) {
                                    return `
                                        <div class="timeline-item">
                                            <div class="timeline-marker" style="background-color: #6c757d">
                                                <i class="fas fa-circle"></i>
                                            </div>
                                            <div class="timeline-content">
                                                <strong>${history.action || history.status || 'Ação'}</strong>
                                                <small>${formatDateTime(history.timestamp)}</small>
                                                ${history.user ? `<span class="user">por ${history.user}</span>` : ''}
                                                ${history.note ? `<p class="text-muted mb-0">${history.note}</p>` : ''}
                                            </div>
                                        </div>
                                    `;
                                }
                                
                                return `
                                    <div class="timeline-item">
                                        <div class="timeline-marker" style="background-color: ${historyStatus.color}">
                                            ${historyStatus.icon}
                                        </div>
                                        <div class="timeline-content">
                                            <strong>${historyStatus.label}</strong>
                                            <small>${formatDateTime(history.timestamp)}</small>
                                            ${history.user ? `<span class="user">por ${history.user}</span>` : ''}
                                            ${history.note ? `<p class="text-muted mb-0">${history.note}</p>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Parse HTML para DOM usando DOMParser (solução Cardápio)
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        
        // Adiciona todos os elementos parseados ao container
        Array.from(doc.body.children).forEach(child => {
            content.appendChild(child);
        });

        // Log de debug para verificar
        console.log('[PEDIDOS] Modal renderizado, children:', content.children.length);
    }

    async printOrder(orderId) {
        try {
            const orders = await window.getFromDatabase('orders');
            const order = orders.find(o => o.id === orderId);
            if (!order) {
                if (window.showToast) window.showToast('Pedido não encontrado', 'error');
                return;
            }

            // Implementa impressão (pode ser integrada com impressora térmica)
            const printContent = this.generatePrintContent(order);
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
            printWindow.close();

        } catch (error) {
            console.error('Erro ao imprimir:', error);
            showToast('Erro ao imprimir pedido', 'error');
        }
    }

    /**
     * Cancelar pedido com motivo
     */
    async cancelOrder(orderId) {
        try {
            const orders = await window.getFromDatabase('orders');
            const order = orders.find(o => o.id === orderId);
            if (!order) {
                if (window.showToast) window.showToast('Pedido não encontrado', 'error');
                return;
            }

            // Se já cancelado, não fazer nada
            if (order.status === 'cancelled') {
                showToast('Pedido já está cancelado', 'info');
                return;
            }

            // Solicita motivo do cancelamento
            const reason = await this.promptCancellationReason();
            if (!reason) {
                return; // Usuário cancelou a ação
            }

            // Atualiza status para cancelled
            order.status = 'cancelled';
            order.updatedAt = new Date().toISOString();
            order.cancellationReason = reason;
            order.cancelledAt = new Date().toISOString();

            // Adiciona ao histórico
            if (!order.statusHistory) {
                order.statusHistory = [];
            }

            order.statusHistory.push({
                status: 'cancelled',
                previousStatus: order.status,
                timestamp: new Date().toISOString(),
                reason: reason,
                user: 'Sistema'
            });

            // Salva no banco
            await window.updateInDatabase('orders', order);
            
            // 🔥 SINCRONIZAR COM FIREBASE (se for pedido online)
            if (order.source === 'online' && window.firebaseManager) {
                try {
                    console.log('🔥 [PEDIDOS] Sincronizando cancelamento com Firebase:', orderId);
                    await window.firebaseManager.updateData(`online-orders/${orderId}`, {
                        status: 'cancelled',
                        cancellationReason: reason,
                        cancelledAt: order.cancelledAt,
                        updatedAt: order.updatedAt,
                        statusHistory: order.statusHistory
                    });
                    console.log('✅ [PEDIDOS] Cancelamento sincronizado com Firebase');
                } catch (fbError) {
                    console.warn('⚠️ [PEDIDOS] Erro ao sincronizar cancelamento com Firebase:', fbError);
                }
            }

            // Atualiza interface
            await this.loadOrders();

            if (window.showToast) window.showToast('Pedido cancelado com sucesso', 'success');

        } catch (error) {
            console.error('Erro ao cancelar pedido:', error);
            showToast('Erro ao cancelar pedido', 'error');
        }
    }

    /**
     * Excluir pedido permanentemente (cancelados ou concluídos)
     */
    async deleteOrder(orderId) {
        try {
            const order = this.currentOrders.find(o => o.id === orderId);
            
            if (!order) {
                window.showToast('Pedido não encontrado', 'error');
                return;
            }
            
            // Confirmar exclusão (sempre permitir deletar)
            const isOnline = order.source === 'online' ? '🌐 ONLINE' : '';
            const confirmed = confirm(`⚠️ ATENÇÃO!\n\nDeseja realmente EXCLUIR PERMANENTEMENTE o pedido ${isOnline} #${order.orderNumber}?\n\nStatus: ${this.orderStatus[order.status].label}\n\nEsta ação não pode ser desfeita!`);
            
            if (!confirmed) return;
            
            console.log(`🗑️ Deletando pedido ${orderId}...`);
            
            // Deletar do banco de dados PDV
            await window.deleteFromDatabase('orders', orderId);
            console.log(`✅ Pedido ${orderId} deletado do banco de dados PDV`);
            
            // Se for pedido ONLINE, deletar também do Firebase
            if (order.source === 'online') {
                try {
                    console.log(`🔥 Tentando deletar ${orderId} do Firebase...`);
                    
                    // Usar API direta do Firebase para garantir deleção
                    if (typeof firebase !== 'undefined' && firebase.database) {
                        const db = firebase.database();
                        
                        // Deletar de online-orders (listener)
                        await db.ref(`online-orders/${orderId}`).remove();
                        console.log(`✅ Deletado de online-orders/${orderId}`);
                        
                        // Deletar de orders (sync)
                        await db.ref(`orders/${orderId}`).remove();
                        console.log(`✅ Deletado de orders/${orderId}`);
                    }
                    
                    // CRÍTICO: Remover do Set de pedidos processados do listener
                    if (window.onlineOrdersListener) {
                        window.onlineOrdersListener.processedOrders.delete(orderId);
                        console.log(`✅ Pedido ${orderId} removido da lista de processados`);
                        
                        // IMPORTANTE: Adicionar à lista de pedidos deletados para evitar reprocessamento
                        if (!window.onlineOrdersListener.deletedOrders) {
                            window.onlineOrdersListener.deletedOrders = new Set();
                        }
                        window.onlineOrdersListener.deletedOrders.add(orderId);
                        console.log(`🚫 Pedido ${orderId} marcado como deletado permanentemente`);
                    }
                    
                    console.log(`🎉 Pedido ${orderId} deletado completamente do Firebase`);
                } catch (fbError) {
                    console.error(`❌ Erro ao deletar do Firebase:`, fbError);
                    window.showToast('⚠️ Erro ao deletar do Firebase: ' + fbError.message, 'warning');
                }
            }
            
            // Remover da lista local
            this.currentOrders = this.currentOrders.filter(o => o.id !== orderId);
            console.log(`✅ Pedido ${orderId} removido da lista local`);
            
            // Atualizar interface
            this.applyFilters();
            this.updateMetrics();
            this.updateOrdersList();
            
            window.showToast('Pedido excluído permanentemente ✓', 'success');
            
            console.log(`🎉 Pedido ${orderId} excluído com sucesso!`);
            
        } catch (error) {
            console.error('❌ Erro ao excluir pedido:', error);
            window.showToast('Erro ao excluir pedido: ' + error.message, 'error');
        }
    }

    /**
     * Deletar TODOS os pedidos de teste (antes de hoje)
     */
    async deleteAllTestOrders() {
        try {
            // Primeira pergunta: tipo de limpeza
            const choice = prompt(
                '🗑️ LIMPAR PEDIDOS\n\n' +
                'Digite o número da opção:\n\n' +
                '1 - Deletar TODOS os pedidos (incluindo de hoje)\n' +
                '2 - Deletar apenas pedidos antigos (antes de hoje)\n' +
                '3 - Deletar apenas pedidos ONLINE\n' +
                '4 - Deletar pedidos INVÁLIDOS (fantasma/sem items)\n' +
                '5 - Cancelar',
                '4'
            );

            if (!choice || choice === '5') return;

            let ordersToDelete = [];
            let message = '';
            
            if (choice === '1') {
                // Deletar TODOS os pedidos
                ordersToDelete = [...this.currentOrders];
                message = `TODOS os ${ordersToDelete.length} pedidos`;
            } else if (choice === '2') {
                // Deletar apenas pedidos ANTIGOS (antes de hoje)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                ordersToDelete = this.currentOrders.filter(order => {
                    const orderDate = new Date(order.createdAt);
                    return orderDate < today;
                });
                message = `${ordersToDelete.length} pedidos antigos (antes de hoje)`;
            } else if (choice === '3') {
                // Deletar apenas pedidos ONLINE
                ordersToDelete = this.currentOrders.filter(order => order.source === 'online');
                message = `TODOS os ${ordersToDelete.length} pedidos ONLINE`;
            } else if (choice === '4') {
                // Deletar pedidos INVÁLIDOS/FANTASMA
                ordersToDelete = this.currentOrders.filter(order => {
                    // Pedido fantasma: sem status, sem items, ou com ID estranho (array salvo como objeto)
                    const hasNoStatus = order.status === undefined || order.status === null;
                    const hasNoItems = !order.items || !Array.isArray(order.items) || order.items.length === 0;
                    const isArrayObject = Array.isArray(order) || (typeof order === 'object' && order[0] !== undefined);
                    const hasInvalidId = order.id && (order.id.includes('yq202') || order.id.includes('i4jh'));
                    
                    return hasNoStatus || (hasNoItems && order.total === 0) || isArrayObject || hasInvalidId;
                });
                message = `${ordersToDelete.length} pedidos INVÁLIDOS/FANTASMA`;
            } else {
                alert('Opção inválida! Digite 1, 2, 3, 4 ou 5.');
                return;
            }
            
            if (ordersToDelete.length === 0) {
                window.showToast('Nenhum pedido encontrado para deletar', 'info');
                return;
            }
            
            const confirmDelete = confirm(
                `⚠️ ATENÇÃO!\n\n` +
                `Serão deletados ${message}.\n\n` +
                `Esta ação NÃO pode ser desfeita!\n\n` +
                `Deseja continuar?`
            );
            
            if (!confirmDelete) return;
            
            // Deletar todos os pedidos selecionados
            console.log(`🗑️ Iniciando exclusão de ${ordersToDelete.length} pedidos...`);
            let deletedCount = 0;
            let errorCount = 0;
            
            for (const order of ordersToDelete) {
                try {
                    // Deletar da coleção orders (local)
                    await window.deleteFromDatabase('orders', order.id);
                    deletedCount++;
                    console.log(`✅ Pedido ${order.id} deletado do banco local (${deletedCount}/${ordersToDelete.length})`);
                    
                    // Se for pedido ONLINE, deletar também do Firebase online-orders
                    if (order.source === 'online' && window.firebaseManager) {
                        try {
                            await window.firebaseManager.deleteData(`online-orders/${order.id}`);
                            console.log(`🔥 Pedido ${order.id} deletado do Firebase online-orders`);
                            
                            // CRÍTICO: Remover do Set de pedidos processados do listener
                            if (window.onlineOrdersListener) {
                                window.onlineOrdersListener.processedOrders.delete(order.id);
                            }
                        } catch (fbError) {
                            console.warn(`⚠️ Não foi possível deletar ${order.id} do Firebase online-orders:`, fbError);
                        }
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Erro ao deletar pedido ${order.id}:`, error);
                }
            }
            
            // Recarregar lista
            await this.loadOrders();
            
            // Mostrar resultado
            if (errorCount === 0) {
                window.showToast(`✅ ${deletedCount} pedidos deletados com sucesso!`, 'success');
            } else {
                window.showToast(`⚠️ ${deletedCount} deletados, ${errorCount} com erro`, 'warning');
            }
            
            console.log(`🎉 Limpeza concluída: ${deletedCount} sucesso, ${errorCount} erros`);
            
        } catch (error) {
            console.error('❌ Erro ao deletar pedidos em lote:', error);
            window.showToast('Erro ao deletar pedidos: ' + error.message, 'error');
        }
    }

    /**
     * Atualizar data/hora do pedido
     */
    async updateOrderDateTime(orderId, newDateTime) {
        try {
            const order = this.currentOrders.find(o => o.id === orderId);
            
            if (!order) {
                window.showToast('Pedido não encontrado', 'error');
                return;
            }
            
            // Converter para timestamp
            const newTimestamp = new Date(newDateTime).getTime();
            
            // Atualizar ordem
            order.createdAt = newTimestamp;
            
            // Salvar no banco de dados
            await window.saveToDatabase('orders', order);
            
            // Atualizar interface
            this.applyFilters();
            this.updateMetrics();
            this.updateOrdersList();
            
            window.showToast('✅ Data do pedido atualizada!', 'success');
            
            console.log(`📅 Data do pedido ${orderId} atualizada para ${newDateTime}`);
            
        } catch (error) {
            console.error('❌ Erro ao atualizar data do pedido:', error);
            window.showToast('Erro ao atualizar data', 'error');
        }
    }

    /**
     * Modal para solicitar motivo de cancelamento
     */
    promptCancellationReason() {
        return new Promise((resolve) => {
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
            
            modal.innerHTML = `
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Cancelar Pedido</h3>
                        <button class="close-modal" style="border: none; background: none; font-size: 28px; cursor: pointer;">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Motivo do cancelamento: *</label>
                            <textarea 
                                id="cancelReason" 
                                rows="4" 
                                placeholder="Descreva o motivo do cancelamento..."
                                style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: inherit;"
                                required
                            ></textarea>
                            <small style="color: #666; font-size: 12px;">Mínimo 10 caracteres</small>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button class="btn btn-secondary cancel-btn">Voltar</button>
                        <button class="btn btn-danger confirm-btn">
                            <i class="fas fa-times-circle"></i> Confirmar Cancelamento
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const reasonTextarea = modal.querySelector('#cancelReason');
            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');
            const closeBtn = modal.querySelector('.close-modal');

            // Focar no textarea
            setTimeout(() => reasonTextarea.focus(), 100);

            // Fechar modal
            const closeModal = (reason = null) => {
                modal.remove();
                resolve(reason);
            };

            // Evento de confirmação
            confirmBtn.onclick = () => {
                const reason = reasonTextarea.value.trim();
                
                if (!reason || reason.length < 10) {
                    showToast('Motivo deve ter no mínimo 10 caracteres', 'warning');
                    reasonTextarea.focus();
                    return;
                }

                closeModal(reason);
            };

            // Eventos de cancelamento
            cancelBtn.onclick = () => closeModal(null);
            closeBtn.onclick = () => closeModal(null);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(null);
            });
        });
    }

    /**
     * Editar pedido - IMPLEMENTAÇÃO COMPLETA
     */
    async editOrder(orderId) {
        try {
            const orders = await window.getFromDatabase('orders');
            const order = orders.find(o => o.id === orderId);
            
            if (!order) {
                window.showToast('Pedido não encontrado', 'error');
                return;
            }

            // Não permitir editar pedidos cancelados ou entregues
            if (order.status === 'cancelled' || order.status === 'delivered') {
                window.showToast('Não é possível editar pedidos finalizados', 'warning');
                return;
            }

            // Carregar produtos disponíveis
            const products = await window.getFromDatabase('products');
            
            // 🔧 CORREÇÃO CRÍTICA: Restaurar preços de items com price = 0 (pedidos online)
            if (order.items && order.items.length > 0) {
                console.log('🔍 Verificando preços dos items do pedido:', order.number);
                for (let item of order.items) {
                    if (!item.price || item.price === 0) {
                        console.warn('⚠️ Item sem preço encontrado:', item.name);
                        
                        // Buscar preço do catálogo
                        const product = products.find(p => 
                            p.name === item.name || p.id === item.id
                        );
                        
                        if (product && product.price) {
                            item.price = product.price;
                            console.log('✅ Preço restaurado do catálogo:', item.name, '→', formatCurrency(product.price));
                        } else {
                            console.error('❌ Produto não encontrado no catálogo:', item.name);
                            window.showToast(`Atenção: Produto "${item.name}" sem preço no catálogo`, 'warning');
                        }
                    }
                }
            }
            
            // Renderizar modal de edição
            await this.renderEditOrderModal(order, products);
            
            // Abrir modal
            const modal = document.getElementById('editOrderModal');
            if (modal) {
                modal.classList.add('active');
                // Se estiver usando Bootstrap
                if (typeof $ !== 'undefined' && $.fn.modal) {
                    $('#editOrderModal').modal('show');
                }
            }

        } catch (error) {
            console.error('Erro ao editar pedido:', error);
            window.showToast('Erro ao abrir editor de pedido', 'error');
        }
    }

    /**
     * Renderizar modal de edição de pedido
     */
    async renderEditOrderModal(order, products) {
        const content = document.getElementById('editOrderContent');
        if (!content) return;

        const isOnlineOrder = order.source === 'online';

        content.innerHTML = `
            <div class="edit-order-container">
                <!-- Info do Pedido -->
                <div class="alert alert-info">
                    <strong>📋 Pedido #${order.id.slice(-8).toUpperCase()}</strong>
                    ${isOnlineOrder ? '<span class="online-badge ml-2">🌐 ONLINE</span>' : ''}
                    <br><small>Status: ${this.orderStatus[order.status].icon} ${this.orderStatus[order.status].label}</small>
                </div>

                <!-- Dados do Cliente -->
                <div class="form-section">
                    <h6><i class="fas fa-user"></i> Dados do Cliente</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Nome do Cliente:</label>
                                <input type="text" class="form-control" id="edit_customerName" 
                                       value="${order.customerName || order.customer?.name || ''}" 
                                       placeholder="Nome do cliente">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Telefone:</label>
                                <input type="text" class="form-control" id="edit_customerPhone" 
                                       value="${order.customerPhone || order.customer?.phone || ''}" 
                                       placeholder="(00) 00000-0000">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Itens do Pedido -->
                <div class="form-section">
                    <h6><i class="fas fa-shopping-cart"></i> Itens do Pedido</h6>
                    <div id="edit_items_list">
                        ${this.renderEditableItems(order.items || [])}
                    </div>
                    <button type="button" class="btn btn-outline-primary btn-sm mt-2" onclick="pedidosModule.addItemToEdit()">
                        <i class="fas fa-plus"></i> Adicionar Item
                    </button>
                </div>

                <!-- Adicionar Produto -->
                <div class="form-section" style="display: none;" id="add_product_section">
                    <h6><i class="fas fa-box"></i> Adicionar Produto</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Produto:</label>
                                <select class="form-control" id="new_product_select">
                                    <option value="">Selecione um produto...</option>
                                    ${products.map(p => `
                                        <option value="${p.id}" data-price="${p.price}" data-name="${p.name}">
                                            ${p.name} - ${formatCurrency(p.price)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="form-group">
                                <label>Quantidade:</label>
                                <input type="number" class="form-control" id="new_product_qty" value="1" min="1">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="form-group">
                                <label>&nbsp;</label>
                                <button type="button" class="btn btn-success btn-block" onclick="pedidosModule.confirmAddItem()">
                                    <i class="fas fa-check"></i> Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Valores -->
                <div class="form-section">
                    <h6><i class="fas fa-calculator"></i> Valores</h6>
                    <div class="row">
                        <div class="col-md-4">
                            <div class="form-group">
                                <label>Método de Pagamento:</label>
                                <select class="form-control" id="edit_paymentMethod">
                                    <option value="dinheiro" ${order.paymentMethod === 'dinheiro' ? 'selected' : ''}>💵 Dinheiro</option>
                                    <option value="pix" ${order.paymentMethod === 'pix' ? 'selected' : ''}>📱 PIX</option>
                                    <option value="cartao" ${order.paymentMethod === 'cartao' ? 'selected' : ''}>💳 Cartão</option>
                                    <option value="credito" ${order.paymentMethod === 'credito' ? 'selected' : ''}>💳 Crédito</option>
                                    <option value="debito" ${order.paymentMethod === 'debito' ? 'selected' : ''}>💳 Débito</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-group">
                                <label>Subtotal:</label>
                                <input type="text" class="form-control" id="edit_subtotal" readonly 
                                       value="${formatCurrency(order.subtotal || order.total)}">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-group">
                                <label>Total:</label>
                                <input type="text" class="form-control font-weight-bold" id="edit_total" readonly 
                                       value="${formatCurrency(order.total)}" style="font-size: 1.2rem; color: #28a745;">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Observações -->
                <div class="form-section">
                    <h6><i class="fas fa-comment"></i> Observações</h6>
                    <textarea class="form-control" id="edit_observations" rows="2" 
                              placeholder="Observações adicionais...">${order.observations || ''}</textarea>
                </div>

                <!-- Botões de Ação -->
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="button" class="btn btn-success" onclick="pedidosModule.saveEditedOrder('${order.id}')">
                        <i class="fas fa-save"></i> Salvar Alterações
                    </button>
                </div>
            </div>
        `;

        // Armazenar ordem atual para edição
        this.currentEditOrder = JSON.parse(JSON.stringify(order));
    }

    renderEditableItems(items) {
        if (!items || items.length === 0) {
            return '<p class="text-muted">Nenhum item adicionado ainda.</p>';
        }

        return items.map((item, index) => `
            <div class="editable-item-row" data-index="${index}">
                <div class="item-details">
                    <strong>${item.name}</strong>
                    ${item.observations ? `<br><small class="text-muted">${item.observations}</small>` : ''}
                </div>
                <div class="item-quantity">
                    <button type="button" class="btn btn-sm btn-outline-secondary" 
                            onclick="pedidosModule.decreaseItemQty(${index})">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" class="form-control form-control-sm" 
                           value="${item.quantity}" min="1" 
                           onchange="pedidosModule.updateItemQty(${index}, this.value)"
                           style="width: 60px; display: inline-block; margin: 0 5px;">
                    <button type="button" class="btn btn-sm btn-outline-secondary" 
                            onclick="pedidosModule.increaseItemQty(${index})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="item-price">
                    ${formatCurrency(item.price)} × ${item.quantity} = <strong>${formatCurrency(item.price * item.quantity)}</strong>
                </div>
                <div class="item-actions">
                    <button type="button" class="btn btn-sm btn-danger" 
                            onclick="pedidosModule.removeItemFromEdit(${index})" 
                            title="Remover item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    addItemToEdit() {
        const section = document.getElementById('add_product_section');
        if (section) {
            section.style.display = section.style.display === 'none' ? 'block' : 'none';
        }
    }

    confirmAddItem() {
        const select = document.getElementById('new_product_select');
        const qtyInput = document.getElementById('new_product_qty');
        
        if (!select.value) {
            window.showToast('Selecione um produto', 'warning');
            return;
        }

        const selectedOption = select.options[select.selectedIndex];
        const productName = selectedOption.dataset.name;
        const productPrice = parseFloat(selectedOption.dataset.price);
        const quantity = parseInt(qtyInput.value) || 1;

        if (!this.currentEditOrder.items) this.currentEditOrder.items = [];

        this.currentEditOrder.items.push({
            id: select.value,
            name: productName,
            price: productPrice,
            quantity: quantity,
            total: productPrice * quantity
        });

        this.updateEditItemsDisplay();
        this.recalculateEditTotal();

        select.value = '';
        qtyInput.value = '1';
        document.getElementById('add_product_section').style.display = 'none';

        window.showToast('Item adicionado!', 'success');
    }

    removeItemFromEdit(index) {
        if (confirm('Remover este item do pedido?')) {
            this.currentEditOrder.items.splice(index, 1);
            this.updateEditItemsDisplay();
            this.recalculateEditTotal();
            window.showToast('Item removido', 'success');
        }
    }

    increaseItemQty(index) {
        this.currentEditOrder.items[index].quantity++;
        this.updateEditItemsDisplay();
        this.recalculateEditTotal();
    }

    decreaseItemQty(index) {
        if (this.currentEditOrder.items[index].quantity > 1) {
            this.currentEditOrder.items[index].quantity--;
            this.updateEditItemsDisplay();
            this.recalculateEditTotal();
        }
    }

    updateItemQty(index, newQty) {
        const qty = parseInt(newQty) || 1;
        if (qty > 0) {
            this.currentEditOrder.items[index].quantity = qty;
            this.recalculateEditTotal();
        }
    }

    updateEditItemsDisplay() {
        const list = document.getElementById('edit_items_list');
        if (list) {
            list.innerHTML = this.renderEditableItems(this.currentEditOrder.items);
        }
    }

    recalculateEditTotal() {
        const items = this.currentEditOrder.items || [];
        
        // 🔧 VALIDAÇÃO: Verificar se algum item tem preço zerado
        const itemsWithoutPrice = items.filter(item => !item.price || item.price === 0);
        if (itemsWithoutPrice.length > 0) {
            console.error('❌ Items sem preço encontrados:', itemsWithoutPrice.map(i => i.name));
            window.showToast('Erro: Alguns items estão sem preço. Recarregue o pedido.', 'error');
            return;
        }
        
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        this.currentEditOrder.subtotal = subtotal;
        this.currentEditOrder.total = subtotal;

        const subtotalInput = document.getElementById('edit_subtotal');
        const totalInput = document.getElementById('edit_total');
        
        if (subtotalInput) subtotalInput.value = formatCurrency(subtotal);
        if (totalInput) totalInput.value = formatCurrency(subtotal);
    }

    async saveEditedOrder(orderId) {
        try {
            if (!this.currentEditOrder.items || this.currentEditOrder.items.length === 0) {
                window.showToast('Adicione pelo menos um item ao pedido', 'warning');
                return;
            }

            const customerName = document.getElementById('edit_customerName').value.trim();
            const customerPhone = document.getElementById('edit_customerPhone').value.trim();
            const paymentMethod = document.getElementById('edit_paymentMethod').value;
            const observations = document.getElementById('edit_observations').value.trim();

            if (!customerName) {
                window.showToast('Informe o nome do cliente', 'warning');
                return;
            }

            this.currentEditOrder.customerName = customerName;
            this.currentEditOrder.customerPhone = customerPhone;
            this.currentEditOrder.paymentMethod = paymentMethod;
            this.currentEditOrder.observations = observations;
            this.currentEditOrder.updatedAt = new Date().toISOString();

            if (!this.currentEditOrder.statusHistory) {
                this.currentEditOrder.statusHistory = [];
            }
            this.currentEditOrder.statusHistory.push({
                action: 'edited',
                timestamp: new Date().toISOString(),
                user: 'Sistema',
                note: 'Pedido editado manualmente'
            });

            await window.updateInDatabase('orders', this.currentEditOrder);

            if (this.currentEditOrder.source === 'online' && window.firebaseManager) {
                try {
                    await window.firebaseManager.updateData(`online-orders/${orderId}`, {
                        items: this.currentEditOrder.items,
                        customerName,
                        customerPhone,
                        paymentMethod,
                        observations,
                        subtotal: this.currentEditOrder.subtotal,
                        total: this.currentEditOrder.total,
                        updatedAt: this.currentEditOrder.updatedAt,
                        statusHistory: this.currentEditOrder.statusHistory
                    });
                } catch (fbError) {
                    console.warn('⚠️ Erro ao sincronizar com Firebase:', fbError);
                }
            }

            const modal = document.getElementById('editOrderModal');
            if (modal) {
                modal.classList.remove('active');
                if (typeof $ !== 'undefined' && $.fn.modal) {
                    $('#editOrderModal').modal('hide');
                }
            }

            await this.loadOrders();
            window.showToast('✅ Pedido atualizado com sucesso!', 'success');

        } catch (error) {
            console.error('❌ Erro ao salvar pedido editado:', error);
            window.showToast('Erro ao salvar alterações', 'error');
        }
    }

    /**
     * Duplicar pedido
     */
    async duplicateOrder(orderId) {
        try {
            const orders = await window.getFromDatabase('orders');
            const order = orders.find(o => o.id === orderId);
            if (!order) {
                if (window.showToast) window.showToast('Pedido não encontrado', 'error');
                return;
            }

            // Confirma duplicação
            const confirmed = await this.confirmDuplication(order);
            if (!confirmed) return;

            // Cria novo pedido baseado no original
            const newOrder = {
                ...order,
                id: generateId(),
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                statusHistory: [{
                    status: 'pending',
                    timestamp: new Date().toISOString(),
                    user: 'Sistema',
                    note: `Duplicado do pedido #${order.id.slice(-8).toUpperCase()}`
                }],
                // Remove campos específicos do pedido original
                cancelledAt: undefined,
                cancellationReason: undefined,
                deliveredAt: undefined
            };

            // Salva novo pedido
            await window.saveToDatabase('orders', newOrder);

            // Atualiza interface
            await this.loadOrders();

            if (window.showToast) window.showToast('Pedido duplicado com sucesso!', 'success');

            // Abre detalhes do novo pedido
            setTimeout(() => {
                this.showOrderDetails(newOrder.id);
            }, 500);

        } catch (error) {
            console.error('Erro ao duplicar pedido:', error);
            showToast('Erro ao duplicar pedido', 'error');
        }
    }

    /**
     * Confirmar duplicação de pedido
     */
    confirmDuplication(order) {
        const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        const message = `Deseja duplicar este pedido?\n\nPedido: #${order.id.slice(-8).toUpperCase()}\nItens: ${totalItems}\nTotal: ${formatCurrency(order.total)}`;
        return Promise.resolve(confirm(message));
    }

    confirmDuplication_OLD(order) {
        return new Promise((resolve) => {
            const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
            
            const modalHtml = `
                <div class="modal fade" id="confirmDuplicateModal" tabindex="-1" data-backdrop="static">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Confirmar Duplicação</h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <p>Deseja duplicar este pedido?</p>
                                <div class="alert alert-info">
                                    <strong>Pedido #${order.id.slice(-8).toUpperCase()}</strong><br>
                                    ${totalItems} item(ns) • ${formatCurrency(order.total)}<br>
                                    ${order.customerName ? `Cliente: ${order.customerName}` : ''}
                                </div>
                                <p class="text-muted small">
                                    Um novo pedido será criado com os mesmos itens e informações, 
                                    com status "Pendente" e novo ID.
                                </p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                                <button type="button" class="btn btn-primary" id="confirmDuplicateBtn">
                                    <i class="fas fa-copy"></i> Duplicar Pedido
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove modal existente
            const existingModal = document.getElementById('confirmDuplicateModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Adiciona modal ao DOM
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = $('#confirmDuplicateModal');
            const confirmBtn = document.getElementById('confirmDuplicateBtn');

            // Abre modal
            modal.modal('show');

            // Evento de confirmação
            confirmBtn.onclick = () => {
                modal.data('confirmed', true);
                modal.modal('hide');
            };

            // Evento de fechamento
            modal.on('hidden.bs.modal', function() {
                const confirmed = $(this).data('confirmed') === true;
                $(this).remove();
                resolve(confirmed);
            });
        });
    }

    generatePrintContent(order) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pedido #${order.id.slice(-8).toUpperCase()}</title>
                <style>
                    body { font-family: monospace; max-width: 300px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                    .order-info { margin: 10px 0; }
                    .items { border-bottom: 1px dashed #000; padding-bottom: 10px; }
                    .item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .total { text-align: center; font-weight: bold; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>HAMBURGUERIA GOURMET</h2>
                    <p>Pedido #${order.id.slice(-8).toUpperCase()}</p>
                    <p>${formatDateTime(order.createdAt)}</p>
                </div>
                
                <div class="order-info">
                    ${order.customerName ? `<p>Cliente: ${order.customerName}</p>` : ''}
                    ${order.customerPhone ? `<p>Telefone: ${order.customerPhone}</p>` : ''}
                </div>
                
                <div class="items">
                    <h3 style="margin-top: 10px; margin-bottom: 5px;">Itens:</h3>
                    ${order.items ? order.items.map(item => {
                        let customizationsHTML = '';
                        
                        // DEBUG: Ver estrutura das customizações
                        console.log('🖨️ Item para impressão:', item.name);
                        console.log('📦 Customizações completas:', JSON.stringify(item.customizations, null, 2));
                        
                        // Processar customizações
                        if (item.customizations && typeof item.customizations === 'object') {
                            Object.entries(item.customizations).forEach(([groupName, selections]) => {
                                console.log(`   📋 Grupo "${groupName}":`, selections);
                                console.log(`   📋 Tipo:`, Array.isArray(selections) ? 'Array' : typeof selections);
                                
                                if (Array.isArray(selections) && selections.length > 0) {
                                    // Array de seleções (checkboxes)
                                    selections.forEach(sel => {
                                        const name = typeof sel === 'object' ? (sel.label || sel.name || sel.id || '') : String(sel);
                                        if (name) {
                                            console.log(`      ✓ Adicionando (array): ${name}`);
                                            customizationsHTML += `<div style="font-size: 0.85em; margin-left: 20px; margin-top: 3px;">  ➤ <strong>${groupName}:</strong> ${name}</div>`;
                                        }
                                    });
                                } else if (selections && typeof selections === 'object' && selections !== null) {
                                    // Objeto único (radio button)
                                    const name = selections.label || selections.name || selections.id || '';
                                    if (name) {
                                        console.log(`      ✓ Adicionando (objeto): ${name}`);
                                        customizationsHTML += `<div style="font-size: 0.85em; margin-left: 20px; margin-top: 3px;">  ➤ <strong>${groupName}:</strong> ${name}</div>`;
                                    }
                                } else if (typeof selections === 'string' && selections.trim()) {
                                    // String simples
                                    console.log(`      ✓ Adicionando (string): ${selections}`);
                                    customizationsHTML += `<div style="font-size: 0.85em; margin-left: 20px; margin-top: 3px;">  ➤ <strong>${groupName}:</strong> ${selections}</div>`;
                                } else {
                                    console.warn(`      ⚠️ Formato não reconhecido para "${groupName}":`, selections);
                                }
                            });
                        } else {
                            console.warn('   ⚠️ Customizações não é um objeto ou está vazio');
                        }
                        
                        console.log('   📝 HTML gerado:', customizationsHTML || '(vazio)');
                        
                        return `
                            <div class="item" style="margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
                                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                                    <span>${item.quantity}x ${item.name}</span>
                                    <span>${formatCurrency(item.price * item.quantity)}</span>
                                </div>
                                ${customizationsHTML}
                                ${item.notes ? `<div style="font-size: 0.85em; margin-left: 20px; margin-top: 3px; font-style: italic;">📝 ${item.notes}</div>` : ''}
                            </div>
                        `;
                    }).join('') : ''}
                </div>
                
                <div class="total">
                    <p>TOTAL: ${formatCurrency(order.total)}</p>
                    <p>Pagamento: ${this.getPaymentMethodName(order.paymentMethod)}</p>
                    ${order.change ? `<p>Troco: ${formatCurrency(order.change)}</p>` : ''}
                </div>
                
                <div style="text-align: center; margin-top: 20px; font-size: 0.8em;">
                    <p>Obrigado pela preferência!</p>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Sistema de notificações
     */
    sendNotification(order, status) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const statusInfo = this.orderStatus[status];
            new Notification(`Pedido ${statusInfo.label}`, {
                body: `Pedido #${order.id.slice(-8).toUpperCase()} - ${formatCurrency(order.total)}`,
                icon: '/favicon.ico'
            });
        }
    }

    setupRealTimeUpdates() {
        // CORREÇÃO CRÍTICA: Limpar interval anterior para evitar múltiplas instâncias
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // OTIMIZAÇÃO CRÍTICA: Interval automático completamente REMOVIDO
        // Previne sobrecarga e travamentos - atualização agora é apenas manual
        
        console.log('✅ Pedidos otimizado - sem atualizações automáticas');
    }

    /**
     * Controle de ordenação
     */
    updateSort(sortBy) {
        this.sortBy = sortBy;
        this.applyFilters();
        this.updateOrdersDisplay();
    }

    toggleSortOrder() {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        
        const btn = document.getElementById('sortOrderBtn');
        if (btn) {
            btn.innerHTML = `<i class="fas fa-sort-amount-${this.sortOrder === 'asc' ? 'up' : 'down'}"></i>`;
        }
        
        this.applyFilters();
        this.updateOrdersDisplay();
    }

    updateMetrics() {
        const metrics = document.getElementById('ordersMetrics');
        if (metrics) {
            metrics.innerHTML = this.renderMetrics();
        }
    }

    /**
     * Exportação de dados
     */
    async exportOrders(format = 'csv') {
        try {
            const orders = this.filteredOrders;
            
            if (orders.length === 0) {
                showToast('Nenhum pedido para exportar', 'warning');
                return;
            }

            switch (format) {
                case 'csv':
                    await this.exportToCSV(orders);
                    break;
                case 'pdf':
                    await this.exportToPDF(orders);
                    break;
                case 'print':
                    await this.printReport(orders);
                    break;
                default:
                    throw new Error('Formato de exportação inválido');
            }
            
            showToast(`Relatório exportado com sucesso (${format.toUpperCase()})`, 'success');
        } catch (error) {
            console.error('Erro ao exportar:', error);
            showToast('Erro ao exportar relatório', 'error');
        }
    }

    async exportToCSV(orders) {
        const csvContent = this.generateCSV(orders);
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedidos-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    async exportToPDF(orders) {
        // Cria HTML para impressão/PDF
        const printContent = this.generateReportHTML(orders, 'PDF');
        
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Aguarda carregamento antes de imprimir
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    async printReport(orders) {
        const printContent = this.generateReportHTML(orders, 'IMPRESSÃO');
        
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    generateReportHTML(orders, type) {
        const totalValue = orders.reduce((sum, order) => sum + order.total, 0);
        const avgValue = orders.length > 0 ? totalValue / orders.length : 0;

        // Agrupa por status
        const byStatus = {};
        Object.keys(this.orderStatus).forEach(status => {
            byStatus[status] = orders.filter(o => o.status === status).length;
        });

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório de Pedidos - ${type}</title>
                <meta charset="utf-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 15px; }
                    .header h1 { color: #333; margin-bottom: 5px; }
                    .header p { color: #666; }
                    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
                    .summary-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
                    .summary-card h3 { font-size: 24px; color: #333; margin-bottom: 5px; }
                    .summary-card p { color: #666; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    thead { background: #333; color: white; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { font-weight: 600; }
                    tr:nth-child(even) { background: #f8f9fa; }
                    .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: white; }
                    .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px solid #ddd; color: #666; font-size: 12px; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🍔 HAMBURGUERIA GOURMET</h1>
                    <p>Relatório de Pedidos - ${new Date().toLocaleDateString('pt-BR')}</p>
                    <p>Total de ${orders.length} pedido(s) • Filtro: ${this.getFilterDescription()}</p>
                </div>

                <div class="summary">
                    <div class="summary-card">
                        <h3>${orders.length}</h3>
                        <p>Total de Pedidos</p>
                    </div>
                    <div class="summary-card">
                        <h3>${formatCurrency(totalValue)}</h3>
                        <p>Valor Total</p>
                    </div>
                    <div class="summary-card">
                        <h3>${formatCurrency(avgValue)}</h3>
                        <p>Ticket Médio</p>
                    </div>
                    <div class="summary-card">
                        <h3>${byStatus.pending || 0}</h3>
                        <p>Pendentes</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Data/Hora</th>
                            <th>Cliente</th>
                            <th>Status</th>
                            <th>Itens</th>
                            <th>Pagamento</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => {
                            const status = this.orderStatus[order.status];
                            return `
                                <tr>
                                    <td>#${order.id.slice(-8).toUpperCase()}</td>
                                    <td>${formatDateTime(order.createdAt)}</td>
                                    <td>${order.customerName || 'N/A'}</td>
                                    <td>
                                        <span class="status-badge" style="background-color: ${status.color}">
                                            ${status.icon} ${status.label}
                                        </span>
                                    </td>
                                    <td>${order.items ? order.items.length : 0}</td>
                                    <td>${this.getPaymentMethodName(order.paymentMethod)}</td>
                                    <td style="text-align: right;"><strong>${formatCurrency(order.total)}</strong></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')}</p>
                    <p>Sistema PDV - Hamburgueria Gourmet © ${new Date().getFullYear()}</p>
                </div>
            </body>
            </html>
        `;
    }

    getFilterDescription() {
        const filters = [];
        if (this.filters.status !== 'all') {
            filters.push(`Status: ${this.orderStatus[this.filters.status].label}`);
        }
        if (this.filters.dateRange !== 'all') {
            const ranges = { today: 'Hoje', yesterday: 'Ontem', week: 'Esta Semana', month: 'Este Mês' };
            filters.push(`Período: ${ranges[this.filters.dateRange] || this.filters.dateRange}`);
        }
        if (this.filters.paymentMethod !== 'all') {
            filters.push(`Pagamento: ${this.getPaymentMethodName(this.filters.paymentMethod)}`);
        }
        if (this.filters.customer) {
            filters.push(`Busca: "${this.filters.customer}"`);
        }
        return filters.length > 0 ? filters.join(' • ') : 'Todos os pedidos';
    }

    generateCSV(orders) {
        const headers = [
            'ID do Pedido',
            'Data/Hora',
            'Cliente',
            'Status',
            'Itens',
            'Subtotal',
            'Total',
            'Pagamento'
        ];

        const rows = orders.map(order => [
            order.id.slice(-8).toUpperCase(),
            formatDateTime(order.createdAt),
            order.customerName || 'N/A',
            this.orderStatus[order.status].label,
            order.items ? order.items.length : 0,
            formatCurrency(order.subtotal || order.total),
            formatCurrency(order.total),
            this.getPaymentMethodName(order.paymentMethod)
        ]);

        return [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    }

    /**
     * Estilos específicos do módulo
     */
    addOrdersStyles() {
        const styleId = 'orders-module-styles';
        if (document.getElementById(styleId)) return;

        const styles = `
            <style id="${styleId}">
                .orders-module {
                    padding: 20px;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .orders-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e9ecef;
                }

                .header-title h2 {
                    color: #2c3e50;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .header-title p {
                    color: #6c757d;
                    margin: 5px 0 0 0;
                }

                .header-actions {
                    display: flex;
                    gap: 10px;
                }

                .orders-metrics {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }

                .metric-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    transition: transform 0.2s;
                }

                .metric-card:hover {
                    transform: translateY(-2px);
                }

                .metric-icon {
                    font-size: 2rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .metric-info h3 {
                    margin: 0;
                    font-size: 1.5rem;
                    color: #2c3e50;
                }

                .metric-info p {
                    margin: 5px 0 0 0;
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .orders-filters {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .filters-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 15px;
                }

                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .filter-group label {
                    font-weight: 600;
                    color: #495057;
                    font-size: 0.9rem;
                }

                .filter-group select,
                .filter-group input {
                    padding: 8px 12px;
                    border: 1px solid #ced4da;
                    border-radius: 6px;
                    font-size: 0.9rem;
                }

                .filters-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 15px;
                    border-top: 1px solid #e9ecef;
                }

                .sort-controls {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .btn-sort {
                    background: none;
                    border: 1px solid #ced4da;
                    border-radius: 6px;
                    padding: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-sort:hover {
                    background: #f8f9fa;
                }

                .orders-container {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }

                .orders-list {
                    padding: 20px;
                }

                .order-card {
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 15px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: white;
                }

                .order-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    transform: translateY(-1px);
                }

                .order-card.online-order {
                    border-left: 4px solid #667eea;
                    background: linear-gradient(to right, rgba(102, 126, 234, 0.03), white);
                }

                .order-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 15px;
                }

                .order-id strong {
                    color: #495057;
                    font-size: 1.1rem;
                }

                .order-time {
                    color: #6c757d;
                    font-size: 0.9rem;
                    display: block;
                    margin-top: 2px;
                }

                .order-status {
                    padding: 6px 12px;
                    border-radius: 20px;
                    color: white;
                    font-size: 0.85rem;
                    font-weight: 600;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                }

                .online-badge {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white !important;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    margin-left: 8px;
                    display: inline-block;
                }

                .order-customer {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 15px;
                    color: #495057;
                }

                .order-customer small {
                    color: #6c757d;
                    margin-left: auto;
                }

                .order-items {
                    margin-bottom: 15px;
                }

                .items-summary {
                    color: #6c757d;
                    font-size: 0.9rem;
                    margin-bottom: 8px;
                }

                .items-preview {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                }

                .item-tag {
                    background: #f8f9fa;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    color: #495057;
                }

                .more-items {
                    color: #6c757d;
                    font-size: 0.8rem;
                    font-style: italic;
                }

                .order-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 15px;
                    border-top: 1px solid #f1f3f4;
                }

                .order-payment {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .order-total {
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: #28a745;
                }

                .order-actions {
                    margin-top: 15px;
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                /* ===== CORREÇÃO: Melhorar contraste dos botões ===== */
                .order-actions .btn {
                    font-weight: 600 !important;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.15) !important;
                    min-height: 32px;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }

                .order-actions .btn i {
                    font-size: 1rem;
                }

                .order-actions .btn-success {
                    background: #28a745 !important;
                    border-color: #28a745 !important;
                    color: #ffffff !important;
                }

                .order-actions .btn-success:hover {
                    background: #218838 !important;
                    border-color: #1e7e34 !important;
                }

                .order-actions .btn-warning {
                    background: #ffc107 !important;
                    border-color: #ffc107 !important;
                    color: #000000 !important;
                    text-shadow: none !important;
                }

                .order-actions .btn-warning:hover {
                    background: #e0a800 !important;
                    border-color: #d39e00 !important;
                }

                .order-actions .btn-info {
                    background: #17a2b8 !important;
                    border-color: #17a2b8 !important;
                    color: #ffffff !important;
                }

                .order-actions .btn-info:hover {
                    background: #138496 !important;
                    border-color: #117a8b !important;
                }

                .order-actions .btn-danger {
                    background: #dc3545 !important;
                    border-color: #dc3545 !important;
                    color: #ffffff !important;
                }

                .order-actions .btn-danger:hover {
                    background: #c82333 !important;
                    border-color: #bd2130 !important;
                }

                .order-actions .btn-outline-danger {
                    border-color: #dc3545 !important;
                    color: #dc3545 !important;
                    background: white !important;
                    text-shadow: none !important;
                }

                .order-actions .btn-outline-danger:hover {
                    background: #dc3545 !important;
                    color: #ffffff !important;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
                }

                .order-actions .btn-outline-primary {
                    border-color: #007bff !important;
                    color: #007bff !important;
                    background: white !important;
                    text-shadow: none !important;
                }

                .order-actions .btn-outline-primary:hover {
                    background: #007bff !important;
                    color: #ffffff !important;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
                }

                .order-actions .btn-outline-secondary {
                    border-color: #6c757d !important;
                    color: #6c757d !important;
                    background: white !important;
                    text-shadow: none !important;
                }

                .order-actions .btn-outline-secondary:hover {
                    background: #6c757d !important;
                    color: #ffffff !important;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
                }

                .pagination {
                    padding: 20px;
                    border-top: 1px solid #e9ecef;
                }

                .pagination-controls {
                    display: flex;
                    justify-content: center;
                    gap: 5px;
                    margin-bottom: 10px;
                }

                .btn-pagination {
                    padding: 8px 12px;
                    border: 1px solid #dee2e6;
                    background: white;
                    color: #495057;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-pagination:hover:not(.disabled) {
                    background: #e9ecef;
                }

                .btn-pagination.active {
                    background: #007bff;
                    color: white;
                    border-color: #007bff;
                }

                .btn-pagination.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .pagination-ellipsis {
                    padding: 8px 4px;
                    color: #6c757d;
                }

                .pagination-info {
                    text-align: center;
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: #6c757d;
                }

                .empty-state i {
                    color: #dee2e6;
                    margin-bottom: 20px;
                }

                .empty-state h3 {
                    margin-bottom: 10px;
                }

                /* Modal específico */
                .order-details {
                    max-height: 70vh;
                    overflow-y: auto;
                }

                .order-detail-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #e9ecef;
                }

                .order-meta {
                    display: flex;
                    gap: 15px;
                    margin-top: 10px;
                }

                .order-status-badge {
                    padding: 4px 12px;
                    border-radius: 12px;
                    color: white;
                    font-size: 0.85rem;
                    font-weight: 600;
                }

                .order-actions-modal {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .customer-info,
                .order-items-detail,
                .order-summary,
                .status-history {
                    margin-bottom: 30px;
                }

                .customer-info h5,
                .order-items-detail h5,
                .order-summary h5,
                .status-history h5 {
                    color: #495057;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .customer-details p {
                    margin-bottom: 5px;
                }

                .items-table {
                    border: 1px solid #e9ecef;
                    border-radius: 6px;
                    overflow: hidden;
                }

                .item-row {
                    display: grid;
                    grid-template-columns: 1fr auto auto auto;
                    gap: 15px;
                    padding: 15px;
                    align-items: center;
                    border-bottom: 1px solid #f1f3f4;
                }

                .item-row:last-child {
                    border-bottom: none;
                }

                .item-customizations {
                    margin-top: 5px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                }

                .customization-tag {
                    background: #e9ecef;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 0.75rem;
                }

                .summary-table {
                    border: 1px solid #e9ecef;
                    border-radius: 6px;
                    overflow: hidden;
                }

                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px 15px;
                    border-bottom: 1px solid #f1f3f4;
                }

                .summary-row:last-child {
                    border-bottom: none;
                }

                .summary-row.total {
                    background: #f8f9fa;
                    font-size: 1.1rem;
                }

                .summary-row.discount span:last-child {
                    color: #dc3545;
                }

                .payment-info {
                    margin-top: 15px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 6px;
                }

                .payment-info p {
                    margin-bottom: 5px;
                }

                .timeline {
                    position: relative;
                    padding-left: 30px;
                }

                .timeline-item {
                    position: relative;
                    padding-bottom: 20px;
                }

                .timeline-item:last-child {
                    padding-bottom: 0;
                }

                .timeline-item:not(:last-child)::before {
                    content: '';
                    position: absolute;
                    left: -19px;
                    top: 30px;
                    width: 2px;
                    height: calc(100% - 10px);
                    background: #e9ecef;
                }

                .timeline-marker {
                    position: absolute;
                    left: -30px;
                    top: 5px;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 0.7rem;
                    z-index: 1;
                }

                .timeline-content {
                    background: white;
                    padding: 10px 15px;
                    border-radius: 6px;
                    border: 1px solid #e9ecef;
                }

                .timeline-content small {
                    display: block;
                    color: #6c757d;
                    margin-top: 5px;
                }

                .timeline-content .user {
                    color: #495057;
                    font-size: 0.9rem;
                }

                /* Estilos para Edição de Pedido */
                .edit-order-container {
                    max-height: 70vh;
                    overflow-y: auto;
                }

                .form-section {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }

                .form-section h6 {
                    color: #495057;
                    font-weight: 600;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .editable-item-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px;
                    background: white;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                    margin-bottom: 8px;
                    transition: box-shadow 0.2s;
                }

                .editable-item-row:hover {
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .item-details {
                    flex: 1;
                    min-width: 0;
                }

                .item-details strong {
                    display: block;
                    color: #212529;
                    margin-bottom: 2px;
                }

                .item-details small {
                    color: #6c757d;
                    font-size: 0.85rem;
                }

                .item-quantity {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin: 0 15px;
                }

                .item-price {
                    color: #28a745;
                    font-weight: 500;
                    white-space: nowrap;
                    margin: 0 15px;
                }

                .item-actions {
                    display: flex;
                    gap: 5px;
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #dee2e6;
                }

                .online-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    background: #17a2b8;
                    color: white;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                /* Responsivo */
                @media (max-width: 768px) {
                    .editable-item-row {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 10px;
                    }

                    .item-quantity,
                    .item-price,
                    .item-actions {
                        margin: 0;
                    }

                    .orders-header {
                        flex-direction: column;
                        gap: 15px;
                        align-items: stretch;
                    }

                    .filters-row {
                        grid-template-columns: 1fr;
                    }

                    .filters-actions {
                        flex-direction: column;
                        gap: 15px;
                        align-items: stretch;
                    }

                    .order-header {
                        flex-direction: column;
                        gap: 10px;
                    }

                    .order-footer {
                        flex-direction: column;
                        gap: 10px;
                        align-items: stretch;
                    }

                    .item-row {
                        grid-template-columns: 1fr;
                        gap: 10px;
                    }

                    .order-detail-header {
                        flex-direction: column;
                        gap: 15px;
                    }

                    .order-actions-modal {
                        justify-content: stretch;
                    }

                    .order-actions-modal .btn {
                        flex: 1;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    /**
     * Envia mensagem via WhatsApp baseada no status do pedido
     */
    async sendWhatsAppByStatus(order, status) {
        try {
            // Tentar pegar telefone do campo direto ou do objeto customer
            const phoneNumber = order.customerPhone || order.customer?.phone;
            
            if (!phoneNumber) {
                console.log('📱 Cliente sem telefone cadastrado');
                return;
            }

            // Limpar telefone (remover caracteres especiais)
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            
            // Verificar se tem DDD e código do país
            let fullPhone = cleanPhone;
            if (cleanPhone.length === 11) {
                fullPhone = '55' + cleanPhone;
            } else if (cleanPhone.length === 10) {
                fullPhone = '55' + cleanPhone.substring(0, 2) + '9' + cleanPhone.substring(2);
            }

            // Dados do pedido (sanitizar para evitar caracteres problemáticos)
            const customerName = (order.customerName || order.customer?.name || 'Cliente')
                .replace(/[<>]/g, '') // Remover < >
                .substring(0, 50); // Limitar tamanho
            
            const orderNumber = order.id ? 
                order.id.slice(-8).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'N/A';
            
            const total = formatCurrency(order.total);
            
            // Detectar tipo de entrega (sanitizado)
            let deliveryType = '';
            let deliveryMessage = '';
            
            if (order.deliveryType) {
                switch(order.deliveryType.toLowerCase()) {
                    case 'delivery':
                    case 'entrega':
                        deliveryType = '🚗 *Tipo:* Delivery';
                        const address = order.deliveryAddress || order.customerAddress || 'A confirmar';
                        const safeAddress = typeof address === 'string' ? 
                            address.replace(/[<>&]/g, '').substring(0, 100) : 'A confirmar';
                        deliveryMessage = `🚗 Seu pedido já saiu para entrega!\n📍 Endereço: ${safeAddress}`;
                        break;
                    case 'retirada':
                    case 'pickup':
                    case 'balcao':
                        deliveryType = '🏪 *Tipo:* Retirada no Local';
                        deliveryMessage = '🏪 Seu pedido está pronto para retirada!\n📍 Compareça ao nosso estabelecimento.';
                        break;
                    case 'mesa':
                    case 'local':
                        const tableNum = (order.tableNumber || 'A definir').toString().replace(/[^0-9A-Za-z]/g, '').substring(0, 10);
                        deliveryType = `🍽️ *Tipo:* Consumo no Local\n🔢 *Mesa:* ${tableNum}`;
                        deliveryMessage = `🍽️ Seu pedido será servido na mesa ${tableNum}!`;
                        break;
                    default:
                        const safeType = (order.deliveryType || '').replace(/[<>&]/g, '').substring(0, 30);
                        deliveryType = `📦 *Tipo:* ${safeType}`;
                        deliveryMessage = '✅ Seu pedido está disponível!';
                }
            } else {
                deliveryType = '📦 *Tipo:* A confirmar';
                deliveryMessage = '✅ Seu pedido está pronto!';
            }
            
            // Montar lista de itens formatada (limitar para evitar mensagens muito longas)
            let itemsList = '';
            if (order.items && order.items.length > 0) {
                const maxItems = Math.min(order.items.length, 8); // Máximo 8 itens
                
                for (let i = 0; i < maxItems; i++) {
                    const item = order.items[i];
                    const itemPrice = formatCurrency(item.price * item.quantity);
                    // Limitar nome do item a 40 caracteres
                    const itemName = item.name.length > 40 ? item.name.substring(0, 37) + '...' : item.name;
                    itemsList += `▪️ ${item.quantity}x ${itemName} - ${itemPrice}\n`;
                    
                    // Adicionar customizações (resumido - máximo 3)
                    if (item.customizations && Object.keys(item.customizations).length > 0) {
                        const customs = Object.values(item.customizations)
                            .flat()
                            .map(c => c.label || c.name || c)
                            .filter(Boolean)
                            .slice(0, 3)
                            .join(', ');
                        if (customs) {
                            const customsShort = customs.length > 50 ? customs.substring(0, 47) + '...' : customs;
                            itemsList += `   └ ${customsShort}\n`;
                        }
                    }
                }
                
                // Se tiver mais itens, avisar
                if (order.items.length > maxItems) {
                    itemsList += `   ... e mais ${order.items.length - maxItems} ${order.items.length - maxItems === 1 ? 'item' : 'itens'}\n`;
                }
            }
            
            // Carregar templates personalizados das configurações
            let customTemplates = null;
            try {
                const settings = await getFromDatabase('settings');
                if (settings && settings.length > 0 && settings[0].whatsappTemplates) {
                    customTemplates = settings[0].whatsappTemplates;
                }
            } catch (error) {
                console.log('📱 Usando templates padrão');
            }
            
            // Mensagem específica para cada status
            let message = '';
            
            // Tentar usar template personalizado primeiro
            if (customTemplates && customTemplates[status]) {
                message = customTemplates[status].template;
                
                // Substituir variáveis
                message = message.replace(/\{\{customerName\}\}/g, customerName);
                message = message.replace(/\{\{orderNumber\}\}/g, orderNumber);
                message = message.replace(/\{\{orderTotal\}\}/g, total);
                message = message.replace(/\{\{orderItems\}\}/g, itemsList.trim());
                message = message.replace(/\{\{deliveryType\}\}/g, deliveryType);
                message = message.replace(/\{\{deliveryMessage\}\}/g, deliveryMessage);
            } else {
                // Usar mensagens padrão
                switch(status) {
                case 'pending':
                    message = `⏳ *Pedido Recebido*\n\n`;
                    message += `Olá *${customerName}*! Recebemos seu pedido. 📝\n\n`;
                    message += `📋 *Pedido:* #${orderNumber}\n`;
                    message += `💰 *Total:* ${total}\n\n`;
                    message += `*Itens:*\n`;
                    message += itemsList.trim();
                    message += `\n⏰ Aguardando confirmação...\n`;
                    message += `Em breve entraremos em contato! 😊`;
                    break;
                    
                case 'confirmed':
                    message = `✅ *Pedido Confirmado!*\n\n`;
                    message += `Ótima notícia *${customerName}*! Seu pedido foi confirmado! 🎉\n\n`;
                    message += `📋 *Pedido:* #${orderNumber}\n`;
                    message += `💰 *Total:* ${total}\n\n`;
                    message += `*Itens:*\n`;
                    message += itemsList.trim(); // itemsList já tem \n no final de cada linha
                    message += `\n⏰ *Tempo estimado:* 30-40 minutos\n\n`;
                    message += `Em breve começaremos a preparar! 👨‍🍳`;
                    break;
                    
                case 'preparing':
                    message = `👨‍🍳 *Preparando seu Pedido!*\n\n`;
                    message += `Olá *${customerName}*! 👋\n\n`;
                    message += `Seu pedido *#${orderNumber}* já está sendo preparado com todo carinho! 🍔✨\n\n`;
                    message += `📋 *Resumo do Pedido:*\n`;
                    message += itemsList.trim();
                    message += `\n💰 *Total:* ${total}\n\n`;
                    message += `Em breve estará pronto! ⏰`;
                    break;
                    
                case 'ready':
                    message = `Oba! *${customerName}*, seu pedido está *PRONTO*! 🎉🍔\n\n`;
                    message += `📦 *Pedido #${orderNumber}*\n\n`;
                    message += `${deliveryMessage}\n\n`;
                    message += `Obrigado pela preferência! 💚`;
                    break;
                    
                case 'delivered':
                    message = `Muito obrigado, *${customerName}*! 🙏✨\n\n`;
                    message += `Foi um prazer atender você! 🍔❤️\n\n`;
                    message += `📦 *Pedido #${orderNumber}* entregue com sucesso!\n\n`;
                    message += `Esperamos que aproveite bastante! 😋\n\n`;
                    message += `⭐ *Sua opinião é importante!*\n`;
                    message += `Nos avalie e nos ajude a melhorar cada vez mais.\n\n`;
                    message += `Até a próxima! 👋`;
                    break;
                    
                case 'cancelled':
                    message = `❌ *Pedido Cancelado*\n\n`;
                    message += `*${customerName}*, informamos que o pedido #${orderNumber} foi cancelado.\n\n`;
                    message += `💰 *Valor:* ${total}\n\n`;
                    if (order.cancellationReason) {
                        message += `📝 *Motivo:* ${order.cancellationReason}\n\n`;
                    }
                    message += `Pedimos desculpas pelo transtorno! 😔\n\n`;
                    message += `Se tiver alguma dúvida, estamos à disposição!\n`;
                    message += `Esperamos você em breve! 🍔`;
                    break;
                    
                default:
                    message = `📱 *Atualização do Pedido*\n\n`;
                    message += `Olá ${customerName}!\n\n`;
                    message += `📋 *Pedido:* #${orderNumber}\n`;
                    message += `📊 *Status:* ${this.orderStatus[status]?.label || status}\n\n`;
                    message += `Qualquer dúvida, estamos à disposição! 😊`;
                }
            }

            // Criar URL do WhatsApp com codificação correta
            // Usar encodeURIComponent que converte \n para %0A corretamente
            const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
            
            // Verificar tamanho da URL (limite WhatsApp Web ~2000 chars)
            if (whatsappUrl.length > 2000) {
                console.warn(`⚠️ Mensagem muito longa (${whatsappUrl.length} chars), pode ser truncada`);
            }
            
            // Perguntar ao usuário se deseja enviar
            const statusLabel = this.orderStatus[status]?.label || status;
            if (confirm(`📱 Deseja enviar notificação "${statusLabel}" por WhatsApp para ${customerName}?`)) {
                window.open(whatsappUrl, '_blank');
                console.log(`📱 WhatsApp aberto - Status: ${status} - Cliente: ${customerName} (${fullPhone})`);
                console.log(`📏 Tamanho da URL: ${whatsappUrl.length} caracteres`);
            }
            
        } catch (error) {
            console.error('Erro ao enviar WhatsApp:', error);
        }
    }

    /**
     * Envia mensagem de confirmação via WhatsApp (função legada)
     */
    sendWhatsAppConfirmation(order) {
        try {
            // Tentar pegar telefone do campo direto ou do objeto customer
            const phoneNumber = order.customerPhone || order.customer?.phone;
            
            if (!phoneNumber) {
                console.log('📱 Cliente sem telefone cadastrado');
                return;
            }

            // Limpar telefone (remover caracteres especiais)
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            
            // Verificar se tem DDD e código do país
            let fullPhone = cleanPhone;
            if (cleanPhone.length === 11) {
                fullPhone = '55' + cleanPhone;
            } else if (cleanPhone.length === 10) {
                fullPhone = '55' + cleanPhone.substring(0, 2) + '9' + cleanPhone.substring(2);
            }

            // Montar mensagem
            const customerName = order.customerName || order.customer?.name || 'Cliente';
            const orderNumber = order.id ? order.id.slice(-8).toUpperCase() : 'N/A';
            const total = formatCurrency(order.total);
            
            let message = `✅ *Pedido Confirmado!*\n\n`;
            message += `Ótima notícia *${customerName}*! Seu pedido foi confirmado! 🎉\n\n`;
            message += `📋 *Pedido:* #${orderNumber}\n`;
            message += `💰 *Total:* ${total}\n\n`;
            message += `*Itens:*\n`;
            
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    message += `• ${item.quantity}x ${item.name}\n`;
                });
            }
            
            message += `\n⏰ *Tempo estimado:* 30-40 minutos\n\n`;
            message += `Em breve começaremos a preparar! 👨‍🍳`;

            // Criar URL do WhatsApp
            const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
            
            // Perguntar ao usuário se deseja enviar
            if (confirm(`📱 Deseja enviar confirmação por WhatsApp para ${customerName}?`)) {
                window.open(whatsappUrl, '_blank');
                console.log(`📱 WhatsApp aberto para ${customerName} (${fullPhone})`);
            }
            
        } catch (error) {
            console.error('Erro ao enviar WhatsApp:', error);
        }
    }
}

// Instância global
let pedidosModule = null;

// Função de inicialização para o module manager
export function initPedidosModule() {
    pedidosModule = new PedidosModule();
    window.pedidosModule = pedidosModule; // Para acesso global
    return pedidosModule.init();
}

// Adicionar métodos à classe através do prototype
PedidosModule.prototype.destroy = function() {
    console.log('🗑️ Destruindo módulo Pedidos...');
    
    // Limpar interval de atualização
    if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('⏸️ Atualização automática desativada');
        }
        
        // Resetar estado
        this.isInitialized = false;
        this.currentOrders = [];
        this.filteredOrders = [];
        this.selectedOrder = null;
        
        console.log('✅ Módulo Pedidos destruído');
};

// Método de ativação (quando módulo se torna ativo)
PedidosModule.prototype.activate = function() {
    if (!this.isInitialized) {
        return this.init();
    }
    
    // Reativar atualizações se necessário
    if (!this.updateInterval) {
        this.setupRealTimeUpdates();
    }
};

// Método de desativação (quando módulo se torna inativo)
PedidosModule.prototype.deactivate = function() {
    // Parar atualizações quando módulo não está ativo
    if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
    }
    
    // Remover todos os event listeners para prevenir vazamentos
    this.removeAllEventListeners();
};

// Função de limpeza
export function destroyPedidosModule() {
    const styles = document.getElementById('orders-module-styles');
    if (styles) styles.remove();
    
    if (pedidosModule) {
        pedidosModule = null;
        delete window.pedidosModule;
    }
}

export default PedidosModule;