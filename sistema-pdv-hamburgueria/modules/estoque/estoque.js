/**
 * Módulo de Gestão de Estoque
 * Sistema completo para controle de inventário, movimentações e alertas
 * 
 * @author Sistema PDV Hamburgueria
 * @version 2.0.0
 * @since 24/11/2025
 */

import { 
    formatCurrency, 
    formatDateTime, 
    formatDate,
    generateId,
    showToast,
    saveToDatabase,
    updateInDatabase,
    getFromDatabase,
    deleteFromDatabase,
    searchInDatabase,
    paginateData
} from '../shared/utils.js';

export default class EstoqueModule {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentFilters = {
            search: '',
            category: '',
            status: '',
            supplier: ''
        };
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.selectedItems = new Set();
        
        this.stockStatuses = {
            in_stock: { label: 'Em Estoque', color: '#28a745', icon: 'fas fa-check-circle' },
            low_stock: { label: 'Estoque Baixo', color: '#ffc107', icon: 'fas fa-exclamation-triangle' },
            out_of_stock: { label: 'Sem Estoque', color: '#dc3545', icon: 'fas fa-times-circle' },
            discontinued: { label: 'Descontinuado', color: '#6c757d', icon: 'fas fa-ban' }
        };
        
        this.movementTypes = {
            entrada: { label: 'Entrada', color: '#28a745', icon: 'fas fa-arrow-up' },
            saida: { label: 'Saída', color: '#dc3545', icon: 'fas fa-arrow-down' },
            ajuste: { label: 'Ajuste', color: '#17a2b8', icon: 'fas fa-balance-scale' },
            perda: { label: 'Perda', color: '#fd7e14', icon: 'fas fa-trash' },
            devolucao: { label: 'Devolução', color: '#6f42c1', icon: 'fas fa-undo' }
        };
        
