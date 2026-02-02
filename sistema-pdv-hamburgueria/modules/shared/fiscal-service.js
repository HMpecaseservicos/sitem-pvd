/**
 * ================================================================
 * SERVIÇO FISCAL - SISTEMA PDV HAMBURGUERIA
 * Gerenciamento de emissão de NFC-e e dados fiscais
 * 
 * Versão: 4.0.0
 * Data: 2026-01-29
 * Atualização: Arquitetura Serverless + Hardening Produção
 * 
 * ⚠️ AMBIENTE: HOMOLOGAÇÃO
 * ⚠️ NÃO ATIVAR PRODUÇÃO SEM AUTORIZAÇÃO
 * ================================================================
 */

import {
    showToast,
    getFromDatabase,
    saveToDatabase,
    updateInDatabase
} from './utils.js';

import gatewayAdapter, { mapOrderToNFCePayload, GATEWAY_PROVIDERS } from './gateway-adapter.js';

/**
 * Status possíveis de uma nota fiscal
 * IMPORTANTE: Nenhuma transição automática é permitida
 */
export const FISCAL_STATUS = {
    PENDING: 'pending',         // Aguardando ação do usuário
    QUEUED: 'queued',           // Na fila para emissão
    PROCESSING: 'processing',   // Em processamento (placeholder)
    AUTHORIZED: 'authorized',   // Autorizada pela SEFAZ
    DENIED: 'denied',           // Rejeitada pela SEFAZ
    CANCELLED: 'cancelled',     // Cancelada pelo usuário
    ERROR: 'error'              // Erro de comunicação/validação
};

/**
 * Labels legíveis para status fiscal
 */
export const FISCAL_STATUS_LABELS = {
    [FISCAL_STATUS.PENDING]: { label: 'Pendente', icon: '⏳', color: '#f39c12' },
    [FISCAL_STATUS.QUEUED]: { label: 'Na Fila', icon: '📋', color: '#3498db' },
    [FISCAL_STATUS.PROCESSING]: { label: 'Processando', icon: '🔄', color: '#9b59b6' },
    [FISCAL_STATUS.AUTHORIZED]: { label: 'Autorizada', icon: '✅', color: '#27ae60' },
    [FISCAL_STATUS.DENIED]: { label: 'Rejeitada', icon: '❌', color: '#e74c3c' },
    [FISCAL_STATUS.CANCELLED]: { label: 'Cancelada', icon: '🚫', color: '#7f8c8d' },
    [FISCAL_STATUS.ERROR]: { label: 'Erro', icon: '⚠️', color: '#c0392b' }
};

/**
 * Formas de pagamento válidas para NFC-e
 */
export const VALID_PAYMENT_METHODS = [
    'dinheiro', 'Dinheiro', 'DINHEIRO',
    'cartao', 'Cartao', 'CARTAO', 'cartão', 'Cartão', 'CARTÃO',
    'cartao_credito', 'cartao_debito', 'credito', 'debito',
    'Cartão de Crédito', 'Cartão de Débito', 'cartao de credito', 'cartao de debito',
    'Crédito', 'Débito', 'CREDITO', 'DEBITO',
    'pix', 'Pix', 'PIX',
    'voucher', 'vale', 'vale_alimentacao', 'vale_refeicao',
    'Vale Alimentação', 'Vale Refeição'
];

/**
 * Limite máximo de tentativas antes de erro permanente
 */
export const MAX_FISCAL_ATTEMPTS = 3;

/**
 * Modelos de documento fiscal
 */
export const FISCAL_MODEL = {
    NFCE: 'NFC-e',              // Nota Fiscal de Consumidor Eletrônica
    NFE: 'NF-e',                // Nota Fiscal Eletrônica (para PJ)
    SAT: 'SAT'                  // Sistema Autenticador e Transmissor (SP)
};

/**
 * Ambientes fiscais
 */
export const FISCAL_ENVIRONMENT = {
    HOMOLOGATION: 'homologacao', // Ambiente de testes
    PRODUCTION: 'producao'       // Ambiente de produção
};

/**
 * Regimes tributários
 */
export const TAX_REGIME = {
    SIMPLES_NACIONAL: 'simples_nacional',
    SIMPLES_NACIONAL_EXCESSO: 'simples_nacional_excesso',
    LUCRO_PRESUMIDO: 'lucro_presumido',
    LUCRO_REAL: 'lucro_real',
    MEI: 'mei'
};

/**
 * Estrutura padrão de configurações fiscais
 */
export const DEFAULT_FISCAL_CONFIG = {
    // Dados da empresa
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    regimeTributario: TAX_REGIME.SIMPLES_NACIONAL,
    
    // Endereço fiscal
    endereco: {
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        municipio: '',
        codigoMunicipio: '', // Código IBGE
        uf: '',
        cep: ''
    },
    
    // Configurações NFC-e
    nfce: {
        serie: 1,
        proximoNumero: 1,
        ambiente: FISCAL_ENVIRONMENT.HOMOLOGATION,
        csc: '',            // Código de Segurança do Contribuinte
        cscId: ''           // ID do CSC
    },
    
    // Gateway fiscal (credenciais no servidor - Netlify)
    gateway: {
        provider: '',       // focus_nfe, nfe_io, tecnospeed, etc.
        // apiKey e apiSecret ficam no servidor (Netlify Environment Variables)
        enabled: false
    },
    
    // Certificado digital (placeholder)
    certificado: {
        tipo: '',           // A1 ou A3
        validade: null,
        arquivo: null,
        senha: ''           // Armazenar de forma segura!
    },
    
    // Flags de controle
    emissaoAutomatica: false,   // Emitir NFC-e automaticamente ao finalizar pedido
    emitirOffline: true,        // Permitir emissão quando voltar online
    
    // Metadados
    createdAt: null,
    updatedAt: null
};

/**
 * Estrutura fiscal padrão para um pedido
 */
