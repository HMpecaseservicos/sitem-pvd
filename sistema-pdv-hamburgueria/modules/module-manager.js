// ===== MODULE MANAGER - SISTEMA PDV HAMBURGUERIA =====
// Gerenciador central de todos os módulos do sistema
// VERSÃO OTIMIZADA com Error Boundaries + Data Cache

import { DashboardModule } from './dashboard/dashboard.js';
// CARDÁPIO INTERNO DESABILITADO - Cardápio digital externo é a fonte única de verdade
// import { CardapioModule } from './cardapio/cardapio.js';
import { PedidosModule } from './pedidos/pedidos.js';
import ClientesModule from './clientes/clientes.js';
import EstoqueModule from './estoque/estoque.js';
import FinanceiroModule from './financeiro/financeiro.js';
import RelatoriosModule from './relatorios/relatorios.js';
import ConfiguracoesModule from './configuracoes/configuracoes.js';
import db from './shared/database-manager.js';
import { onlineOrdersListener } from './shared/online-orders-listener.js';
import logger from './shared/logger.js';
import errorBoundary from './shared/error-boundary.js';
import dataCache from './shared/data-cache.js';

import * as Utils from './shared/utils.js';
import { initializeDatabase } from './shared/utils.js';

export class ModuleManager {
    constructor() {
        this.modules = new Map();
        this.currentModule = null;
        this.isInitialized = false;
        this.boundHandlers = new Map();
        
        // Tornar utilitários globais para compatibilidade
        this.makeUtilsGlobal();
    }
    
    async init() {
        // CORREÇÃO CRÍTICA: Proteção contra inicialização duplicada
        if (this.isInitialized) {
            console.warn('⚠️ Module Manager já foi inicializado, ignorando chamada duplicada');
            return;
        }
        this.isInitialized = true; // Marcar IMEDIATAMENTE
        
        try {
            console.log('🔄 Inicializando Module Manager...');
            
            // OTIMIZAÇÃO: Inicializar apenas componentes críticos primeiro
            await this.initDatabase();
            this.setupNavigation();
            
            // OTIMIZAÇÃO: Carregamento lazy dos módulos
            this.initializeModulesLazy();
            this.bindGlobalEvents();
            this.loadInitialModule();
            
            // Inicializar listener de pedidos online após tudo estar pronto
            setTimeout(() => {
                if (window.onlineOrdersListener && !window.onlineOrdersListener.isInitialized) {
                    console.log('🌐 Inicializando listener de pedidos online...');
                    window.onlineOrdersListener.init();
                }
            }, 2000);
            
            console.log('✅ Module Manager initialized successfully');
            Utils.showToast('Sistema iniciado com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Error initializing Module Manager:', error);
            this.isInitialized = false; // CORREÇÃO: Resetar em caso de erro
            Utils.showToast('Erro ao inicializar sistema', 'error');
            throw error;
        }
    }
    
    // === UTILITÁRIOS GLOBAIS ===
    makeUtilsGlobal() {
        // Expor utilitários no window para compatibilidade com código legado
        Object.keys(Utils).forEach(key => {
            if (typeof Utils[key] === 'function') {
                window[key] = Utils[key];
            }
        });
        
        // CORREÇÃO CRÍTICA: Expor logger e error boundary
        window.logger = logger;
        window.errorBoundary = errorBoundary;
        
        // CRÍTICO: Expor listener de pedidos online globalmente
        window.onlineOrdersListener = onlineOrdersListener;
    }
    
    // === INICIALIZAÇÃO DE MÓDULOS ===
    initializeModulesLazy() {
        // OTIMIZAÇÃO: Registrar módulos sem instanciar ainda (lazy loading)
        // Apenas registra as classes, instanciação acontece sob demanda
        this.registerModule('dashboard', DashboardModule);
        // CARDÁPIO INTERNO DESABILITADO - Cardápio digital externo é a fonte única de verdade
        // this.registerModule('cardapio', CardapioModule);
        this.registerModule('pedidos', PedidosModule);
        this.registerModule('clientes', ClientesModule);
        this.registerModule('estoque', EstoqueModule);
        this.registerModule('financeiro', FinanceiroModule);
        this.registerModule('relatorios', RelatoriosModule);
        this.registerModule('configuracoes', ConfiguracoesModule);
        
        console.log('📋 Módulos registrados para carregamento lazy');
    }

    // Método legado mantido para compatibilidade
    initializeModules() {
        this.initializeModulesLazy();
    }
    
    registerModule(name, ModuleClass) {
        this.modules.set(name, {
            name,
            ModuleClass,
            instance: null,
            isLoaded: false
        });
    }

