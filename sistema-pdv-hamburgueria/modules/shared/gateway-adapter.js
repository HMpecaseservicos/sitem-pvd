/**
 * ================================================================
 * GATEWAY ADAPTER - CAMADA DE ABSTRAÇÃO FISCAL (FRONTEND)
 * Sistema PDV Hamburgueria
 * 
 * Este módulo fornece uma interface para comunicação com
 * o backend serverless (Netlify Functions) que gerencia
 * a integração com gateways fiscais.
 * 
 * ⚠️ IMPORTANTE: NENHUMA CREDENCIAL EXPOSTA NO FRONTEND
 * As credenciais (apiKey/apiSecret) ficam no servidor.
 * 
 * ⚠️ AMBIENTE ATUAL: HOMOLOGAÇÃO
 * ⚠️ NÃO ATIVAR PRODUÇÃO SEM AUTORIZAÇÃO
 * 
 * Versão: 2.0.0 (Serverless)
 * Data: 2026-01-29
 * ================================================================
 */

import { FISCAL_ENVIRONMENT, FISCAL_STATUS } from './fiscal-service.js';
import { showToast } from './utils.js';

/**
 * Gateways fiscais suportados (apenas referência no frontend)
 */
export const GATEWAY_PROVIDERS = {
    FOCUS_NFE: 'focus_nfe',
    NFE_IO: 'nfe_io',
    TECNOSPEED: 'tecnospeed',
    WEBMANIA: 'webmania',
    MOCK: 'mock'
};

/**
 * Endpoints internos (Netlify Functions via redirect)
 */
const API_ENDPOINTS = {
    EMIT: '/api/fiscal/emit',
    STATUS: '/api/fiscal/status',
    CANCEL: '/api/fiscal/cancel'
};

/**
 * Códigos de forma de pagamento NFC-e
 */
const PAYMENT_CODES = {
    'dinheiro': '01',
    'cartao_credito': '03',
    'cartao_debito': '04',
    'credito': '03',
    'debito': '04',
    'cartao': '03',
    'pix': '17',
    'voucher': '04',
    'vale': '04',
    'vale_alimentacao': '10',
    'vale_refeicao': '11'
};

/**
 * ================================================================
 * CLASSE GATEWAY ADAPTER (FRONTEND - SERVERLESS)
 * ================================================================
 */
class GatewayAdapter {
    constructor() {
        this.config = null;
        this.isInitialized = false;
    }
    
    /**
     * Inicializa o adapter com configurações
     * Nota: Credenciais NÃO são armazenadas no frontend
     * @param {Object} gatewayConfig - Configuração básica
     */
    initialize(gatewayConfig) {
        if (!gatewayConfig) {
            console.warn('⚠️ [GATEWAY] Configuração não fornecida');
            return false;
        }
        
        // IMPORTANTE: Não armazenar secrets no frontend
        this.config = {
            provider: gatewayConfig.provider || GATEWAY_PROVIDERS.MOCK,
            environment: gatewayConfig.environment || FISCAL_ENVIRONMENT.HOMOLOGATION,
            enabled: gatewayConfig.enabled || false,
            timeout: gatewayConfig.timeout || 30000
            // apiKey e apiSecret NÃO são armazenados aqui
        };
        
        // BLOQUEIO DE SEGURANÇA: Nunca permitir produção
        if (this.config.environment === FISCAL_ENVIRONMENT.PRODUCTION) {
            console.error('🚫 [GATEWAY] Ambiente de PRODUÇÃO bloqueado nesta versão');
            this.config.environment = FISCAL_ENVIRONMENT.HOMOLOGATION;
            showToast('⚠️ Produção bloqueada - usando homologação', 'warning');
        }
        
        this.isInitialized = true;
        console.log(`✅ [GATEWAY] Inicializado (Serverless): ${this.config.provider} (${this.config.environment})`);
        
        return true;
    }
    
