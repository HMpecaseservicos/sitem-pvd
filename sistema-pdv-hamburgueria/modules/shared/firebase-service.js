/**
 * 🔥 FIREBASE SERVICE - CAMADA ÚNICA DE ACESSO A DADOS
 * 
 * Gerencia Firebase como fonte principal + IndexedDB como cache
 * Remove complexidade de múltiplos bancos e garante consistência
 * 
 * @author Sistema PDV Hamburgueria
 * @version 3.0.0
 * @since 10/12/2025
 */

import db from './database-manager.js';

class FirebaseService {
    constructor() {
        this.cacheEnabled = true;
        this.offlineMode = false;
        this.syncInProgress = false;
        this.pendingOperations = [];
        this.isInitialized = false;
        
        // CORREÇÃO CRÍTICA: Fila de operações para prevenir race conditions
        this.operationQueue = [];
        this.processingQueue = false;
        
        // NOVO: Proteção contra vazamentos de memória
        this.activeListeners = new Set();
        this.memoryCleanupInterval = null;
    }

    /**
     * Inicializa o serviço
     */
    async init() {
        // CORREÇÃO CRÍTICA: Proteção contra inicialização duplicada
        if (this.isInitialized) {
            console.warn('⚠️ Firebase Service já foi inicializado, ignorando chamada duplicada');
            return true;
        }
        this.isInitialized = true; // Marcar IMEDIATAMENTE
        
        try {
            console.log('🔥 Inicializando Firebase Service...');

            // Verificar se Firebase está disponível
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase SDK não carregado');
                this.offlineMode = true;
                return false;
            }

            // Verificar se firebaseManager está disponível
            if (!window.firebaseManager) {
                console.warn('⚠️ Firebase Manager não disponível');
                this.offlineMode = true;
                return false;
            }

            // Inicializar cache local
            await db.init();

            // Verificar status de conexão
            this.checkOnlineStatus();

            console.log('✅ Firebase Service inicializado');
            return true;

        } catch (error) {
            console.error('❌ Erro ao inicializar Firebase Service:', error);
            this.offlineMode = true;
            this.isInitialized = false; // Resetar em caso de erro
            return false;
        }
    }

    /**
     * Verifica status online/offline
     */
    checkOnlineStatus() {
        if (window.firebaseManager && window.firebaseManager.isOnline !== undefined) {
            this.offlineMode = !window.firebaseManager.isOnline;
        }
    }

    /**
     * Salvar dados (Firebase + Cache)
     * @param {string} collection - Nome da coleção (products, orders, etc)
     * @param {object} data - Dados a serem salvos
     * @returns {Promise<object>} Dados salvos com ID
     */
    async save(collection, data) {
        // CORREÇÃO CRÍTICA: Se sincronização em progresso, adicionar à fila
        if (this.syncInProgress) {
            return this.queueOperation('save', collection, data);
        }
        
        this.syncInProgress = true;
        
        try {
            return await this._executeSave(collection, data);
        } finally {
            this.syncInProgress = false;
            this.processQueue(); // Processar próxima operação
        }
    }
    
    /**
     * Executa operação de save (método interno)
     */
    async _executeSave(collection, data) {
        // 1. Garantir ID único
        if (!data.id) {
            data.id = this.generateId();
        }

        // 2. Timestamps
        const now = new Date().toISOString();
        data.updatedAt = now;
        if (!data.createdAt) {
            data.createdAt = now;
        }

        try {
            // 3. Salvar no Firebase (PRINCIPAL)
            if (this.canUseFirebase()) {
                await window.firebaseManager.updateData(`${collection}/${data.id}`, data);
                console.log(`🔥 Salvo no Firebase: ${collection}/${data.id}`, {
                    status: data.status,
                    updatedAt: data.updatedAt
                });
            } else {
                // Adicionar à fila para sincronizar depois
                this.pendingOperations.push({
                    type: 'save',
                    collection,
                    data,
                    timestamp: now
                });
                console.log(`📦 Firebase offline - Adicionado à fila: ${collection}/${data.id}`, {
                    status: data.status,
                    queueSize: this.pendingOperations.length
                });
            }

            // 4. Atualizar cache local (sempre)
            if (this.cacheEnabled) {
                await db.update(collection, data);
                console.log(`💾 Cache atualizado: ${collection}/${data.id}`);
            }

            return data;

        } catch (error) {
            console.error('❌ Erro ao salvar:', error);
            
            // Fallback: salvar apenas no cache
            if (this.cacheEnabled) {
                await db.update(collection, data);
                this.offlineMode = true;
                
                // Adicionar à fila
                this.pendingOperations.push({
                    type: 'save',
                    collection,
                    data,
                    timestamp: now
                });
            }
            
            return data;
        }
    }
    
    /**
     * CORREÇÃO CRÍTICA: Adiciona operação à fila
     */
    queueOperation(type, collection, data) {
        return new Promise((resolve, reject) => {
            this.operationQueue.push({
                type,
                collection,
                data,
                resolve,
                reject,
                timestamp: Date.now()
            });
            console.log(`📦 Operação ${type} adicionada à fila (${this.operationQueue.length} pendentes)`);
        });
    }
    
    /**
     * CORREÇÃO CRÍTICA: Processa fila de operações
     */
    async processQueue() {
        if (this.processingQueue || this.operationQueue.length === 0) {
            return;
        }
        
        this.processingQueue = true;
        
        while (this.operationQueue.length > 0) {
            const operation = this.operationQueue.shift();
            
            try {
                let result;
                if (operation.type === 'save') {
                    result = await this._executeSave(operation.collection, operation.data);
                } else if (operation.type === 'delete') {
                    result = await this._executeDelete(operation.collection, operation.data);
                }
                operation.resolve(result);
            } catch (error) {
                operation.reject(error);
            }
        }
        
        this.processingQueue = false;
    }

    /**
     * Buscar dados (Cache primeiro para performance)
     * @param {string} collection - Nome da coleção
     * @param {string} id - ID do registro (opcional, null = buscar todos)
     * @returns {Promise<object|array|null>}
     */
    async get(collection, id = null) {
        try {
            // 1. Buscar do cache (RÁPIDO - ~10ms)
            if (this.cacheEnabled) {
                const cached = id 
                    ? await db.get(collection, id)
                    : await db.getAll(collection);
                
                if (cached) {
                    // Se encontrou no cache, retornar
                    console.log(`💾 Cache hit: ${collection}${id ? `/${id}` : ''}`);
                    return cached;
                }
            }

            // 2. Se não tem no cache, buscar do Firebase
            if (this.canUseFirebase()) {
                const path = id ? `${collection}/${id}` : collection;
                const data = await window.firebaseManager.getData(path);
                
                console.log(`🔥 Firebase fetch: ${path}`);
                
                // 3. Atualizar cache com dados do Firebase
                if (data && this.cacheEnabled) {
                    if (id) {
                        await db.update(collection, data);
                    } else {
                        // Múltiplos registros
                        const dataArray = Object.values(data);
                        for (const item of dataArray) {
                            await db.update(collection, item);
                        }
                    }
                    console.log(`💾 Cache preenchido: ${path}`);
                }
                
                return data;
            }

            // 3. Se offline e não tem cache, retornar vazio
            console.warn(`⚠️ Offline e sem cache: ${collection}${id ? `/${id}` : ''}`);
            return id ? null : [];

        } catch (error) {
            console.error('❌ Erro ao buscar:', error);
            
            // Em caso de erro, tentar cache como fallback
            if (this.cacheEnabled) {
                const cached = id 
                    ? await db.get(collection, id)
                    : await db.getAll(collection);
                return cached || (id ? null : []);
            }
            
            return id ? null : [];
        }
    }

    /**
     * Atualizar dados parcialmente
     * @param {string} collection - Nome da coleção
     * @param {string} id - ID do registro
     * @param {object} updates - Campos a atualizar
     * @returns {Promise<object>} Dados atualizados
     */
    async update(collection, id, updates) {
        const existing = await this.get(collection, id);
        if (!existing) {
            throw new Error(`❌ Registro ${id} não encontrado em ${collection}`);
        }

        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        return await this.save(collection, updated);
    }

    /**
     * Deletar dados
     * @param {string} collection - Nome da coleção
     * @param {string} id - ID do registro
     * @returns {Promise<boolean>}
     */
    async delete(collection, id) {
        try {
            // 1. Deletar do Firebase
            if (this.canUseFirebase()) {
                await window.firebaseManager.deleteData(`${collection}/${id}`);
                console.log(`🔥 Deletado do Firebase: ${collection}/${id}`);
            } else {
                // Adicionar à fila
                this.pendingOperations.push({
                    type: 'delete',
                    collection,
                    id,
                    timestamp: new Date().toISOString()
                });
            }

            // 2. Deletar do cache
            if (this.cacheEnabled) {
                await db.delete(collection, id);
                console.log(`💾 Deletado do cache: ${collection}/${id}`);
            }

            return true;

        } catch (error) {
            console.error('❌ Erro ao deletar:', error);
            throw error;
        }
    }

    /**
     * Escutar mudanças em tempo real
     * @param {string} collection - Nome da coleção
     * @param {function} callback - Função chamada quando dados mudam
     * @returns {object} Referência do listener (para parar depois)
     */
    listen(collection, callback) {
        if (!this.canUseFirebase()) {
            console.warn('⚠️ Realtime desabilitado (offline ou não autenticado)');
            return null;
        }

        console.log(`👂 Escutando mudanças: ${collection}`);

        return window.firebaseManager.listenToData(collection, async (data) => {
            console.log(`🔄 Mudança detectada: ${collection}`);
            
            // Atualizar cache automaticamente
            if (data && this.cacheEnabled) {
                const dataArray = Object.values(data);
                for (const item of dataArray) {
                    await db.update(collection, item);
                }
                console.log(`💾 Cache atualizado automaticamente: ${collection}`);
            }

            // Chamar callback do usuário
            callback(data);
        });
    }

    /**
     * Parar de escutar mudanças
     * @param {string} collection - Nome da coleção
     */
    stopListening(collection) {
        if (window.firebaseManager) {
            window.firebaseManager.stopListening(collection);
            console.log(`👂 Parou de escutar: ${collection}`);
        }
    }

    /**
     * Sincronizar TUDO do Firebase para cache local
     * @returns {Promise<boolean>}
     */
    async syncFromCloud() {
        if (!this.canUseFirebase()) {
            console.warn('⚠️ Não é possível sincronizar (offline ou não autenticado)');
            return false;
        }

        if (this.syncInProgress) {
            console.warn('⏳ Sincronização já em andamento');
            return false;
        }

        this.syncInProgress = true;
        console.log('📥 Sincronizando do Firebase...');
        
        // PROTEÇÃO: Timeout de 30 segundos
        const syncTimeout = setTimeout(() => {
            console.error('❌ Timeout na sincronização (30s)');
            this.syncInProgress = false;
        }, 30000);

        const collections = [
            'products',
            'categories',
            'orders',      // OTIMIZADO: Será limitado
            'customers',
            'inventory',
            'financial',
            'settings',
            'tables'
        ];

        let totalSynced = 0;

        try {
            for (const collection of collections) {
                try {
                    const data = await window.firebaseManager.getData(collection);
                    if (data) {
                        let dataArray = Object.values(data);
                        
                        // PROTEÇÃO: Limitar pedidos a últimos 1000
                        if (collection === 'orders') {
                            if (dataArray.length > 1000) {
                                console.warn(`⚠️ ${collection}: ${dataArray.length} registros, limitando a 1000`);
                                // Ordenar por data e pegar os 1000 mais recentes
                                dataArray = dataArray
                                    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                                    .slice(0, 1000);
                            }
                        }
                        
                        // Tratamento especial para settings
                        if (collection === 'settings') {
                            console.log('🔍 DEBUG Settings - Data original:', JSON.stringify(data, null, 2));
                            
                            if (data.id) {
                                dataArray = [data];
                            } else {
                                const values = Object.values(data);
                                const firstValidSettings = values.find(item => item && item.id);
                                
                                if (firstValidSettings) {
                                    dataArray = [firstValidSettings];
                                    console.log('✅ Settings encontrado:', firstValidSettings.id);
                                } else {
                                    dataArray = [{
                                        id: 'settings-1',
                                        ...data
                                    }];
                                    console.log('🔧 Settings criado com ID padrão');
                                }
                            }
                        }
                        
                        for (const item of dataArray) {
                            // Pular se item for inválido
                            if (!item || typeof item !== 'object') {
                                console.warn(`⚠️ Item inválido em ${collection}, pulando...`);
                                continue;
                            }
                        
                        // Garantir que cada item tem um ID antes de salvar no IndexedDB
                        if (!item.id) {
                            // Para settings, usar nome da coleção como ID padrão
                            if (collection === 'settings') {
                                item.id = 'settings-1';
                            } else {
                                // Para outros, gerar ID baseado no timestamp
                                item.id = `${collection}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            }
                            console.log(`🔧 ID gerado para ${collection}:`, item.id);
                        }
                        
                        // Verificar se ID não foi perdido (validação final)
                        if (!item.id || typeof item.id !== 'string') {
                            console.error(`❌ ID inválido para item em ${collection}, pulando...`, item);
                            continue;
                        }
                        
                        // Log final antes de salvar
                        if (collection === 'settings') {
                            console.log('💾 Salvando settings com ID:', item.id);
                        }
                        
                        // Para pedidos, fazer merge inteligente
                        if (collection === 'orders') {
                            const existingOrder = await db.get(collection, item.id);
                            if (existingOrder) {
                                // Se o pedido existe localmente, verificar qual é mais recente
                                const localUpdatedAt = existingOrder.updatedAt || existingOrder.createdAt || 0;
                                const firebaseUpdatedAt = item.updatedAt || item.createdAt || 0;
                                
                                console.log(`🔍 Comparando pedido ${item.id}:`, {
                                    localStatus: existingOrder.status,
                                    firebaseStatus: item.status,
                                    localUpdatedAt,
                                    firebaseUpdatedAt,
                                    firebaseNewer: firebaseUpdatedAt > localUpdatedAt
                                });
                                
                                // Só sobrescrever se o Firebase tiver versão mais recente
                                if (firebaseUpdatedAt > localUpdatedAt) {
                                    console.log(`🔄 Atualizando pedido ${item.id} do Firebase (mais recente)`);
                                    await db.update(collection, item);
                                } else {
                                    console.log(`⏭️ Mantendo pedido ${item.id} local (mais recente ou igual)`);
                                    // Não faz nada - mantém a versão local
                                }
                            } else {
                                // Pedido não existe localmente, adicionar
                                console.log(`➕ Adicionando novo pedido ${item.id} do Firebase`);
                                await db.update(collection, item);
                            }
                        } else {
                            // Para outras coleções, atualizar normalmente
                            await db.update(collection, item);
                        }
                    }
                    totalSynced += dataArray.length;
                    console.log(`✅ ${collection}: ${dataArray.length} registros`);
                }
            } catch (error) {
                console.error(`❌ Erro ao sincronizar ${collection}:`, error);
            }
        }

        clearTimeout(syncTimeout);
        this.syncInProgress = false;
        console.log(`🎉 Sincronização completa: ${totalSynced} registros`);
        
        return true;
    } catch (error) {
        clearTimeout(syncTimeout);
        this.syncInProgress = false;
        console.error('❌ Erro crítico na sincronização:', error);
        return false;
    }
}

    /**
     * Enviar TUDO do cache para Firebase
     * @returns {Promise<boolean>}
     */
    async syncToCloud() {
        if (!this.canUseFirebase()) {
            console.warn('⚠️ Não é possível sincronizar (offline ou não autenticado)');
            return false;
        }

        if (this.syncInProgress) {
            console.warn('⏳ Sincronização já em andamento');
            return false;
        }

        this.syncInProgress = true;
        console.log('📤 Sincronizando para Firebase...');

        const collections = [
            'products',
            'categories',
            'orders',
            'customers',
            'inventory',
            'financial',
            'settings',
            'tables'
        ];

        let totalSynced = 0;

        for (const collection of collections) {
            try {
                const items = await db.getAll(collection);
                for (const item of items) {
                    await window.firebaseManager.updateData(`${collection}/${item.id}`, item);
                }
                totalSynced += items.length;
                console.log(`✅ ${collection}: ${items.length} registros enviados`);
            } catch (error) {
                console.error(`❌ Erro ao enviar ${collection}:`, error);
            }
        }

        this.syncInProgress = false;
        console.log(`🎉 Sincronização completa: ${totalSynced} registros enviados`);
        
        return true;
    }

    /**
     * Processar operações pendentes (quando voltar online)
     * @returns {Promise<number>} Número de operações processadas
     */
    async processPendingOperations() {
        if (!this.canUseFirebase()) {
            console.warn('⚠️ Ainda offline, não é possível processar fila');
            return 0;
        }

        if (this.pendingOperations.length === 0) {
            return 0;
        }

        console.log(`⏳ Processando ${this.pendingOperations.length} operações pendentes...`);
        
        let processed = 0;
        const operations = [...this.pendingOperations];
        this.pendingOperations = [];

        for (const op of operations) {
            try {
                if (op.type === 'save') {
                    console.log(`⬆️ Enviando para Firebase: ${op.collection}/${op.data.id}`, {
                        status: op.data.status,
                        updatedAt: op.data.updatedAt
                    });
                    await window.firebaseManager.updateData(`${op.collection}/${op.data.id}`, op.data);
                    console.log(`✅ Enviado com sucesso: ${op.collection}/${op.data.id}`);
                } else if (op.type === 'delete') {
                    console.log(`🗑️ Deletando do Firebase: ${op.collection}/${op.id}`);
                    await window.firebaseManager.deleteData(`${op.collection}/${op.id}`);
                    console.log(`✅ Deletado com sucesso: ${op.collection}/${op.id}`);
                }
                processed++;
            } catch (error) {
                console.error(`❌ Erro ao processar operação ${op.collection}/${op.data?.id || op.id}:`, error);
                // Re-adicionar à fila
                this.pendingOperations.push(op);
            }
        }

        console.log(`✅ ${processed}/${operations.length} operações processadas com sucesso`);
        return processed;
    }

    /**
     * Verificar se pode usar Firebase
     * @returns {boolean}
     */
    canUseFirebase() {
        return window.firebaseManager && 
               window.firebaseManager.isAuthenticated && 
               window.firebaseManager.isAuthenticated() &&
               !this.offlineMode;
    }

    /**
     * Gerar ID único
     * @returns {string}
     */
    generateId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        const counter = (this._idCounter = (this._idCounter || 0) + 1).toString(36);
        return `${timestamp}-${random}-${counter}`;
    }

    /**
     * Obter estatísticas do serviço
     * @returns {object}
     */
    getStats() {
        return {
            offlineMode: this.offlineMode,
            cacheEnabled: this.cacheEnabled,
            syncInProgress: this.syncInProgress,
            pendingOperations: this.pendingOperations.length,
            isAuthenticated: this.canUseFirebase()
        };
    }

    /**
     * Limpar cache local
     * @returns {Promise<boolean>}
     */
    async clearCache() {
        try {
            console.log('🗑️ Limpando cache local...');
            
            // Fechar banco
            if (db.db) {
                db.db.close();
            }
            
            // Deletar banco
            await new Promise((resolve, reject) => {
                const request = indexedDB.deleteDatabase('PDVHamburgueriaDB');
                request.onsuccess = resolve;
                request.onerror = reject;
            });
            
            // Reinicializar
            await db.init();
            
            console.log('✅ Cache limpo');
            return true;
        } catch (error) {
            console.error('❌ Erro ao limpar cache:', error);
            return false;
        }
    }
}

// Criar instância global
const firebaseService = new FirebaseService();

// Expor globalmente
window.firebaseService = firebaseService;

// IMPORTANTE: NÃO auto-inicializar aqui!
// A inicialização é feita pelo module-manager.js para evitar duplicação
// Se precisar inicializar manualmente, use: window.firebaseService.init()

// Monitorar mudanças de status de autenticação
window.addEventListener('userAuthenticated', async () => {
    console.log('🔓 Usuário autenticado, sincronizando...');
    firebaseService.offlineMode = false;
    
    // IMPORTANTE: Processar operações pendentes PRIMEIRO (enviar mudanças locais)
    console.log('⬆️ Enviando alterações locais para Firebase...');
    await firebaseService.processPendingOperations();
    
    // DEPOIS sincronizar dados do Firebase (trazer dados novos)
    console.log('⬇️ Baixando dados do Firebase...');
    await firebaseService.syncFromCloud();
});

window.addEventListener('userSignedOut', () => {
    console.log('🔒 Usuário deslogado');
    firebaseService.offlineMode = true;
});

// Exportar
export default firebaseService;

console.log('✅ Firebase Service carregado');