export const DEFAULT_ORDER_FISCAL = {
    enabled: false,             // Se a emissão fiscal está habilitada para este pedido
    status: FISCAL_STATUS.PENDING,
    model: FISCAL_MODEL.NFCE,
    
    // Dados da nota (preenchidos após autorização)
    numero: null,
    serie: null,
    chave: null,                // Chave de acesso (44 dígitos)
    protocolo: null,            // Protocolo de autorização
    
    // URLs dos arquivos
    xmlUrl: null,
    pdfUrl: null,
    danfeUrl: null,
    
    // Ambiente e datas
    ambiente: FISCAL_ENVIRONMENT.HOMOLOGATION,
    createdAt: null,            // Data de criação do registro fiscal
    authorizedAt: null,         // Data de autorização pela SEFAZ
    cancelledAt: null,          // Data de cancelamento (se aplicável)
    
    // Informações de erro (se houver)
    error: null,
    errorCode: null,
    errorMessage: null,
    
    // Histórico de tentativas
    attempts: []
};

/**
 * ================================================================
 * FUNÇÕES HELPER DE COMPATIBILIDADE
 * ================================================================
 * Garantem que pedidos antigos (sem estrutura fiscal) não quebrem a UI
 */

/**
 * Obtém estrutura fiscal do pedido com fallback para valores padrão
 * @param {Object} order - Pedido do sistema
 * @returns {Object} Estrutura fiscal segura
 */
export function getOrderFiscalSafe(order) {
    if (!order) {
        return { ...DEFAULT_ORDER_FISCAL };
    }
    
    return {
        ...DEFAULT_ORDER_FISCAL,
        ...(order.fiscal || {})
    };
}

/**
 * Verifica se pedido tem estrutura fiscal válida
 * @param {Object} order - Pedido do sistema
 * @returns {boolean}
 */
export function hasValidFiscalStructure(order) {
    return order && order.fiscal && typeof order.fiscal === 'object';
}

/**
 * Obtém status fiscal do pedido de forma segura
 * @param {Object} order - Pedido do sistema
 * @returns {string} Status fiscal
 */
export function getOrderFiscalStatus(order) {
    const fiscal = getOrderFiscalSafe(order);
    return fiscal.status || FISCAL_STATUS.PENDING;
}

/**
 * Obtém label do status fiscal
 * @param {string} status - Status fiscal
 * @returns {Object} { label, icon, color }
 */
export function getFiscalStatusLabel(status) {
    return FISCAL_STATUS_LABELS[status] || FISCAL_STATUS_LABELS[FISCAL_STATUS.PENDING];
}

/**
 * Classe principal do Serviço Fiscal
 */
class FiscalService {
    constructor() {
        this.isInitialized = false;
        this.config = null;
        this.fiscalQueue = [];      // Fila de notas para emitir
        this.isProcessingQueue = false;
        this.isOnline = navigator.onLine;
        
        // Listener de conexão
        this.setupConnectivityListener();
    }
    