        this.init();
    }

    async init() {
        console.log('Inicializando módulo de Estoque...');
        await this.loadInventoryItems();
        this.setupEventListeners();
        this.updateInventoryDisplay();
        this.updateStatistics();
        this.checkLowStock();
    }

    setupEventListeners() {
        // Busca
        const searchInput = document.getElementById('inventory-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = searchInput.value;
                    this.currentPage = 1;
                    this.updateInventoryDisplay();
                }, 300);
            });
        }

        // Filtros
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.currentFilters.category = categoryFilter.value;
                this.currentPage = 1;
                this.updateInventoryDisplay();
            });
        }

        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.currentFilters.status = statusFilter.value;
                this.currentPage = 1;
                this.updateInventoryDisplay();
            });
        }

        // Novo item
        const addItemBtn = document.getElementById('add-inventory-item');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => {
                this.showItemModal();
            });
        }

        // Movimentação
        const addMovementBtn = document.getElementById('add-movement');
        if (addMovementBtn) {
            addMovementBtn.addEventListener('click', () => {
                this.showMovementModal();
            });
        }

        // Relatórios
        const reportsBtn = document.getElementById('inventory-reports');
        if (reportsBtn) {
            reportsBtn.addEventListener('click', () => {
                this.showReportsModal();
            });
        }

        // Importação/Exportação
        const exportBtn = document.getElementById('export-inventory');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportInventory();
            });
        }

        const importBtn = document.getElementById('import-inventory');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.showImportModal();
            });
        }

        // Ordenação
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-sort]')) {
                const sortField = e.target.dataset.sort;
                if (this.sortBy === sortField) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortBy = sortField;
                    this.sortOrder = 'asc';
                }
                this.updateInventoryDisplay();
            }
        });

        // OTIMIZAÇÃO: Interval automático removido para evitar sobrecarga
        // Atualizações agora são manuais
        // setInterval(() => {
        //     this.updateStatistics();
        //     this.checkLowStock();
        // }, 60000); // REMOVIDO
    }

    async loadInventoryItems() {
        try {
            this.inventoryItems = await getFromDatabase('inventory') || [];
            
            // Calcular status de estoque para cada item
            for (const item of this.inventoryItems) {
                item.status = this.calculateStockStatus(item);
            }
        } catch (error) {
            console.error('Erro ao carregar itens do estoque:', error);
            this.inventoryItems = [];
        }
    }

    calculateStockStatus(item) {
        if (item.discontinued) return 'discontinued';
        if (item.currentStock <= 0) return 'out_of_stock';
        if (item.currentStock <= item.minStock) return 'low_stock';
        return 'in_stock';
    }

    async updateInventoryDisplay() {
        try {
            let items;

            if (this.currentFilters.search) {
                items = await searchInDatabase('inventory', this.currentFilters.search, ['name', 'sku', 'supplier']);
            } else {
                const filters = {};
                if (this.currentFilters.category) {
                    filters.category = this.currentFilters.category;
                }
                if (this.currentFilters.status) {
                    filters.status = this.currentFilters.status;
                }
                if (this.currentFilters.supplier) {
                    filters.supplier = this.currentFilters.supplier;
                }

                const result = await paginateData('inventory', {
                    page: this.currentPage,
                    limit: this.itemsPerPage,
                    filters,
                    sortBy: this.sortBy,
                    sortOrder: this.sortOrder
                });
                
                items = result.data;
                this.updatePagination(result.pagination);
            }

            // Recalcular status
            items.forEach(item => {
                item.status = this.calculateStockStatus(item);
            });

            this.renderInventoryList(items);
            this.updateStatistics(); // CORRIGIDO: Nome correto do método
        } catch (error) {
            console.error('Erro ao atualizar display do estoque:', error);
            showToast('Erro ao carregar estoque', 'error');
        }
    }

    renderInventoryList(items) {
        const container = document.getElementById('inventory-list');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-boxes"></i>
                    <h3>Nenhum item encontrado</h3>
                    <p>Não há itens que correspondem aos filtros aplicados.</p>
                    <button class="btn btn-primary" onclick="window.estoqueModule.showItemModal()">
                        <i class="fas fa-plus"></i> Adicionar Item
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="inventory-card ${item.status}" data-item-id="${item.id}">
                <div class="inventory-header">
                    <div class="item-info">
                        <input type="checkbox" 
                               class="item-checkbox" 
                               data-item-id="${item.id}"
                               ${this.selectedItems.has(item.id) ? 'checked' : ''}>
                        <div class="item-details">
                            <h4 class="item-name">${item.name}</h4>
                            <span class="item-sku">SKU: ${item.sku || 'N/A'}</span>
                            <span class="item-category">${item.category || 'Sem categoria'}</span>
                        </div>
                    </div>
                    
                    <div class="stock-status">
                        <span class="status-badge" 
                              style="background: ${this.stockStatuses[item.status]?.color}">
                            <i class="${this.stockStatuses[item.status]?.icon}"></i>
                            ${this.stockStatuses[item.status]?.label}
                        </span>
                    </div>
                </div>

                <div class="inventory-details">
                    <div class="stock-info">
                        <div class="stock-item">
                            <label>Estoque Atual:</label>
                            <span class="stock-value ${item.status}">${item.currentStock || 0} ${item.unit || 'un'}</span>
                        </div>
                        <div class="stock-item">
                            <label>Estoque Mínimo:</label>
                            <span>${item.minStock || 0} ${item.unit || 'un'}</span>
                        </div>
                        <div class="stock-item">
                            <label>Estoque Máximo:</label>
                            <span>${item.maxStock || 'N/A'} ${item.unit || 'un'}</span>
                        </div>
                    </div>

                    <div class="price-info">
                        <div class="price-item">
                            <label>Custo:</label>
                            <span>${formatCurrency(item.cost || 0)}</span>
                        </div>
                        <div class="price-item">
                            <label>Preço de Venda:</label>
                            <span>${formatCurrency(item.salePrice || 0)}</span>
                        </div>
                        <div class="price-item">
                            <label>Margem:</label>
                            <span class="margin">${item.cost && item.salePrice ? (((item.salePrice - item.cost) / item.cost * 100)).toFixed(1) + '%' : 'N/A'}</span>
                        </div>
                    </div>

                    ${item.supplier ? `
                        <div class="supplier-info">
                            <i class="fas fa-truck"></i>
                            <span>Fornecedor: ${item.supplier}</span>
                        </div>
                    ` : ''}

                    ${item.location ? `
                        <div class="location-info">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>Localização: ${item.location}</span>
                        </div>
                    ` : ''}

                    ${item.lastMovement ? `
                        <div class="last-movement">
                            <i class="fas fa-history"></i>
                            <span>Última movimentação: ${formatDateTime(item.lastMovement)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="inventory-actions">
                    <button class="btn btn-sm btn-primary" 
                            onclick="window.estoqueModule.viewItemDetails('${item.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    
                    <button class="btn btn-sm btn-warning" 
                            onclick="window.estoqueModule.editItem('${item.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    
                    <button class="btn btn-sm btn-info" 
                            onclick="window.estoqueModule.showMovementModal('${item.id}')">
                        <i class="fas fa-plus-minus"></i> Movimentar
                    </button>
                    
                    <button class="btn btn-sm btn-success" 
                            onclick="window.estoqueModule.viewMovements('${item.id}')">
                        <i class="fas fa-list"></i> Histórico
                    </button>
                    
                    ${item.status === 'out_of_stock' || item.status === 'low_stock' ? `
                        <button class="btn btn-sm btn-warning" 
                                onclick="window.estoqueModule.createPurchaseOrder('${item.id}')">
                            <i class="fas fa-shopping-cart"></i> Comprar
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Event listeners para checkboxes
        container.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const itemId = e.target.dataset.itemId;
                if (e.target.checked) {
                    this.selectedItems.add(itemId);
                } else {
                    this.selectedItems.delete(itemId);
                }
                this.updateBulkActionsVisibility();
            });
        });
    }

    updatePagination(pagination) {
        const container = document.getElementById('pagination-container');
        if (!container) return;

        container.innerHTML = `
            <div class="pagination-info">
                Mostrando ${Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} a 
                ${Math.min(pagination.page * pagination.limit, pagination.total)} de 
                ${pagination.total} itens
            </div>
            
            <div class="pagination-controls">
                <button class="btn btn-sm ${!pagination.hasPrev ? 'btn-secondary' : 'btn-primary'}"
                        ${!pagination.hasPrev ? 'disabled' : ''}
                        onclick="window.estoqueModule.goToPage(${pagination.page - 1})">
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
                
                <span class="page-info">Página ${pagination.page} de ${pagination.totalPages}</span>
                
                <button class="btn btn-sm ${!pagination.hasNext ? 'btn-secondary' : 'btn-primary'}"
                        ${!pagination.hasNext ? 'disabled' : ''}
                        onclick="window.estoqueModule.goToPage(${pagination.page + 1})">
                    Próxima <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    async updateStatistics() {
        try {
            const items = await getFromDatabase('inventory');
            
            const stats = {
                totalItems: items.length,
                inStock: items.filter(i => i.status === 'in_stock').length,
                lowStock: items.filter(i => i.status === 'low_stock').length,
                outOfStock: items.filter(i => i.status === 'out_of_stock').length,
                totalValue: items.reduce((sum, item) => sum + ((item.currentStock || 0) * (item.cost || 0)), 0),
                categories: [...new Set(items.map(i => i.category).filter(Boolean))].length
            };

            this.displayStatistics(stats);
        } catch (error) {
            console.error('Erro ao calcular estatísticas:', error);
        }
    }

    displayStatistics(stats) {
        const elements = {
            totalItems: document.getElementById('stat-total-items'),
            inStock: document.getElementById('stat-in-stock'),
            lowStock: document.getElementById('stat-low-stock'),
            outOfStock: document.getElementById('stat-out-of-stock'),
            totalValue: document.getElementById('stat-total-value'),
            categories: document.getElementById('stat-categories')
        };

        if (elements.totalItems) elements.totalItems.textContent = stats.totalItems;
        if (elements.inStock) elements.inStock.textContent = stats.inStock;
        if (elements.lowStock) elements.lowStock.textContent = stats.lowStock;
        if (elements.outOfStock) elements.outOfStock.textContent = stats.outOfStock;
        if (elements.totalValue) elements.totalValue.textContent = formatCurrency(stats.totalValue);
        if (elements.categories) elements.categories.textContent = stats.categories;
    }

    async checkLowStock() {
        try {
            const items = await getFromDatabase('inventory');
            const lowStockItems = items.filter(item => 
                item.currentStock <= item.minStock && 
                item.status !== 'discontinued'
            );

            if (lowStockItems.length > 0) {
                this.showLowStockAlert(lowStockItems);
            }
        } catch (error) {
            console.error('Erro ao verificar estoque baixo:', error);
        }
    }

    showLowStockAlert(items) {
        const alertContainer = document.getElementById('low-stock-alerts');
        if (!alertContainer) return;

        alertContainer.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Alerta de Estoque Baixo!</strong>
                ${items.length} ${items.length === 1 ? 'item está' : 'itens estão'} com estoque baixo:
                <ul class="low-stock-list">
                    ${items.slice(0, 5).map(item => `
                        <li>${item.name} - ${item.currentStock} ${item.unit || 'un'} restantes</li>
                    `).join('')}
                    ${items.length > 5 ? `<li>E mais ${items.length - 5} itens...</li>` : ''}
                </ul>
                <button class="btn btn-sm btn-primary" onclick="window.estoqueModule.generatePurchaseReport()">
                    Gerar Relatório de Compras
                </button>
            </div>
        `;
    }

    showItemModal(item = null) {
        const isEdit = !!item;
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-content item-modal">
                <div class="modal-header">
                    <h2>${isEdit ? 'Editar Item' : 'Novo Item de Estoque'}</h2>
                    <button class="close-modal">&times;</button>
                </div>
                
                <form id="item-form" class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-name">Nome do Item *</label>
                            <input type="text" id="item-name" required 
                                   value="${item?.name || ''}" placeholder="Nome do produto/ingrediente">
                        </div>
                        <div class="form-group">
                            <label for="item-sku">SKU/Código</label>
                            <input type="text" id="item-sku" 
                                   value="${item?.sku || ''}" placeholder="Código único do item">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-category">Categoria</label>
                            <select id="item-category">
                                <option value="">Selecione uma categoria</option>
                                <option value="ingredientes" ${item?.category === 'ingredientes' ? 'selected' : ''}>Ingredientes</option>
                                <option value="bebidas" ${item?.category === 'bebidas' ? 'selected' : ''}>Bebidas</option>
                                <option value="embalagens" ${item?.category === 'embalagens' ? 'selected' : ''}>Embalagens</option>
                                <option value="limpeza" ${item?.category === 'limpeza' ? 'selected' : ''}>Limpeza</option>
                                <option value="descartaveis" ${item?.category === 'descartaveis' ? 'selected' : ''}>Descartáveis</option>
                                <option value="outros" ${item?.category === 'outros' ? 'selected' : ''}>Outros</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="item-unit">Unidade de Medida</label>
                            <select id="item-unit">
                                <option value="un" ${item?.unit === 'un' ? 'selected' : ''}>Unidade</option>
                                <option value="kg" ${item?.unit === 'kg' ? 'selected' : ''}>Quilograma</option>
                                <option value="g" ${item?.unit === 'g' ? 'selected' : ''}>Grama</option>
                                <option value="l" ${item?.unit === 'l' ? 'selected' : ''}>Litro</option>
                                <option value="ml" ${item?.unit === 'ml' ? 'selected' : ''}>Mililitro</option>
                                <option value="cx" ${item?.unit === 'cx' ? 'selected' : ''}>Caixa</option>
                                <option value="pc" ${item?.unit === 'pc' ? 'selected' : ''}>Pacote</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-current-stock">Estoque Atual</label>
                            <input type="number" id="item-current-stock" min="0" step="0.01"
                                   value="${item?.currentStock || 0}" placeholder="0">
                        </div>
                        <div class="form-group">
                            <label for="item-min-stock">Estoque Mínimo *</label>
                            <input type="number" id="item-min-stock" min="0" step="0.01" required
                                   value="${item?.minStock || 0}" placeholder="0">
                        </div>
                        <div class="form-group">
                            <label for="item-max-stock">Estoque Máximo</label>
                            <input type="number" id="item-max-stock" min="0" step="0.01"
                                   value="${item?.maxStock || ''}" placeholder="Opcional">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-cost">Custo Unitário</label>
                            <input type="number" id="item-cost" min="0" step="0.01"
                                   value="${item?.cost || ''}" placeholder="0,00">
                        </div>
                        <div class="form-group">
                            <label for="item-sale-price">Preço de Venda</label>
                            <input type="number" id="item-sale-price" min="0" step="0.01"
                                   value="${item?.salePrice || ''}" placeholder="0,00">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-supplier">Fornecedor</label>
                            <input type="text" id="item-supplier" 
                                   value="${item?.supplier || ''}" placeholder="Nome do fornecedor">
                        </div>
                        <div class="form-group">
                            <label for="item-location">Localização no Estoque</label>
                            <input type="text" id="item-location" 
                                   value="${item?.location || ''}" placeholder="Ex: Prateleira A, Geladeira 1">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-description">Descrição</label>
                            <textarea id="item-description" rows="3" 
                                      placeholder="Descrição detalhada do item...">${item?.description || ''}</textarea>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="item-active" 
                                       ${item?.active !== false ? 'checked' : ''}>
                                Item ativo
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="item-discontinued" 
                                       ${item?.discontinued ? 'checked' : ''}>
                                Item descontinuado
                            </label>
                        </div>
                    </div>
                </form>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" form="item-form">
                        <i class="fas fa-save"></i> ${isEdit ? 'Atualizar' : 'Salvar'}
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

        // Calcular margem automaticamente
        const costInput = modal.querySelector('#item-cost');
        const salePriceInput = modal.querySelector('#item-sale-price');
        
        function updateMargin() {
            const cost = parseFloat(costInput.value) || 0;
            const salePrice = parseFloat(salePriceInput.value) || 0;
            // Implementar cálculo de margem se necessário
        }

        costInput.addEventListener('input', updateMargin);
        salePriceInput.addEventListener('input', updateMargin);

        // Submit do formulário
        modal.querySelector('#item-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveItem(modal, isEdit, item?.id);
        });
    }

    async saveItem(modal, isEdit, itemId) {
        try {
            const itemData = {
                id: isEdit ? itemId : generateId(),
                name: modal.querySelector('#item-name').value.trim(),
                sku: modal.querySelector('#item-sku').value.trim(),
                category: modal.querySelector('#item-category').value,
                unit: modal.querySelector('#item-unit').value,
                currentStock: parseFloat(modal.querySelector('#item-current-stock').value) || 0,
                minStock: parseFloat(modal.querySelector('#item-min-stock').value) || 0,
                maxStock: parseFloat(modal.querySelector('#item-max-stock').value) || null,
                cost: parseFloat(modal.querySelector('#item-cost').value) || 0,
                salePrice: parseFloat(modal.querySelector('#item-sale-price').value) || 0,
                supplier: modal.querySelector('#item-supplier').value.trim(),
                location: modal.querySelector('#item-location').value.trim(),
                description: modal.querySelector('#item-description').value.trim(),
                active: modal.querySelector('#item-active').checked,
                discontinued: modal.querySelector('#item-discontinued').checked
            };

            // Validações
            if (!itemData.name) {
                showToast('Nome do item é obrigatório', 'error');
                return;
            }

            if (itemData.minStock < 0) {
                showToast('Estoque mínimo não pode ser negativo', 'error');
                return;
            }

            // Calcular status
            itemData.status = this.calculateStockStatus(itemData);
            itemData.lastUpdated = new Date().toISOString();

            // Salvar no banco
            if (isEdit) {
                await updateInDatabase('inventory', itemData);
                showToast('Item atualizado com sucesso!', 'success');
            } else {
                await saveToDatabase('inventory', itemData);
                showToast('Item criado com sucesso!', 'success');
            }

            modal.remove();
            this.updateInventoryDisplay();
            this.updateStatistics();

        } catch (error) {
            console.error('Erro ao salvar item:', error);
            showToast('Erro ao salvar item', 'error');
        }
    }

    showMovementModal(itemId = null) {
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-content movement-modal">
                <div class="modal-header">
                    <h2>Registrar Movimentação de Estoque</h2>
                    <button class="close-modal">&times;</button>
                </div>
                
                <form id="movement-form" class="modal-body">
                    ${!itemId ? `
                        <div class="form-group">
                            <label for="movement-item">Item *</label>
                            <select id="movement-item" required>
                                <option value="">Selecione um item</option>
                            </select>
                        </div>
                    ` : '<input type="hidden" id="movement-item" value="' + itemId + '">'}
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="movement-type">Tipo de Movimentação *</label>
                            <select id="movement-type" required>
                                <option value="">Selecione o tipo</option>
                                ${Object.entries(this.movementTypes).map(([key, type]) => `
                                    <option value="${key}">${type.label}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="movement-quantity">Quantidade *</label>
                            <input type="number" id="movement-quantity" min="0" step="0.01" required
                                   placeholder="0">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="movement-cost">Custo Unitário</label>
                            <input type="number" id="movement-cost" min="0" step="0.01"
                                   placeholder="0,00">
                        </div>
                        <div class="form-group">
                            <label for="movement-total">Total</label>
                            <input type="number" id="movement-total" min="0" step="0.01" readonly
                                   placeholder="Calculado automaticamente">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="movement-reason">Motivo/Observações *</label>
                        <textarea id="movement-reason" rows="3" required
                                  placeholder="Descreva o motivo da movimentação..."></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="movement-reference">Referência</label>
                            <input type="text" id="movement-reference" 
                                   placeholder="Nota fiscal, pedido de compra, etc.">
                        </div>
                        <div class="form-group">
                            <label for="movement-date">Data/Hora</label>
                            <input type="datetime-local" id="movement-date" 
                                   value="${new Date().toISOString().slice(0, 16)}">
                        </div>
                    </div>
                </form>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary" form="movement-form">
                        <i class="fas fa-save"></i> Registrar Movimentação
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Carregar itens se necessário
        if (!itemId) {
            this.loadItemsForMovement(modal);
        }

        // Event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Calcular total automaticamente
        const quantityInput = modal.querySelector('#movement-quantity');
        const costInput = modal.querySelector('#movement-cost');
        const totalInput = modal.querySelector('#movement-total');

        function updateTotal() {
            const quantity = parseFloat(quantityInput.value) || 0;
            const cost = parseFloat(costInput.value) || 0;
            totalInput.value = (quantity * cost).toFixed(2);
        }

        quantityInput.addEventListener('input', updateTotal);
        costInput.addEventListener('input', updateTotal);

        // Submit
        modal.querySelector('#movement-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveMovement(modal);
        });
    }

    async loadItemsForMovement(modal) {
        try {
            const items = await getFromDatabase('inventory');
            const select = modal.querySelector('#movement-item');
            
            select.innerHTML = `
                <option value="">Selecione um item</option>
                ${items.map(item => `
                    <option value="${item.id}">${item.name} (${item.currentStock} ${item.unit})</option>
                `).join('')}
            `;
        } catch (error) {
            console.error('Erro ao carregar itens:', error);
        }
    }

    async saveMovement(modal) {
        try {
            const movementData = {
                id: generateId(),
                itemId: modal.querySelector('#movement-item').value,
                type: modal.querySelector('#movement-type').value,
                quantity: parseFloat(modal.querySelector('#movement-quantity').value),
                cost: parseFloat(modal.querySelector('#movement-cost').value) || 0,
                total: parseFloat(modal.querySelector('#movement-total').value) || 0,
                reason: modal.querySelector('#movement-reason').value.trim(),
                reference: modal.querySelector('#movement-reference').value.trim(),
                date: modal.querySelector('#movement-date').value,
                createdAt: new Date().toISOString()
            };

            // Validações
            if (!movementData.itemId || !movementData.type || !movementData.quantity || !movementData.reason) {
                showToast('Todos os campos obrigatórios devem ser preenchidos', 'error');
                return;
            }

            // Atualizar estoque do item
            const item = await getFromDatabase('inventory', movementData.itemId);
            if (!item) {
                showToast('Item não encontrado', 'error');
                return;
            }

            // Aplicar movimentação ao estoque
            switch (movementData.type) {
                case 'entrada':
                case 'devolucao':
                    item.currentStock = (item.currentStock || 0) + movementData.quantity;
                    break;
                case 'saida':
                case 'perda':
                    item.currentStock = Math.max(0, (item.currentStock || 0) - movementData.quantity);
                    break;
                case 'ajuste':
                    item.currentStock = movementData.quantity;
                    break;
            }

            item.lastMovement = new Date().toISOString();
            item.status = this.calculateStockStatus(item);

            // Salvar movimento e atualizar item
            await saveToDatabase('inventory', { ...movementData, storeName: 'movements' });
            await updateInDatabase('inventory', item);

            showToast('Movimentação registrada com sucesso!', 'success');
            modal.remove();
            this.updateInventoryDisplay();
            this.updateStatistics();

        } catch (error) {
            console.error('Erro ao salvar movimentação:', error);
            showToast('Erro ao registrar movimentação', 'error');
        }
    }

    // Métodos auxiliares
    async viewItemDetails(itemId) { showToast('Funcionalidade em desenvolvimento', 'info'); }
    async editItem(itemId) {
        const item = await getFromDatabase('inventory', itemId);
        if (item) this.showItemModal(item);
    }
    async viewMovements(itemId) { showToast('Funcionalidade em desenvolvimento', 'info'); }
    async createPurchaseOrder(itemId) { showToast('Funcionalidade em desenvolvimento', 'info'); }
    async generatePurchaseReport() { showToast('Funcionalidade em desenvolvimento', 'info'); }
    async exportInventory() { showToast('Funcionalidade em desenvolvimento', 'info'); }
    showImportModal() { showToast('Funcionalidade em desenvolvimento', 'info'); }
    showReportsModal() { showToast('Funcionalidade em desenvolvimento', 'info'); }
    goToPage(page) { this.currentPage = page; this.updateInventoryDisplay(); }
    updateBulkActionsVisibility() { /* Implementar */ }

    // Método para ser chamado quando o módulo for ativado
    activate() {
        console.log('Módulo de Estoque ativado');
        this.updateInventoryDisplay();
        this.updateStatistics();
        this.checkLowStock();
    }

    // Método para ser chamado quando o módulo for desativado
    deactivate() {
        console.log('Módulo de Estoque desativado');
    }
}

// Disponibilizar globalmente para compatibilidade
window.EstoqueModule = EstoqueModule;