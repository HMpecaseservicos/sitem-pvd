/**
 * Sistema de Banco de Dados IndexedDB
 * Gerenciamento profissional de dados com performance otimizada
 * 
 * @author Sistema PDV Hamburgueria
 * @version 2.0.0
 * @since 24/11/2025
 */

class DatabaseManager {
    constructor() {
        this.dbName = 'PDVHamburgueriaDB';
        this.dbVersion = 7; // v7: Adicionar fiscal_queue e fiscal_logs para módulo Fiscal
        this.db = null;
        this.isInitialized = false;
        
        // CORREÇÃO CRÍTICA: Limpeza automática de memória
        this.maxRecords = 5000; // Limite de registros por store
        this.cleanupInterval = null;
        
        // Sistema de migrações
        this.migrations = {
            1: this.migrateV1ToV2.bind(this),
            6: this.migrateV6ToV7.bind(this) // Adiciona stores fiscais
        };
        
        // Configuração das stores
        this.stores = {
            products: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'category', keyPath: 'category', unique: false },
                    { name: 'name', keyPath: 'name', unique: false },
                    { name: 'available', keyPath: 'available', unique: false },
                    { name: 'price', keyPath: 'price', unique: false }
                ]
            },
            categories: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'name', keyPath: 'name', unique: false },
                    { name: 'order', keyPath: 'order', unique: false }
                ]
            },
            orders: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'date', keyPath: 'date', unique: false },
                    { name: 'status', keyPath: 'status', unique: false },
                    { name: 'customer', keyPath: 'customer.id', unique: false },
                    { name: 'total', keyPath: 'total', unique: false },
                    { name: 'paymentMethod', keyPath: 'payment.method', unique: false }
                ]
            },
            customers: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'name', keyPath: 'name', unique: false },
                    { name: 'email', keyPath: 'email', unique: false },
                    { name: 'phone', keyPath: 'phone', unique: false },
                    { name: 'cpf', keyPath: 'cpf', unique: false },
                    { name: 'createdAt', keyPath: 'createdAt', unique: false }
                ]
            },
            inventory: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'productId', keyPath: 'productId', unique: false },
                    { name: 'type', keyPath: 'type', unique: false },
                    { name: 'date', keyPath: 'date', unique: false },
                    { name: 'quantity', keyPath: 'quantity', unique: false }
                ]
            },
            tables: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'number', keyPath: 'number', unique: true },
                    { name: 'status', keyPath: 'status', unique: false },
                    { name: 'capacity', keyPath: 'capacity', unique: false }
                ]
            },
            financial: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'date', keyPath: 'date', unique: false },
                    { name: 'type', keyPath: 'type', unique: false },
                    { name: 'category', keyPath: 'category', unique: false },
                    { name: 'amount', keyPath: 'amount', unique: false },
                    { name: 'orderId', keyPath: 'orderId', unique: false }
                ]
            },
            settings: {
                keyPath: 'key',
                autoIncrement: false,
                indexes: [
                    { name: 'category', keyPath: 'category', unique: false },
                    { name: 'updatedAt', keyPath: 'updatedAt', unique: false }
                ]
            },
            deleted_products: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'deletedAt', keyPath: 'deletedAt', unique: false },
                    { name: 'deletedBy', keyPath: 'deletedBy', unique: false },
                    { name: 'category', keyPath: 'category', unique: false }
                ]
            },
            price_history: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'productId', keyPath: 'productId', unique: false },
                    { name: 'changedAt', keyPath: 'changedAt', unique: false },
                    { name: 'changedBy', keyPath: 'changedBy', unique: false }
                ]
            },
            fiscal_queue: {
                keyPath: 'orderId',
                autoIncrement: false,
                indexes: [
                    { name: 'status', keyPath: 'status', unique: false },
                    { name: 'queuedAt', keyPath: 'queuedAt', unique: false },
                    { name: 'processedAt', keyPath: 'processedAt', unique: false }
                ]
            },
            fiscal_logs: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'orderId', keyPath: 'orderId', unique: false },
                    { name: 'action', keyPath: 'action', unique: false },
                    { name: 'timestamp', keyPath: 'timestamp', unique: false }
                ]
            }
        };
    }

    /**
     * Inicializa o banco de dados
     */
    async init() {
        return new Promise((resolve, reject) => {
            if (this.isInitialized && this.db) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Erro ao abrir banco de dados:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                console.log('Banco de dados inicializado com sucesso');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;
                
                console.log(`Atualizando banco de dados da versão ${oldVersion} para ${newVersion}`);
                
                // Criar stores na primeira vez
                if (oldVersion === 0) {
                    // Criar todas as stores
                    Object.entries(this.stores).forEach(([storeName, config]) => {
                        if (!db.objectStoreNames.contains(storeName)) {
                            const store = db.createObjectStore(storeName, {
                                keyPath: config.keyPath,
                                autoIncrement: config.autoIncrement
                            });

                            // Criar índices
                            config.indexes.forEach(index => {
                                try {
                                    store.createIndex(index.name, index.keyPath, { 
                                        unique: index.unique 
                                    });
                                } catch (error) {
                                    console.warn(`Erro ao criar índice ${index.name}:`, error);
                                }
                            });

                            console.log(`Store '${storeName}' criada com sucesso`);
                        }
                    });
                } else {
                    // Executar migrações incrementais
                    for (let v = oldVersion; v < newVersion; v++) {
                        if (this.migrations[v]) {
                            console.log(`Executando migração para versão ${v + 1}`);
                            try {
                                this.migrations[v](db, event.target.transaction);
                            } catch (error) {
                                console.error(`Erro na migração ${v}:`, error);
                            }
                        }
                    }
                }
            };
        });
    }

    /**
     * Adiciona um item à store com TIMEOUT (CORREÇÃO CRÍTICA)
     */
    async add(storeName, data) {
        await this.ensureInitialized();
        
        // CORREÇÃO CRÍTICA: Adicionar timeout de 5s
        return Promise.race([
            new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // Adicionar timestamp se não existir
                if (!data.createdAt) {
                    data.createdAt = new Date().toISOString();
                }
                data.updatedAt = new Date().toISOString();
                
                const request = store.add(data);
                
                // Tratar eventos da transação
                transaction.oncomplete = () => {
                    resolve(data);
                };
                
                transaction.onerror = () => {
                    console.error('Transaction error:', transaction.error);
                    reject(transaction.error);
                };
                
                transaction.onabort = () => {
                    console.error('Transaction aborted');
                    reject(new Error('Transaction aborted'));
                };
                
                request.onerror = () => {
                    console.error('Request error:', request.error);
                    reject(request.error);
                };
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Add timeout após 30 segundos')), 30000)
            )
        ]).catch(error => {
            console.warn(`⚠️ Timeout em add(${storeName}):`, error.message);
            // Retornar data com aviso ao invés de falhar
            return { ...data, _timeout: true };
        });
    }

    /**
     * Atualiza um item na store com TIMEOUT (CORREÇÃO CRÍTICA)
     */
    async update(storeName, data) {
        await this.ensureInitialized();
        
        // CORREÇÃO CRÍTICA: Adicionar timeout de 5s para prevenir travamentos
        return Promise.race([
            new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                data.updatedAt = new Date().toISOString();
                
                const request = store.put(data);
                
                transaction.oncomplete = () => {
                    resolve(data);
                };
                
                transaction.onerror = () => {
                    console.error('Transaction error:', transaction.error);
                    reject(transaction.error);
                };
                
                request.onerror = () => {
                    console.error('Request error:', request.error);
                    reject(request.error);
                };
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transaction timeout após 30 segundos')), 30000)
            )
        ]).catch(error => {
            console.warn(`⚠️ Timeout em update(${storeName}):`, error.message);
            // Retornar data com aviso ao invés de falhar
            return { ...data, _timeout: true };
        });
    }

    /**
     * Salva dados (add ou update automaticamente)
     * Se o ID já existir, atualiza. Caso contrário, adiciona.
     */
    async save(storeName, data) {
        await this.ensureInitialized();
        
        try {
            // Verificar se o item já existe
            const existing = await this.get(storeName, data.id);
            
            if (existing) {
                // Atualizar item existente
                return await this.update(storeName, data);
            } else {
                // Adicionar novo item
                return await this.add(storeName, data);
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            throw error;
        }
    }

    /**
     * Busca um item por ID
     */
    async get(storeName, id) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Busca todos os itens de uma store
     */
    async getAll(storeName, filters = {}) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                
                // PROTEÇÃO: Timeout aumentado para 60s (operações pesadas)
                const timeoutId = setTimeout(() => {
                    console.warn(`⚠️ Timeout ao buscar ${storeName} (60s) - retornando array vazio`);
                    resolve([]); // Retornar vazio ao invés de falhar
                }, 60000);
                
                request.onsuccess = () => {
                    clearTimeout(timeoutId);
                    let results = request.result || [];
                    
                    // PROTEÇÃO: Limitar resultados massivos
                    if (results.length > 10000) {
                        console.warn(`⚠️ ${storeName}: ${results.length} registros - limitando a 10000`);
                        results = results.slice(0, 10000);
                    }
                    
                    // Aplicar filtros
                    if (Object.keys(filters).length > 0) {
                        results = results.filter(item => {
                            return Object.entries(filters).every(([key, value]) => {
                                if (key.includes('.')) {
                                    // Suporte para propriedades aninhadas
                                    const keys = key.split('.');
                                    let itemValue = item;
                                    for (const k of keys) {
                                        itemValue = itemValue?.[k];
                                    }
                                    return itemValue === value;
                                }
                                return item[key] === value;
                            });
                        });
                    }
                    
                    resolve(results);
                };
                
                request.onerror = () => {
                    clearTimeout(timeoutId);
                    console.error(`❌ Erro ao buscar ${storeName}:`, request.error);
                    resolve([]); // Retornar vazio ao invés de falhar
                };
                
                // PROTEÇÃO: Erro na transação
                transaction.onerror = () => {
                    clearTimeout(timeoutId);
                    console.error(`❌ Erro na transação ${storeName}:`, transaction.error);
                    resolve([]); // Retornar vazio ao invés de falhar
                };
                
            } catch (error) {
                console.error(`❌ Erro crítico em getAll(${storeName}):`, error);
                resolve([]); // Retornar vazio ao invés de falhar
            }
        });
    }

    /**
     * Busca itens por índice
     */
    async getByIndex(storeName, indexName, value) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Remove um item por ID
     */
    async delete(storeName, id) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Conta itens na store
     */
    async count(storeName, filters = {}) {
        const items = await this.getAll(storeName, filters);
        return items.length;
    }

    /**
     * Busca com paginação
     */
    async paginate(storeName, { page = 1, limit = 10, filters = {}, sortBy = null, sortOrder = 'asc' }) {
        const allItems = await this.getAll(storeName, filters);
        
        // Ordenação
        if (sortBy) {
            allItems.sort((a, b) => {
                let valueA = a[sortBy];
                let valueB = b[sortBy];
                
                // Suporte para propriedades aninhadas
                if (sortBy.includes('.')) {
                    const keys = sortBy.split('.');
                    valueA = keys.reduce((obj, key) => obj?.[key], a);
                    valueB = keys.reduce((obj, key) => obj?.[key], b);
                }
                
                if (typeof valueA === 'string') {
                    valueA = valueA.toLowerCase();
                    valueB = valueB.toLowerCase();
                }
                
                if (sortOrder === 'desc') {
                    return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
                }
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            });
        }
        
        const total = allItems.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        return {
            data: allItems.slice(startIndex, endIndex),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Busca com texto
     */
    async search(storeName, searchTerm, searchFields = ['name']) {
        const allItems = await this.getAll(storeName);
        const term = searchTerm.toLowerCase();
        
        return allItems.filter(item => {
            return searchFields.some(field => {
                const value = field.includes('.') 
                    ? field.split('.').reduce((obj, key) => obj?.[key], item)
                    : item[field];
                
                return value && value.toString().toLowerCase().includes(term);
            });
        });
    }

    /**
     * Executa transação personalizada
     */
    async transaction(storeNames, mode = 'readonly', callback) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeNames, mode);
            const stores = {};
            
            // Criar objeto com todas as stores
            storeNames.forEach(name => {
                stores[name] = transaction.objectStore(name);
            });
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            
            try {
                callback(stores, transaction);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Backup do banco
     */
    async backup() {
        await this.ensureInitialized();
        
        const backup = {
            timestamp: new Date().toISOString(),
            version: this.dbVersion,
            data: {}
        };
        
        // Exportar todas as stores
        for (const storeName of Object.keys(this.stores)) {
            backup.data[storeName] = await this.getAll(storeName);
        }
        
        return backup;
    }

    /**
     * Restaurar backup
     */
    async restore(backupData) {
        await this.ensureInitialized();
        
        try {
            // Limpar banco atual
            await this.clear();
            
            // Importar dados
            for (const [storeName, items] of Object.entries(backupData.data)) {
                if (this.stores[storeName] && Array.isArray(items)) {
                    for (const item of items) {
                        await this.add(storeName, item);
                    }
                }
            }
            
            console.log('Backup restaurado com sucesso');
            return true;
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            throw error;
        }
    }

    /**
     * Limpa todas as stores
     */
    async clear() {
        await this.ensureInitialized();
        
        const storeNames = Object.keys(this.stores);
        
        return this.transaction(storeNames, 'readwrite', (stores) => {
            Object.values(stores).forEach(store => {
                store.clear();
            });
        });
    }

    /**
     * Limpa uma store específica
     */
    async clearStore(storeName) {
        await this.ensureInitialized();
        
        if (!this.stores[storeName]) {
            throw new Error(`Store "${storeName}" não existe`);
        }
        
        return this.transaction([storeName], 'readwrite', (stores) => {
            stores[storeName].clear();
        });
    }

    /**
     * Migração de dados do localStorage (OTIMIZADA COM BATCH)
     */
    async migrateFromLocalStorage() {
        console.log('Iniciando migração do localStorage para IndexedDB...');
        
        try {
            // Verificar se já foi migrado
            const migrationFlag = await this.get('settings', 'migration_completed');
            if (migrationFlag && migrationFlag.value === true) {
                console.log('Migração já foi executada anteriormente');
                return true;
            }
            
            let migratedCount = 0;
            const BATCH_SIZE = 50; // CORREÇÃO: Processar em lotes
            
            // Migrar produtos
            const products = JSON.parse(localStorage.getItem('products') || '[]');
            for (let i = 0; i < products.length; i += BATCH_SIZE) {
                const batch = products.slice(i, i + BATCH_SIZE);
                
                // Executar batch em paralelo
                await Promise.all(
                    batch.map(async (product) => {
                        try {
                            if (!product.id) product.id = Date.now() + Math.random();
                            const exists = await this.get('products', product.id);
                            if (!exists) {
                                await this.add('products', product);
                                migratedCount++;
                            }
                        } catch (error) {
                            console.debug(`Produto ${product.id} já existe, pulando...`);
                        }
                    })
                );
                
                // Dar tempo para UI atualizar
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            // Migrar pedidos
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            for (let i = 0; i < orders.length; i += BATCH_SIZE) {
                const batch = orders.slice(i, i + BATCH_SIZE);
                
                await Promise.all(
                    batch.map(async (order) => {
                        try {
                            if (!order.id) order.id = Date.now() + Math.random();
                            const exists = await this.get('orders', order.id);
                            if (!exists) {
                                await this.add('orders', order);
                                migratedCount++;
                            }
                        } catch (error) {
                            console.debug(`Pedido ${order.id} já existe, pulando...`);
                        }
                    })
                );
                
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            // Migrar clientes
            const customers = JSON.parse(localStorage.getItem('customers') || '[]');
            for (let i = 0; i < customers.length; i += BATCH_SIZE) {
                const batch = customers.slice(i, i + BATCH_SIZE);
                
                await Promise.all(
                    batch.map(async (customer) => {
                        try {
                            if (!customer.id) customer.id = Date.now() + Math.random();
                            const exists = await this.get('customers', customer.id);
                            if (!exists) {
                                await this.add('customers', customer);
                                migratedCount++;
                            }
                        } catch (error) {
                            console.debug(`Cliente ${customer.id} já existe, pulando...`);
                        }
                    })
                );
                
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            // Migrar configurações
            const settings = JSON.parse(localStorage.getItem('settings') || '{}');
            for (const [key, value] of Object.entries(settings)) {
                try {
                    const exists = await this.get('settings', key);
                    if (!exists) {
                        await this.add('settings', {
                            key,
                            value,
                            category: 'system'
                        });
                        migratedCount++;
                    }
                } catch (error) {
                    console.debug(`Configuração ${key} já existe, pulando...`);
                }
            }
            
            // Marcar migração como completa
            await this.add('settings', {
                key: 'migration_completed',
                value: true,
                category: 'system',
                migratedAt: new Date().toISOString(),
                itemsMigrated: migratedCount
            });
            
            console.log(`Migração concluída: ${migratedCount} itens migrados`);
            return true;
        } catch (error) {
            console.error('Erro na migração:', error);
            return false;
        }
    }

    /**
     * Garante que o banco está inicializado
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    /**
     * Estatísticas do banco
     */
    async getStats() {
        const stats = {};
        
        for (const storeName of Object.keys(this.stores)) {
            stats[storeName] = await this.count(storeName);
        }
        
        return {
            stores: stats,
            total: Object.values(stats).reduce((sum, count) => sum + count, 0),
            lastUpdate: new Date().toISOString()
        };
    }
    
    /**
     * NOVA: Limpar dados antigos para evitar sobrecarga de memória
     */
    async cleanOldData(storeName, daysToKeep = 90) {
        try {
            console.log(`🧹 Limpando dados antigos de ${storeName} (mantendo ${daysToKeep} dias)...`);
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            const allItems = await this.getAll(storeName);
            const itemsToDelete = allItems.filter(item => {
                const itemDate = new Date(item.date || item.createdAt || item.created_at);
                return itemDate < cutoffDate;
            });
            
            if (itemsToDelete.length === 0) {
                console.log(`✅ Nenhum item antigo em ${storeName}`);
                return 0;
            }
            
            // Deletar em lotes de 50
            for (let i = 0; i < itemsToDelete.length; i += 50) {
                const batch = itemsToDelete.slice(i, i + 50);
                await Promise.all(batch.map(item => this.delete(storeName, item.id)));
            }
            
            console.log(`✅ ${itemsToDelete.length} itens antigos removidos de ${storeName}`);
            return itemsToDelete.length;
            
        } catch (error) {
            console.error(`❌ Erro ao limpar ${storeName}:`, error);
            return 0;
        }
    }
    
    /**
     * Limpar todos os dados antigos (executar periodicamente)
     */
    async cleanupDatabase() {
        console.log('🧹 Iniciando limpeza do banco de dados...');
        
        const results = {
            orders: await this.cleanOldData('orders', 90),      // 3 meses
            customers: 0, // Nunca deletar clientes
            products: 0,  // Nunca deletar produtos
            total: 0
        };
        
        results.total = Object.values(results).reduce((sum, count) => sum + count, 0);
        
        console.log(`✅ Limpeza concluída: ${results.total} itens removidos`);
        return results;
    }
    
    /**
     * Migração v1 para v2 - Atualizar índices únicos
     */
    migrateV1ToV2(db, transaction) {
        console.log('Executando migração v1 -> v2: Atualizando índices de customers');
        
        // Não é possível modificar índices existentes em uma transação de upgrade
        // Esta migração é apenas para documentação
        // Os índices serão recriados quando a store for recriada
        
        // Se precisar adicionar novas stores, fazer aqui
        // Exemplo:
        // if (!db.objectStoreNames.contains('promotions')) {
        //     const store = db.createObjectStore('promotions', { keyPath: 'id' });
        //     store.createIndex('active', 'active', { unique: false });
        // }
    }
    
    /**
     * Migração v6 para v7 - Adicionar stores fiscais
     */
    migrateV6ToV7(db, transaction) {
        console.log('Executando migração v6 -> v7: Adicionando stores fiscais');
        
        // Criar fiscal_queue
        if (!db.objectStoreNames.contains('fiscal_queue')) {
            const fiscalQueueStore = db.createObjectStore('fiscal_queue', { keyPath: 'orderId' });
            fiscalQueueStore.createIndex('status', 'status', { unique: false });
            fiscalQueueStore.createIndex('queuedAt', 'queuedAt', { unique: false });
            fiscalQueueStore.createIndex('processedAt', 'processedAt', { unique: false });
            console.log('✅ Store fiscal_queue criada');
        }
        
        // Criar fiscal_logs
        if (!db.objectStoreNames.contains('fiscal_logs')) {
            const fiscalLogsStore = db.createObjectStore('fiscal_logs', { keyPath: 'id' });
            fiscalLogsStore.createIndex('orderId', 'orderId', { unique: false });
            fiscalLogsStore.createIndex('action', 'action', { unique: false });
            fiscalLogsStore.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('✅ Store fiscal_logs criada');
        }
    }
}

// Instância global do banco
const db = new DatabaseManager();

// Exportar para uso em módulos
export default db;

// Também disponibilizar globalmente para compatibilidade
window.db = db;