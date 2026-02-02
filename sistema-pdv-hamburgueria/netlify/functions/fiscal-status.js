/**
 * ================================================================
 * NETLIFY FUNCTION: FISCAL STATUS
 * Endpoint: GET /.netlify/functions/fiscal-status?chave=...
 * 
 * Consulta status de uma NFC-e no gateway fiscal.
 * As credenciais ficam em variáveis de ambiente do Netlify.
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
    // Apenas GET
    if (event.httpMethod !== 'GET') {
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

        // Obter chave da query string
        const chave = event.queryStringParameters?.chave;
        
        if (!chave) {
            return response(400, {
                ok: false,
                error: 'Parâmetro "chave" é obrigatório'
            });
        }

        console.log('🔍 [FISCAL] Consultando status:', chave.slice(-8));

        let result;
        switch (config.provider) {
            case 'focus_nfe':
                result = await checkStatusFocusNFe(config, chave);
                break;
            case 'nfe_io':
                result = await checkStatusNFeIO(config, chave);
                break;
            case 'mock':
            default:
                result = await checkStatusMock(chave);
                break;
        }

        return response(200, result);

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

async function checkStatusFocusNFe(config, chave) {
    const url = `${config.endpoint}/nfce/${chave}`;
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${auth}`
        }
    });

    const data = await response.json();

    return {
        ok: true,
        status: mapFocusStatus(data.status),
        chave: data.chave_nfe,
        protocolo: data.protocolo,
        numero: data.numero,
        serie: data.serie,
        xmlUrl: data.caminho_xml_nota_fiscal,
        pdfUrl: data.caminho_danfe
    };
}

async function checkStatusNFeIO(config, chave) {
    const url = `${config.endpoint}/nfce/${chave}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': config.apiKey
        }
    });

    const data = await response.json();

    return {
        ok: true,
        status: data.status === 'Issued' ? FISCAL_STATUS.AUTHORIZED : 
                data.status === 'Cancelled' ? FISCAL_STATUS.CANCELLED : FISCAL_STATUS.ERROR,
        chave: data.accessKey,
        protocolo: data.protocol
    };
}

async function checkStatusMock(chave) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
        ok: true,
        status: FISCAL_STATUS.AUTHORIZED,
        chave: chave,
        protocolo: '135' + Date.now().toString().slice(-12),
        mock: true
    };
}

function mapFocusStatus(status) {
    const map = {
        'autorizado': FISCAL_STATUS.AUTHORIZED,
        'cancelado': FISCAL_STATUS.CANCELLED,
        'erro_autorizacao': FISCAL_STATUS.DENIED,
        'processando_autorizacao': FISCAL_STATUS.PROCESSING
    };
    return map[status] || FISCAL_STATUS.ERROR;
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
