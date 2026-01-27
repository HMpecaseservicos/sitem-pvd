// ===== DASHBOARD MODULE - SISTEMA PDV HAMBURGUERIA =====
// Versão 2.0 - Profissional com KPIs e Chart.js
// Data: 01/01/2026
// Melhorias: Chart.js, KPIs, Filtros Funcionais, Auto-Update Inteligente

export class DashboardModule {
    constructor() {
        // CORREÇÃO CRÍTICA: Prevenir múltiplas instâncias
        if (DashboardModule.instance) {
            console.warn('⚠️ Dashboard já existe, reutilizando instância');
            return DashboardModule.instance;
        }
        DashboardModule.instance = this;
        
        this.isInitialized = false;
        this.updateInterval = null;
        this.salesChart = null;
        this.chartData = {
            hourly: [],
            daily: [],
            weekly: []
        };
        this.currentPeriod = 'today';
        this.stats = {
            totalSales: 0,
            totalOrders: 0,
            activeOrders: 0,
            averageTicket: 0,
            customersServed: 0
        };
    }
    
    // ========================================
    // INICIALIZAÇÃO
    // ========================================
    
    async init() {
        // CORREÇÃO CRÍTICA: Proteção contra inicialização duplicada
        if (this.isInitialized) {
            console.warn('⚠️ Dashboard já foi inicializado, ignorando chamada duplicada');
            return;
        }
        this.isInitialized = true; // Marcar IMEDIATAMENTE
        
        try {
            console.log('📊 Inicializando Dashboard Module...');
            
            // 1. Carregar dados do IndexedDB
            await this.loadAllData();
            
            // 2. Configurar event listeners
            this.bindEvents();
            
            // 3. Renderizar dashboard
            this.render();
            
            // 4. Iniciar atualização automática
            this.startAutoUpdate();
            
            // 5. Expor globalmente
            window.dashboardModule = this;
            
            console.log('✅ Dashboard Module inicializado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar Dashboard:', error);
            this.isInitialized = false; // CORREÇÃO: Resetar em caso de erro
            this.showError('Erro ao carregar dashboard');
            throw error;
        }
    }
    
    // ========================================
    // CARREGAMENTO DE DADOS
    // ========================================
    
    async loadAllData() {
        try {
            // Carregar pedidos do IndexedDB
            const orders = await this.getOrdersFromDatabase();
            
            // Carregar produtos
            const products = await this.getProductsFromDatabase();
            
            // Carregar clientes
            const customers = await this.getCustomersFromDatabase();
            
            // Verificar se há dados
            const hasData = products.length > 0 || customers.length > 0;
            
            if (!hasData) {
                this.showEmptyDataBanner();
            } else {
                this.hideEmptyDataBanner();
            }
            
            // Processar dados
            this.processData(orders, products, customers);
            
            console.log('📊 Dados carregados:', {
                pedidos: orders.length,
                produtos: products.length,
                clientes: customers.length
            });
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            // Usar dados de fallback do localStorage
            this.loadFallbackData();
        }
    }
    
    async getOrdersFromDatabase() {
        if (window.getFromDatabase) {
            return await window.getFromDatabase('orders') || [];
        }
        return [];
    }
    
    async getProductsFromDatabase() {
        if (window.getFromDatabase) {
            return await window.getFromDatabase('products') || [];
        }
        return [];
    }
    
    async getCustomersFromDatabase() {
        if (window.getFromDatabase) {
            return await window.getFromDatabase('customers') || [];
        }
        return [];
    }
    
    loadFallbackData() {
        // Carregar do localStorage como fallback
        const dailyOrders = JSON.parse(localStorage.getItem('dailyOrders') || '[]');
        this.processData(dailyOrders, [], []);
    }
    
    processData(orders, products, customers) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filtrar pedidos de hoje
        const todayOrders = orders.filter(order => {
            const orderDate = new Date(order.date || order.createdAt);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === today.getTime() && order.status !== 'cancelled';
        });
        
        // Calcular estatísticas básicas
        this.stats.totalOrders = todayOrders.length;
        this.stats.totalSales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        this.stats.averageTicket = this.stats.totalOrders > 0 
            ? this.stats.totalSales / this.stats.totalOrders 
            : 0;
        this.stats.activeOrders = todayOrders.filter(order => 
            ['confirmed', 'preparing', 'ready'].includes(order.status)
        ).length;
        
        // Calcular clientes únicos de hoje
        const uniqueCustomers = new Set(
            todayOrders
                .map(order => order.customer?.id || order.customerId)
                .filter(id => id)
        );
        this.stats.customersServed = uniqueCustomers.size;
        