    /**
     * Verifica se o gateway está pronto para uso
     */
    isReady() {
        if (!this.isInitialized) {
            return { ready: false, reason: 'Gateway não inicializado' };
        }
        
        if (!this.config.enabled) {
            return { ready: false, reason: 'Gateway desabilitado nas configurações' };
        }
        
        if (this.config.environment === FISCAL_ENVIRONMENT.PRODUCTION) {
            return { ready: false, reason: 'Ambiente de produção bloqueado' };
        }
        
        return { ready: true };
    }
    
    /**
     * ================================================================
     * INTERFACE PRINCIPAL - EMISSÃO NFC-e
     * ================================================================
     * Chama o endpoint serverless /api/fiscal/emit
     * @param {Object} payload - Payload NFC-e formatado
     * @returns {Object} Resultado da emissão
     */
    async emitNFCe(payload) {
        console.log('📤 [GATEWAY] Iniciando emissão NFC-e via serverless...');
        
        const readyCheck = this.isReady();
        if (!readyCheck.ready) {
            return {
                success: false,
                status: FISCAL_STATUS.ERROR,
                error: readyCheck.reason,
                errorCode: 'GATEWAY_NOT_READY'
            };
        }
        
        try {
            // Garantir ambiente de homologação
            payload.ambiente = 2; // 2 = Homologação
            
            // Log do payload (sem dados sensíveis)
            console.log('📋 [GATEWAY] Payload:', {
                referencia: payload.referencia,
                total: payload.valor_total,
                itens: payload.itens?.length || 0,
                ambiente: 'HOMOLOGAÇÃO'
            });
            
            // Chamar endpoint serverless
            const response = await fetch(API_ENDPOINTS.EMIT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(this.config.timeout)
            });
            
            const data = await response.json();
            
            // Mapear resposta do serverless para formato interno
            if (data.ok) {
                return {
                    success: true,
                    status: data.status || FISCAL_STATUS.AUTHORIZED,
                    chave: data.chave,
                    protocolo: data.protocolo,
                    numero: data.numero,
                    serie: data.serie,
                    xmlUrl: data.xmlUrl,
                    pdfUrl: data.pdfUrl,
                    timestamp: data.timestamp || new Date().toISOString(),
                    mock: data.mock || false,
                    message: data.message
                };
            } else {
                return {
                    success: false,
                    status: data.status || FISCAL_STATUS.ERROR,
                    error: data.error || 'Erro na emissão',
                    errorCode: data.errorCode || 'EMIT_ERROR',
                    errors: data.errors || [],
                    timestamp: data.timestamp || new Date().toISOString()
                };
            }
            
        } catch (error) {
            console.error('❌ [GATEWAY] Erro na emissão:', error);
            
            // Tratar timeout
            if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                return {
                    success: false,
                    status: FISCAL_STATUS.ERROR,
                    error: 'Timeout na comunicação com o servidor',
                    errorCode: 'TIMEOUT',
                    timestamp: new Date().toISOString()
                };
            }
            
