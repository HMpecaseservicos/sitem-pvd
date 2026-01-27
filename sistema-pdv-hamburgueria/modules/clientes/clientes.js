/**
 * Módulo de Gestão de Clientes
 * Sistema CRM completo para gerenciamento de clientes e relacionamento
 * 
 * @author Sistema PDV Hamburgueria
 * @version 2.0.1
 * @since 24/11/2025
 * @updated 08/12/2025 18:12 - Adicionado atributo name a todos os campos
 */

import { 
    formatCurrency, 
    formatDateTime, 
    formatDate,
    formatPhone,
    generateId,
    showToast,
    validateEmail,
    validateCPF,
    validatePhone,
    saveToDatabase,
    updateInDatabase,
    getFromDatabase,
    deleteFromDatabase,
    searchInDatabase,
    paginateData
} from '../shared/utils.js';

export default class ClientesModule {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 50; // Aumentado de 15 para 50 para mostrar mais clientes
        this.currentFilters = {
            search: '',
            status: '',
            segment: '',
            city: ''
        };
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.selectedCustomers = new Set();
        this.currentCustomer = null;
        
        this.customerSegments = {
            vip: { label: 'VIP', color: '#ffd700', minSpent: 500 },
            regular: { label: 'Regular', color: '#28a745', minSpent: 200 },
            new: { label: 'Novo', color: '#17a2b8', minSpent: 0 }
        };
        
