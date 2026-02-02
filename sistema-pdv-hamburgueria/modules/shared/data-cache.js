/**
 * 💾 DATA CACHE - Sistema de Cache Centralizado
 * 
 * Previne múltiplas consultas ao IndexedDB carregando dados pesados
 * apenas uma vez e servindo do cache em memória.
 * 
 * CRÍTICO: Resolve problema de Out of Memory
 * 
 * @version 1.0.0
 * @date 04/01/2026
 */

class DataCache {
    constructor() {
        this.cache = new Map();
        this.cacheTimestamps = new Map();
        this.cacheTTL = {
            orders: 5000,       // 🔄 UNIFICAÇÃO: 5 segundos (sincroniza com painel em tempo real)
            products: 300000,   // 5 minutos (muda pouco)
            customers: 300000,  // 5 minutos
            categories: 600000, // 10 minutos
            settings: 600000,   // 10 minutos
            inventory: 60000    // 1 minuto
        };
        
        this.loading = new Map(); // Previne múltiplas requisições simultâneas
        
        // CORREÇÃO CRÍTICA: Prevenir spam de logs e chamadas excessivas
        this.lastLogTime = new Map();
        this.LOG_THROTTLE_MS = 5000; // 5 segundos entre logs do mesmo tipo
        
        // CORREÇÃO: Rate limiting para prevenir chamadas excessivas
        this.lastCallTime = new Map();
        this.CALL_THROTTLE_MS = 1000; // 1 segundo entre chamadas do mesmo storeName
        
        console.log('💾 Data Cache inicializado');
    }

    /**
     * Log com throttle para evitar spam
     */
    throttledLog(message, type = 'log') {
        const now = Date.now();
        const key = `${type}:${message}`;
        const lastTime = this.lastLogTime.get(key) || 0;
        
        if (now - lastTime >= this.LOG_THROTTLE_MS) {
            console[type](message);
            this.lastLogTime.set(key, now);
        }
    }

