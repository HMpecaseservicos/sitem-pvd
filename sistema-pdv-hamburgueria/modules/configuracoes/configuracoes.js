/**
 * Módulo de Configurações - Sistema PDV Hamburgueria
 * Gerenciamento de configurações do sistema
 */

import {
    showToast,
    getFromDatabase,
    saveToDatabase,
    updateInDatabase
} from '../shared/utils.js';

export default class ConfiguracoesModule {
    constructor() {
        this.isInitialized = false;
        this.currentSettings = null;
        this.whatsappTemplates = {
            pending: {
                title: 'Pedido Recebido',
                icon: '⏳',
                template: `🍔 *BURGERPDV* - Pedido Recebido

Prezado(a) *{{customerName}}*,

Recebemos seu pedido com sucesso!

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

{{orderItems}}

💵 *Valor Total:* {{orderTotal}}
{{deliveryType}}

⏰ *Status:* Aguardando confirmação

Entraremos em contato em breve para confirmar seu pedido.

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
            },
            confirmed: {
                title: 'Pedido Confirmado',
                icon: '✅',
                template: `✅ *PEDIDO CONFIRMADO*

Prezado(a) *{{customerName}}*,

Seu pedido foi confirmado com sucesso!

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

{{orderItems}}

💵 *Valor Total:* {{orderTotal}}
{{deliveryType}}

⏰ *Tempo Estimado:* 35-45 minutos
📍 *Status:* Confirmado - Aguardando preparo

Em breve iniciaremos a preparação do seu pedido.

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
            },
            preparing: {
                title: 'Pedido em Preparo',
                icon: '👨‍🍳',
                template: `👨‍🍳 *PEDIDO EM PREPARO*

Prezado(a) *{{customerName}}*,

Seu pedido está sendo preparado!

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

{{orderItems}}

💵 *Valor Total:* {{orderTotal}}
{{deliveryType}}

🔥 *Status:* Em preparação
⏰ *Previsão:* 20-30 minutos

Nosso chef está preparando seu pedido com todo cuidado e qualidade.

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
            },
            ready: {
                title: 'Pedido Pronto',
                icon: '🍽️',
                template: `🍽️ *PEDIDO PRONTO!*

Prezado(a) *{{customerName}}*,

Seu pedido está pronto!

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

{{orderItems}}

💵 *Valor Total:* {{orderTotal}}
{{deliveryType}}

✅ *Status:* Pronto
{{deliveryMessage}}

Tudo preparado com qualidade e carinho!

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
            },
            delivered: {
                title: 'Pedido Entregue/Concluído',
                icon: '📦',
                template: `📦 *PEDIDO CONCLUÍDO*

Prezado(a) *{{customerName}}*,

Seu pedido foi concluído com sucesso!

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

💵 *Valor Total:* {{orderTotal}}
✅ *Status:* Concluído

Esperamos que tenha apreciado sua refeição!

⭐ *SUA OPINIÃO É IMPORTANTE*
Avalie sua experiência conosco e nos ajude a melhorar cada vez mais.

Agradecemos sua preferência e esperamos atendê-lo novamente em breve!

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
            },
            cancelled: {
                title: 'Pedido Cancelado',
                icon: '❌',
                template: `❌ *PEDIDO CANCELADO*

Prezado(a) *{{customerName}}*,

Informamos que seu pedido foi cancelado.

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

💵 *Valor:* {{orderTotal}}
❌ *Status:* Cancelado

Pedimos desculpas por qualquer inconveniente causado.

Para dúvidas ou esclarecimentos, estamos à disposição para atendê-lo.

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
            },
            welcome: {
                title: 'Mensagem de Boas-vindas',
                icon: '👋',
                template: `👋 *Olá, {{customerName}}!*

Seja bem-vindo(a) ao *BURGERPDV*! 🍔

Estamos prontos para atendê-lo(a) com os melhores hambúrgueres da região!

📱 Como podemos ajudá-lo(a) hoje?

_Atenciosamente,_
_Equipe BurgerPDV_`
            }
        };
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('⚙️ Inicializando módulo Configurações...');
            
            await this.loadSettings();
            this.renderInterface();
            this.setupEventListeners();
            
            window.configuracoesModule = this;
            this.isInitialized = true;
            
            console.log('✅ Configurações Module inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar Configurações:', error);
        }
    }

    async loadSettings() {
        try {
            const settings = await getFromDatabase('settings');
            
            if (settings && settings.length > 0) {
                this.currentSettings = settings[0];
                
                // Carregar templates personalizados se existirem
                if (this.currentSettings.whatsappTemplates) {
                    this.whatsappTemplates = {
                        ...this.whatsappTemplates,
                        ...this.currentSettings.whatsappTemplates
                    };
                }
            } else {
                // Criar configurações padrão
                this.currentSettings = {
                    id: 'default-settings',
                    companyName: 'BurgerPDV',
                    companyPhone: '',
                    companyAddress: '',
                    whatsappTemplates: this.whatsappTemplates,
                    createdAt: new Date().toISOString()
                };
                
                await saveToDatabase('settings', this.currentSettings);
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    renderInterface() {
        const container = document.getElementById('configuracoes-page');
        if (!container) {
            console.error('❌ Container #configuracoes-page não encontrado');
            console.error('   Verifique se o elemento existe no HTML');
            
            // Tentar exibir erro para o usuário
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
                        <h2>Erro ao Carregar Configurações</h2>
                        <p>O container #configuracoes-page não foi encontrado no HTML.</p>
                        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                            <i class="fas fa-redo"></i> Recarregar Página
                        </button>
                    </div>
                `;
            }
            return;
        }

        container.innerHTML = `
            <div class="configuracoes-container">
                <div class="config-header">
                    <h2><i class="fas fa-cog"></i> Configurações do Sistema</h2>
                    <p>Personalize o funcionamento do seu sistema</p>
                </div>

                <div class="config-tabs">
                    <button class="tab-btn active" data-tab="whatsapp">
                        <i class="fab fa-whatsapp"></i> Templates WhatsApp
                    </button>
                    <button class="tab-btn" data-tab="empresa">
                        <i class="fas fa-building"></i> Dados da Empresa
                    </button>
                    <button class="tab-btn" data-tab="fiscal">
                        <i class="fas fa-file-invoice"></i> Fiscal (NFC-e)
                    </button>
                    <button class="tab-btn" data-tab="sistema">
                        <i class="fas fa-cogs"></i> Sistema
                    </button>
                </div>

                <div class="config-content">
                    <!-- Tab WhatsApp Templates -->
                    <div class="tab-content active" id="tab-whatsapp">
                        <div class="config-section">
                            <h3><i class="fab fa-whatsapp"></i> Templates de Mensagens WhatsApp</h3>
                            <p class="text-muted">Personalize as mensagens automáticas enviadas aos clientes</p>
                            
                            <div class="templates-info">
                                <i class="fas fa-info-circle"></i>
                                <strong>Variáveis disponíveis:</strong>
                                <code>{{customerName}}</code>
                                <code>{{orderNumber}}</code>
                                <code>{{orderItems}}</code>
                                <code>{{orderTotal}}</code>
                                <code>{{deliveryMessage}}</code>
                            </div>

                            ${this.renderWhatsAppTemplates()}
                        </div>
                    </div>

                    <!-- Tab Empresa -->
                    <div class="tab-content" id="tab-empresa">
                        <div class="config-section">
                            <h3><i class="fas fa-building"></i> Dados da Empresa</h3>
                            
                            <div class="form-group">
                                <label>Nome da Empresa</label>
                                <input type="text" id="company-name" value="${this.currentSettings?.companyName || ''}" class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label>Telefone</label>
                                <input type="text" id="company-phone" value="${this.currentSettings?.companyPhone || ''}" class="form-control" placeholder="(00) 00000-0000">
                            </div>
                            
                            <div class="form-group">
                                <label>Endereço</label>
                                <textarea id="company-address" class="form-control" rows="3">${this.currentSettings?.companyAddress || ''}</textarea>
                            </div>
                            
                            <button class="btn btn-primary" id="save-company-btn">
                                <i class="fas fa-save"></i> Salvar Dados da Empresa
                            </button>
                        </div>
                    </div>

                    <!-- Tab Fiscal (NFC-e) -->
                    <div class="tab-content" id="tab-fiscal">
                        ${this.renderFiscalTab()}
                    </div>

                    <!-- Tab Sistema -->
                    <div class="tab-content" id="tab-sistema">
                        <div class="config-section">
                            <h3><i class="fas fa-cogs"></i> Configurações do Sistema</h3>
                            
                            <div class="form-group">
                                <label>
                                    <i class="fas fa-truck"></i> Taxa de Entrega (R$)
                                </label>
                                <input type="number" 
                                       id="delivery-fee" 
                                       value="${this.currentSettings?.deliveryFee || 10}" 
                                       class="form-control" 
                                       step="0.01" 
                                       min="0"
                                       placeholder="10.00">
                                <small class="text-muted">Valor cobrado automaticamente em pedidos de delivery</small>
                            </div>
                            
                            <button class="btn btn-primary" id="save-system-btn">
                                <i class="fas fa-save"></i> Salvar Configurações
                            </button>
                            
                            <hr style="margin: 30px 0; border: 1px solid #ddd;">
                            
                            <div class="config-option">
                                <div class="option-info">
                                    <strong>🗑️ Limpar Apenas Pedidos</strong>
                                    <p>Remove todos os pedidos de teste (mantém clientes e produtos)</p>
                                </div>
                                <button class="btn btn-warning" id="clear-orders-btn">
                                    <i class="fas fa-receipt"></i> Limpar Pedidos
                                </button>
                            </div>

                            <div class="config-option">
                                <div class="option-info">
                                    <strong>🗑️ Limpar Apenas Clientes</strong>
                                    <p>Remove todos os clientes cadastrados (mantém pedidos e produtos)</p>
                                </div>
                                <button class="btn btn-warning" id="clear-customers-btn">
                                    <i class="fas fa-users"></i> Limpar Clientes
                                </button>
                            </div>

                            <div class="config-option">
                                <div class="option-info">
                                    <strong>🗑️ Limpar Apenas Produtos</strong>
                                    <p>Remove todos os produtos do cardápio</p>
                                </div>
                                <button class="btn btn-warning" id="clear-products-btn">
                                    <i class="fas fa-hamburger"></i> Limpar Produtos
                                </button>
                            </div>

                            <hr style="margin: 30px 0; border: 1px solid #ddd;">
                            
                            <div class="config-option">
                                <div class="option-info">
                                    <strong>Restaurar Templates Padrão</strong>
                                    <p>Restaura todos os templates de WhatsApp para os valores originais</p>
                                </div>
                                <button class="btn btn-info" id="restore-templates-btn">
                                    <i class="fas fa-undo"></i> Restaurar Templates
                                </button>
                            </div>

                            <hr style="margin: 30px 0; border: 1px solid #ddd;">
                            
                            <div class="config-option" style="background: #fff3cd; padding: 20px; border-radius: 8px; border: 2px solid #ffc107;">
                                <div class="option-info">
                                    <strong style="color: #856404;">⚠️ PERIGO: Limpar TODOS os Dados</strong>
                                    <p style="color: #856404;">Remove TODOS os dados do sistema (clientes, pedidos, produtos, estoque, transações)</p>
                                </div>
                                <button class="btn btn-danger" id="clear-database-btn">
                                    <i class="fas fa-exclamation-triangle"></i> Limpar TUDO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderWhatsAppTemplates() {
        return Object.entries(this.whatsappTemplates).map(([key, template]) => `
            <div class="template-card" data-template="${key}">
                <div class="template-header">
                    <h4>${template.icon} ${template.title}</h4>
                    <div class="template-actions">
                        <button class="btn btn-sm btn-primary save-template-btn" data-template="${key}">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </div>
                <div class="template-body">
                    <textarea class="template-textarea" id="template-${key}" rows="10">${template.template}</textarea>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderiza a aba de configurações fiscais (NFC-e)
     */
    renderFiscalTab() {
        const fiscal = this.currentSettings?.fiscal || {};
        const endereco = fiscal.endereco || {};
        const nfce = fiscal.nfce || {};
        const gateway = fiscal.gateway || {};
        
        return `
            <div class="config-section fiscal-section">
                <div class="fiscal-header">
                    <h3><i class="fas fa-file-invoice"></i> Configurações Fiscais (NFC-e)</h3>
                    <div class="fiscal-status">
                        <span class="status-badge ${gateway.enabled ? 'status-active' : 'status-inactive'}">
                            ${gateway.enabled ? '✅ Gateway Ativo' : '⏸️ Gateway Inativo'}
                        </span>
                        <span class="status-badge status-env-${nfce.ambiente || 'homologacao'}">
                            🏢 ${nfce.ambiente === 'producao' ? 'Produção' : 'Homologação'}
                        </span>
                    </div>
                </div>
                
                <div class="fiscal-alert">
                    <i class="fas fa-info-circle"></i>
                    <div>
                        <strong>📋 Preparação para Emissão Fiscal</strong>
                        <p>Preencha os dados abaixo para preparar seu sistema para emissão de NFC-e. 
                        A emissão real será habilitada após integração com gateway fiscal.</p>
                    </div>
                </div>

                <!-- Dados da Empresa (Fiscal) -->
                <div class="fiscal-card">
                    <h4><i class="fas fa-building"></i> Dados da Empresa</h4>
                    
                    <div class="form-row">
                        <div class="form-group col-md-8">
                            <label>Razão Social *</label>
                            <input type="text" id="fiscal-razao-social" 
                                   value="${fiscal.razaoSocial || ''}" 
                                   class="form-control" 
                                   placeholder="Nome empresarial completo">
                        </div>
                        <div class="form-group col-md-4">
                            <label>Nome Fantasia</label>
                            <input type="text" id="fiscal-nome-fantasia" 
                                   value="${fiscal.nomeFantasia || ''}" 
                                   class="form-control" 
                                   placeholder="Nome comercial">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label>CNPJ *</label>
                            <input type="text" id="fiscal-cnpj" 
                                   value="${fiscal.cnpj || ''}" 
                                   class="form-control cnpj-mask" 
                                   placeholder="00.000.000/0001-00"
                                   maxlength="18">
                        </div>
                        <div class="form-group col-md-4">
                            <label>Inscrição Estadual *</label>
                            <input type="text" id="fiscal-ie" 
                                   value="${fiscal.inscricaoEstadual || ''}" 
                                   class="form-control" 
                                   placeholder="Número ou ISENTO">
                        </div>
                        <div class="form-group col-md-4">
                            <label>Inscrição Municipal</label>
                            <input type="text" id="fiscal-im" 
                                   value="${fiscal.inscricaoMunicipal || ''}" 
                                   class="form-control" 
                                   placeholder="Número (se aplicável)">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Regime Tributário *</label>
                        <select id="fiscal-regime" class="form-control">
                            <option value="simples_nacional" ${fiscal.regimeTributario === 'simples_nacional' ? 'selected' : ''}>
                                Simples Nacional
                            </option>
                            <option value="simples_nacional_excesso" ${fiscal.regimeTributario === 'simples_nacional_excesso' ? 'selected' : ''}>
                                Simples Nacional - Excesso de sublimite
                            </option>
                            <option value="lucro_presumido" ${fiscal.regimeTributario === 'lucro_presumido' ? 'selected' : ''}>
                                Lucro Presumido
                            </option>
                            <option value="lucro_real" ${fiscal.regimeTributario === 'lucro_real' ? 'selected' : ''}>
                                Lucro Real
                            </option>
                            <option value="mei" ${fiscal.regimeTributario === 'mei' ? 'selected' : ''}>
                                MEI - Microempreendedor Individual
                            </option>
                        </select>
                    </div>
                </div>

                <!-- Endereço Fiscal -->
                <div class="fiscal-card">
                    <h4><i class="fas fa-map-marker-alt"></i> Endereço Fiscal</h4>
                    
                    <div class="form-row">
                        <div class="form-group col-md-3">
                            <label>CEP *</label>
                            <input type="text" id="fiscal-cep" 
                                   value="${endereco.cep || ''}" 
                                   class="form-control cep-mask" 
                                   placeholder="00000-000"
                                   maxlength="9">
                        </div>
                        <div class="form-group col-md-7">
                            <label>Logradouro *</label>
                            <input type="text" id="fiscal-logradouro" 
                                   value="${endereco.logradouro || ''}" 
                                   class="form-control" 
                                   placeholder="Rua, Avenida, etc.">
                        </div>
                        <div class="form-group col-md-2">
                            <label>Número *</label>
                            <input type="text" id="fiscal-numero" 
                                   value="${endereco.numero || ''}" 
                                   class="form-control" 
                                   placeholder="Nº">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group col-md-4">
                            <label>Complemento</label>
                            <input type="text" id="fiscal-complemento" 
                                   value="${endereco.complemento || ''}" 
                                   class="form-control" 
                                   placeholder="Sala, Andar, etc.">
                        </div>
                        <div class="form-group col-md-4">
                            <label>Bairro *</label>
                            <input type="text" id="fiscal-bairro" 
                                   value="${endereco.bairro || ''}" 
                                   class="form-control">
                        </div>
                        <div class="form-group col-md-4">
                            <label>Município *</label>
                            <input type="text" id="fiscal-municipio" 
                                   value="${endereco.municipio || ''}" 
                                   class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group col-md-3">
                            <label>Código IBGE</label>
                            <input type="text" id="fiscal-cod-municipio" 
                                   value="${endereco.codigoMunicipio || ''}" 
                                   class="form-control" 
                                   placeholder="7 dígitos"
                                   maxlength="7">
                        </div>
                        <div class="form-group col-md-2">
                            <label>UF *</label>
                            <select id="fiscal-uf" class="form-control">
                                <option value="">Selecione</option>
                                ${this.renderUFOptions(endereco.uf)}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Configurações NFC-e -->
                <div class="fiscal-card">
                    <h4><i class="fas fa-receipt"></i> Configurações NFC-e</h4>
                    
                    <div class="form-row">
                        <div class="form-group col-md-3">
                            <label>Série *</label>
                            <input type="number" id="fiscal-serie" 
                                   value="${nfce.serie || 1}" 
                                   class="form-control" 
                                   min="1" max="999">
                        </div>
                        <div class="form-group col-md-3">
                            <label>Próximo Número *</label>
                            <input type="number" id="fiscal-proximo-numero" 
                                   value="${nfce.proximoNumero || 1}" 
                                   class="form-control" 
                                   min="1">
                        </div>
                        <div class="form-group col-md-3">
                            <label>Ambiente *</label>
                            <select id="fiscal-ambiente" class="form-control">
                                <option value="homologacao" ${nfce.ambiente === 'homologacao' ? 'selected' : ''}>
                                    🧪 Homologação (Testes)
                                </option>
                                <option value="producao" ${nfce.ambiente === 'producao' ? 'selected' : ''}>
                                    🏭 Produção
                                </option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label>CSC (Código de Segurança)</label>
                            <input type="text" id="fiscal-csc" 
                                   value="${nfce.csc || ''}" 
                                   class="form-control" 
                                   placeholder="Token de segurança da SEFAZ">
                        </div>
                        <div class="form-group col-md-3">
                            <label>ID do CSC</label>
                            <input type="text" id="fiscal-csc-id" 
                                   value="${nfce.cscId || ''}" 
                                   class="form-control" 
                                   placeholder="ID do token">
                        </div>
                    </div>
                </div>

                <!-- Gateway Fiscal -->
                <div class="fiscal-card fiscal-gateway">
                    <h4><i class="fas fa-plug"></i> Gateway Fiscal (Serverless)</h4>
                    
                    <div class="gateway-info gateway-homolog">
                        <i class="fas fa-shield-alt"></i>
                        <p>
                            <strong>AMBIENTE: HOMOLOGAÇÃO (SEGURO)</strong><br>
                            As credenciais do gateway (API Key/Secret) são configuradas no <strong>servidor Netlify</strong> 
                            por segurança. Aqui você apenas habilita/desabilita e seleciona o provedor.
                        </p>
                    </div>

                    <div class="gateway-info" style="background: #fff3cd; border-color: #ffc107; margin-top: 10px;">
                        <i class="fas fa-key" style="color: #856404;"></i>
                        <p style="color: #856404;">
                            <strong>Configurar no Netlify:</strong> Acesse Site Settings → Environment Variables e adicione:<br>
                            <code>FISCAL_GATEWAY_PROVIDER</code>, <code>FISCAL_GATEWAY_API_KEY</code>, 
                            <code>FISCAL_GATEWAY_API_SECRET</code>, <code>FISCAL_GATEWAY_ENABLED=true</code>
                        </p>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label>Provedor Configurado</label>
                            <select id="fiscal-gateway-provider" class="form-control"
                                    ${gateway.provider ? `value="${gateway.provider}"` : ''}>
                                <option value="">Não configurado</option>
                                <option value="focus_nfe" ${gateway.provider === 'focus_nfe' ? 'selected' : ''}>Focus NF-e</option>
                                <option value="nfe_io" ${gateway.provider === 'nfe_io' ? 'selected' : ''}>NFe.io</option>
                                <option value="tecnospeed" ${gateway.provider === 'tecnospeed' ? 'selected' : ''}>Tecnospeed</option>
                                <option value="webmania" ${gateway.provider === 'webmania' ? 'selected' : ''}>Webmania</option>
                                <option value="mock" ${gateway.provider === 'mock' ? 'selected' : ''}>Mock (Testes)</option>
                            </select>
                            <small class="form-text text-muted">Deve corresponder ao configurado no Netlify</small>
                        </div>
                        <div class="form-group col-md-3">
                            <label>Ambiente</label>
                            <select id="fiscal-gateway-ambiente" class="form-control" disabled>
                                <option value="homologacao" selected>Homologação</option>
                                <option value="producao" disabled>Produção (bloqueado)</option>
                            </select>
                        </div>
                        <div class="form-group col-md-3">
                            <label>&nbsp;</label>
                            <div class="form-check" style="padding-top: 8px;">
                                <input type="checkbox" id="fiscal-gateway-enabled" 
                                       class="form-check-input"
                                       ${gateway.enabled ? 'checked' : ''}>
                                <label class="form-check-label" for="fiscal-gateway-enabled">
                                    <strong>Habilitar Gateway</strong>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="gateway-status-row">
                        <div id="gateway-status-indicator" class="gateway-status-badge">
                            ${this.renderGatewayStatus(gateway)}
                        </div>
                        <button type="button" class="btn btn-outline-info btn-sm" id="test-gateway-btn">
                            <i class="fas fa-vial"></i> Testar Conexão
                        </button>
                    </div>
                </div>

                <!-- Certificado Digital (Placeholder para Futuro) -->
                <div class="fiscal-card fiscal-certificate">
                    <h4><i class="fas fa-certificate"></i> Certificado Digital</h4>
                    
                    <div class="certificate-info">
                        <i class="fas fa-lock"></i>
                        <p>
                            A maioria dos gateways fiscais gerencia o certificado digital internamente. 
                            Consulte a documentação do seu gateway para configuração do certificado.
                        </p>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group col-md-3">
                            <label>Tipo</label>
                            <select id="fiscal-cert-tipo" class="form-control" disabled>
                                <option value="">Gerenciado pelo Gateway</option>
                                <option value="A1">A1 (Arquivo)</option>
                                <option value="A3">A3 (Token/Cartão)</option>
                            </select>
                        </div>
                        <div class="form-group col-md-5">
                            <label>Arquivo do Certificado</label>
                            <input type="file" id="fiscal-cert-arquivo" 
                                   class="form-control" 
                                   accept=".pfx,.p12"
                                   disabled>
                        </div>
                        <div class="form-group col-md-4">
                            <label>Validade</label>
                            <input type="text" id="fiscal-cert-validade" 
                                   value="Não configurado" 
                                   class="form-control" 
                                   readonly>
                        </div>
                    </div>
                </div>

                <!-- Opções de Emissão -->
                <div class="fiscal-card">
                    <h4><i class="fas fa-sliders-h"></i> Opções de Emissão</h4>
                    
                    <div class="form-check">
                        <input type="checkbox" id="fiscal-emissao-automatica" 
                               class="form-check-input"
                               ${fiscal.emissaoAutomatica ? 'checked' : ''}
                               disabled>
                        <label class="form-check-label" for="fiscal-emissao-automatica">
                            <strong>Emissão Automática</strong>
                            <small>Emitir NFC-e automaticamente ao finalizar pedido (requer gateway ativo)</small>
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="fiscal-emitir-offline" 
                               class="form-check-input"
                               ${fiscal.emitirOffline !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="fiscal-emitir-offline">
                            <strong>Fila Offline</strong>
                            <small>Pedidos feitos offline entram na fila e são emitidos quando houver conexão</small>
                        </label>
                    </div>
                </div>

                <!-- Botões de Ação -->
                <div class="fiscal-actions">
                    <button class="btn btn-primary btn-lg" id="save-fiscal-btn">
                        <i class="fas fa-save"></i> Salvar Configurações Fiscais
                    </button>
                    <button class="btn btn-outline-secondary" id="validate-fiscal-btn">
                        <i class="fas fa-check-circle"></i> Validar Dados
                    </button>
                </div>
                
                <!-- Fila Fiscal Visível -->
                <div class="fiscal-queue-section">
                    <h4><i class="fas fa-list-ol"></i> Fila Fiscal</h4>
                    <p class="fiscal-queue-description">
                        Pedidos finalizados aguardando emissão de NFC-e. Todas as ações são manuais.
                    </p>
                    
                    <!-- Resumo da Fila -->
                    <div id="fiscal-queue-summary" class="fiscal-queue-summary">
                        <div class="queue-stat">
                            <span class="stat-number" id="queue-total">0</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="queue-stat stat-pending">
                            <span class="stat-number" id="queue-pending">0</span>
                            <span class="stat-label">Aguardando</span>
                        </div>
                        <div class="queue-stat stat-processing">
                            <span class="stat-number" id="queue-processing">0</span>
                            <span class="stat-label">Processando</span>
                        </div>
                        <div class="queue-stat stat-success">
                            <span class="stat-number" id="queue-authorized">0</span>
                            <span class="stat-label">Autorizadas</span>
                        </div>
                        <div class="queue-stat stat-error">
                            <span class="stat-number" id="queue-errors">0</span>
                            <span class="stat-label">Erros</span>
                        </div>
                    </div>
                    
                    <!-- Tabela da Fila -->
                    <div class="fiscal-queue-table-container">
                        <table class="fiscal-queue-table" id="fiscal-queue-table">
                            <thead>
                                <tr>
                                    <th>Pedido</th>
                                    <th>Cliente</th>
                                    <th>Data</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                    <th>Tentativas</th>
                                    <th>Último Erro</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="fiscal-queue-body">
                                <tr class="queue-empty-row">
                                    <td colspan="8">
                                        <i class="fas fa-inbox"></i> Fila fiscal vazia
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Ações em Lote -->
                    <div class="fiscal-queue-actions">
                        <button class="btn btn-outline-info btn-sm" id="refresh-queue-btn">
                            <i class="fas fa-sync-alt"></i> Atualizar Fila
                        </button>
                        <button class="btn btn-outline-warning btn-sm" id="clear-cancelled-btn">
                            <i class="fas fa-broom"></i> Limpar Cancelados
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza opções de UF para select
     */
    renderUFOptions(selectedUF) {
        const ufs = [
            'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
            'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
            'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
        ];
        
        return ufs.map(uf => 
            `<option value="${uf}" ${selectedUF === uf ? 'selected' : ''}>${uf}</option>`
        ).join('');
    }

    /**
     * Renderiza status do gateway
     */
    renderGatewayStatus(gateway) {
        if (!gateway || !gateway.enabled) {
            return `<span class="badge badge-secondary">
                        <i class="fas fa-pause-circle"></i> Desabilitado
                    </span>`;
        }
        
        if (!gateway.apiKey) {
            return `<span class="badge badge-warning">
                        <i class="fas fa-exclamation-triangle"></i> API Key não configurada
                    </span>`;
        }
        
        return `<span class="badge badge-success">
                    <i class="fas fa-check-circle"></i> Pronto (Homologação)
                </span>`;
    }

    setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`tab-${tabId}`).classList.add('active');
                
                // Inicializar fila fiscal quando aba fiscal é selecionada
                if (tabId === 'fiscal') {
                    this.initFiscalQueue();
                }
            });
        });

        // Salvar templates
        document.querySelectorAll('.save-template-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const templateKey = e.target.closest('.save-template-btn').dataset.template;
                await this.saveTemplate(templateKey);
            });
        });

        // Salvar dados da empresa
        const saveCompanyBtn = document.getElementById('save-company-btn');
        if (saveCompanyBtn) {
            saveCompanyBtn.addEventListener('click', () => this.saveCompanyData());
        }
        
        // Salvar configurações do sistema (taxa de entrega)
        const saveSystemBtn = document.getElementById('save-system-btn');
        if (saveSystemBtn) {
            saveSystemBtn.addEventListener('click', () => this.saveSystemSettings());
        }

        // Salvar configurações fiscais
        const saveFiscalBtn = document.getElementById('save-fiscal-btn');
        if (saveFiscalBtn) {
            saveFiscalBtn.addEventListener('click', () => this.saveFiscalSettings());
        }

        // Validar dados fiscais
        const validateFiscalBtn = document.getElementById('validate-fiscal-btn');
        if (validateFiscalBtn) {
            validateFiscalBtn.addEventListener('click', () => this.validateFiscalData());
        }

        // Máscaras de input para campos fiscais
        this.setupFiscalMasks();

        // Restaurar templates
        const restoreBtn = document.getElementById('restore-templates-btn');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => this.restoreDefaultTemplates());
        }

        // Limpar apenas pedidos
        const clearOrdersBtn = document.getElementById('clear-orders-btn');
        if (clearOrdersBtn) {
            clearOrdersBtn.addEventListener('click', () => this.clearOrders());
        }

        // Limpar apenas clientes
        const clearCustomersBtn = document.getElementById('clear-customers-btn');
        if (clearCustomersBtn) {
            clearCustomersBtn.addEventListener('click', () => this.clearCustomers());
        }

        // Limpar apenas produtos
        const clearProductsBtn = document.getElementById('clear-products-btn');
        if (clearProductsBtn) {
            clearProductsBtn.addEventListener('click', () => this.clearProducts());
        }

        // Limpar banco de dados completo
        const clearDbBtn = document.getElementById('clear-database-btn');
        if (clearDbBtn) {
            clearDbBtn.addEventListener('click', () => this.clearDatabase());
        }
    }

    async saveTemplate(templateKey) {
        try {
            const textarea = document.getElementById(`template-${templateKey}`);
            const newTemplate = textarea.value;

            this.whatsappTemplates[templateKey].template = newTemplate;
            
            this.currentSettings.whatsappTemplates = this.whatsappTemplates;
            this.currentSettings.updatedAt = new Date().toISOString();
            
            // Salvar no cache local (IndexedDB)
            await updateInDatabase('settings', this.currentSettings);
            
            // Salvar no Firebase também
            if (window.firebaseService) {
                try {
                    await window.firebaseService.save('settings', this.currentSettings);
                    console.log('✅ Template salvo no Firebase');
                } catch (fbError) {
                    console.warn('⚠️ Erro ao salvar template no Firebase:', fbError);
                }
            }

            showToast(`✅ Template "${this.whatsappTemplates[templateKey].title}" salvo com sucesso!`, 'success');
            
            console.log(`✅ Template ${templateKey} atualizado`);
        } catch (error) {
            console.error('Erro ao salvar template:', error);
            showToast('Erro ao salvar template', 'error');
        }
    }

    async saveCompanyData() {
        try {
            console.log('💾 Salvando dados da empresa...');
            
            this.currentSettings.companyName = document.getElementById('company-name').value;
            this.currentSettings.companyPhone = document.getElementById('company-phone').value;
            this.currentSettings.companyAddress = document.getElementById('company-address').value;
            this.currentSettings.updatedAt = new Date().toISOString();

            // Salvar no cache local (IndexedDB)
            await updateInDatabase('settings', this.currentSettings);
            
            // Salvar no Firebase também
            if (window.firebaseService) {
                try {
                    await window.firebaseService.save('settings', this.currentSettings);
                    console.log('✅ Dados da empresa salvos no Firebase');
                } catch (fbError) {
                    console.warn('⚠️ Erro ao salvar no Firebase:', fbError);
                }
            }
            
            showToast('✅ Dados da empresa salvos com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar dados da empresa:', error);
            showToast('Erro ao salvar dados', 'error');
        }
    }
    
    async saveSystemSettings() {
        try {
            console.log('💾 Salvando configurações do sistema...');
            
            const deliveryFeeInput = document.getElementById('delivery-fee');
            const deliveryFee = parseFloat(deliveryFeeInput.value) || 0;
            
            if (deliveryFee < 0) {
                showToast('A taxa de entrega não pode ser negativa', 'error');
                return;
            }
            
            this.currentSettings.deliveryFee = deliveryFee;
            this.currentSettings.updatedAt = new Date().toISOString();
            
            // Salvar no cache local (IndexedDB)
            await updateInDatabase('settings', this.currentSettings);
            
            // Salvar no Firebase também
            if (window.firebaseService) {
                try {
                    await window.firebaseService.save('settings', this.currentSettings);
                    console.log('✅ Configurações do sistema salvas no Firebase');
                } catch (fbError) {
                    console.warn('⚠️ Erro ao salvar no Firebase:', fbError);
                }
            }
            
            // Atualizar globalmente para o PDV usar
            window.systemSettings = this.currentSettings;
            
            showToast(`Taxa de entrega atualizada: R$ ${deliveryFee.toFixed(2)}`, 'success');
            console.log('✅ Taxa de entrega salva:', deliveryFee);
        } catch (error) {
            console.error('Erro ao salvar configurações do sistema:', error);
            showToast('Erro ao salvar configurações', 'error');
        }
    }

    async restoreDefaultTemplates() {
        if (!confirm('Deseja realmente restaurar os templates padrão? As personalizações serão perdidas.')) {
            return;
        }

        try {
            // Restaurar templates profissionais padrão
            this.whatsappTemplates = {
                pending: {
                    title: 'Pedido Recebido',
                    icon: '⏳',
                    template: `🍔 *BURGERPDV* - Pedido Recebido

Prezado(a) *{{customerName}}*,

Recebemos seu pedido com sucesso!

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

{{orderItems}}

💵 *Valor Total:* {{orderTotal}}
{{deliveryType}}

⏰ *Status:* Aguardando confirmação

Entraremos em contato em breve para confirmar seu pedido.

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
                },
                confirmed: {
                    title: 'Pedido Confirmado',
                    icon: '✅',
                    template: `✅ *PEDIDO CONFIRMADO*

Prezado(a) *{{customerName}}*,

Seu pedido foi confirmado com sucesso!

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

{{orderItems}}

💵 *Valor Total:* {{orderTotal}}
{{deliveryType}}

⏰ *Tempo Estimado:* 35-45 minutos
📍 *Status:* Confirmado - Aguardando preparo

Em breve iniciaremos a preparação do seu pedido.

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
                },
                preparing: {
                    title: 'Pedido em Preparo',
                    icon: '👨‍🍳',
                    template: `👨‍🍳 *PEDIDO EM PREPARO*

Prezado(a) *{{customerName}}*,

Seu pedido está sendo preparado!

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

{{orderItems}}

💵 *Valor Total:* {{orderTotal}}
{{deliveryType}}

🔥 *Status:* Em preparação
⏰ *Previsão:* 20-30 minutos

Nosso chef está preparando seu pedido com todo cuidado e qualidade.

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
                },
                ready: {
                    title: 'Pedido Pronto',
                    icon: '🍽️',
                    template: `🍽️ *PEDIDO PRONTO!*

Prezado(a) *{{customerName}}*,

Seu pedido está pronto!

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

{{orderItems}}

💵 *Valor Total:* {{orderTotal}}
{{deliveryType}}

✅ *Status:* Pronto
{{deliveryMessage}}

Tudo preparado com qualidade e carinho!

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
                },
                delivered: {
                    title: 'Pedido Entregue/Concluído',
                    icon: '📦',
                    template: `📦 *PEDIDO CONCLUÍDO*

Prezado(a) *{{customerName}}*,

Seu pedido foi concluído com sucesso!

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

💵 *Valor Total:* {{orderTotal}}
✅ *Status:* Concluído

Esperamos que tenha apreciado sua refeição!

⭐ *SUA OPINIÃO É IMPORTANTE*
Avalie sua experiência conosco e nos ajude a melhorar cada vez mais.

Agradecemos sua preferência e esperamos atendê-lo novamente em breve!

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
                },
                cancelled: {
                    title: 'Pedido Cancelado',
                    icon: '❌',
                    template: `❌ *PEDIDO CANCELADO*

Prezado(a) *{{customerName}}*,

Informamos que seu pedido foi cancelado.

━━━━━━━━━━━━━━━━━━━
📋 *PEDIDO #{{orderNumber}}*
━━━━━━━━━━━━━━━━━━━

💵 *Valor:* {{orderTotal}}
❌ *Status:* Cancelado

Pedimos desculpas por qualquer inconveniente causado.

Para dúvidas ou esclarecimentos, estamos à disposição para atendê-lo.

_Atenciosamente,_
_Equipe BurgerPDV_ 🍔`
                },
                welcome: {
                    title: 'Mensagem de Boas-vindas',
                    icon: '👋',
                    template: `👋 *Olá, {{customerName}}!*

Seja bem-vindo(a) ao *BURGERPDV*! 🍔

Estamos prontos para atendê-lo(a) com os melhores hambúrgueres da região!

📱 Como podemos ajudá-lo(a) hoje?

_Atenciosamente,_
_Equipe BurgerPDV_`
                }
            };

            this.currentSettings.whatsappTemplates = this.whatsappTemplates;
            await updateInDatabase('settings', this.currentSettings);

            this.renderInterface();
            this.setupEventListeners();

            showToast('Templates restaurados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao restaurar templates:', error);
            showToast('Erro ao restaurar templates', 'error');
        }
    }

    async clearOrders() {
        const confirmation = confirm('🗑️ Deseja realmente remover TODOS os pedidos?\n\nEsta ação não pode ser desfeita!');
        
        if (!confirmation) {
            showToast('Operação cancelada', 'info');
            return;
        }

        try {
            showToast('Removendo pedidos...', 'info');
            let deletedCount = 0;

            // Limpar Firebase
            if (window.firebaseService) {
                const orders = await window.firebaseService.get('orders', null);
                if (orders && orders.length > 0) {
                    for (const order of orders) {
                        if (order.id) {
                            await window.firebaseService.delete('orders', order.id);
                            deletedCount++;
                        }
                    }
                } else if (orders && typeof orders === 'object') {
                    // Se retornou objeto ao invés de array
                    const ordersArray = Object.values(orders);
                    for (const order of ordersArray) {
                        if (order.id) {
                            await window.firebaseService.delete('orders', order.id);
                            deletedCount++;
                        }
                    }
                }
            }

            // Limpar cache local
            if (window.dbManager) {
                await window.dbManager.clearStore('orders');
            }

            showToast(`✅ ${deletedCount} pedido(s) removido(s) com sucesso!`, 'success');
            
            setTimeout(() => {
                if (window.moduleManager) {
                    window.moduleManager.navigateTo('dashboard');
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Erro ao limpar pedidos:', error);
            showToast('Erro ao limpar pedidos: ' + error.message, 'error');
        }
    }

    async clearCustomers() {
        const confirmation = confirm('🗑️ Deseja realmente remover TODOS os clientes?\n\nEsta ação não pode ser desfeita!');
        
        if (!confirmation) {
            showToast('Operação cancelada', 'info');
            return;
        }

        try {
            showToast('Removendo clientes...', 'info');
            let deletedCount = 0;

            // Limpar Firebase
            if (window.firebaseService) {
                const customers = await window.firebaseService.get('customers', null);
                if (customers && customers.length > 0) {
                    for (const customer of customers) {
                        if (customer.id) {
                            await window.firebaseService.delete('customers', customer.id);
                            deletedCount++;
                        }
                    }
                } else if (customers && typeof customers === 'object') {
                    // Se retornou objeto ao invés de array
                    const customersArray = Object.values(customers);
                    for (const customer of customersArray) {
                        if (customer.id) {
                            await window.firebaseService.delete('customers', customer.id);
                            deletedCount++;
                        }
                    }
                }
            }

            // Limpar cache local
            if (window.dbManager) {
                await window.dbManager.clearStore('customers');
            }

            showToast(`✅ ${deletedCount} cliente(s) removido(s) com sucesso!`, 'success');
            
            setTimeout(() => {
                if (window.moduleManager) {
                    window.moduleManager.navigateTo('dashboard');
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Erro ao limpar clientes:', error);
            showToast('Erro ao limpar clientes: ' + error.message, 'error');
        }
    }

    async clearProducts() {
        const confirmation = confirm('🗑️ Deseja realmente remover TODOS os produtos?\n\nEsta ação não pode ser desfeita!');
        
        if (!confirmation) {
            showToast('Operação cancelada', 'info');
            return;
        }

        try {
            showToast('Removendo produtos...', 'info');
            let deletedCount = 0;

            // Limpar Firebase
            if (window.firebaseService) {
                const products = await window.firebaseService.get('products', null);
                if (products && products.length > 0) {
                    for (const product of products) {
                        if (product.id) {
                            await window.firebaseService.delete('products', product.id);
                            deletedCount++;
                        }
                    }
                } else if (products && typeof products === 'object') {
                    // Se retornou objeto ao invés de array
                    const productsArray = Object.values(products);
                    for (const product of productsArray) {
                        if (product.id) {
                            await window.firebaseService.delete('products', product.id);
                            deletedCount++;
                        }
                    }
                }
            }

            // Limpar cache local
            if (window.dbManager) {
                await window.dbManager.clearStore('products');
            }

            showToast(`✅ ${deletedCount} produto(s) removido(s) com sucesso!`, 'success');
            
            setTimeout(() => {
                if (window.moduleManager) {
                    window.moduleManager.navigateTo('cardapio');
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Erro ao limpar produtos:', error);
            showToast('Erro ao limpar produtos: ' + error.message, 'error');
        }
    }

    async clearDatabase() {
        const confirmation = prompt('⚠️ ATENÇÃO: Esta ação irá apagar TODOS os dados!\n\nDigite "LIMPAR" para confirmar:');
        
        if (confirmation !== 'LIMPAR') {
            showToast('Operação cancelada', 'info');
            return;
        }

        try {
            showToast('Limpando dados do Firebase...', 'info');

            // Limpar Firebase primeiro
            if (window.firebaseService) {
                const collections = ['customers', 'orders', 'products', 'inventory', 'transactions'];
                
                for (const collection of collections) {
                    try {
                        // Buscar todos os items da coleção usando get(collection, null)
                        const items = await window.firebaseService.get(collection, null);
                        
                        let itemsArray = [];
                        if (items && Array.isArray(items)) {
                            itemsArray = items;
                        } else if (items && typeof items === 'object') {
                            itemsArray = Object.values(items);
                        }
                        
                        // Deletar cada item
                        if (itemsArray.length > 0) {
                            for (const item of itemsArray) {
                                if (item.id) {
                                    await window.firebaseService.delete(collection, item.id);
                                }
                            }
                            console.log(`✅ Firebase: ${collection} limpo (${itemsArray.length} itens removidos)`);
                        }
                    } catch (error) {
                        console.log(`⚠️ Erro ao limpar ${collection}:`, error);
                    }
                }
            }

            showToast('Limpando cache local...', 'info');

            // Limpar IndexedDB (cache local)
            if (window.dbManager) {
                try {
                    const stores = ['customers', 'orders', 'products', 'inventory', 'transactions'];
                    for (const storeName of stores) {
                        await window.dbManager.clearStore(storeName);
                        console.log(`✅ Cache: ${storeName} limpo`);
                    }
                } catch (error) {
                    console.log('⚠️ Erro ao limpar cache local:', error);
                }
            }

            showToast('✅ Todos os dados foram removidos! Recarregando...', 'success');
            
            // Recarregar página após 1.5 segundos
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            console.error('❌ Erro ao limpar banco de dados:', error);
            showToast('Erro ao limpar dados: ' + error.message, 'error');
        }
    }

    /**
     * Configura máscaras de input para campos fiscais
     */
    setupFiscalMasks() {
        // Máscara CNPJ
        const cnpjInput = document.getElementById('fiscal-cnpj');
        if (cnpjInput) {
            cnpjInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 14) {
                    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                    value = value.replace(/(\d{4})(\d)/, '$1-$2');
                }
                e.target.value = value;
            });
        }

        // Máscara CEP
        const cepInput = document.getElementById('fiscal-cep');
        if (cepInput) {
            cepInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 8) {
                    value = value.replace(/^(\d{5})(\d)/, '$1-$2');
                }
                e.target.value = value;
            });

            // Busca automática de CEP
            cepInput.addEventListener('blur', async (e) => {
                const cep = e.target.value.replace(/\D/g, '');
                if (cep.length === 8) {
                    await this.searchCEP(cep);
                }
            });
        }
    }

    /**
     * Busca endereço pelo CEP
     */
    async searchCEP(cep) {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                document.getElementById('fiscal-logradouro').value = data.logradouro || '';
                document.getElementById('fiscal-bairro').value = data.bairro || '';
                document.getElementById('fiscal-municipio').value = data.localidade || '';
                document.getElementById('fiscal-uf').value = data.uf || '';
                document.getElementById('fiscal-cod-municipio').value = data.ibge || '';
                
                showToast('✅ Endereço preenchido automaticamente', 'success');
            }
        } catch (error) {
            console.warn('Erro ao buscar CEP:', error);
        }
    }

    /**
     * Salva configurações fiscais
     */
    async saveFiscalSettings() {
        try {
            console.log('💾 Salvando configurações fiscais...');

            // Coletar dados do formulário
            const fiscalData = {
                // Dados da empresa
                razaoSocial: document.getElementById('fiscal-razao-social')?.value?.trim() || '',
                nomeFantasia: document.getElementById('fiscal-nome-fantasia')?.value?.trim() || '',
                cnpj: document.getElementById('fiscal-cnpj')?.value?.replace(/\D/g, '') || '',
                inscricaoEstadual: document.getElementById('fiscal-ie')?.value?.trim() || '',
                inscricaoMunicipal: document.getElementById('fiscal-im')?.value?.trim() || '',
                regimeTributario: document.getElementById('fiscal-regime')?.value || 'simples_nacional',

                // Endereço fiscal
                endereco: {
                    cep: document.getElementById('fiscal-cep')?.value?.replace(/\D/g, '') || '',
                    logradouro: document.getElementById('fiscal-logradouro')?.value?.trim() || '',
                    numero: document.getElementById('fiscal-numero')?.value?.trim() || '',
                    complemento: document.getElementById('fiscal-complemento')?.value?.trim() || '',
                    bairro: document.getElementById('fiscal-bairro')?.value?.trim() || '',
                    municipio: document.getElementById('fiscal-municipio')?.value?.trim() || '',
                    codigoMunicipio: document.getElementById('fiscal-cod-municipio')?.value?.trim() || '',
                    uf: document.getElementById('fiscal-uf')?.value || ''
                },

                // Configurações NFC-e
                nfce: {
                    serie: parseInt(document.getElementById('fiscal-serie')?.value) || 1,
                    proximoNumero: parseInt(document.getElementById('fiscal-proximo-numero')?.value) || 1,
                    ambiente: document.getElementById('fiscal-ambiente')?.value || 'homologacao',
                    csc: document.getElementById('fiscal-csc')?.value?.trim() || '',
                    cscId: document.getElementById('fiscal-csc-id')?.value?.trim() || ''
                },

                // Gateway Fiscal (Serverless - SEM SECRETS NO FRONTEND)
                gateway: {
                    provider: document.getElementById('fiscal-gateway-provider')?.value || '',
                    // apiKey e apiSecret são configurados no Netlify, não no frontend
                    enabled: document.getElementById('fiscal-gateway-enabled')?.checked || false
                },

                // Certificado (placeholder)
                certificado: {
                    tipo: '',
                    validade: null,
                    arquivo: null,
                    senha: ''
                },

                // Opções
                emissaoAutomatica: document.getElementById('fiscal-emissao-automatica')?.checked || false,
                emitirOffline: document.getElementById('fiscal-emitir-offline')?.checked !== false,

                // Metadados
                updatedAt: new Date().toISOString()
            };

            // BLOQUEIO DE SEGURANÇA: Forçar homologação
            fiscalData.nfce.ambiente = 'homologacao';

            // Adicionar createdAt se não existir
            if (!this.currentSettings?.fiscal?.createdAt) {
                fiscalData.createdAt = new Date().toISOString();
            } else {
                fiscalData.createdAt = this.currentSettings.fiscal.createdAt;
            }

            // Atualizar settings
            this.currentSettings.fiscal = fiscalData;

            // Salvar no cache local (IndexedDB)
            await updateInDatabase('settings', this.currentSettings);

            // Reinicializar gateway com novas configurações
            if (window.FiscalService) {
                window.FiscalService.config = fiscalData;
                window.FiscalService.initializeGateway();
                
                // Atualizar status do gateway na UI
                const statusDiv = document.getElementById('gateway-status-indicator');
                if (statusDiv) {
                    statusDiv.innerHTML = this.renderGatewayStatus(fiscalData.gateway);
                }
            }

            // Salvar no Firebase também
            if (window.firebaseService) {
                try {
                    await window.firebaseService.save('settings', this.currentSettings);
                    console.log('✅ Configurações fiscais sincronizadas com Firebase');
                } catch (fbError) {
                    console.warn('⚠️ Erro ao sincronizar com Firebase:', fbError);
                }
            }

            showToast('✅ Configurações fiscais salvas com sucesso!', 'success');
            console.log('✅ Configurações fiscais salvas:', fiscalData);

        } catch (error) {
            console.error('❌ Erro ao salvar configurações fiscais:', error);
            showToast('Erro ao salvar configurações fiscais', 'error');
        }
    }

    /**
     * Valida dados fiscais
     */
    validateFiscalData() {
        const errors = [];
        const warnings = [];

        // Validar CNPJ
        const cnpj = document.getElementById('fiscal-cnpj')?.value?.replace(/\D/g, '') || '';
        if (!cnpj) {
            errors.push('CNPJ é obrigatório');
        } else if (cnpj.length !== 14) {
            errors.push('CNPJ deve ter 14 dígitos');
        } else if (!this.validateCNPJ(cnpj)) {
            errors.push('CNPJ inválido (dígitos verificadores incorretos)');
        }

        // Validar Razão Social
        const razaoSocial = document.getElementById('fiscal-razao-social')?.value?.trim() || '';
        if (!razaoSocial) {
            errors.push('Razão Social é obrigatória');
        } else if (razaoSocial.length < 5) {
            errors.push('Razão Social muito curta');
        }

        // Validar IE
        const ie = document.getElementById('fiscal-ie')?.value?.trim() || '';
        if (!ie) {
            errors.push('Inscrição Estadual é obrigatória (ou informe ISENTO)');
        }

        // Validar Endereço
        const cep = document.getElementById('fiscal-cep')?.value?.replace(/\D/g, '') || '';
        if (!cep || cep.length !== 8) {
            errors.push('CEP inválido (deve ter 8 dígitos)');
        }

        const logradouro = document.getElementById('fiscal-logradouro')?.value?.trim() || '';
        if (!logradouro) {
            errors.push('Logradouro é obrigatório');
        }

        const numero = document.getElementById('fiscal-numero')?.value?.trim() || '';
        if (!numero) {
            errors.push('Número é obrigatório');
        }

        const municipio = document.getElementById('fiscal-municipio')?.value?.trim() || '';
        if (!municipio) {
            errors.push('Município é obrigatório');
        }

        const uf = document.getElementById('fiscal-uf')?.value || '';
        if (!uf) {
            errors.push('UF é obrigatória');
        }

        // Validar NFC-e
        const ambiente = document.getElementById('fiscal-ambiente')?.value || '';
        if (ambiente === 'producao') {
            warnings.push('⚠️ Ambiente de PRODUÇÃO selecionado - notas serão válidas');
        }

        const csc = document.getElementById('fiscal-csc')?.value?.trim() || '';
        if (!csc) {
            warnings.push('CSC não configurado - necessário para emissão de NFC-e');
        }

        // Exibir resultado
        if (errors.length > 0) {
            const errorMessage = '❌ Erros encontrados:\n\n' + errors.map(e => '• ' + e).join('\n');
            alert(errorMessage);
            showToast(`${errors.length} erro(s) encontrado(s)`, 'error');
            return false;
        }

        if (warnings.length > 0) {
            const warningMessage = '⚠️ Avisos:\n\n' + warnings.map(w => '• ' + w).join('\n') + 
                                   '\n\n✅ Nenhum erro crítico encontrado!';
            alert(warningMessage);
            showToast('Dados válidos (com avisos)', 'warning');
            return true;
        }

        showToast('✅ Todos os dados fiscais estão válidos!', 'success');
        return true;
    }

    /**
     * Valida CNPJ
     */
    validateCNPJ(cnpj) {
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

    // ================================================================
    // FILA FISCAL - MÉTODOS DE GERENCIAMENTO
    // ================================================================

    /**
     * Inicializa a fila fiscal na UI
     */
    async initFiscalQueue() {
        // Verificar se FiscalService está disponível
        if (!window.FiscalService) {
            console.warn('⚠️ FiscalService não disponível');
            return;
        }

        // Atualizar exibição da fila
        await this.refreshFiscalQueue();

        // Configurar event listeners para ações da fila
        this.setupFiscalQueueListeners();
    }

    /**
     * Configura event listeners para ações da fila fiscal
     */
    setupFiscalQueueListeners() {
        // Botão atualizar fila
        const refreshBtn = document.getElementById('refresh-queue-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshFiscalQueue());
        }

        // Botão limpar cancelados
        const clearCancelledBtn = document.getElementById('clear-cancelled-btn');
        if (clearCancelledBtn) {
            clearCancelledBtn.addEventListener('click', () => this.clearCancelledItems());
        }

        // Delegação de eventos para ações da tabela
        const queueBody = document.getElementById('fiscal-queue-body');
        if (queueBody) {
            queueBody.addEventListener('click', (e) => this.handleQueueAction(e));
        }
    }

    /**
     * Atualiza a exibição da fila fiscal
     */
    async refreshFiscalQueue() {
        try {
            if (!window.FiscalService) {
                console.warn('⚠️ FiscalService não disponível');
                return;
            }

            // Obter status da fila
            const status = window.FiscalService.getQueueStatus();
            const queue = window.FiscalService.getQueue();

            // Atualizar resumo
            this.updateQueueSummary(status);

            // Atualizar tabela
            this.renderQueueTable(queue);

            console.log('📋 Fila fiscal atualizada:', status);

        } catch (error) {
            console.error('❌ Erro ao atualizar fila fiscal:', error);
            showToast('Erro ao atualizar fila fiscal', 'error');
        }
    }

    /**
     * Atualiza o resumo da fila
     */
    updateQueueSummary(status) {
        const totalEl = document.getElementById('queue-total');
        const pendingEl = document.getElementById('queue-pending');
        const processingEl = document.getElementById('queue-processing');
        const authorizedEl = document.getElementById('queue-authorized');
        const errorsEl = document.getElementById('queue-errors');

        if (totalEl) totalEl.textContent = status.total || 0;
        if (pendingEl) pendingEl.textContent = (status.pending || 0) + (status.queued || 0);
        if (processingEl) processingEl.textContent = status.processing || 0;
        if (authorizedEl) authorizedEl.textContent = status.authorized || 0;
        if (errorsEl) errorsEl.textContent = status.errors || 0;
    }

    /**
     * Renderiza a tabela da fila fiscal
     */
    renderQueueTable(queue) {
        const tbody = document.getElementById('fiscal-queue-body');
        if (!tbody) return;

        if (!queue || queue.length === 0) {
            tbody.innerHTML = `
                <tr class="queue-empty-row">
                    <td colspan="8">
                        <i class="fas fa-inbox"></i> Fila fiscal vazia
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = queue.map(item => this.renderQueueRow(item)).join('');
    }

    /**
     * Renderiza uma linha da tabela
     */
    renderQueueRow(item) {
        const statusClass = this.getStatusClass(item.status);
        const statusLabel = item.statusLabel?.label || item.statusLabel || item.status;
        const formattedDate = this.formatQueueDate(item.date || item.queuedAt);
        const formattedTotal = this.formatCurrency(item.total);
        const lastError = item.lastError ? this.truncateText(item.lastError, 30) : '-';
        const actions = this.getQueueActions(item);
        
        // Exibir tentativas como X/MAX
        const maxAttempts = item.maxAttempts || 3;
        const attemptsDisplay = `${item.attempts || 0}/${maxAttempts}`;
        const attemptsClass = (item.attempts >= maxAttempts) ? 'attempts-max' : '';

        return `
            <tr data-order-id="${item.orderId}">
                <td><strong>#${item.orderNumber || item.orderId.slice(-6)}</strong></td>
                <td>${item.customerName || 'Cliente'}</td>
                <td>${formattedDate}</td>
                <td>${formattedTotal}</td>
                <td><span class="queue-status ${statusClass}">${statusLabel}</span></td>
                <td class="${attemptsClass}">${attemptsDisplay}</td>
                <td class="error-cell" title="${item.lastError || ''}">${lastError}</td>
                <td class="actions-cell">${actions}</td>
            </tr>
        `;
    }

    /**
     * Retorna classe CSS para o status
     */
    getStatusClass(status) {
        const classes = {
            'pending': 'status-pending',
            'queued': 'status-queued',
            'processing': 'status-processing',
            'authorized': 'status-authorized',
            'denied': 'status-denied',
            'cancelled': 'status-cancelled',
            'error': 'status-error'
        };
        return classes[status] || 'status-pending';
    }

    /**
     * Gera botões de ação baseado no status
     */
    getQueueActions(item) {
        const actions = [];

        switch (item.status) {
            case 'queued':
            case 'pending':
                actions.push(`
                    <button class="btn-action btn-process" data-action="process" title="Processar">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="btn-action btn-cancel" data-action="cancel" title="Cancelar">
                        <i class="fas fa-times"></i>
                    </button>
                `);
                break;

            case 'error':
                actions.push(`
                    <button class="btn-action btn-retry" data-action="retry" title="Reprocessar">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="btn-action btn-cancel" data-action="cancel" title="Cancelar">
                        <i class="fas fa-times"></i>
                    </button>
                `);
                break;

            case 'cancelled':
                actions.push(`
                    <button class="btn-action btn-remove" data-action="remove" title="Remover da fila">
                        <i class="fas fa-trash"></i>
                    </button>
                `);
                break;

            case 'authorized':
                actions.push(`
                    <span class="action-done"><i class="fas fa-check-circle"></i> OK</span>
                `);
                break;

            case 'processing':
                actions.push(`
                    <span class="action-processing"><i class="fas fa-spinner fa-spin"></i></span>
                `);
                break;
        }

        return actions.join('');
    }

    /**
     * Manipula ações da fila (delegação de eventos)
     */
    async handleQueueAction(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const row = btn.closest('tr');
        const orderId = row?.dataset?.orderId;

        if (!orderId) {
            console.error('ID do pedido não encontrado');
            return;
        }

        // Desabilitar botão durante a ação
        btn.disabled = true;

        try {
            let result;

            switch (action) {
                case 'process':
                    // Usar processQueueItem que integra com o gateway
                    result = await window.FiscalService.processQueueItem(orderId);
                    break;

                case 'retry':
                    result = await window.FiscalService.reprocessQueueItem(orderId);
                    break;

                case 'cancel':
                    if (confirm('Deseja realmente cancelar este item da fila fiscal?')) {
                        result = await window.FiscalService.cancelQueueItem(orderId);
                    }
                    break;

                case 'remove':
                    if (confirm('Deseja remover este item da fila?')) {
                        result = await window.FiscalService.removeFromQueue(orderId);
                    }
                    break;
            }

            // Atualizar fila após ação
            await this.refreshFiscalQueue();

        } catch (error) {
            console.error('❌ Erro na ação da fila:', error);
            showToast('Erro ao executar ação', 'error');
        } finally {
            btn.disabled = false;
        }
    }

    /**
     * Limpa itens cancelados da fila
     */
    async clearCancelledItems() {
        try {
            if (!window.FiscalService) return;

            const queue = window.FiscalService.getQueue();
            const cancelledItems = queue.filter(item => item.status === 'cancelled');

            if (cancelledItems.length === 0) {
                showToast('Não há itens cancelados para remover', 'info');
                return;
            }

            if (!confirm(`Deseja remover ${cancelledItems.length} item(s) cancelado(s)?`)) {
                return;
            }

            for (const item of cancelledItems) {
                await window.FiscalService.removeFromQueue(item.orderId);
            }

            await this.refreshFiscalQueue();
            showToast(`${cancelledItems.length} item(s) removido(s)`, 'success');

        } catch (error) {
            console.error('❌ Erro ao limpar cancelados:', error);
            showToast('Erro ao limpar itens cancelados', 'error');
        }
    }

    /**
     * Formata data para exibição
     */
    formatQueueDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR') + ' ' + 
                   date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '-';
        }
    }

    /**
     * Formata valor monetário
     */
    formatCurrency(value) {
        const num = parseFloat(value) || 0;
        return 'R$ ' + num.toFixed(2).replace('.', ',');
    }

    /**
     * Trunca texto longo
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Método público para obter template formatado
     */
    getWhatsAppTemplate(templateKey, variables = {}) {
        const template = this.whatsappTemplates[templateKey];
        if (!template) return null;

        let message = template.template;

        // Substituir variáveis
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            message = message.replace(regex, value || '');
        });

        return {
            icon: template.icon,
            title: template.title,
            body: message
        };
    }
}

// Instância global
window.ConfiguracoesModule = ConfiguracoesModule;

export function initConfiguracoesModule() {
    const module = new ConfiguracoesModule();
    return module.init();
}