    /**
     * Inicializa o serviço fiscal
     */
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ FiscalService já inicializado');
            return;
        }
        
        try {
            console.log('📋 Inicializando FiscalService v3.0.0...');
            
            // Carregar configurações fiscais
            await this.loadConfig();
            
            // Inicializar gateway com configurações carregadas
            this.initializeGateway();
            
            // Carregar fila pendente (se houver)
            await this.loadPendingQueue();
            
            // Expor globalmente
            window.fiscalService = this;
            window.FiscalService = this; // Compatibilidade
            
            this.isInitialized = true;
            console.log('✅ FiscalService inicializado com sucesso');
            
            // Log do status do gateway
            const gatewayStatus = this.isGatewayReady();
            console.log(`📡 Gateway: ${gatewayStatus.ready ? 'PRONTO' : gatewayStatus.reason}`);
            
        } catch (error) {
            console.error('❌ Erro ao inicializar FiscalService:', error);
            throw error;
        }
    }
    
    /**
     * Configura listener de conectividade
     */
    setupConnectivityListener() {
        window.addEventListener('online', () => {
            console.log('🌐 Conexão restaurada');
            this.isOnline = true;
            this.processQueueOnReconnect();
        });
        
        window.addEventListener('offline', () => {
            console.log('📴 Conexão perdida');
            this.isOnline = false;
        });
    }
    
    /**
     * Carrega configurações fiscais do banco de dados
     */
    async loadConfig() {
        try {
            const settings = await getFromDatabase('settings');
            
            // Suporta tanto array quanto objeto
            let fiscalConfig = null;
            
            if (Array.isArray(settings) && settings.length > 0) {
                // Formato array - busca o primeiro com fiscal
                const settingsWithFiscal = settings.find(s => s.fiscal);
                if (settingsWithFiscal) {
                    fiscalConfig = settingsWithFiscal.fiscal;
                }
            } else if (settings && typeof settings === 'object') {
                // Formato objeto - busca 'default-settings' ou primeiro com fiscal
                if (settings['default-settings']?.fiscal) {
                    fiscalConfig = settings['default-settings'].fiscal;
                } else {
                    // Busca em outras chaves
                    for (const key of Object.keys(settings)) {
                        if (settings[key]?.fiscal) {
                            fiscalConfig = settings[key].fiscal;
                            break;
                        }
                    }
                }
            }
            
            if (fiscalConfig) {
                this.config = { ...DEFAULT_FISCAL_CONFIG, ...fiscalConfig };
                console.log('✅ Configurações fiscais carregadas:', {
                    cnpj: this.config.cnpj ? '***' + this.config.cnpj.slice(-4) : 'N/A',
                    razaoSocial: this.config.razaoSocial || 'N/A',
                    ie: this.config.inscricaoEstadual ? '***' + this.config.inscricaoEstadual.slice(-4) : 'N/A'
                });
            } else {
                this.config = { ...DEFAULT_FISCAL_CONFIG };
                console.log('ℹ️ Usando configurações fiscais padrão');
            }
            
        } catch (error) {
            console.error('Erro ao carregar configurações fiscais:', error);
            this.config = { ...DEFAULT_FISCAL_CONFIG };
        }
    }
    
    /**
     * Salva configurações fiscais no banco de dados
     */
    async saveConfig(newConfig) {
        try {
            const settings = await getFromDatabase('settings');
            let currentSettings = settings && settings.length > 0 ? settings[0] : { id: 'default-settings' };
            
            currentSettings.fiscal = {
                ...this.config,
                ...newConfig,
                updatedAt: new Date().toISOString()
            };
            
            if (!currentSettings.fiscal.createdAt) {
                currentSettings.fiscal.createdAt = new Date().toISOString();
            }
            
            await updateInDatabase('settings', currentSettings);
            this.config = currentSettings.fiscal;
            
            // Sincronizar com Firebase se disponível
            if (window.firebaseService) {
                try {
                    await window.firebaseService.save('settings', currentSettings);
                    console.log('✅ Configurações fiscais sincronizadas com Firebase');
                } catch (fbError) {
                    console.warn('⚠️ Erro ao sincronizar configurações fiscais:', fbError);
                }
            }
            
            console.log('✅ Configurações fiscais salvas');
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao salvar configurações fiscais:', error);
            throw error;
        }
    }
    
    /**
     * Carrega fila de notas pendentes do armazenamento local
     */
    async loadPendingQueue() {
        try {
            const queue = await getFromDatabase('fiscal_queue');
            this.fiscalQueue = queue || [];
            
            if (this.fiscalQueue.length > 0) {
                console.log(`📋 ${this.fiscalQueue.length} nota(s) na fila fiscal`);
            }
            
        } catch (error) {
            console.error('Erro ao carregar fila fiscal:', error);
            this.fiscalQueue = [];
        }
    }
    
    /**
     * Salva fila fiscal no armazenamento local
     */
    async savePendingQueue() {
        try {
            // Atualizar no IndexedDB
            const existingQueue = await getFromDatabase('fiscal_queue');
            
            if (existingQueue && existingQueue.length > 0) {
                // Atualizar existente
                await updateInDatabase('fiscal_queue', {
                    id: 'fiscal-queue',
                    items: this.fiscalQueue,
                    updatedAt: new Date().toISOString()
                });
            } else {
                // Criar novo
                await saveToDatabase('fiscal_queue', {
                    id: 'fiscal-queue',
                    items: this.fiscalQueue,
                    createdAt: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('Erro ao salvar fila fiscal:', error);
        }
    }
    
    /**
     * Cria estrutura fiscal para um pedido
     * @param {Object} order - Pedido do sistema
     * @returns {Object} Estrutura fiscal inicializada
     */
    createOrderFiscal(order) {
        return {
            ...DEFAULT_ORDER_FISCAL,
            enabled: this.config?.gateway?.enabled || false,
            ambiente: this.config?.nfce?.ambiente || FISCAL_ENVIRONMENT.HOMOLOGATION,
            createdAt: new Date().toISOString()
        };
    }
    
    /**
     * ================================================================
     * VALIDADOR FISCAL DO PEDIDO
     * ================================================================
     * Método principal de validação - NÃO emite, NÃO muda status
     * Apenas retorna se pode ou não emitir e os motivos
     * 
     * @param {Object} order - Pedido para validar
     * @returns {Object} { canEmit: boolean, reasons: string[] }
     */
    canEmitFiscal(order) {
        const reasons = [];
        
        // 1. Verificar se o pedido existe
        if (!order) {
            reasons.push('Pedido não encontrado');
            return { canEmit: false, reasons };
        }
        
        // 2. Verificar se o pedido está FINALIZADO (delivered)
        if (order.status !== 'delivered') {
            reasons.push(`Pedido deve estar finalizado (status atual: ${order.status || 'indefinido'})`);
        }
        
        // 3. Verificar se tem valor total > 0
        const total = parseFloat(order.total) || 0;
        if (total <= 0) {
            reasons.push('Pedido deve ter valor total maior que zero');
        }
        
        // 4. Verificar forma de pagamento válida
        const paymentMethod = order.paymentMethod || order.payment?.method || '';
        if (!paymentMethod) {
            reasons.push('Forma de pagamento não informada');
        } else if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
            reasons.push(`Forma de pagamento "${paymentMethod}" não reconhecida para NFC-e`);
        }
        
        // 5. Verificar se tem itens
        if (!order.items || order.items.length === 0) {
            reasons.push('Pedido não possui itens');
        }
        
        // 6. Verificar estrutura fiscal do pedido
        const fiscal = order.fiscal || {};
        // NOTA: Se o gateway estiver habilitado globalmente e o pedido finalizado,
        // assumimos que pode emitir mesmo se fiscal.enabled não estiver definido
        const gatewayEnabled = this.config?.gateway?.enabled === true;
        if (!gatewayEnabled && fiscal.enabled !== true) {
            reasons.push('Emissão fiscal não está habilitada para este pedido');
        }
        
        // 7. Verificar se já foi autorizado
        if (fiscal.status === FISCAL_STATUS.AUTHORIZED) {
            reasons.push('Nota fiscal já foi autorizada para este pedido');
        }
        
        // 8. Verificar se foi cancelada
        if (fiscal.status === FISCAL_STATUS.CANCELLED) {
            reasons.push('Nota fiscal foi cancelada para este pedido');
        }
        
        // 9. Verificar configurações da empresa
        if (!this.config?.cnpj) {
            reasons.push('CNPJ da empresa não configurado');
        }
        
        if (!this.config?.inscricaoEstadual) {
            reasons.push('Inscrição Estadual não configurada');
        }
        
        if (!this.config?.razaoSocial) {
            reasons.push('Razão Social não configurada');
        }
        
        // 10. Verificar endereço fiscal
        const endereco = this.config?.endereco || {};
        if (!endereco.logradouro || !endereco.numero || !endereco.municipio || !endereco.uf || !endereco.cep) {
            reasons.push('Endereço fiscal incompleto');
        }
        
        // 11. Verificar se sistema está ONLINE
        if (!this.isOnline) {
            reasons.push('Sistema está offline - aguarde conexão');
        }
        
        // Resultado final
        return {
            canEmit: reasons.length === 0,
            reasons
        };
    }
    
    /**
     * Verifica se um pedido pode ter nota fiscal emitida (método legado)
     * @deprecated Use canEmitFiscal() ao invés
     * @param {Object} order - Pedido para validar
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validateOrderForFiscal(order) {
        const result = this.canEmitFiscal(order);
        return {
            valid: result.canEmit,
            errors: result.reasons
        };
    }
    
    /**
     * ================================================================
     * FILA FISCAL - GERENCIAMENTO MANUAL
     * ================================================================
     * Todas as transições são MANUAIS - nenhuma automação
     */
    
    /**
     * Obtém a fila fiscal atual
     * @returns {Array} Lista de itens na fila
     */
    getQueue() {
        return this.fiscalQueue.map(item => ({
            ...item,
            statusLabel: FISCAL_STATUS_LABELS[item.status] || FISCAL_STATUS_LABELS[FISCAL_STATUS.PENDING]
        }));
    }
    
    /**
     * Obtém um item específico da fila
     * @param {string} orderId - ID do pedido
     * @returns {Object|null} Item da fila ou null
     */
    getQueueItem(orderId) {
        return this.fiscalQueue.find(item => item.orderId === orderId) || null;
    }
    
    /**
     * Envia pedido para a fila fiscal (ação manual do usuário)
     * @param {Object} order - Pedido a ser enviado
     * @returns {Object} Resultado da operação
     */
    async sendToQueue(order) {
        try {
            // Validar pedido antes de enviar
            const validation = this.canEmitFiscal(order);
            
            if (!validation.canEmit) {
                return {
                    success: false,
                    queued: false,
                    reasons: validation.reasons
                };
            }
            
            // Verificar se já está na fila
            const existingItem = this.getQueueItem(order.id);
            if (existingItem) {
                return {
                    success: false,
                    queued: true,
                    reasons: ['Pedido já está na fila fiscal']
                };
            }
            
            // Criar snapshot imutável do pedido para a nota fiscal
            // Isso garante que edições posteriores não afetem a nota
            const snapshot = {
                total: order.total,
                subtotal: order.subtotal || order.total,
                desconto: order.discount || 0,
                itens: JSON.parse(JSON.stringify(order.items || [])),
                pagamento: order.paymentMethod || order.payment?.method || '',
                cliente: {
                    nome: order.customerName || order.customer?.name || 'Consumidor',
                    telefone: order.customerPhone || order.customer?.phone || '',
                    cpf: order.customerCpf || order.customer?.cpf || ''
                },
                endereco: order.address ? JSON.parse(JSON.stringify(order.address)) : null,
                // Dados tributários (para auditoria)
                impostos: {
                    regime: this.config?.regimeTributario || 'simples_nacional',
                    aliquotaMedia: this.config?.aliquotaMedia || 0,
                    valorImpostos: (order.total || 0) * ((this.config?.aliquotaMedia || 0) / 100)
                },
                // Timestamp de criação do snapshot (imutável)
                timestamp: new Date().toISOString()
            };
            
            // Criar item da fila
            const queueItem = {
                orderId: order.id,
                orderNumber: order.number || order.id.slice(-6),
                total: order.total,
                customerName: order.customerName || order.customer?.name || 'Cliente',
                date: order.createdAt || order.date || new Date().toISOString(),
                status: FISCAL_STATUS.QUEUED,
                queuedAt: new Date().toISOString(),
                attempts: 0,
                maxAttempts: MAX_FISCAL_ATTEMPTS,
                lastAttempt: null,
                lastError: null,
                processedAt: null,
                snapshot: snapshot  // Dados imutáveis para emissão
            };
            
            // Adicionar à fila
            this.fiscalQueue.push(queueItem);
            await this.savePendingQueue();
            
            // 📝 LOG: Pedido adicionado à fila
            await this.saveFiscalLog({
                action: 'queue_add',
                orderId: order.id,
                orderNumber: queueItem.orderNumber,
                status: FISCAL_STATUS.QUEUED,
                total: order.total,
                itensCount: snapshot.itens?.length || 0,
                success: true
            });
            
            console.log('📋 [FISCAL] Pedido enviado para fila:', order.id);
            showToast('✅ Pedido enviado para fila fiscal', 'success');
            
            return {
                success: true,
                queued: true,
                item: queueItem
            };
            
        } catch (error) {
            console.error('❌ [FISCAL] Erro ao enviar para fila:', error);
            return {
                success: false,
                queued: false,
                reasons: [error.message]
            };
        }
    }
    
    /**
     * Reprocessa um item da fila (ação manual)
     * @param {string} orderId - ID do pedido
     * @returns {Object} Resultado
     */
    async reprocessQueueItem(orderId) {
        try {
            const item = this.getQueueItem(orderId);
            
            if (!item) {
                return {
                    success: false,
                    reasons: ['Item não encontrado na fila']
                };
            }
            
            // Verificar status atual
            if (item.status === FISCAL_STATUS.AUTHORIZED) {
                return {
                    success: false,
                    reasons: ['Nota já foi autorizada - não é possível reprocessar']
                };
            }
            
            if (item.status === FISCAL_STATUS.CANCELLED) {
                return {
                    success: false,
                    reasons: ['Item foi cancelado - não é possível reprocessar']
                };
            }
            
            // Verificar limite de tentativas
            const maxAttempts = item.maxAttempts || MAX_FISCAL_ATTEMPTS;
            if (item.attempts >= maxAttempts) {
                return {
                    success: false,
                    reasons: [`Limite de ${maxAttempts} tentativas atingido. Cancele e crie novo pedido.`]
                };
            }
            
            // Atualizar item para reprocessamento
            item.status = FISCAL_STATUS.QUEUED;
            item.attempts++;
            item.lastAttempt = new Date().toISOString();
            item.lastError = null;
            
            await this.savePendingQueue();
            
            console.log('🔄 [FISCAL] Item marcado para reprocessamento:', orderId);
            showToast('🔄 Item marcado para reprocessamento', 'info');
            
            return {
                success: true,
                item
            };
            
        } catch (error) {
            console.error('❌ [FISCAL] Erro ao reprocessar item:', error);
            return {
                success: false,
                reasons: [error.message]
            };
        }
    }
    
    /**
     * Cancela um item da fila (ação manual)
     * @param {string} orderId - ID do pedido
     * @param {string} reason - Motivo do cancelamento
     * @returns {Object} Resultado
     */
    async cancelQueueItem(orderId, reason = 'Cancelado pelo usuário') {
        try {
            const item = this.getQueueItem(orderId);
            
            if (!item) {
                return {
                    success: false,
                    reasons: ['Item não encontrado na fila']
                };
            }
            
            // Verificar status atual
            if (item.status === FISCAL_STATUS.AUTHORIZED) {
                return {
                    success: false,
                    reasons: ['Nota já foi autorizada - use cancelamento de NFC-e']
                };
            }
            
            // Atualizar status para cancelado
            item.status = FISCAL_STATUS.CANCELLED;
            item.cancelledAt = new Date().toISOString();
            item.cancelReason = reason;
            
            await this.savePendingQueue();
            
            console.log('🚫 [FISCAL] Item cancelado:', orderId);
            showToast('🚫 Item cancelado da fila fiscal', 'warning');
            
            return {
                success: true,
                item
            };
            
        } catch (error) {
            console.error('❌ [FISCAL] Erro ao cancelar item:', error);
            return {
                success: false,
                reasons: [error.message]
            };
        }
    }
    
    /**
     * Remove um item cancelado da fila
     * @param {string} orderId - ID do pedido
     * @returns {Object} Resultado
     */
    async removeFromQueue(orderId) {
        try {
            const item = this.getQueueItem(orderId);
            
            if (!item) {
                return {
                    success: false,
                    reasons: ['Item não encontrado na fila']
                };
            }
            
            // Só permite remover itens cancelados ou com erro
            if (![FISCAL_STATUS.CANCELLED, FISCAL_STATUS.ERROR].includes(item.status)) {
                return {
                    success: false,
                    reasons: ['Só é possível remover itens cancelados ou com erro']
                };
            }
            
            const index = this.fiscalQueue.findIndex(i => i.orderId === orderId);
            if (index !== -1) {
                this.fiscalQueue.splice(index, 1);
                await this.savePendingQueue();
                
                console.log('🗑️ [FISCAL] Item removido da fila:', orderId);
                showToast('🗑️ Item removido da fila', 'info');
                
                return { success: true };
            }
            
            return { success: false, reasons: ['Erro ao remover item'] };
            
        } catch (error) {
            console.error('❌ [FISCAL] Erro ao remover item:', error);
            return {
                success: false,
                reasons: [error.message]
            };
        }
    }
    
    /**
     * ================================================================
     * PROCESSAMENTO REAL DE ITEM DA FILA (GATEWAY)
     * ================================================================
     * Este método processa um item usando o gateway fiscal configurado.
     * ⚠️ AMBIENTE: HOMOLOGAÇÃO (produção bloqueada)
     * 
     * @param {string} orderId - ID do pedido
     * @returns {Object} Resultado do processamento
     */
    async processQueueItem(orderId) {
        console.log('🔄 [FISCAL] Iniciando processamento:', orderId);
        
        const item = this.getQueueItem(orderId);
        
        if (!item) {
            return {
                success: false,
                reasons: ['Item não encontrado na fila']
            };
        }
        
        // 1. Verificar limite de tentativas
        const maxAttempts = item.maxAttempts || MAX_FISCAL_ATTEMPTS;
        if (item.attempts >= maxAttempts) {
            item.status = FISCAL_STATUS.ERROR;
            item.lastError = `Limite de ${maxAttempts} tentativas atingido`;
            await this.savePendingQueue();
            
            // 📝 LOG: Limite de tentativas excedido
            await this.saveFiscalLog({
                action: 'limit_exceeded',
                orderId: orderId,
                orderNumber: item.orderNumber,
                status: FISCAL_STATUS.ERROR,
                total: item.total,
                success: false,
                error: `Limite de ${maxAttempts} tentativas atingido`,
                tentativa: item.attempts
            });
            
            showToast(`❌ Limite de tentativas atingido`, 'error');
            return {
                success: false,
                reasons: [`Limite de ${maxAttempts} tentativas atingido. Cancele e crie novo pedido.`]
            };
        }
        
        // 2. Verificar se gateway está pronto
        const gatewayReady = gatewayAdapter.isReady();
        if (!gatewayReady.ready) {
            // Fallback para simulação se gateway não configurado
            console.warn('⚠️ [FISCAL] Gateway não pronto:', gatewayReady.reason);
            return await this.simulateProcessing(orderId);
        }
        
        // 3. Marcar como processando
        item.status = FISCAL_STATUS.PROCESSING;
        item.lastAttempt = new Date().toISOString();
        item.attempts++;
        await this.savePendingQueue();
        
        try {
            // 4. Buscar pedido completo para snapshot
            const orders = await getFromDatabase('orders') || [];
            const order = orders.find(o => o.id === orderId);
            
            if (!order) {
                throw new Error('Pedido não encontrado no banco de dados');
            }
            
            // 5. Validar novamente
            const validation = this.canEmitFiscal(order);
            if (!validation.canEmit) {
                item.status = FISCAL_STATUS.ERROR;
                item.lastError = validation.reasons.join('; ');
                await this.savePendingQueue();
                
                return {
                    success: false,
                    reasons: validation.reasons
                };
            }
            
            // 6. Montar payload NFC-e usando snapshot
            const payload = mapOrderToNFCePayload(
                { ...order, snapshot: item.snapshot },
                this.config
            );
            
            console.log('📤 [FISCAL] Enviando para gateway:', payload.referencia);
            
            // 7. Enviar para gateway
            const result = await gatewayAdapter.emitNFCe(payload);
            
            // 8. Processar resultado
            if (result.success) {
                // AUTORIZADA
                item.status = FISCAL_STATUS.AUTHORIZED;
                item.chave = result.chave;
                item.protocolo = result.protocolo;
                item.numero = result.numero;
                item.serie = result.serie;
                item.xmlUrl = result.xmlUrl;
                item.pdfUrl = result.pdfUrl;
                item.processedAt = new Date().toISOString();
                item.lastError = null;
                
                // Registrar no histórico
                item.history = item.history || [];
                item.history.push({
                    action: 'authorized',
                    timestamp: new Date().toISOString(),
                    chave: result.chave,
                    protocolo: result.protocolo
                });
                
                await this.savePendingQueue();
                
                // Atualizar pedido com dados fiscais
                await this.updateOrderFiscalData(orderId, {
                    status: FISCAL_STATUS.AUTHORIZED,
                    chave: result.chave,
                    protocolo: result.protocolo,
                    numero: result.numero,
                    serie: result.serie,
                    xmlUrl: result.xmlUrl,
                    pdfUrl: result.pdfUrl,
                    authorizedAt: new Date().toISOString()
                });
                
                // 📝 SALVAR LOG FISCAL PERSISTENTE
                await this.saveFiscalLog({
                    action: 'emit_success',
                    orderId: orderId,
                    orderNumber: item.orderNumber,
                    chave: result.chave,
                    protocolo: result.protocolo,
                    numero: result.numero,
                    serie: result.serie,
                    status: FISCAL_STATUS.AUTHORIZED,
                    total: item.total,
                    itensCount: item.snapshot?.itens?.length || 0,
                    success: true,
                    tentativa: item.attempts,
                    mock: result.mock || false
                });
                
                console.log('✅ [FISCAL] NFC-e autorizada:', result.chave);
                showToast('✅ NFC-e autorizada com sucesso!', 'success');
                
                return {
                    success: true,
                    status: FISCAL_STATUS.AUTHORIZED,
                    chave: result.chave,
                    protocolo: result.protocolo
                };
                
            } else if (result.status === FISCAL_STATUS.DENIED) {
                // REJEITADA PELA SEFAZ
                item.status = FISCAL_STATUS.DENIED;
                item.lastError = result.error || 'Rejeitada pela SEFAZ';
                item.errorCode = result.errorCode;
                item.sefazErrors = result.sefazErrors || [];
                
                item.history = item.history || [];
                item.history.push({
                    action: 'denied',
                    timestamp: new Date().toISOString(),
                    error: result.error,
                    errorCode: result.errorCode
                });
                
                await this.savePendingQueue();
                
                // 📝 SALVAR LOG FISCAL PERSISTENTE
                await this.saveFiscalLog({
                    action: 'emit_error',
                    orderId: orderId,
                    orderNumber: item.orderNumber,
                    status: FISCAL_STATUS.DENIED,
                    total: item.total,
                    success: false,
                    error: result.error,
                    errorCode: result.errorCode,
                    tentativa: item.attempts
                });
                
                console.error('❌ [FISCAL] NFC-e rejeitada:', result.error);
                showToast(`❌ NFC-e rejeitada: ${result.errorCode || 'Erro SEFAZ'}`, 'error');
                
                return {
                    success: false,
                    status: FISCAL_STATUS.DENIED,
                    error: result.error,
                    errorCode: result.errorCode
                };
                
            } else if (result.status === FISCAL_STATUS.PROCESSING) {
                // AINDA PROCESSANDO (assíncrono)
                console.log('⏳ [FISCAL] Aguardando processamento SEFAZ');
                showToast('⏳ Aguardando resposta da SEFAZ...', 'info');
                
                return {
                    success: false,
                    status: FISCAL_STATUS.PROCESSING,
                    message: 'Aguardando processamento'
                };
                
            } else {
                // ERRO TÉCNICO
                item.status = FISCAL_STATUS.ERROR;
                item.lastError = result.error || 'Erro de comunicação';
                item.errorCode = result.errorCode;
                
                item.history = item.history || [];
                item.history.push({
                    action: 'error',
                    timestamp: new Date().toISOString(),
                    error: result.error
                });
                
                await this.savePendingQueue();
                
                // 📝 SALVAR LOG FISCAL PERSISTENTE
                await this.saveFiscalLog({
                    action: 'emit_error',
                    orderId: orderId,
                    orderNumber: item.orderNumber,
                    status: FISCAL_STATUS.ERROR,
                    total: item.total,
                    success: false,
                    error: result.error,
                    errorCode: result.errorCode,
                    tentativa: item.attempts
                });
                
                console.error('⚠️ [FISCAL] Erro técnico:', result.error);
                showToast(`⚠️ Erro: ${result.error}`, 'error');
                
                return {
                    success: false,
                    status: FISCAL_STATUS.ERROR,
                    error: result.error
                };
            }
            
        } catch (error) {
            // EXCEÇÃO
            console.error('❌ [FISCAL] Exceção no processamento:', error);
            
            item.status = FISCAL_STATUS.ERROR;
            item.lastError = error.message || 'Erro inesperado';
            
            item.history = item.history || [];
            item.history.push({
                action: 'exception',
                timestamp: new Date().toISOString(),
                error: error.message
            });
            
            await this.savePendingQueue();
            
            showToast(`❌ Erro: ${error.message}`, 'error');
            
            return {
                success: false,
                status: FISCAL_STATUS.ERROR,
                error: error.message
            };
        }
    }
    
    /**
     * Atualiza dados fiscais do pedido no banco
     */
    async updateOrderFiscalData(orderId, fiscalData) {
        try {
            const orders = await getFromDatabase('orders') || [];
            const orderIndex = orders.findIndex(o => o.id === orderId);
            
            if (orderIndex === -1) {
                console.warn('⚠️ Pedido não encontrado para atualização fiscal');
                return false;
            }
            
            // Mesclar dados fiscais
            orders[orderIndex].fiscal = {
                ...orders[orderIndex].fiscal,
                ...fiscalData,
                updatedAt: new Date().toISOString()
            };
            
            await saveToDatabase('orders', orders);
            console.log('💾 [FISCAL] Dados fiscais do pedido atualizados:', orderId);
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao atualizar dados fiscais:', error);
            return false;
        }
    }
    
    /**
     * Consulta status de uma NFC-e via gateway
     * @param {string} chave - Chave de acesso
     */
    async checkNFCeStatus(chave) {
        return await gatewayAdapter.checkStatus(chave);
    }
    
    /**
     * Cancela uma NFC-e via gateway
     * @param {string} chave - Chave de acesso
     * @param {string} justificativa - Motivo (mín 15 caracteres)
     */
    async cancelNFCe(chave, justificativa) {
        const result = await gatewayAdapter.cancelNFCe(chave, justificativa);
        
        if (result.success) {
            // Atualizar item na fila
            const item = this.fiscalQueue.find(i => i.chave === chave);
            if (item) {
                item.status = FISCAL_STATUS.CANCELLED;
                item.cancelledAt = new Date().toISOString();
                item.cancelReason = justificativa;
                await this.savePendingQueue();
            }
            
            showToast('🚫 NFC-e cancelada com sucesso', 'success');
        }
        
        return result;
    }
    
    /**
     * Simula processamento (fallback quando gateway não configurado)
     * @deprecated Use processQueueItem() quando gateway estiver configurado
     */
    async simulateProcessing(orderId) {
        console.log('🧪 [FISCAL] Modo simulação (gateway não configurado)');
        
        const item = this.getQueueItem(orderId);
        if (!item) {
            return { success: false, reasons: ['Item não encontrado'] };
        }
        
        // Marcar como processando
        item.status = FISCAL_STATUS.PROCESSING;
        item.lastAttempt = new Date().toISOString();
        item.attempts++;
        await this.savePendingQueue();
        
        // Simular delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Marcar como erro (simulação)
        item.status = FISCAL_STATUS.ERROR;
        item.lastError = 'Gateway não configurado - configure em Configurações > Fiscal';
        await this.savePendingQueue();
        
        showToast('⚠️ Configure o gateway fiscal para emitir notas', 'warning');
        
        return {
            success: false,
            simulated: true,
            message: 'Gateway não configurado'
        };
    }
    
    /**
     * Inicializa o gateway com as configurações atuais
     * NOTA: Credenciais (apiKey/apiSecret) são gerenciadas no servidor (Netlify)
     */
    initializeGateway() {
        if (this.config?.gateway) {
            const initialized = gatewayAdapter.initialize({
                provider: this.config.gateway.provider || GATEWAY_PROVIDERS.MOCK,
                // Credenciais NÃO são passadas - estão no servidor
                environment: this.config.nfce?.ambiente || 'homologacao',
                enabled: this.config.gateway.enabled || false
            });
            
            if (initialized) {
                console.log('✅ [FISCAL] Gateway inicializado (modo serverless)');
            }
            
            return initialized;
        }
        return false;
    }
    
    /**
     * Verifica se gateway está pronto
     */
    isGatewayReady() {
        return gatewayAdapter.isReady();
    }
    
    /**
     * Método legado - redireciona para sendToQueue
     * @deprecated Use sendToQueue() ao invés
     */
    async addToFiscalQueue(order) {
        return await this.sendToQueue(order);
    }
    
    /**
     * Obtém status consolidado da fila fiscal
     * @returns {Object} Estatísticas da fila
     */
    getQueueStatus() {
        const queue = this.fiscalQueue || [];
        return {
            total: queue.length,
            pending: queue.filter(i => i.status === FISCAL_STATUS.PENDING).length,
            queued: queue.filter(i => i.status === FISCAL_STATUS.QUEUED).length,
            processing: queue.filter(i => i.status === FISCAL_STATUS.PROCESSING).length,
            authorized: queue.filter(i => i.status === FISCAL_STATUS.AUTHORIZED).length,
            denied: queue.filter(i => i.status === FISCAL_STATUS.DENIED).length,
            cancelled: queue.filter(i => i.status === FISCAL_STATUS.CANCELLED).length,
            errors: queue.filter(i => i.status === FISCAL_STATUS.ERROR).length,
            isProcessing: this.isProcessingQueue,
            isOnline: this.isOnline
        };
    }
    
    /**
     * Constrói payload para emissão de NFC-e (placeholder)
     * @param {Object} queueItem - Item da fila
     * @returns {Object} Payload formatado para o gateway
     */
    buildNFCePayload(queueItem) {
        // Este método será implementado na integração com gateway real
        return {
            natureza_operacao: 'VENDA',
            modelo: 65, // NFC-e
            serie: this.config?.nfce?.serie || 1,
            numero: this.config?.nfce?.proximoNumero || 1,
            orderId: queueItem.orderId,
            total: queueItem.total
        };
    }
    
    /**
     * Obtém configurações fiscais atuais
     */
    getConfig() {
        return this.config || DEFAULT_FISCAL_CONFIG;
    }
    
    /**
     * Valida CNPJ
     * @param {string} cnpj - CNPJ a validar
     * @returns {boolean}
     */
    validateCNPJ(cnpj) {
        // Remover caracteres não numéricos
        cnpj = cnpj.replace(/[^\d]/g, '');
        
        if (cnpj.length !== 14) return false;
        
        // Verificar se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(cnpj)) return false;
        
        // Validar dígitos verificadores
        let tamanho = cnpj.length - 2;
        let numeros = cnpj.substring(0, tamanho);
        let digitos = cnpj.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;
        
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado != digitos.charAt(0)) return false;
        
        tamanho = tamanho + 1;
        numeros = cnpj.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;
        
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado != digitos.charAt(1)) return false;
        
        return true;
    }
    
    /**
     * Formata CNPJ para exibição
     * @param {string} cnpj - CNPJ a formatar
     * @returns {string} CNPJ formatado
     */
    formatCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]/g, '');
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    
    /**
     * Valida Inscrição Estadual
     * Validação simplificada - considera apenas formato básico
     * @param {string} ie - Inscrição Estadual
     * @param {string} uf - UF do estado
     * @returns {boolean}
     */
    validateIE(ie, uf) {
        // Remover caracteres não alfanuméricos
        ie = ie.replace(/[^\dA-Za-z]/g, '').toUpperCase();
        
        // ISENTO é válido
        if (ie === 'ISENTO') return true;
        
        // Verificar tamanho mínimo
        if (ie.length < 8 || ie.length > 14) return false;
        
        return true;
    }
    
    /**
     * Valida CEP
     * @param {string} cep - CEP a validar
     * @returns {boolean}
     */
    validateCEP(cep) {
        cep = cep.replace(/[^\d]/g, '');
        return cep.length === 8;
    }
    
    /**
     * Formata CEP para exibição
     * @param {string} cep - CEP a formatar
     * @returns {string} CEP formatado
     */
    formatCEP(cep) {
        cep = cep.replace(/[^\d]/g, '');
        return cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
    }

    // ================================================================
    // LOGS FISCAIS PERSISTENTES
    // ================================================================

    /**
     * Tipos de ações fiscais para log
     */
    static LOG_ACTIONS = {
        EMIT: 'emit',
        EMIT_SUCCESS: 'emit_success',
        EMIT_ERROR: 'emit_error',
        STATUS_CHECK: 'status_check',
        CANCEL: 'cancel',
        CANCEL_SUCCESS: 'cancel_success',
        CANCEL_ERROR: 'cancel_error',
        QUEUE_ADD: 'queue_add',
        QUEUE_REMOVE: 'queue_remove',
        RETRY: 'retry',
        LIMIT_EXCEEDED: 'limit_exceeded'
    };

    /**
     * Salva log fiscal persistente
     * @param {Object} logData - Dados do log
     * @returns {Promise<Object>} Log salvo
     */
    async saveFiscalLog(logData) {
        try {
            const log = {
                id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                action: logData.action || 'unknown',
                orderId: logData.orderId || null,
                orderNumber: logData.orderNumber || null,
                
                // Dados fiscais (sem expor dados sensíveis)
                fiscal: {
                    chave: logData.chave || null,
                    protocolo: logData.protocolo || null,
                    numero: logData.numero || null,
                    serie: logData.serie || null,
                    status: logData.status || null,
                    ambiente: this.config?.nfce?.ambiente || 'homologacao'
                },
                
                // Valores (para auditoria)
                valores: {
                    total: logData.total || null,
                    itens: logData.itensCount || null
                },
                
                // Resultado
                success: logData.success || false,
                error: logData.error || null,
                errorCode: logData.errorCode || null,
                
                // Metadados
                gateway: this.config?.gateway?.provider || 'unknown',
                tentativa: logData.tentativa || 1,
                mock: logData.mock || false
            };

            // Salvar no IndexedDB/Firebase
            await saveToDatabase('fiscal_logs', log);
            
            // Log no console também (para debug)
            const emoji = log.success ? '✅' : '❌';
            console.log(`${emoji} [FISCAL LOG] ${log.action}:`, {
                orderId: log.orderId,
                status: log.fiscal.status,
                success: log.success,
                error: log.error
            });

            return log;

        } catch (error) {
            console.error('❌ [FISCAL] Erro ao salvar log:', error);
            // Não lançar erro - logs não devem quebrar o fluxo principal
            return null;
        }
    }

    /**
     * Busca logs fiscais por pedido
     * @param {string} orderId - ID do pedido
     * @returns {Promise<Array>} Lista de logs
     */
    async getFiscalLogsByOrder(orderId) {
        try {
            const allLogs = await getFromDatabase('fiscal_logs') || [];
            return allLogs
                .filter(log => log.orderId === orderId)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error('❌ [FISCAL] Erro ao buscar logs:', error);
            return [];
        }
    }

    /**
     * Busca logs fiscais por período
     * @param {Date} startDate - Data inicial
     * @param {Date} endDate - Data final
     * @returns {Promise<Array>} Lista de logs
     */
    async getFiscalLogsByPeriod(startDate, endDate) {
        try {
            const allLogs = await getFromDatabase('fiscal_logs') || [];
            return allLogs
                .filter(log => {
                    const logDate = new Date(log.timestamp);
                    return logDate >= startDate && logDate <= endDate;
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error('❌ [FISCAL] Erro ao buscar logs por período:', error);
            return [];
        }
    }

    /**
     * Gera resumo de logs fiscais para auditoria
     * @param {Date} startDate - Data inicial
     * @param {Date} endDate - Data final
     * @returns {Promise<Object>} Resumo estatístico
     */
    async getFiscalLogsSummary(startDate = null, endDate = null) {
        try {
            let logs = await getFromDatabase('fiscal_logs') || [];
            
            // Filtrar por período se fornecido
            if (startDate && endDate) {
                logs = logs.filter(log => {
                    const logDate = new Date(log.timestamp);
                    return logDate >= startDate && logDate <= endDate;
                });
            }

            // Calcular estatísticas
            const summary = {
                periodo: {
                    inicio: startDate?.toISOString() || 'todos',
                    fim: endDate?.toISOString() || 'todos'
                },
                totais: {
                    logs: logs.length,
                    emissoes: logs.filter(l => l.action === 'emit' || l.action === 'emit_success').length,
                    sucessos: logs.filter(l => l.success).length,
                    erros: logs.filter(l => !l.success).length,
                    cancelamentos: logs.filter(l => l.action.includes('cancel')).length
                },
                taxaSucesso: 0,
                errosFrequentes: {},
                valorTotalEmitido: 0,
                ultimaEmissao: null
            };

            // Taxa de sucesso
            const emissoes = logs.filter(l => l.action === 'emit' || l.action === 'emit_success' || l.action === 'emit_error');
            if (emissoes.length > 0) {
                const sucessos = emissoes.filter(l => l.success).length;
                summary.taxaSucesso = ((sucessos / emissoes.length) * 100).toFixed(1);
            }

            // Erros mais frequentes
            logs.filter(l => l.error).forEach(log => {
                const errorKey = log.errorCode || log.error?.substring(0, 50) || 'unknown';
                summary.errosFrequentes[errorKey] = (summary.errosFrequentes[errorKey] || 0) + 1;
            });

            // Valor total emitido (apenas sucessos)
            logs.filter(l => l.success && l.valores?.total).forEach(log => {
                summary.valorTotalEmitido += parseFloat(log.valores.total) || 0;
            });

            // Última emissão com sucesso
            const ultimaSucesso = logs.find(l => l.success && l.action === 'emit_success');
            if (ultimaSucesso) {
                summary.ultimaEmissao = ultimaSucesso.timestamp;
            }

            return summary;

        } catch (error) {
            console.error('❌ [FISCAL] Erro ao gerar resumo de logs:', error);
            return { error: error.message };
        }
    }

    /**
     * Limpa logs antigos (manter apenas últimos X dias)
     * @param {number} diasManter - Dias para manter (default: 90)
     * @returns {Promise<number>} Quantidade de logs removidos
     */
    async cleanOldFiscalLogs(diasManter = 90) {
        try {
            const allLogs = await getFromDatabase('fiscal_logs') || [];
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - diasManter);

            const logsToKeep = allLogs.filter(log => 
                new Date(log.timestamp) >= cutoffDate
            );

            const removed = allLogs.length - logsToKeep.length;

            if (removed > 0) {
                // Sobrescrever com logs filtrados
                // Nota: Isso depende da implementação do banco
                console.log(`🧹 [FISCAL] Removendo ${removed} logs antigos`);
            }

            return removed;

        } catch (error) {
            console.error('❌ [FISCAL] Erro ao limpar logs antigos:', error);
            return 0;
        }
    }
}

// Instância singleton
const fiscalService = new FiscalService();

export default fiscalService;

// Exportar também a classe para testes
export { FiscalService };
