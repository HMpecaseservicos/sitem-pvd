/**
 * ================================================================
 * NETLIFY FUNCTION: FISCAL EMIT
 * Endpoint: POST /.netlify/functions/fiscal-emit
 * 
 * Emite NFC-e através do gateway fiscal configurado.
 * As credenciais ficam em variáveis de ambiente do Netlify.
 * 
 * Environment Variables necessárias:
 * - FISCAL_GATEWAY_PROVIDER: focus_nfe | nfe_io | mock
 * - FISCAL_GATEWAY_API_KEY: Chave da API
 * - FISCAL_GATEWAY_API_SECRET: Secret da API (obrigatório em produção)
 * - FISCAL_GATEWAY_ENVIRONMENT: homologacao | producao
 * - FISCAL_GATEWAY_CERTIFICATE: true se certificado configurado
 * 
 * @version 2.0.0 - GO-LIVE PRODUÇÃO
 * @date 2026-02-02
 * ================================================================
 */

const fetch = require('node-fetch');

// Status fiscais (espelho do frontend)
const FISCAL_STATUS = {
    PENDING: 'pending',
    QUEUED: 'queued',
    PROCESSING: 'processing',
    AUTHORIZED: 'authorized',
    DENIED: 'denied',
    CANCELLED: 'cancelled',
    ERROR: 'error'
};

// Gateways suportados
const GATEWAY_PROVIDERS = {
    FOCUS_NFE: 'focus_nfe',
    NFE_IO: 'nfe_io',
    MOCK: 'mock'
};

// Endpoints por ambiente
const GATEWAY_ENDPOINTS = {
    homologacao: {
        focus_nfe: 'https://homologacao.focusnfe.com.br/v2',
        nfe_io: 'https://api.nfe.io/v1/companies',
        mock: 'mock'
    },
    producao: {
        focus_nfe: 'https://api.focusnfe.com.br/v2',
        nfe_io: 'https://api.nfe.io/v1/companies',
        mock: null // Mock não permitido em produção
    }
};

/**
 * Handler principal da function
 */
exports.handler = async (event, context) => {
    // Apenas POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders(),
            body: JSON.stringify({ ok: false, error: 'Método não permitido' })
        };
    }

    // Preflight CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    try {
        // Obter configuração do ambiente
        const config = getGatewayConfig();
        
        if (!config.enabled) {
            return response(400, { 
                ok: false, 
                status: FISCAL_STATUS.ERROR,
                error: 'Gateway fiscal não configurado no servidor' 
            });
        }

        // VALIDAÇÃO DE PRODUÇÃO: Requisitos obrigatórios
        const isProduction = config.environment === 'producao' || config.environment === 'production';
        
        if (isProduction) {
            console.log('🔴 [FISCAL] Modo PRODUÇÃO ativo');
            
            // Validação 1: Mock não permitido em produção
            if (config.provider === 'mock') {
                console.error('🚫 [FISCAL] Mock não permitido em produção!');
                return response(403, {
                    ok: false,
                    status: FISCAL_STATUS.ERROR,
                    error: 'Provider "mock" não é permitido em produção'
                });
            }
            
            // Validação 2: API Key obrigatória
            if (!config.apiKey || config.apiKey.length < 10) {
                console.error('🚫 [FISCAL] API Key inválida para produção!');
                return response(403, {
                    ok: false,
                    status: FISCAL_STATUS.ERROR,
                    error: 'API Key inválida ou não configurada para produção'
                });
            }
            
            // Validação 3: API Secret obrigatório para Focus NF-e
            if (config.provider === 'focus_nfe' && (!config.apiSecret || config.apiSecret.length < 10)) {
                console.error('🚫 [FISCAL] API Secret inválido para produção!');
                return response(403, {
                    ok: false,
                    status: FISCAL_STATUS.ERROR,
                    error: 'API Secret inválido ou não configurado para produção'
                });
            }
            
            // Validação 4: Certificado digital configurado
            if (process.env.FISCAL_GATEWAY_CERTIFICATE !== 'true') {
                console.error('🚫 [FISCAL] Certificado digital não confirmado!');
                return response(403, {
                    ok: false,
                    status: FISCAL_STATUS.ERROR,
                    error: 'Certificado digital não configurado no gateway'
                });
            }
        } else {
            console.log('🟡 [FISCAL] Modo HOMOLOGAÇÃO ativo');
        }

        // Parse do payload
        const payload = JSON.parse(event.body);
        
        if (!payload || !payload.itens || payload.itens.length === 0) {
            return response(400, {
                ok: false,
                status: FISCAL_STATUS.ERROR,
                error: 'Payload inválido: itens obrigatórios'
            });
        }

        // Log (sem dados sensíveis)
        console.log('📤 [FISCAL] Emitindo NFC-e:', {
            provider: config.provider,
            ambiente: config.environment,
            producao: isProduction,
            referencia: payload.referencia,
            totalItens: payload.itens?.length,
            valorTotal: payload.valor_total
        });

        // Definir ambiente no payload conforme configuração
        // 1 = Produção, 2 = Homologação
        payload.ambiente = isProduction ? 1 : 2;

        // Dispatch para o gateway
        let result;
        switch (config.provider) {
            case GATEWAY_PROVIDERS.FOCUS_NFE:
                result = await emitFocusNFe(config, payload);
                break;
            case GATEWAY_PROVIDERS.NFE_IO:
                result = await emitNFeIO(config, payload);
                break;
            case GATEWAY_PROVIDERS.MOCK:
            default:
                result = await emitMock(payload);
                break;
        }

        console.log('📋 [FISCAL] Resultado:', {
            ok: result.ok,
            status: result.status,
            chave: result.chave?.slice(-8) || null
        });

        return response(result.ok ? 200 : 400, result);

    } catch (error) {
        console.error('❌ [FISCAL] Erro:', error);
        return response(500, {
            ok: false,
            status: FISCAL_STATUS.ERROR,
            error: error.message || 'Erro interno do servidor',
            errorCode: 'SERVER_ERROR'
        });
    }
};