        // ========================================
        // KPIs PROFISSIONAIS
        // ========================================
        
        // Taxa de Conversão (pedidos confirmados / total)
        const confirmedOrders = todayOrders.filter(o => o.status === 'confirmed' || o.status === 'completed');
        this.stats.conversionRate = this.stats.totalOrders > 0 
            ? (confirmedOrders.length / this.stats.totalOrders * 100).toFixed(1)
            : 0;
        
        // Margem de Lucro Estimada (40% de markup padrão)
        this.stats.estimatedProfit = this.stats.totalSales * 0.40;
        this.stats.profitMargin = 40;
        
        // Taxa de Pedidos Cancelados
        const cancelledOrders = orders.filter(order => {
            const orderDate = new Date(order.date || order.createdAt);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === today.getTime() && order.status === 'cancelled';
        });
        this.stats.cancellationRate = (this.stats.totalOrders + cancelledOrders.length) > 0
            ? (cancelledOrders.length / (this.stats.totalOrders + cancelledOrders.length) * 100).toFixed(1)
            : 0;
        
        // Comparação com ontem
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayOrders = orders.filter(order => {
            const orderDate = new Date(order.date || order.createdAt);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === yesterday.getTime() && order.status !== 'cancelled';
        });
        
        const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        this.stats.salesGrowth = yesterdaySales > 0 
            ? (((this.stats.totalSales - yesterdaySales) / yesterdaySales) * 100).toFixed(1)
            : 0;
        
        // Processar dados para gráficos
        this.processChartData(todayOrders);
        