        this.init();
    }

    async init() {
        console.log('📋 Inicializando módulo de Clientes...');
        await this.loadCustomers();
        this.setupEventListeners();
        this.updateCustomersDisplay();
        this.updateStatistics();
        
        // Expor globalmente
        window.clientesModule = this;
        
        console.log('✅ Módulo Clientes inicializado com sucesso');
    }

    setupEventListeners() {
        // Usar event delegation no documento para pegar eventos dos botões
        document.addEventListener('click', (e) => {
            // Botão Novo Cliente
            if (e.target.id === 'add-customer' || e.target.closest('#add-customer')) {
                e.preventDefault();
                console.log('🆕 Botão Novo Cliente clicado', e.target);
                
                // Verificar se o módulo está disponível
                if (window.clientesModule) {
                    console.log('✅ Módulo encontrado, chamando showCustomerModal...');
                    window.clientesModule.showCustomerModal();
                } else {
                    console.error('❌ window.clientesModule não encontrado!');
                }
                return;
            }
            
            // Botão Exportar
            if (e.target.id === 'export-customers' || e.target.closest('#export-customers')) {
                e.preventDefault();
                this.exportCustomers();
                return;
            }
        });
        
        // Busca
        const searchInput = document.getElementById('customers-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = searchInput.value;
                    this.currentPage = 1;
                    this.updateCustomersDisplay();
                }, 300);
            });
        }

        // Filtros
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.currentFilters.status = statusFilter.value;
                this.currentPage = 1;
                this.updateCustomersDisplay();
            });
        }

        const segmentFilter = document.getElementById('segment-filter');
        if (segmentFilter) {
            segmentFilter.addEventListener('change', () => {
                this.currentFilters.segment = segmentFilter.value;
                this.currentPage = 1;
                this.updateCustomersDisplay();
            });
        }
        
        console.log('✅ Event listeners configurados com event delegation');
    }

    async loadCustomers() {
        try {
            this.customers = await getFromDatabase('customers') || [];
            
            // Calcular segmentos dos clientes baseado no histórico de pedidos
            for (const customer of this.customers) {
                await this.calculateCustomerSegment(customer);
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            this.customers = [];
        }
    }

    async calculateCustomerSegment(customer) {
        try {
            const orders = await getFromDatabase('orders', null, { 'customer.id': customer.id });
            const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
            const orderCount = orders.length;
            
            customer.totalSpent = totalSpent;
            customer.orderCount = orderCount;
            
            // Corrigido: usar createdAt ao invés de date, e validar se é uma data válida
            if (orders.length > 0) {
                const dates = orders
                    .map(o => o.createdAt || o.date)
                    .filter(d => d && !isNaN(new Date(d).getTime()))
                    .map(d => new Date(d).getTime());
                
                customer.lastOrderDate = dates.length > 0 ? Math.max(...dates) : null;
            } else {
                customer.lastOrderDate = null;
            }
            
            // Definir segmento
            if (totalSpent >= this.customerSegments.vip.minSpent) {
                customer.segment = 'vip';
            } else if (totalSpent >= this.customerSegments.regular.minSpent) {
                customer.segment = 'regular';
            } else {
                customer.segment = 'new';
            }
            
            // Atualizar no banco
            await updateInDatabase('customers', customer);
        } catch (error) {
            console.error('Erro ao calcular segmento do cliente:', error);
        }
    }

    async updateCustomersDisplay() {
        try {
            let customers;

            if (this.currentFilters.search) {
                customers = await searchInDatabase('customers', this.currentFilters.search, ['name', 'email', 'phone', 'cpf']);
            } else {
                const filters = {};
                if (this.currentFilters.status) {
                    filters.active = this.currentFilters.status === 'active';
                }
                if (this.currentFilters.segment) {
                    filters.segment = this.currentFilters.segment;
                }

                const result = await paginateData('customers', {
                    page: this.currentPage,
                    limit: this.itemsPerPage,
                    filters,
                    sortBy: this.sortBy,
                    sortOrder: this.sortOrder
                });
                
                customers = result.data;
                this.updatePagination(result.pagination);
            }

            await this.renderCustomersList(customers);
            // Stats serão atualizados pelo dashboard
        } catch (error) {
            console.error('Erro ao atualizar display de clientes:', error);
            showToast('Erro ao carregar clientes', 'error');
        }
    }

    async renderCustomersList(customers) {
        const tbody = document.getElementById('customers-tbody');
        if (!tbody) {
            console.error('❌ Elemento #customers-tbody não encontrado');
            return;
        }

        if (customers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-users"></i>
                            <h3>Nenhum cliente encontrado</h3>
                            <p>Não há clientes cadastrados ainda.</p>
                            <button class="btn btn-primary" onclick="window.clientesModule.showCustomerModal()">
                                <i class="fas fa-plus"></i> Adicionar Cliente
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Buscar todos os pedidos para calcular valores reais
        const orders = await getFromDatabase('orders');
        
        // Calcular estatísticas para cada cliente
        const customersWithStats = customers.map(customer => {
            const customerOrders = orders.filter(order => 
                order.customerId === customer.id || 
                order.customer?.id === customer.id ||
                order.customer?.phone === customer.phone
            );
            
            return {
                ...customer,
                totalOrders: customerOrders.length,
                totalSpent: customerOrders.reduce((sum, order) => sum + (order.total || 0), 0),
                lastOrder: customerOrders.length > 0 
                    ? Math.max(...customerOrders.map(o => new Date(o.createdAt || o.date).getTime()))
                    : null
            };
        });

        tbody.innerHTML = customersWithStats.map(customer => `
            <tr>
                <td>
                    <div class="customer-info">
                        <strong>${customer.name || 'N/A'}</strong>
                        ${customer.cpf ? `<small>CPF: ${customer.cpf}</small>` : ''}
                    </div>
                </td>
                <td>
                    <div>${customer.phone || 'N/A'}</div>
                    ${customer.email ? `<small>${customer.email}</small>` : ''}
                </td>
                <td>${customer.totalOrders}</td>
                <td>${formatCurrency(customer.totalSpent)}</td>
                <td>${customer.lastOrder ? formatDate(new Date(customer.lastOrder)) : 'Nunca'}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="window.clientesModule.sendWhatsApp('${customer.phone}', '${customer.name}')" title="WhatsApp" ${!customer.phone ? 'disabled' : ''}>
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.clientesModule.editCustomer('${customer.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.clientesModule.deleteCustomer('${customer.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        console.log(`📋 ${customers.length} clientes renderizados`);
    }

    updatePagination(pagination) {
        const container = document.getElementById('pagination-container');
        if (!container) return;

        container.innerHTML = `
            <div class="pagination-info">
                Mostrando ${Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} a 
                ${Math.min(pagination.page * pagination.limit, pagination.total)} de 
                ${pagination.total} clientes
            </div>
            
            <div class="pagination-controls">
                <button class="btn btn-sm ${!pagination.hasPrev ? 'btn-secondary' : 'btn-primary'}"
                        ${!pagination.hasPrev ? 'disabled' : ''}
                        onclick="window.clientesModule.goToPage(${pagination.page - 1})">
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
                
                <span class="page-info">Página ${pagination.page} de ${pagination.totalPages}</span>
                
                <button class="btn btn-sm ${!pagination.hasNext ? 'btn-secondary' : 'btn-primary'}"
                        ${!pagination.hasNext ? 'disabled' : ''}
                        onclick="window.clientesModule.goToPage(${pagination.page + 1})">
                    Próxima <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    async updateStatistics() {
        try {
            const customers = await getFromDatabase('customers');
            const orders = await getFromDatabase('orders');
            const today = new Date();
            const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            
            // Calcular estatísticas baseadas em pedidos reais
            let totalOrderValue = 0;
            let totalOrderCount = 0;
            
            customers.forEach(customer => {
                const customerOrders = orders.filter(order => 
                    order.customerId === customer.id || 
                    order.customer?.id === customer.id ||
                    order.customer?.phone === customer.phone
                );
                
                customerOrders.forEach(order => {
                    totalOrderValue += order.total || 0;
                    totalOrderCount++;
                });
            });
            
            const stats = {
                totalCustomers: customers.length,
                activeCustomers: customers.filter(c => c.active !== false).length,
                vipCustomers: customers.filter(c => c.segment === 'vip').length,
                newCustomersThisMonth: customers.filter(c => 
                    new Date(c.createdAt) >= thisMonth).length,
                averageOrderValue: totalOrderCount > 0 ? totalOrderValue / totalOrderCount : 0,
                totalRevenue: totalOrderValue,
                totalOrders: totalOrderCount
            };

            console.log('📊 [CLIENTES] Estatísticas calculadas:', {
                clientes: stats.totalCustomers,
                pedidos: stats.totalOrders,
                receita: stats.totalRevenue,
                ticketMedio: stats.averageOrderValue
            });

            this.displayStatistics(stats);
        } catch (error) {
            console.error('Erro ao calcular estatísticas:', error);
        }
    }

    displayStatistics(stats) {
        const elements = {
            totalCustomers: document.getElementById('total-customers'),
            activeCustomers: document.getElementById('active-customers'),
            avgCustomerValue: document.getElementById('avg-customer-value')
        };

        console.log('📊 [CLIENTES] Atualizando estatísticas:', stats);

        if (elements.totalCustomers) {
            elements.totalCustomers.textContent = stats.totalCustomers;
            console.log('✅ Total de clientes atualizado:', stats.totalCustomers);
        }
        if (elements.activeCustomers) {
            elements.activeCustomers.textContent = stats.activeCustomers;
            console.log('✅ Clientes ativos atualizado:', stats.activeCustomers);
        }
        if (elements.avgCustomerValue) {
            elements.avgCustomerValue.textContent = formatCurrency(stats.averageOrderValue);
            console.log('✅ Ticket médio atualizado:', stats.averageOrderValue);
        }
    }

    showCustomerModal(customer = null) {
        console.log('📝 showCustomerModal chamado', { customer, isEdit: !!customer });
        
        const isEdit = !!customer;
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-content customer-modal">
                <div class="modal-header">
                    <h2>${isEdit ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                    <button class="close-modal">&times;</button>
                </div>
                
                <form id="customer-form" class="modal-body" novalidate>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="customer-name">Nome *</label>
                            <input type="text" id="customer-name" name="name"
                                   value="${customer?.name || ''}" placeholder="Nome completo">
                        </div>
                        <div class="form-group">
                            <label for="customer-email">Email</label>
                            <input type="email" id="customer-email" name="email"
                                   value="${customer?.email || ''}" placeholder="email@exemplo.com">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="customer-phone">Telefone *</label>
                            <input type="tel" id="customer-phone" name="phone"
                                   value="${customer?.phone || ''}" placeholder="(11) 99999-9999">
                        </div>
                        <div class="form-group">
                            <label for="customer-cpf">CPF</label>
                            <input type="text" id="customer-cpf" name="cpf"
                                   value="${customer?.cpf || ''}" placeholder="000.000.000-00">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="customer-birthdate">Data de Nascimento</label>
                            <input type="date" id="customer-birthdate" name="birthdate"
                                   value="${customer?.birthDate || ''}">
                        </div>
                        <div class="form-group">
                            <label for="customer-gender">Gênero</label>
                            <select id="customer-gender" name="gender">
                                <option value="">Não informado</option>
                                <option value="M" ${customer?.gender === 'M' ? 'selected' : ''}>Masculino</option>
                                <option value="F" ${customer?.gender === 'F' ? 'selected' : ''}>Feminino</option>
                                <option value="O" ${customer?.gender === 'O' ? 'selected' : ''}>Outro</option>
                            </select>
                        </div>
                    </div>

                    <fieldset class="address-fieldset">
                        <legend>Endereço</legend>
                        
                        <div class="form-row">
                            <div class="form-group flex-3">
                                <label for="address-street">Rua</label>
                                <input type="text" id="address-street" name="street"
                                       value="${customer?.address?.street || ''}" placeholder="Nome da rua">
                            </div>
                            <div class="form-group flex-1">
                                <label for="address-number">Número</label>
                                <input type="text" id="address-number" name="number"
                                       value="${customer?.address?.number || ''}" placeholder="123">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="address-complement">Complemento</label>
                                <input type="text" id="address-complement" name="complement"
                                       value="${customer?.address?.complement || ''}" placeholder="Apto, bloco, etc.">
                            </div>
                            <div class="form-group">
                                <label for="address-neighborhood">Bairro</label>
                                <input type="text" id="address-neighborhood" name="neighborhood"
                                       value="${customer?.address?.neighborhood || ''}" placeholder="Nome do bairro">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="address-city">Cidade</label>
                                <input type="text" id="address-city" name="city"
                                       value="${customer?.address?.city || ''}" placeholder="Nome da cidade">
                            </div>
                            <div class="form-group">
                                <label for="address-state">Estado</label>
                                <input type="text" id="address-state" name="state" maxlength="2"
                                       value="${customer?.address?.state || ''}" placeholder="SP">
                            </div>
                            <div class="form-group">
                                <label for="address-cep">CEP</label>
                                <input type="text" id="address-cep" name="cep"
                                       value="${customer?.address?.cep || ''}" placeholder="00000-000">
                            </div>
                        </div>
                    </fieldset>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="customer-notes">Observações</label>
                            <textarea id="customer-notes" name="notes" rows="3" 
                                      placeholder="Anotações sobre o cliente...">${customer?.notes || ''}</textarea>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="customer-active" name="active"
                                       ${customer?.active !== false ? 'checked' : ''}>
                                Cliente ativo
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="customer-newsletter" name="newsletter"
                                       ${customer?.newsletter ? 'checked' : ''}>
                                Receber newsletter
                            </label>
                        </div>
                    </div>
                </form>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" form="customer-form">
                        <i class="fas fa-save"></i> ${isEdit ? 'Atualizar' : 'Salvar'}
                    </button>
                </div>
            </div>
        `;

        // Adicionar estilos inline para garantir visibilidade
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        document.body.appendChild(modal);
        console.log('✅ Modal adicionado ao DOM');

        // Event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            console.log('❌ Fechando modal');
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('❌ Fechando modal (clique fora)');
                modal.remove();
            }
        });

        // Formatação automática de campos
        const phoneInput = modal.querySelector('#customer-phone');
        phoneInput.addEventListener('input', (e) => {
            e.target.value = formatPhone(e.target.value);
        });

        const cpfInput = modal.querySelector('#customer-cpf');
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });

        // Submit do formulário
        modal.querySelector('#customer-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveCustomer(modal, isEdit, customer?.id);
        });
    }

    async saveCustomer(modal, isEdit, customerId) {
        try {
            const formData = new FormData(modal.querySelector('#customer-form'));
            const customerData = {
                id: isEdit ? customerId : generateId(),
                name: modal.querySelector('#customer-name').value.trim(),
                email: modal.querySelector('#customer-email').value.trim(),
                phone: modal.querySelector('#customer-phone').value.trim(),
                cpf: modal.querySelector('#customer-cpf').value.trim(),
                birthDate: modal.querySelector('#customer-birthdate').value,
                gender: modal.querySelector('#customer-gender').value,
                address: {
                    street: modal.querySelector('#address-street').value.trim(),
                    number: modal.querySelector('#address-number').value.trim(),
                    complement: modal.querySelector('#address-complement').value.trim(),
                    neighborhood: modal.querySelector('#address-neighborhood').value.trim(),
                    city: modal.querySelector('#address-city').value.trim(),
                    state: modal.querySelector('#address-state').value.trim(),
                    cep: modal.querySelector('#address-cep').value.trim()
                },
                notes: modal.querySelector('#customer-notes').value.trim(),
                active: modal.querySelector('#customer-active').checked,
                newsletter: modal.querySelector('#customer-newsletter').checked
            };

            // Validações
            if (!customerData.name) {
                showToast('Nome é obrigatório', 'error');
                return;
            }

            if (!customerData.phone) {
                showToast('Telefone é obrigatório', 'error');
                return;
            }

            if (customerData.email && !validateEmail(customerData.email)) {
                showToast('Email inválido', 'error');
                return;
            }

            if (customerData.cpf && !validateCPF(customerData.cpf)) {
                showToast('CPF inválido', 'error');
                return;
            }

            if (!validatePhone(customerData.phone)) {
                showToast('Telefone inválido', 'error');
                return;
            }

            // Salvar no banco
            if (isEdit) {
                await updateInDatabase('customers', customerData);
                showToast('Cliente atualizado com sucesso!', 'success');
            } else {
                await saveToDatabase('customers', customerData);
                showToast('Cliente criado com sucesso!', 'success');
            }

            modal.remove();
            this.updateCustomersDisplay();
            this.updateStatistics();

        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            showToast('Erro ao salvar cliente', 'error');
        }
    }

    async viewCustomerDetails(customerId) {
        try {
            const customer = await getFromDatabase('customers', customerId);
            if (!customer) {
                showToast('Cliente não encontrado', 'error');
                return;
            }

            const orders = await getFromDatabase('orders', null, { 'customer.id': customerId });
            
            // Implementar modal de detalhes
            this.showCustomerDetailsModal(customer, orders);
        } catch (error) {
            console.error('Erro ao carregar detalhes do cliente:', error);
            showToast('Erro ao carregar cliente', 'error');
        }
    }

    showCustomerDetailsModal(customer, orders) {
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-content customer-details-modal">
                <div class="modal-header">
                    <h2>Detalhes do Cliente</h2>
                    <button class="close-modal">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="customer-summary">
                        <div class="customer-avatar-large">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="customer-info">
                            <h3>${customer.name}</h3>
                            <p>${customer.email || 'Email não informado'}</p>
                            <p>${formatPhone(customer.phone)}</p>
                            <span class="segment-badge" 
                                  style="background: ${this.customerSegments[customer.segment]?.color}">
                                ${this.customerSegments[customer.segment]?.label}
                            </span>
                        </div>
                        <div class="customer-stats-summary">
                            <div class="stat-item">
                                <span class="stat-value">${formatCurrency(customer.totalSpent || 0)}</span>
                                <span class="stat-label">Total Gasto</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${customer.orderCount || 0}</span>
                                <span class="stat-label">Pedidos</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${customer.orderCount > 0 ? formatCurrency((customer.totalSpent || 0) / customer.orderCount) : formatCurrency(0)}</span>
                                <span class="stat-label">Ticket Médio</span>
                            </div>
                        </div>
                    </div>

                    <div class="customer-details-tabs">
                        <div class="tabs">
                            <button class="tab-button active" data-tab="info">Informações</button>
                            <button class="tab-button" data-tab="orders">Pedidos (${orders.length})</button>
                            <button class="tab-button" data-tab="analytics">Análise</button>
                        </div>

                        <div id="tab-info" class="tab-content active">
                            <div class="info-grid">
                                <div class="info-section">
                                    <h4>Dados Pessoais</h4>
                                    <div class="info-item">
                                        <label>CPF:</label>
                                        <span>${customer.cpf || 'Não informado'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Data de Nascimento:</label>
                                        <span>${customer.birthDate ? formatDate(customer.birthDate) : 'Não informada'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Gênero:</label>
                                        <span>${customer.gender === 'M' ? 'Masculino' : customer.gender === 'F' ? 'Feminino' : 'Não informado'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Status:</label>
                                        <span class="status-badge ${customer.active !== false ? 'active' : 'inactive'}">
                                            ${customer.active !== false ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                </div>

                                ${customer.address && (customer.address.street || customer.address.city) ? `
                                    <div class="info-section">
                                        <h4>Endereço</h4>
                                        <div class="address-display">
                                            ${customer.address.street ? `${customer.address.street}, ${customer.address.number || 'S/N'}` : ''}<br>
                                            ${customer.address.complement ? `${customer.address.complement}<br>` : ''}
                                            ${customer.address.neighborhood ? `${customer.address.neighborhood} - ` : ''}
                                            ${customer.address.city || ''} ${customer.address.state || ''}<br>
                                            ${customer.address.cep || ''}
                                        </div>
                                    </div>
                                ` : ''}

                                ${customer.notes ? `
                                    <div class="info-section">
                                        <h4>Observações</h4>
                                        <div class="notes-display">
                                            ${customer.notes}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <div id="tab-orders" class="tab-content">
                            <div class="orders-list">
                                ${orders.length === 0 ? 
                                    '<p class="no-orders">Este cliente ainda não fez pedidos.</p>' :
                                    orders.slice(0, 10).map(order => `
                                        <div class="order-item">
                                            <div class="order-info">
                                                <span class="order-number">#${order.orderNumber || order.id.slice(-8)}</span>
                                                <span class="order-date">${formatDateTime(order.date)}</span>
                                            </div>
                                            <div class="order-total">${formatCurrency(order.total)}</div>
                                            <div class="order-status">
                                                <span class="status-badge">${order.status}</span>
                                            </div>
                                        </div>
                                    `).join('')
                                }
                                ${orders.length > 10 ? `<p class="more-orders">E mais ${orders.length - 10} pedidos...</p>` : ''}
                            </div>
                        </div>

                        <div id="tab-analytics" class="tab-content">
                            <div class="analytics-grid">
                                <div class="analytics-item">
                                    <h5>Frequência de Pedidos</h5>
                                    <p>${orders.length > 0 ? `${(orders.length / Math.max(1, Math.ceil((Date.now() - new Date(customer.createdAt)) / (1000 * 60 * 60 * 24 * 30)))).toFixed(1)} pedidos/mês` : 'Nenhum pedido'}</p>
                                </div>
                                <div class="analytics-item">
                                    <h5>Último Pedido</h5>
                                    <p>${customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'Nunca'}</p>
                                </div>
                                <div class="analytics-item">
                                    <h5>Cliente desde</h5>
                                    <p>${formatDate(customer.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Fechar
                    </button>
                    <button class="btn btn-warning" onclick="window.clientesModule.editCustomer('${customer.id}'); this.closest('.modal').remove();">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-info" onclick="window.clientesModule.createOrderForCustomer('${customer.id}')">
                        <i class="fas fa-plus"></i> Novo Pedido
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Tabs
        modal.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                
                // Remover active de todos
                modal.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Adicionar active no selecionado
                button.classList.add('active');
                modal.querySelector(`#tab-${tabId}`).classList.add('active');
            });
        });
    }

    async editCustomer(customerId) {
        try {
            const customer = await getFromDatabase('customers', customerId);
            if (!customer) {
                showToast('Cliente não encontrado', 'error');
                return;
            }

            this.showCustomerModal(customer);
        } catch (error) {
            console.error('Erro ao carregar cliente para edição:', error);
            showToast('Erro ao carregar cliente', 'error');
        }
    }

    async deleteCustomer(customerId) {
        if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            await deleteFromDatabase('customers', customerId);
            showToast('Cliente excluído com sucesso!', 'success');
            this.updateCustomersDisplay();
            this.updateStatistics();
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            showToast('Erro ao excluir cliente', 'error');
        }
    }

    async viewCustomerOrders(customerId) {
        // Redirecionar para o módulo de pedidos com filtro do cliente
        if (window.moduleManager) {
            window.moduleManager.navigateTo('pedidos', { customerId });
        }
    }

    createOrderForCustomer(customerId) {
        // Redirecionar para PDV com cliente selecionado
        if (window.moduleManager) {
            window.moduleManager.navigateTo('pdv', { customerId });
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.updateCustomersDisplay();
    }

    updateBulkActionsVisibility() {
        const container = document.getElementById('bulk-actions-container');
        if (container) {
            container.style.display = this.selectedCustomers.size > 0 ? 'block' : 'none';
        }
    }

    async handleBulkAction(action) {
        if (this.selectedCustomers.size === 0) return;

        switch (action) {
            case 'export':
                await this.exportSelectedCustomers();
                break;
            case 'newsletter':
                await this.updateNewsletterPreference(true);
                break;
            case 'activate':
                await this.updateCustomersStatus(true);
                break;
            case 'deactivate':
                await this.updateCustomersStatus(false);
                break;
        }
    }

    async exportCustomers() {
        try {
            const customers = await getFromDatabase('customers');
            const data = {
                exportDate: new Date().toISOString(),
                totalCustomers: customers.length,
                customers: customers
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `clientes-${formatDate()}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            showToast('Clientes exportados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar clientes:', error);
            showToast('Erro ao exportar clientes', 'error');
        }
    }

    /**
     * Envia mensagem pelo WhatsApp
     */
    sendWhatsApp(phone, name) {
        try {
            if (!phone) {
                showToast('Cliente não possui telefone cadastrado', 'error');
                return;
            }

            // Limpar telefone (remover caracteres especiais)
            const cleanPhone = phone.replace(/\D/g, '');
            
            // Verificar se tem DDD e código do país
            let fullPhone = cleanPhone;
            if (cleanPhone.length === 11) {
                // Adicionar código do Brasil
                fullPhone = '55' + cleanPhone;
            } else if (cleanPhone.length === 10) {
                // Adicionar código do Brasil e 9 no celular
                fullPhone = '55' + cleanPhone.substring(0, 2) + '9' + cleanPhone.substring(2);
            }

            // Mensagem padrão
            const message = `Olá ${name}! Tudo bem? Aqui é da hamburgueria. Como posso ajudar?`;
            
            // Criar URL do WhatsApp
            const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
            
            // Abrir em nova aba
            window.open(whatsappUrl, '_blank');
            
            console.log(`📱 WhatsApp aberto para ${name} (${fullPhone})`);
        } catch (error) {
            console.error('Erro ao abrir WhatsApp:', error);
            showToast('Erro ao abrir WhatsApp', 'error');
        }
    }

    // Método para ser chamado quando o módulo for ativado
    activate() {
        console.log('Módulo de Clientes ativado');
        this.updateCustomersDisplay();
        this.updateStatistics();
    }

    // Método para ser chamado quando o módulo for desativado
    deactivate() {
        console.log('Módulo de Clientes desativado');
    }
}

// Disponibilizar globalmente para compatibilidade
window.ClientesModule = ClientesModule;