/**
 * Obtém configuração do gateway das variáveis de ambiente
 */
function getGatewayConfig() {
    const environment = process.env.FISCAL_GATEWAY_ENVIRONMENT || 'homologacao';
    const provider = process.env.FISCAL_GATEWAY_PROVIDER || 'mock';
    const envEndpoints = GATEWAY_ENDPOINTS[environment] || GATEWAY_ENDPOINTS.homologacao;
    
    return {
        provider: provider,
        apiKey: process.env.FISCAL_GATEWAY_API_KEY || '',
        apiSecret: process.env.FISCAL_GATEWAY_API_SECRET || '',
        environment: environment,
        enabled: process.env.FISCAL_GATEWAY_ENABLED === 'true',
        endpoint: envEndpoints[provider] || envEndpoints.mock
    };
}

/**
 * Emissão via Focus NF-e
 */
async function emitFocusNFe(config, payload) {
    const url = `${config.endpoint}/nfce?ref=${payload.referencia}`;
    
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.status === 'autorizado') {
        return {
            ok: true,
            status: FISCAL_STATUS.AUTHORIZED,
            chave: data.chave_nfe,
            protocolo: data.protocolo,
            numero: data.numero,
            serie: data.serie,
            xmlUrl: data.caminho_xml_nota_fiscal,
            pdfUrl: data.caminho_danfe,
            timestamp: new Date().toISOString()
        };
    } else if (data.status === 'erro_autorizacao') {
        return {
            ok: false,
            status: FISCAL_STATUS.DENIED,
            error: data.mensagem || 'Rejeitada pela SEFAZ',
            errorCode: data.codigo,
            errors: data.erros || [],
            timestamp: new Date().toISOString()
        };
    } else if (data.status === 'processando_autorizacao') {
        return {
            ok: false,
            status: FISCAL_STATUS.PROCESSING,
            message: 'Aguardando processamento SEFAZ',
            referencia: payload.referencia,
            timestamp: new Date().toISOString()
        };
    }

    return {
        ok: false,
        status: FISCAL_STATUS.ERROR,
        error: data.mensagem || 'Erro desconhecido',
        errorCode: data.codigo || 'UNKNOWN',
        timestamp: new Date().toISOString()
    };
}

/**
 * Emissão via NFe.io
 */
async function emitNFeIO(config, payload) {
    const url = `${config.endpoint}/nfce`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': config.apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.status === 'Issued') {
        return {
            ok: true,
            status: FISCAL_STATUS.AUTHORIZED,
            chave: data.accessKey,
            protocolo: data.protocol,
            numero: data.number,
            serie: data.series,
            xmlUrl: data.xml,
            pdfUrl: data.pdf,
            timestamp: new Date().toISOString()
        };
    }

    return {
        ok: false,
        status: FISCAL_STATUS.ERROR,
        error: data.message || 'Erro NFe.io',
        timestamp: new Date().toISOString()
    };
}

/**
 * Emissão Mock (para testes)
 */
async function emitMock(payload) {
    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockChave = generateMockChave();
    const mockProtocolo = '135' + Date.now().toString().slice(-12);
    const mockNumero = Math.floor(Math.random() * 99999) + 1;
    
    // 80% sucesso, 20% erro
    const success = Math.random() > 0.2;
    
    if (success) {
        return {
            ok: true,
            status: FISCAL_STATUS.AUTHORIZED,
            chave: mockChave,
            protocolo: mockProtocolo,
            numero: mockNumero,
            serie: 1,
            xmlUrl: `https://mock.fiscal/xml/${mockChave}.xml`,
            pdfUrl: `https://mock.fiscal/pdf/${mockChave}.pdf`,
            timestamp: new Date().toISOString(),
            mock: true,
            message: 'NFC-e autorizada em HOMOLOGAÇÃO (mock)'
        };
    }

    const errors = [
        { code: '301', message: 'Uso Denegado: Irregularidade fiscal do emitente' },
        { code: '539', message: 'Duplicidade de NF-e' },
        { code: '999', message: 'Erro de comunicação com SEFAZ (mock)' }
    ];
    const error = errors[Math.floor(Math.random() * errors.length)];
    
    return {
        ok: false,
        status: FISCAL_STATUS.DENIED,
        error: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
        mock: true
    };
}

function generateMockChave() {
    const uf = '35';
    const aamm = new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7);
    const cnpj = '12345678000199';
    const mod = '65';
    const serie = '001';
    const numero = String(Math.floor(Math.random() * 999999999)).padStart(9, '0');
    const tpEmis = '1';
    const codigo = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
    const dv = '0';
    return uf + aamm + cnpj + mod + serie + numero + tpEmis + codigo + dv;
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
}

function response(statusCode, body) {
    return {
        statusCode,
        headers: corsHeaders(),
        body: JSON.stringify(body)
    };
}