    // === BANCO DE DADOS ===
    async initDatabase() {
        try {
            console.log('🗄️ Inicializando banco de dados IndexedDB (cache)...');
            
            // Inicializar banco através do DatabaseManager (usado apenas como cache)
            await db.init();
            
            // NOVO: Pre-carregar dados essenciais no cache
            console.log('💾 Inicializando Data Cache...');
            await dataCache.preload();
            
            // Disponibilizar globalmente para compatibilidade
            window.dbManager = db;
            window.dataCache = dataCache;
            
            console.log('✅ Banco de dados inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar banco de dados:', error);
            Utils.showToast('Erro ao inicializar banco de dados', 'error');
        }
    }

    async syncInitialData() {
        try {
            // Apenas sincronizar do Firebase (sem carregar dados de exemplo)
            console.log('🔄 Sincronizando dados do Firebase...');
            const allProducts = await Utils.getFromDatabase('products');
            
            // Disponibilizar dados globalmente para compatibilidade
            window.currentProducts = allProducts || [];
            
            console.log(`✅ ${allProducts?.length || 0} produtos sincronizados do Firebase`);

        } catch (error) {
            console.error('Erro ao sincronizar dados do Firebase:', error);
        }
    }
    
    // === NAVEGAÇÃO ===
    setupNavigation() {
        const navigationHandler = (e) => {
            if (e.target.matches('.nav-item[data-page]')) {
                const page = e.target.dataset.page;
                this.navigateTo(page);
            }
        };
        
        this.boundHandlers.set('navigation', navigationHandler);
        document.addEventListener('click', navigationHandler);
    }
    
    navigateTo(moduleName) {
        if (moduleName === this.currentModule) return;
        
        try {
            // Esconder todos os módulos
            this.hideAllPages();
            
            // Ocultar/mostrar top-bar baseado no módulo
            const topBar = document.querySelector('.top-bar');
            if (topBar) {
                if (moduleName === 'dashboard') {
                    topBar.style.display = 'flex'; // Mostrar apenas no dashboard
                } else {
                    topBar.style.display = 'none'; // Ocultar em outros módulos
                }
            }
            
            // Carregar e mostrar módulo solicitado
            this.loadModule(moduleName);
            this.showPage(moduleName);
            
            // Atualizar navegação
            this.updateNavigation(moduleName);
            
            // Definir como módulo atual
            this.currentModule = moduleName;
            
            console.log(`Navigated to module: ${moduleName}`);
            
        } catch (error) {
            console.error(`Error navigating to ${moduleName}:`, error);
            Utils.showToast(`Erro ao carregar módulo ${moduleName}`, 'error');
        }
    }
    
    loadModule(moduleName) {
        const moduleInfo = this.modules.get(moduleName);
        if (!moduleInfo) {
            const log = logger || console;
            log.error(`Module ${moduleName} not registered`);
            return;
        }
        
        // Se o módulo já foi carregado, apenas ativar
        if (moduleInfo.instance) {
            if (typeof moduleInfo.instance.activate === 'function') {
                moduleInfo.instance.activate();
            }
            return;
        }
        
        // Carregar novo módulo com error boundary
        try {
            const log = logger || console;
            log.log(`⚡ Carregando ${moduleName}...`);
            
            const startTime = performance.now();
            
            moduleInfo.instance = new moduleInfo.ModuleClass();
            
            // Inicializar o módulo se tiver método init() - NÃO esperar se for assíncrono
            if (typeof moduleInfo.instance.init === 'function') {
                const initResult = moduleInfo.instance.init();
                
                // Se retornar Promise, não bloquear - deixar carregar em background
                if (initResult && typeof initResult.then === 'function') {
                    initResult
                        .then(() => {
                            const loadTime = Math.round(performance.now() - startTime);
                            log.log(`✅ ${moduleName} OK (${loadTime}ms)`);
                        })
                        .catch(err => {
                            log.error(`❌ Erro init ${moduleName}:`, err);
                        });
                } else {
                    const loadTime = Math.round(performance.now() - startTime);
                    log.log(`✅ ${moduleName} OK (${loadTime}ms)`);
                }
            }
            
            moduleInfo.isLoaded = true;
            
            // Expor instância globalmente para compatibilidade
            window[`${moduleName}Module`] = moduleInfo.instance;
            
        } catch (error) {
            const log = logger || console;
            log.error(`Error loading module ${moduleName}:`, error);
            if (Utils && Utils.showToast) {
                Utils.showToast(`Erro ao carregar módulo ${moduleName}`, 'error');
            }
            // Não relançar - deixar sistema continuar funcionando
        }
    }
    
