/**
 * SCRIPT DE LIMPEZA CRÍTICA DO SISTEMA PDV
 * 
 * Remove dados desnecessários que causam sobrecarga:
 * - localStorage excessivo
 * - Cache acumulado
 * - Listeners ativos
 * - Intervals desnecessários
 */

class SystemCleaner {
    static async cleanSystem() {
        console.log('🧹 Iniciando limpeza crítica do sistema...');
        
        // 1. Limpar localStorage desnecessário
        this.cleanLocalStorage();
        
        // 2. Limpar IndexedDB antigo
        await this.cleanIndexedDB();
        
        // 3. Parar intervals ativos
        this.stopAllIntervals();
        
        // 4. Remover listeners desnecessários
        this.removeEventListeners();
        
        console.log('✅ Limpeza do sistema concluída!');
    }
    
    static cleanLocalStorage() {
        console.log('🗑️ Limpando localStorage...');
        
        const itemsToRemove = [
            'cached_products',
            'cached_orders', 
            'cached_customers',
            'temp_data',
            'old_settings',
            'debug_logs',
            'production_errors'
        ];
        
        itemsToRemove.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`   Removido: ${key}`);
            }
        });
        
        // Manter apenas dados essenciais
        const essentialKeys = ['financial_custom_categories', 'lastDataCleanup', 'debug_verbose'];
        const allKeys = Object.keys(localStorage);
        
        allKeys.forEach(key => {
            if (!essentialKeys.includes(key)) {
                const size = localStorage.getItem(key)?.length || 0;
                if (size > 10000) { // Remover itens grandes (> 10KB)
                    localStorage.removeItem(key);
                    console.log(`   Removido item grande: ${key} (${size} chars)`);
                }
            }
        });
    }
    
    static async cleanIndexedDB() {
        console.log('🗄️ Verificando IndexedDB...');
        
        try {
            if (window.dbManager && window.dbManager.cleanupDatabase) {
                await window.dbManager.cleanupDatabase();
            }
            
            // NOTA: Remoção de pedidos antigos DESABILITADA
            // O código anterior estava criando pedidos fantasma ao salvar array como objeto único
            // A limpeza de pedidos antigos deve ser feita manualmente pelo usuário
            console.log('   ℹ️ Limpeza de pedidos antigos desabilitada (use botão "Limpar Testes" no módulo Pedidos)');
            
        } catch (error) {
            console.error('Erro ao verificar IndexedDB:', error);
        }
    }
    
    static stopAllIntervals() {
        console.log('⏰ Parando intervals desnecessários...');
        
        // Parar intervals conhecidos
        if (window.pedidosModule && window.pedidosModule.updateInterval) {
            clearInterval(window.pedidosModule.updateInterval);
            window.pedidosModule.updateInterval = null;
            console.log('   Parado: interval de pedidos');
        }
        
        if (window.dashboardModule && window.dashboardModule.updateInterval) {
            clearInterval(window.dashboardModule.updateInterval);
            window.dashboardModule.updateInterval = null;
            console.log('   Parado: interval do dashboard');
        }
        
        // Parar todos os intervals ativos (método agressivo)
        const highestId = window.setTimeout(() => {}, 0);
        for (let i = 0; i < highestId; i++) {
            window.clearInterval(i);
            window.clearTimeout(i);
        }
        console.log(`   Limpados ${highestId} timers/intervals`);
    }
    
    static removeEventListeners() {
        console.log('👂 Removendo listeners desnecessários...');
        
        // Remover listeners Firebase problemáticos
        if (window.firebase && window.firebase.database) {
            try {
                const db = window.firebase.database();
                db.ref('.info/connected').off(); // Remove listener de conexão
                console.log('   Removido: listener Firebase de conexão');
            } catch (error) {
                console.log('   Firebase listener já removido ou inexistente');
            }
        }
        
        // Coletar garbage
        if (window.gc) {
            window.gc();
            console.log('   Executado: garbage collection');
        }
    }
    
    static getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }
    
    static logMemoryStatus() {
        const memory = this.getMemoryUsage();
        if (memory) {
            console.log(`💾 Memória: ${memory.used}MB / ${memory.total}MB (limite: ${memory.limit}MB)`);
            
            if (memory.used > memory.limit * 0.8) {
                console.warn('⚠️ Uso de memória alto! Executando limpeza...');
                this.cleanSystem();
            }
        }
    }
}

// NÃO executar limpeza automaticamente - pode causar criação de pedidos fantasma
// Limpeza deve ser chamada manualmente apenas quando necessário
// SystemCleaner.cleanSystem();

// Monitoramento de memória DESABILITADO - causa problemas de performance
// Se necessário, chamar manualmente: SystemCleaner.logMemoryStatus()

// Disponibilizar globalmente para chamadas manuais
window.SystemCleaner = SystemCleaner;

export default SystemCleaner;