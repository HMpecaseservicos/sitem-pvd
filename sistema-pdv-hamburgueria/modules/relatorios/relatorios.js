// ===== RELATORIOS MODULE - SISTEMA PDV HAMBURGUERIA =====

export default class RelatoriosModule {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('Relatórios Module initialized');
        this.isInitialized = true;
    }

    activate() {
        console.log('Relatórios Module activated');
        // Recarregar dados quando módulo for ativado
    }

    destroy() {
        this.isInitialized = false;
        console.log('Relatórios Module destroyed');
    }
}