            return {
                success: false,
                status: FISCAL_STATUS.ERROR,
                error: error.message || 'Erro de comunicação',
                errorCode: 'NETWORK_ERROR',
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * ================================================================
     * INTERFACE - CONSULTA STATUS
     * ================================================================
     * Chama o endpoint serverless /api/fiscal/status
     * @param {string} chave - Chave de acesso da NFC-e (44 dígitos)
     * @returns {Object} Status da nota
     */
    async checkStatus(chave) {
        console.log('🔍 [GATEWAY] Consultando status via serverless:', chave?.slice(-8));
        
        const readyCheck = this.isReady();
        if (!readyCheck.ready) {
            return {
                success: false,
                error: readyCheck.reason
            };
        }
        
        try {
            const response = await fetch(`${API_ENDPOINTS.STATUS}?chave=${encodeURIComponent(chave)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            return {
                success: data.ok !== false,
                status: data.status,
                chave: data.chave,
                protocolo: data.protocolo,
                numero: data.numero,
                serie: data.serie,
                xmlUrl: data.xmlUrl,
                pdfUrl: data.pdfUrl,
                error: data.error
            };
            
        } catch (error) {
            console.error('❌ [GATEWAY] Erro na consulta:', error);
            return {
                success: false,
                error: error.message || 'Erro de comunicação'
            };
        }
    }
    
    /**
     * ================================================================
     * INTERFACE - CANCELAMENTO NFC-e
     * ================================================================
     * Chama o endpoint serverless /api/fiscal/cancel
     * @param {string} chave - Chave de acesso
     * @param {string} justificativa - Motivo do cancelamento
     * @returns {Object} Resultado do cancelamento
     */
    async cancelNFCe(chave, justificativa) {
        console.log('🚫 [GATEWAY] Iniciando cancelamento via serverless:', chave?.slice(-8));
        
        const readyCheck = this.isReady();
        if (!readyCheck.ready) {
            return {
                success: false,
                error: readyCheck.reason
            };
        }
        
        if (!justificativa || justificativa.length < 15) {
            return {
                success: false,
                error: 'Justificativa deve ter no mínimo 15 caracteres'
            };
        }
        
        try {
            const response = await fetch(API_ENDPOINTS.CANCEL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ chave, justificativa })
            });
            
            const data = await response.json();
            
            return {
                success: data.ok !== false,
                status: data.status,
                protocolo: data.protocolo,
                error: data.error,
                timestamp: data.timestamp
            };
            
        } catch (error) {
            console.error('❌ [GATEWAY] Erro no cancelamento:', error);
            return {
                success: false,
                error: error.message || 'Erro de comunicação'
            };
        }
    }
    
    /**
     * Retorna informações sobre o gateway (sem segredos)
     */
    getInfo() {
        return {
            provider: this.config?.provider || 'não configurado',
            environment: this.config?.environment || 'homologacao',
            enabled: this.config?.enabled || false,
            isInitialized: this.isInitialized,
            mode: 'serverless',
            endpoints: API_ENDPOINTS
        };
    }
}

/**
 * ================================================================
 * MAPEADOR DE PEDIDO PARA NFC-e
 * ================================================================
 * Converte um pedido do sistema para o formato NFC-e
 */
export function mapOrderToNFCePayload(order, fiscalConfig) {
    if (!order) {
        throw new Error('Pedido não fornecido para mapeamento');
    }
    
    // Usar snapshot fiscal se disponível (dados imutáveis)
    const snapshot = order.snapshot || {
        total: order.total,
        itens: order.items || [],
        pagamento: order.paymentMethod || 'dinheiro',
        cliente: {
            nome: order.customerName || 'Consumidor Final',
            cpf: order.customerCpf || ''
        }
    };
    
    // Gerar referência única
    const referencia = `PDV-${order.id}-${Date.now()}`;
    
    // Mapear itens
    const itens = (snapshot.itens || []).map((item, index) => ({
        numero_item: index + 1,
        codigo_produto: item.id || `PROD-${index + 1}`,
        descricao: item.name || item.nome || `Item ${index + 1}`,
        codigo_ncm: item.ncm || '21069090', // NCM padrão para alimentos preparados
        cfop: '5102', // Venda de mercadoria dentro do estado
        unidade_comercial: 'UN',
        quantidade_comercial: item.quantity || 1,
        valor_unitario_comercial: parseFloat(item.price) || 0,
        valor_bruto: (parseFloat(item.price) || 0) * (item.quantity || 1),
        
        // Tributação Simples Nacional
        icms_origem: 0,
        icms_situacao_tributaria: '102',
        
        // PIS/COFINS
        pis_situacao_tributaria: '49',
        cofins_situacao_tributaria: '49'
    }));
    
    // Calcular totais
    const valorProdutos = itens.reduce((sum, item) => sum + item.valor_bruto, 0);
    const valorDesconto = parseFloat(order.discount) || 0;
    const valorTotal = parseFloat(snapshot.total) || valorProdutos - valorDesconto;
    
    // Mapear forma de pagamento
    const formaPagamento = mapPaymentMethod(snapshot.pagamento);
    
    // Montar payload NFC-e
    const payload = {
        // Identificação
        referencia: referencia,
        natureza_operacao: 'VENDA',
        modelo: 65, // NFC-e
        serie: fiscalConfig?.nfce?.serie || 1,
        
        // Emitente (da configuração fiscal)
        cnpj_emitente: fiscalConfig?.cnpj || '',
        inscricao_estadual_emitente: fiscalConfig?.inscricaoEstadual || '',
        nome_emitente: fiscalConfig?.razaoSocial || '',
        nome_fantasia_emitente: fiscalConfig?.nomeFantasia || '',
        
        // Endereço emitente
        logradouro_emitente: fiscalConfig?.endereco?.logradouro || '',
        numero_emitente: fiscalConfig?.endereco?.numero || '',
        bairro_emitente: fiscalConfig?.endereco?.bairro || '',
        municipio_emitente: fiscalConfig?.endereco?.municipio || '',
        uf_emitente: fiscalConfig?.endereco?.uf || '',
        cep_emitente: fiscalConfig?.endereco?.cep?.replace(/\D/g, '') || '',
        codigo_municipio_emitente: fiscalConfig?.endereco?.codigoMunicipio || '',
        
        // Consumidor
        cpf_destinatario: snapshot.cliente?.cpf?.replace(/\D/g, '') || '',
        nome_destinatario: snapshot.cliente?.nome || 'CONSUMIDOR FINAL',
        
        // Itens
        itens: itens,
        
        // Totais
        valor_produtos: valorProdutos.toFixed(2),
        valor_desconto: valorDesconto.toFixed(2),
        valor_total: valorTotal.toFixed(2),
        
        // Pagamento
        formas_pagamento: [{
            forma_pagamento: formaPagamento.codigo,
            valor_pagamento: valorTotal.toFixed(2),
            tipo_integracao: formaPagamento.integracao
        }],
        
        // Informações adicionais
        informacoes_adicionais_contribuinte: `Pedido PDV: ${order.id}`,
        
        // CSC (para QR Code) - vem da config, será validado no servidor
        token_csc: fiscalConfig?.nfce?.csc || '',
        id_token_csc: fiscalConfig?.nfce?.cscId || '',
        
        // Metadados
        _orderId: order.id,
        _createdAt: new Date().toISOString()
    };
    
    console.log('📋 [MAPPER] Payload NFC-e gerado:', {
        referencia: payload.referencia,
        itens: payload.itens.length,
        total: payload.valor_total
    });
    
    return payload;
}

/**
 * Mapeia forma de pagamento para código NFC-e
 */
function mapPaymentMethod(method) {
    const normalizedMethod = (method || 'dinheiro').toLowerCase().replace(/[áàã]/g, 'a');
    
    const mapping = {
        'dinheiro': { codigo: '01', integracao: 2 },
        'cartao': { codigo: '03', integracao: 1 },
        'cartao_credito': { codigo: '03', integracao: 1 },
        'cartao_debito': { codigo: '04', integracao: 1 },
        'credito': { codigo: '03', integracao: 1 },
        'debito': { codigo: '04', integracao: 1 },
        'pix': { codigo: '17', integracao: 2 },
        'voucher': { codigo: '04', integracao: 2 },
        'vale_alimentacao': { codigo: '10', integracao: 2 },
        'vale_refeicao': { codigo: '11', integracao: 2 }
    };
    
    return mapping[normalizedMethod] || { codigo: '99', integracao: 2 };
}

/**
 * Instância singleton do adapter
 */
const gatewayAdapter = new GatewayAdapter();

export default gatewayAdapter;
export { GatewayAdapter, PAYMENT_CODES };
