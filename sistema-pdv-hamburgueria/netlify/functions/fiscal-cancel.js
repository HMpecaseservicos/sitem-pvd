/**
 * ================================================================
 * NETLIFY FUNCTION: FISCAL CANCEL
 * Endpoint: POST /.netlify/functions/fiscal-cancel
 * 
 * Cancela uma NFC-e através do gateway fiscal.
 * As credenciais ficam em variáveis de ambiente do Netlify.
 * 
 * Body esperado:
 * { "chave": "44 dígitos", "justificativa": "mínimo 15 caracteres" }
 * 
 * @version 2.0.0 - GO-LIVE PRODUÇÃO
 * @date 2026-02-02
 * ================================================================
 */

const fetch = require('node-fetch');

const FISCAL_STATUS = {
    PENDING: 'pending',
    QUEUED: 'queued',
    PROCESSING: 'processing',
    AUTHORIZED: 'authorized',
    DENIED: 'denied',
    CANCELLED: 'cancelled',
    ERROR: 'error'
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
        mock: null
    }
};

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
        const config = getGatewayConfig();
        
        if (!config.enabled) {
            return response(400, { 
                ok: false, 
                error: 'Gateway fiscal não configurado' 
            });
        }

        // VALIDAÇÃO DE PRODUÇÃO
        const isProduction = config.environment === 'producao' || config.environment === 'production';
        
        if (isProduction) {
            console.log('🔴 [FISCAL] Cancelamento em PRODUÇÃO');
            
            if (config.provider === 'mock') {
                return response(403, {
                    ok: false,
                    error: 'Provider "mock" não é permitido em produção'
                });
            }
            
            if (!config.apiKey || config.apiKey.length < 10) {
                return response(403, {
                    ok: false,
                    error: 'API Key inválida para produção'
                });
            }
        }

        const body = JSON.parse(event.body);
        const { chave, justificativa } = body;

        if (!chave) {
            return response(400, {
                ok: false,
                error: 'Parâmetro "chave" é obrigatório'
            });
        }

        if (!justificativa || justificativa.length < 15) {
            return response(400, {
                ok: false,
                error: 'Justificativa deve ter no mínimo 15 caracteres'
            });
        }

        console.log('🚫 [FISCAL] Cancelando NFC-e:', chave.slice(-8));

        let result;
        switch (config.provider) {
            case 'focus_nfe':
                result = await cancelFocusNFe(config, chave, justificativa);
                break;
            case 'nfe_io':
                result = await cancelNFeIO(config, chave, justificativa);
                break;
            case 'mock':
            default:
                result = await cancelMock(chave, justificativa);
                break;
        }

        return response(result.ok ? 200 : 400, result);

    } catch (error) {
        console.error('❌ [FISCAL] Erro:', error);
        return response(500, {
            ok: false,
            error: error.message || 'Erro interno do servidor'
        });
    }
};

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

async function cancelFocusNFe(config, chave, justificativa) {
    const url = `${config.endpoint}/nfce/${chave}`;
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
    
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ justificativa })
    });

    const data = await response.json();

    return {
        ok: data.status === 'cancelado',
        status: data.status === 'cancelado' ? FISCAL_STATUS.CANCELLED : FISCAL_STATUS.ERROR,
        protocolo: data.protocolo_cancelamento,
        timestamp: new Date().toISOString()
    };
}

async function cancelNFeIO(config, chave, justificativa) {
    const url = `${config.endpoint}/nfce/${chave}/cancel`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': config.apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: justificativa })
    });

    const data = await response.json();

    return {
        ok: data.status === 'Cancelled',
        status: data.status === 'Cancelled' ? FISCAL_STATUS.CANCELLED : FISCAL_STATUS.ERROR,
        protocolo: data.protocol,
        timestamp: new Date().toISOString()
    };
}

async function cancelMock(chave, justificativa) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
        ok: true,
        status: FISCAL_STATUS.CANCELLED,
        protocolo: '135' + Date.now().toString().slice(-12),
        timestamp: new Date().toISOString(),
        mock: true,
        message: 'NFC-e cancelada em HOMOLOGAÇÃO (mock)'
    };
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