    hideAllPages() {
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.add('hidden');
        });
    }
    
    showPage(moduleName) {
        const page = document.getElementById(`${moduleName}-page`);
        if (page) {
            page.classList.remove('hidden');
        }
    }
    
    updateNavigation(moduleName) {
        // Remover classe active de todos os itens
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Adicionar classe active no item atual
        const currentNavItem = document.querySelector(`[data-page="${moduleName}"]`);
        if (currentNavItem) {
            currentNavItem.classList.add('active');
        }
        
        // Atualizar título da página
        this.updatePageTitle(moduleName);
    }
    
    updatePageTitle(moduleName) {
        const titleMap = {
            dashboard: 'Dashboard',
            pdv: 'Ponto de Venda',
            // cardapio: 'Cardápio', // DESABILITADO - fonte única é cardápio digital
            pedidos: 'Pedidos',
            clientes: 'Clientes',
            estoque: 'Estoque',
            financeiro: 'Financeiro',
            relatorios: 'Relatórios',
            configuracoes: 'Configurações'
        };
        
        const title = titleMap[moduleName] || moduleName;
        document.title = `${title} - Sistema PDV Hamburgueria`;
        
        // Atualizar breadcrumb se existir
        const breadcrumb = document.querySelector('.page-title h1');
        if (breadcrumb) {
            breadcrumb.textContent = title;
        }
    }
    
    loadInitialModule() {
        // Verificar URL hash
        const hash = window.location.hash.substr(1);
        const validModules = ['dashboard', 'pdv', 'cardapio', 'pedidos', 'clientes', 'estoque', 'financeiro', 'relatorios', 'configuracao'];
        
        if (hash && validModules.includes(hash)) {
            this.navigateTo(hash);
        } else {
            this.navigateTo('dashboard'); // Módulo padrão
        }
    }
    
    // === EVENTOS GLOBAIS ===
    bindGlobalEvents() {
        // Fechar modais
        document.addEventListener('click', (e) => {
            if (e.target.matches('.close-modal') || 
                (e.target.matches('.modal') && e.target === e.currentTarget)) {
                this.closeAllModals();
            }
        });
        
        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Controle de redimensionamento
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
        
        // Controle de saída
        window.addEventListener('beforeunload', (e) => {
            this.handleBeforeUnload(e);
        });
        
        // Atualização de tempo
        this.startTimeUpdater();
        
        // Verificação de status da loja
        this.startStoreStatusChecker();
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    handleKeyboardShortcuts(e) {
        // Ctrl + números para navegação rápida
        if (e.ctrlKey && !e.shiftKey && !e.altKey) {
            const moduleMap = {
                '1': 'dashboard',
                '2': 'pedidos',
                '3': 'clientes',
                '4': 'estoque',
                '5': 'financeiro',
                '6': 'relatorios',
                '7': 'configuracoes'
                // CARDÁPIO INTERNO DESABILITADO - removido do mapa de atalhos
            };
            
            if (moduleMap[e.key]) {
                e.preventDefault();
                this.navigateTo(moduleMap[e.key]);
            }
        }
        
        // ESC para fechar modais
        if (e.key === 'Escape') {
            this.closeAllModals();
        }
        
        // F5 para atualizar módulo atual
        if (e.key === 'F5' && this.currentModule) {
            e.preventDefault();
            this.refreshCurrentModule();
        }
    }
    
    handleWindowResize() {
        // Reagir a mudanças de tamanho da janela
        const isMobile = window.innerWidth <= 768;
        document.body.classList.toggle('mobile-view', isMobile);
    }
    
    handleBeforeUnload(e) {
        // Verificar se há dados não salvos
        const hasUnsavedData = this.checkUnsavedData();
        
        if (hasUnsavedData) {
            e.preventDefault();
            e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
            return e.returnValue;
        }
    }
    
    checkUnsavedData() {
        // Verificar se algum módulo tem dados não salvos
        for (const [name, moduleInfo] of this.modules) {
            if (moduleInfo.instance && 
                typeof moduleInfo.instance.hasUnsavedData === 'function' &&
                moduleInfo.instance.hasUnsavedData()) {
                return true;
            }
        }
        return false;
    }
    
    // === UTILITÁRIOS DE TEMPO ===
    startTimeUpdater() {
        const updateTime = () => {
            const timeElement = document.getElementById('current-time');
            if (timeElement) {
                timeElement.textContent = Utils.formatDateTime();
            }
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }
    
    startStoreStatusChecker() {
        const checkStatus = () => {
            const isOpen = Utils.isStoreOpen();
            const statusElement = document.getElementById('store-status');
            
            if (statusElement) {
                statusElement.textContent = isOpen ? 'Aberto' : 'Fechado';
                statusElement.className = isOpen ? 'status-open' : 'status-closed';
            }
            
            if (!isOpen) {
                Utils.showToast('Loja fora do horário de funcionamento', 'warning', 5000);
            }
        };
        
        checkStatus();
        // Verificar a cada hora
        // OTIMIZAÇÃO: Verificar status menos frequentemente
        setInterval(checkStatus, 1800000); // 30 minutos em vez de 1 hora
    }
    
    // === MÉTODOS PÚBLICOS ===
    
    // Obter instância de um módulo
    getModule(moduleName) {
        const moduleInfo = this.modules.get(moduleName);
        return moduleInfo ? moduleInfo.instance : null;
    }
    
    // Recarregar módulo atual
    refreshCurrentModule() {
        if (!this.currentModule) return;
        
        const moduleInstance = this.getModule(this.currentModule);
        if (moduleInstance && typeof moduleInstance.refresh === 'function') {
            moduleInstance.refresh();
        } else {
            // Recarregar completamente
            const moduleInfo = this.modules.get(this.currentModule);
            if (moduleInfo && moduleInfo.instance) {
                // Destruir instância atual
                if (typeof moduleInfo.instance.destroy === 'function') {
                    moduleInfo.instance.destroy();
                }
                
                // Criar nova instância
                moduleInfo.instance = null;
                moduleInfo.isLoaded = false;
                
                // Carregar novamente
                this.loadModule(this.currentModule);
            }
        }
        
        Utils.showToast('Módulo atualizado', 'info');
    }
    
    // Obter estado do sistema
    getSystemState() {
        return {
            currentModule: this.currentModule,
            loadedModules: Array.from(this.modules.entries())
                .filter(([name, info]) => info.isLoaded)
                .map(([name]) => name),
            storeOpen: Utils.isStoreOpen(),
            timestamp: new Date().toISOString()
        };
    }
    
    // Exportar dados do sistema
    exportSystemData() {
        const data = {
            timestamp: new Date().toISOString(),
            dailyOrders: Utils.loadFromStorage('dailyOrders', []),
            products: Utils.loadFromStorage('products', []),
            categories: Utils.loadFromStorage('categories', []),
            customers: Utils.loadFromStorage('customers', []),
            stockItems: Utils.loadFromStorage('stockItems', []),
            financialTransactions: Utils.loadFromStorage('financialTransactions', []),
            systemSettings: Utils.loadFromStorage('systemSettings', {}),
            dailyStats: Utils.loadFromStorage('dailyStats', {})
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sistema-pdv-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Utils.showToast('Dados exportados com sucesso!', 'success');
    }
    
    // Importar dados do sistema
    importSystemData(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Importar cada tipo de dado
                const dataTypes = [
                    'dailyOrders', 'products', 'categories', 'customers',
                    'stockItems', 'financialTransactions', 'systemSettings', 'dailyStats'
                ];
                
                dataTypes.forEach(type => {
                    if (data[type]) {
                        Utils.saveToStorage(type, data[type]);
                    }
                });
                
                // Recarregar módulo atual
                this.refreshCurrentModule();
                
                Utils.showToast('Dados importados com sucesso!', 'success');
                
            } catch (error) {
                console.error('Import error:', error);
                Utils.showToast('Erro ao importar dados. Verifique o arquivo.', 'error');
            }
        };
        
        reader.readAsText(file);
    }
    
    // Obter instância de módulo
    getModuleInstance(moduleName) {
        const moduleInfo = this.modules.get(moduleName);
        return moduleInfo ? moduleInfo.instance : null;
    }

    // Destruir gerenciador
    destroy() {
        console.log('Destroying ModuleManager...');
        
        // Destruir todos os módulos
        for (const [name, moduleInfo] of this.modules) {
            if (moduleInfo.instance) {
                // Chamar destroy se existir
                if (typeof moduleInfo.instance.destroy === 'function') {
                    try {
                        moduleInfo.instance.destroy();
                    } catch (error) {
                        console.error(`Error destroying module ${name}:`, error);
                    }
                }
                // Limpar instância global
                delete window[`${name}Module`];
            }
        }
        
        // Limpar event listeners globais
        this.boundHandlers.forEach((handler, key) => {
            document.removeEventListener('click', handler);
        });
        this.boundHandlers.clear();
        
        // Fechar banco de dados
        if (window.dbManager && window.dbManager.db) {
            window.dbManager.db.close();
            window.dbManager.isInitialized = false;
            window.dbManager.db = null;
        }
        
        // Limpar referências
        this.modules.clear();
        this.currentModule = null;
        this.isInitialized = false;
        
        console.log('ModuleManager destroyed successfully');
    }
}

export default ModuleManager;