        // Armazenar pedidos recentes
        this.recentOrders = todayOrders
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
            .slice(0, 10);
    }
    
    processChartData(orders) {
        // Agrupar por hora
        const hourlyData = new Array(24).fill(0);
        
        orders.forEach(order => {
            const hour = new Date(order.date || order.createdAt).getHours();
            hourlyData[hour] += order.total || 0;
        });
        
        this.chartData.hourly = hourlyData;
    }
    
    // ========================================
    // RENDERIZAÇÃO
    // ========================================
    
    render() {
        this.renderStats();
        this.renderKPIs();
        this.renderRecentOrders();
        this.renderChart();
        console.log('🎨 Dashboard renderizado completo');
    }
    
    renderStats() {
        // Atualizar cards de estatísticas
        this.updateStatValue('sales-today', window.formatCurrency 
            ? window.formatCurrency(this.stats.totalSales) 
            : `R$ ${this.stats.totalSales.toFixed(2)}`
        );
        
        this.updateStatValue('active-orders', this.stats.activeOrders);
        
        this.updateStatValue('customers-served', this.stats.customersServed || 0);
        
        this.updateStatValue('average-ticket', window.formatCurrency 
            ? window.formatCurrency(this.stats.averageTicket) 
            : `R$ ${this.stats.averageTicket.toFixed(2)}`
        );
        
        console.log('📊 Stats atualizadas:', this.stats);
    }
    
    renderKPIs() {
        const kpiContainer = document.getElementById('kpi-dashboard');
        if (!kpiContainer) return;
        
        const growthClass = this.stats.salesGrowth >= 0 ? 'positive' : 'negative';
        const growthIcon = this.stats.salesGrowth >= 0 ? '↑' : '↓';
        
        kpiContainer.innerHTML = `
            <div class="kpi-cards">
                <div class="kpi-card">
                    <div class="kpi-header">
                        <i class="fas fa-chart-line"></i>
                        <span class="kpi-label">Crescimento</span>
                    </div>
                    <div class="kpi-value ${growthClass}">
                        ${growthIcon} ${Math.abs(this.stats.salesGrowth)}%
                    </div>
                    <div class="kpi-subtitle">vs. ontem</div>
                </div>
                
                <div class="kpi-card">
                    <div class="kpi-header">
                        <i class="fas fa-percentage"></i>
                        <span class="kpi-label">Taxa de Conversão</span>
                    </div>
                    <div class="kpi-value">${this.stats.conversionRate}%</div>
                    <div class="kpi-subtitle">pedidos confirmados</div>
                </div>
                
                <div class="kpi-card">
                    <div class="kpi-header">
                        <i class="fas fa-coins"></i>
                        <span class="kpi-label">Lucro Estimado</span>
                    </div>
                    <div class="kpi-value">
                        ${window.formatCurrency 
                            ? window.formatCurrency(this.stats.estimatedProfit) 
                            : `R$ ${this.stats.estimatedProfit.toFixed(2)}`
                        }
                    </div>
                    <div class="kpi-subtitle">margem: ${this.stats.profitMargin}%</div>
                </div>
                
                <div class="kpi-card">
                    <div class="kpi-header">
                        <i class="fas fa-ban"></i>
                        <span class="kpi-label">Taxa de Cancelamento</span>
                    </div>
                    <div class="kpi-value ${this.stats.cancellationRate > 10 ? 'negative' : ''}">${this.stats.cancellationRate}%</div>
                    <div class="kpi-subtitle">pedidos cancelados</div>
                </div>
            </div>
        `;
        
        console.log('📈 KPIs renderizados');
    }
    
    updateStatValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`⚠️ Elemento #${elementId} não encontrado`);
        }
    }
    
    renderRecentOrders() {
        const container = document.getElementById('recent-orders');
        if (!container) {
            console.warn('⚠️ Container #recent-orders não encontrado');
            return;
        }
        
        if (!this.recentOrders || this.recentOrders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Nenhum pedido registrado hoje</p>
                    <button class="btn btn-primary" onclick="window.location.href='#pdv'" style="margin-top: 15px;">
                        <i class="fas fa-plus"></i> Criar Primeiro Pedido
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.recentOrders.map(order => `
            <div class="order-item" data-order-id="${order.id}">
                <div class="order-header">
                    <span class="order-number">#${order.number || order.id.slice(-4)}</span>
                    <span class="order-time">${this.formatTime(order.date || order.createdAt)}</span>
                </div>
                <div class="order-body">
                    <div class="order-items">
                        ${(order.items || []).slice(0, 2).map(item => 
                            `<span>${item.quantity}x ${item.name}</span>`
                        ).join('')}
                        ${(order.items || []).length > 2 ? `<span>+${order.items.length - 2} mais</span>` : ''}
                    </div>
                    <div class="order-footer">
                        <span class="order-total">${window.formatCurrency 
                            ? window.formatCurrency(order.total) 
                            : `R$ ${order.total.toFixed(2)}`
                        }</span>
                        <span class="order-status status-${order.status}">
                            ${this.getStatusText(order.status)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderChart() {
        const canvas = document.getElementById('sales-chart');
        if (!canvas) {
            console.warn('⚠️ Canvas #sales-chart não encontrado');
            return;
        }
        
        // Garantir dados do gráfico
        if (!this.chartData.hourly || this.chartData.hourly.length === 0) {
            this.chartData.hourly = Array(24).fill(0);
        }
        
        // Destruir TODOS os gráficos no canvas (método correto)
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
            console.log('🗑️ Gráfico anterior destruído');
        }
        
        // Destruir referência local também
        if (this.salesChart) {
            try {
                this.salesChart.destroy();
            } catch (e) {
                // Ignorar erro se já foi destruído
            }
            this.salesChart = null;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Configurar Chart.js com dados profissionais
        this.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}h`),
                datasets: [{
                    label: 'Vendas por Hora',
                    data: this.chartData.hourly,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Vendas por Hora (Hoje)',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#111827'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Vendas: ${window.formatCurrency 
                                    ? window.formatCurrency(context.parsed.y) 
                                    : `R$ ${context.parsed.y.toFixed(2)}`
                                }`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e5e7eb'
                        },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return `R$ ${value.toFixed(0)}`;
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: '#e5e7eb'
                        },
                        ticks: {
                            color: '#6b7280'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        });
        
        console.log('📈 Gráfico Chart.js renderizado');
    }
    
    // ========================================
    // EVENT LISTENERS
    // ========================================
    
    bindEvents() {
        // Botão de refresh no header do PDV (se existir)
        const refreshBtn = document.getElementById('dashboard-refresh') || 
                          document.querySelector('[data-action="dashboard-refresh"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
            console.log('✅ Botão refresh vinculado');
        }
        
        // Filtros de período - CORRIGIDO
        const periodFilters = document.querySelectorAll('[data-period]');
        if (periodFilters.length > 0) {
            periodFilters.forEach(filter => {
                filter.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // Remover classe ativa de todos os filtros
                    periodFilters.forEach(f => f.classList.remove('active'));
                    
                    // Adicionar classe ativa ao filtro clicado
                    filter.classList.add('active');
                    
                    // Aplicar filtro
                    const period = filter.dataset.period;
                    this.changePeriod(period);
                    
                    console.log(`📅 Período alterado para: ${period}`);
                });
            });
            
            console.log(`✅ ${periodFilters.length} filtros de período vinculados`);
        }
        
        // Export
        const exportBtn = document.getElementById('export-dashboard') ||
                         document.querySelector('[data-action="export-dashboard"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
    }
    
    // ========================================
    // AÇÕES DO USUÁRIO
    // ========================================
    
    async refresh() {
        try {
            if (window.showToast) {
                window.showToast('Atualizando dashboard...', 'info');
            }
            
            await this.loadAllData();
            this.render();
            
            if (window.showToast) {
                window.showToast('Dashboard atualizado com sucesso!', 'success');
            }
            
            console.log('🔄 Dashboard atualizado manualmente');
        } catch (error) {
            console.error('Erro ao atualizar dashboard:', error);
            if (window.showToast) {
                window.showToast('Erro ao atualizar dashboard', 'error');
            }
        }
    }
    
    changePeriod(period) {
        console.log(`🔄 Alterando período para: ${period}`);
        
        this.currentPeriod = period;
        
        // Recarregar dados com o novo período
        this.loadAllData().then(() => {
            this.render();
            
            if (window.showToast) {
                const periodText = {
                    'today': 'Hoje',
                    'week': 'Semana',
                    'month': 'Mês',
                    'year': 'Ano'
                };
                window.showToast(`Exibindo dados de: ${periodText[period] || period}`, 'info');
            }
        }).catch(error => {
            console.error('Erro ao alterar período:', error);
            if (window.showToast) {
                window.showToast('Erro ao aplicar filtro', 'error');
            }
        });
    }
    
    exportData() {
        const data = {
            stats: this.stats,
            orders: this.recentOrders,
            chartData: this.chartData,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        if (window.showToast) {
            window.showToast('Dados exportados com sucesso!', 'success');
        }
    }
    
    // ========================================
    // AUTO-ATUALIZAÇÃO COM DETECÇÃO DE MUDANÇAS
    // ========================================
    
    startAutoUpdate() {
        // CORREÇÃO CRÍTICA: Limpar interval anterior para prevenir memory leak E múltiplas instâncias
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('🔄 Limpando auto-atualização anterior');
        }
        
        // Armazenar hash dos dados para detectar mudanças
        this.lastDataHash = this.calculateDataHash();
        
        // OTIMIZAÇÃO: Reduzir frequência para evitar sobrecarga
        this.updateInterval = setInterval(async () => {
            try {
                // CORREÇÃO CRÍTICA: Verificar se dashboard está visível E é a instância ativa
                if (document.hidden || 
                    window.moduleManager?.currentModule !== 'dashboard' ||
                    DashboardModule.instance !== this) {
                    console.log('⏸️ Dashboard não visível ou inativo, pulando atualização');
                    return;
                }
                
                // OTIMIZAÇÃO: Só atualiza se página for visível
                if (document.visibilityState === 'visible') {
                    // Carregar dados temporários para comparação
                    const orders = await this.getOrdersFromDatabase();
                    const tempStats = this.calculateTempStats(orders);
                    const newDataHash = this.calculateStatsHash(tempStats);
                    
                    // Só atualizar se houver mudanças
                    if (newDataHash !== this.lastDataHash) {
                        console.log('🔄 Mudanças detectadas, atualizando dashboard...');
                        
                        // CORREÇÃO CRÍTICA: Destruir gráfico antes de recriar
                        this.destroyChart();
                    
                    await this.loadAllData();
                    this.render();
                    this.lastDataHash = newDataHash;
                    
                    // Notificar usuário
                    if (window.showToast) {
                        window.showToast('Dashboard atualizado automaticamente', 'info');
                    }
                    }
                } else {
                    console.log('✓ Nenhuma mudança detectada, mantendo visualização atual');
                }
            } catch (error) {
                console.error('Erro no auto-update:', error);
            }
        }, 120000); // OTIMIZAÇÃO: 2 minutos em vez de 30 segundos
        
        console.log('⏰ Auto-atualização otimizada (2min com detecção de mudanças)');
    }
    
    calculateTempStats(orders) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayOrders = orders.filter(order => {
            const orderDate = new Date(order.date || order.createdAt);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === today.getTime() && order.status !== 'cancelled';
        });
        
        const totalOrders = todayOrders.length;
        const totalSales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        return { totalOrders, totalSales };
    }
    
    calculateDataHash() {
        return this.calculateStatsHash(this.stats);
    }
    
    calculateStatsHash(stats) {
        // Criar hash simples baseado nas estatísticas principais
        const hashData = `${stats.totalSales || 0}-${stats.totalOrders || 0}`;
        return hashData;
    }
    
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('⏸️ Auto-atualização desativada');
        }
    }
    
    /**
     * CORREÇÃO CRÍTICA: Destrói gráfico Chart.js para prevenir memory leak
     */
    destroyChart() {
        // Destruir instância do Chart.js
        if (this.salesChart) {
            try {
                this.salesChart.destroy();
                this.salesChart = null;
                console.log('🗑️ Gráfico Chart.js destruído');
            } catch (error) {
                console.warn('Erro ao destruir gráfico:', error);
            }
        }
        
        // Limpar canvas para garantir
        const canvas = document.getElementById('sales-chart');
        if (canvas) {
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                existingChart.destroy();
            }
        }
    }
    
    // ========================================
    // BANNER DE DADOS VAZIOS
    // ========================================
    
    showEmptyDataBanner() {
        // Verificar se o banner já existe
        let banner = document.getElementById('empty-data-banner');
        
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'empty-data-banner';
            banner.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                margin: 20px;
                text-align: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                animation: slideIn 0.5s ease-out;
            `;
            
            banner.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 15px;">🍔</div>
                <h3 style="margin: 0 0 10px 0; font-size: 20px;">Bem-vindo ao BurgerPDV!</h3>
                <p style="margin: 0 0 20px 0; opacity: 0.95; font-size: 14px;">
                    Seu banco de dados está vazio. Os dados de exemplo foram carregados automaticamente.<br>
                    <strong>Aguarde alguns segundos e recarregue a página</strong>, ou comece criando seu primeiro produto!
                </p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="location.reload()" class="btn" style="background: white; color: #667eea; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        🔄 Recarregar Página
                    </button>
                    <button onclick="window.moduleManager.navigateToModule('cardapio')" class="btn" style="background: rgba(255,255,255,0.2); color: white; border: 2px solid white; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        🍔 Ir para Cardápio
                    </button>
                </div>
            `;
            
            const mainContent = document.querySelector('#dashboard-page .dashboard-container');
            if (mainContent) {
                mainContent.insertBefore(banner, mainContent.firstChild);
            }
        }
        
        banner.style.display = 'block';
    }
    
    hideEmptyDataBanner() {
        const banner = document.getElementById('empty-data-banner');
        if (banner) {
            banner.style.display = 'none';
        }
    }
    
    // ========================================
    // MÉTODOS DE ATIVAÇÃO/DESATIVAÇÃO
    // ========================================
    
    activate() {
        console.log('📊 Dashboard ativado');
        
        // Não recarregar se já está inicializado - apenas reativar auto-update
        if (this.isInitialized && this.stats.totalOrders >= 0) {
            console.log('✓ Dashboard já carregado, apenas reativando auto-update');
            if (!this.updateInterval) {
                this.startAutoUpdate();
            }
            return;
        }
        
        // Carregar apenas se não estiver inicializado
        this.loadAllData();
        this.render();
        this.startAutoUpdate();
    }
    
    deactivate() {
        console.log('📊 Dashboard desativado');
        this.stopAutoUpdate();
    }
    
    destroy() {
        this.stopAutoUpdate();
        this.isInitialized = false;
        console.log('🗑️ Dashboard destruído');
    }
    
    // ========================================
    // UTILITÁRIOS
    // ========================================
    
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    getStatusText(status) {
        const statusMap = {
            'draft': 'Rascunho',
            'confirmed': 'Confirmado',
            'preparing': 'Preparando',
            'ready': 'Pronto',
            'delivered': 'Entregue',
            'cancelled': 'Cancelado'
        };
        return statusMap[status] || status;
    }
    
    showError(message) {
        console.error('❌ Dashboard Error:', message);
        if (window.showToast) {
            window.showToast(message, 'error');
        }
    }
    
    // ========================================
    // LIMPEZA E DESTRUIÇÃO
    // ========================================
    
    destroy() {
        console.log('🗑️ Destruindo Dashboard Module...');
        
        // Parar auto-update
        this.stopAutoUpdate();
        
        // CORREÇÃO: Usar método centralizado para destruir gráfico
        this.destroyChart();
        
        // CORREÇÃO CRÍTICA: Limpar referência da instância singleton
        DashboardModule.instance = null;
        
        // Resetar estado
        this.isInitialized = false;
        
        console.log('✅ Dashboard Module destruído');
    }
}

// Exportar como default
export default DashboardModule;

// Log de carregamento
console.log('📊 Dashboard Module v2.0 carregado ✅ | KPIs + Chart.js + Auto-Update Inteligente');