    /**
     * Busca dados com cache inteligente
     */
    async get(storeName, forceRefresh = false) {
        const cacheKey = storeName;
        const now = Date.now();
        
        // CORREÇÃO CRÍTICA: Rate limiting para prevenir calls excessivos E recursão
        if (!forceRefresh && this.lastCallTime.has(cacheKey)) {
            const timeSinceLastCall = now - this.lastCallTime.get(cacheKey);
            if (timeSinceLastCall < this.CALL_THROTTLE_MS) {
                // Retornar dados em cache IMEDIATAMENTE sem logs excessivos
                const cached = this.cache.get(cacheKey);
                if (cached !== undefined) {
                    return cached;
                }
            }
        }
        this.lastCallTime.set(cacheKey, now);
        
        // PROTEÇÃO ADICIONAL: Prevenir recursão infinita
        const recursionKey = `${cacheKey}_${Date.now()}`;
        if (this.loading.has(cacheKey)) {
            this.throttledLog(`⏳ Aguardando carregamento em progresso: ${storeName}`);
            try {
                return await this.loading.get(cacheKey);
            } catch (error) {
                console.error(`❌ Erro ao aguardar carregamento de ${storeName}:`, error);
                return [];
            }
        }
        
        // 2. Verificar cache (se não forçar refresh)
        if (!forceRefresh && this.isValid(cacheKey)) {
            const age = Date.now() - this.cacheTimestamps.get(cacheKey);
            this.throttledLog(`💾 Cache hit: ${storeName} (${Math.round(age/1000)}s)`);
            return this.cache.get(cacheKey);
        }
        
        // 3. Carregar do banco (criar promise e registrar ANTES de await)
        this.throttledLog(`📥 Carregando ${storeName} do banco...`);
        
        // PROTEÇÃO CRÍTICA: Definir timeout menor para carregamento
        const loadPromise = Promise.race([
            this.loadFromDatabase(storeName),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Cache timeout: ${storeName}`)), 15000)
            )
        ])
            .then(data => {
                // Garantir que data é array
                const normalizedData = Array.isArray(data) ? data : (data ? [data] : []);
                
                // Atualizar cache
                this.cache.set(cacheKey, normalizedData);
                this.cacheTimestamps.set(cacheKey, Date.now());
                this.throttledLog(`✅ ${storeName} carregado e cacheado (${normalizedData.length} items)`);
                return normalizedData;
            })
            .catch(error => {
                console.error(`❌ Erro ao carregar ${storeName}:`, error);
                return [];
            })
            .finally(() => {
                // Remover do loading após 100ms para evitar race condition
                setTimeout(() => this.loading.delete(cacheKey), 100);
            });
        
        // Registrar IMEDIATAMENTE para bloquear outras chamadas
        this.loading.set(cacheKey, loadPromise);
        
        // Aguardar resultado
        return await loadPromise;
    }
    
    /**
     * CORREÇÃO CRÍTICA: Carrega do banco SEM recursão
     * Chama diretamente firebaseService para evitar loop infinito
     */
    async loadFromDatabase(storeName) {
        try {
            // CORREÇÃO CRÍTICA: Múltiplas estratégias para evitar recursão
            
            // 1. Primeiro tentar firebaseService diretamente
            if (window.firebaseService && typeof window.firebaseService.get === 'function') {
                const dataPromise = window.firebaseService.get(storeName);
                const data = await Promise.race([
                    dataPromise,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`Firebase timeout: ${storeName}`)), 20000)
                    )
                ]);
                return Array.isArray(data) ? data : (data ? [data] : []);
            }
            
            // 2. Fallback: Tentar databaseManager local
            if (window.databaseManager && typeof window.databaseManager.getAll === 'function') {
                console.log(`🔄 Fallback para databaseManager: ${storeName}`);
                const data = await window.databaseManager.getAll(storeName);
                return Array.isArray(data) ? data : [];
            }
            
            // 3. Último recurso: localStorage
            if (typeof Storage !== 'undefined') {
                console.log(`🔄 Último fallback localStorage: ${storeName}`);
                const stored = localStorage.getItem(`cached_${storeName}`);
                if (stored) {
                    const data = JSON.parse(stored);
                    return Array.isArray(data) ? data : [];
                }
            }
            
            console.warn(`⚠️ Nenhuma fonte de dados disponível para ${storeName}`);
            return [];
            
        } catch (error) {
            console.error(`❌ Erro ao carregar ${storeName}:`, error.message || error);
            return [];
        }
    }

    /**
     * Verifica se cache é válido
     */
    isValid(cacheKey) {
        if (!this.cache.has(cacheKey)) return false;
        
        const timestamp = this.cacheTimestamps.get(cacheKey);
        if (!timestamp) return false;
        
        const age = Date.now() - timestamp;
        const ttl = this.cacheTTL[cacheKey] || 60000; // Default 1 minuto
        
        return age < ttl;
    }

    /**
     * Invalida cache de uma store
     */
    invalidate(storeName) {
        this.cache.delete(storeName);
        this.cacheTimestamps.delete(storeName);
    }

    /**
     * Atualiza cache após modificação
     */
    async update(storeName, operation, data) {
        // Invalidar cache
        this.invalidate(storeName);
        
        // Executar operação no banco
        let result;
        switch (operation) {
            case 'add':
                result = await window.saveToDatabase(storeName, data);
                break;
            case 'update':
                result = await window.updateInDatabase(storeName, data);
                break;
            case 'delete':
                result = await window.deleteFromDatabase(storeName, data.id || data);
                break;
            default:
                throw new Error(`Operação desconhecida: ${operation}`);
        }
        
        // Recarregar cache em background
        setTimeout(() => this.get(storeName, true), 100);
        
        return result;
    }

    /**
     * Limpar todo o cache
     */
    clear() {
        this.cache.clear();
        this.cacheTimestamps.clear();
        this.loading.clear();
        console.log('🗑️ Todo o cache limpo');
    }

    /**
     * Estatísticas do cache
     */
    getStats() {
        const stats = {};
        
        for (const [key, data] of this.cache.entries()) {
            const age = Date.now() - (this.cacheTimestamps.get(key) || 0);
            stats[key] = {
                items: Array.isArray(data) ? data.length : 1,
                age: Math.round(age / 1000),
                valid: this.isValid(key)
            };
        }
        
        return stats;
    }
    
    /**
     * Pre-carregar dados essenciais
     */
    async preload() {
        console.log('🚀 Pre-carregando dados essenciais...');
        
        const essential = ['products', 'customers', 'settings'];
        await Promise.all(essential.map(store => this.get(store)));
        
        console.log('✅ Dados essenciais pre-carregados');
    }
}

// Exportar instância singleton
const dataCache = new DataCache();
window.dataCache = dataCache;

export default dataCache;
