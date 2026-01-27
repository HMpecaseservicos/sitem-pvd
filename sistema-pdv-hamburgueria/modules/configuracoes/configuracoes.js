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

    setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`tab-${tabId}`).classList.add('active');
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
