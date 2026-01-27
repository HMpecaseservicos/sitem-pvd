// ===== CARDÁPIO MODULE v2.0 - SISTEMA HAMBURGUERIA =====
// Módulo responsável pela gestão completa do cardápio/menu
// VERSÃO CORRIGIDA: CRUD completo, filtros funcionais, validações

export class CardapioModule {
    constructor() {
        this.products = [];
        this.categories = [];
        this.currentEditId = null;
        this.currentFilter = 'todos';
        this.currentSearch = '';
        this.currentSort = 'name';
        this.isInitialized = false;
        this.deletedProducts = []; // MELHORIA 1: Produtos com soft delete
        this.priceHistory = []; // MELHORIA 8: Histórico de alterações de preço
        this.categoryCache = null; // MELHORIA 25: Cache de categorias
        this.categoryCacheTime = null;
        this.searchDebounceTimer = null; // MELHORIA 9: Timer para debounce
        this.virtualScrollState = { offset: 0, limit: 20 }; // MELHORIA 10: Scroll infinito
        
        // Sistema de rastreamento de event listeners
        this.eventListeners = [];
        
        // Identificador de versão
        this.version = '3.0.0';
        this.buildDate = '2026-01-02';
        
        console.log(`📋 Construindo CardapioModule v${this.version} (${this.buildDate}) com 28 melhorias...`);
    }
    
    /**
     * Sistema de rastreamento de event listeners para prevenir vazamentos de memória
     */
    addEventListener(element, event, handler, options = false) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }

    /**
     * Remove todos os event listeners rastreados
     */
    removeAllEventListeners() {
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];
    }
    
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ CardapioModule já inicializado');
            return;
        }
        
        console.log('📱 Inicializando CardapioModule...');
        
        try {
            // 1. Renderizar interface principal
            this.renderInterface();
            
            // 2. Carregar categorias primeiro
            await this.loadCategoriesFromDatabase();
            
            // 3. Carregar produtos do banco
            await this.loadProductsFromDatabase();
            
            // 4. Configurar UI
            this.bindEvents();
            this.loadCategoryFilters();
            this.renderProducts();
            this.updateStats();
            
            // 5. Expor globalmente
            window.cardapioModule = this;
            
            this.isInitialized = true;
            console.log('✅ CardapioModule inicializado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar CardapioModule:', error);
            throw error;
        }
    }
    
    // ========================================
    // RENDERIZAÇÃO DA INTERFACE PRINCIPAL
    // ========================================
    
    renderInterface() {
        const content = document.getElementById('cardapio-page');
        if (!content) {
            console.error('❌ Elemento #cardapio-page não encontrado');
            return;
        }
        
        content.innerHTML = `
            <div class="cardapio-container">
                <div class="page-header">
                    <div class="header-content">
                        <h2><i class="fas fa-hamburger"></i> Gestão de Cardápio</h2>
                        <p>Gerencie produtos, categorias e disponibilidade</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-secondary" id="manage-categories">
                            <i class="fas fa-folder"></i> Gerenciar Categorias
                        </button>
                        <button class="btn btn-secondary" id="manage-extras">
                            <i class="fas fa-puzzle-piece"></i> Gerenciar Adicionais
                        </button>
                        <button class="btn btn-secondary" id="view-inactive-products">
                            <i class="fas fa-exclamation-triangle"></i> Produtos Inativos
                        </button>
                        <button class="btn btn-secondary" id="view-trash">
                            <i class="fas fa-trash-restore"></i> Lixeira
                        </button>
                        <button class="btn btn-primary" id="add-product">
                            <i class="fas fa-plus"></i> Novo Produto
                        </button>
                    </div>
                </div>
                
                <div class="filters-bar">
                    <div class="filter-group">
                        <label>Categoria:</label>
                        <select id="menu-filter-category" class="form-control">
                            <option value="todos">Todas</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label>Status:</label>
                        <select id="menu-filter-status" class="form-control">
                            <option value="">Todos</option>
                            <option value="true">Disponível</option>
                            <option value="false">Indisponível</option>
                        </select>
                    </div>
                    
                    <div class="filter-group search-group">
                        <label>Buscar:</label>
                        <input type="text" id="menu-search" class="form-control" 
                               placeholder="Nome ou descrição...">
                    </div>
                </div>
                
                <div class="stats-cards" id="menu-stats">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-box"></i></div>
                        <div class="stat-info">
                            <span class="stat-value" id="total-products">0</span>
                            <span class="stat-label">Total de Produtos</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-info">
                            <span class="stat-value" id="available-products">0</span>
                            <span class="stat-label">Disponíveis</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-folder"></i></div>
                        <div class="stat-info">
                            <span class="stat-value" id="total-categories">0</span>
                            <span class="stat-label">Categorias</span>
                        </div>
                    </div>
                </div>
                
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Categoria</th>
                                <th>Preço</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="menu-products-tbody">
                            <tr>
                                <td colspan="5" class="text-center">
                                    <i class="fas fa-spinner fa-spin"></i> Carregando produtos...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        console.log('✅ Interface do Cardápio renderizada');
    }
    
    // ========================================
    // CARREGAMENTO DE DADOS
    // ========================================
    
    async loadCategoriesFromDatabase() {
        try {
            const categoriesFromDB = await window.getFromDatabase('categories');
            
            if (categoriesFromDB && categoriesFromDB.length > 0) {
                this.categories = categoriesFromDB;
                console.log(`📂 ${this.categories.length} categorias carregadas do IndexedDB`);
            } else {
                // Fallback para dados estáticos
                if (window.productData && window.productData.categories) {
                    this.categories = [...window.productData.categories];
                    console.log('📂 Usando categorias estáticas');
                    
                    // Salvar no banco para próxima vez (usa updateInDatabase para evitar duplicatas)
                    for (const category of this.categories) {
                        try {
                            await window.updateInDatabase('categories', category);
                        } catch (error) {
                            // Ignora erro de chave duplicada - categoria já existe
                            if (!error.message.includes('Key already exists')) {
                                console.error('Erro ao salvar categoria:', error);
                            }
                        }
                    }
                } else {
                    this.categories = [
                        { id: 'hamburgueres', name: 'Hambúrgueres', icon: '🍔' },
                        { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
                        { id: 'acompanhamentos', name: 'Acompanhamentos', icon: '🍟' },
                        { id: 'sobremesas', name: 'Sobremesas', icon: '🍰' }
                    ];
                }
            }
            
            // Atualizar global
            if (window.productData) {
                window.productData.categories = this.categories;
            }
            
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            this.categories = [];
        }
    }
    
    async loadProductsFromDatabase() {
        try {
            const productsFromDB = await window.getFromDatabase('products');
            
            if (productsFromDB && productsFromDB.length > 0) {
                // Filtrar produtos não deletados
                this.products = productsFromDB.filter(p => !p.deleted);
                console.log(`📦 ${this.products.length} produtos ativos carregados do IndexedDB`);
            } else {
                // Popular banco com dados de exemplo se vazio
                if (window.populateIfEmpty) {
                    const populated = await window.populateIfEmpty();
                    if (populated) {
                        // Recarregar após popular
                        const newProducts = await window.getFromDatabase('products');
                        this.products = newProducts ? newProducts.filter(p => !p.deleted) : [];
                        console.log(`✅ ${this.products.length} produtos carregados após popular banco`);
                    } else {
                        this.products = [];
                    }
                } else {
                    this.products = [];
                }
            }
            
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            window.showToast('Erro ao carregar produtos', 'error');
            this.products = [];
        }
    }
    
    // ========================================
    // EVENT LISTENERS
    // ========================================
    
    bindEvents() {
        console.log('🔗 Configurando event listeners do Cardápio...');
        
        // Botão adicionar produto
        const addBtn = document.getElementById('add-product');
        console.log('🔍 DEBUG - Botão add-product encontrado:', addBtn);
        
        if (addBtn) {
            // Remover listeners antigos se existirem
            const newBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newBtn, addBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('➕ Botão Adicionar Produto clicado');
                this.showProductModal();
            });
            console.log('✅ Event listener do botão add-product registrado');
        } else {
            console.error('❌ Botão add-product NÃO encontrado no DOM');
        }
        
        // Botão gerenciar categorias
        const manageCatBtn = document.getElementById('manage-categories');
        if (manageCatBtn) {
            const newCatBtn = manageCatBtn.cloneNode(true);
            manageCatBtn.parentNode.replaceChild(newCatBtn, manageCatBtn);
            
            newCatBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📂 Botão Gerenciar Categorias clicado');
                this.showCategoriesModal();
            });
            console.log('✅ Event listener do botão manage-categories registrado');
        }
        
        // Botão gerenciar adicionais
        const manageExtrasBtn = document.getElementById('manage-extras');
        if (manageExtrasBtn) {
            const newExtrasBtn = manageExtrasBtn.cloneNode(true);
            manageExtrasBtn.parentNode.replaceChild(newExtrasBtn, manageExtrasBtn);
            
            newExtrasBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🧩 Botão Gerenciar Adicionais clicado');
                this.showExtrasModal();
            });
            console.log('✅ Event listener do botão manage-extras registrado');
        }
        
        // MELHORIA 20: Botão produtos inativos
        const viewInactiveBtn = document.getElementById('view-inactive-products');
        if (viewInactiveBtn) {
            const newInactiveBtn = viewInactiveBtn.cloneNode(true);
            viewInactiveBtn.parentNode.replaceChild(newInactiveBtn, viewInactiveBtn);
            
            newInactiveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('⚠️ Botão Produtos Inativos clicado');
                this.showInactiveProductsModal();
            });
            console.log('✅ Event listener do botão view-inactive-products registrado');
        }
        
        // MELHORIA 27: Botão visualizar lixeira
        const viewTrashBtn = document.getElementById('view-trash');
        if (viewTrashBtn) {
            const newTrashBtn = viewTrashBtn.cloneNode(true);
            viewTrashBtn.parentNode.replaceChild(newTrashBtn, viewTrashBtn);
            
            newTrashBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🗑️ Botão Lixeira clicado');
                this.showTrashModal();
            });
            console.log('✅ Event listener do botão view-trash registrado');
        }
        
        // Filtro de categoria
        const categoryFilter = document.getElementById('menu-filter-category');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value || 'todos';
                console.log(`🔍 Filtro de categoria: ${this.currentFilter}`);
                this.renderProducts();
            });
        }
        
        // Filtro de status
        const statusFilter = document.getElementById('menu-filter-status');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.renderProducts();
            });
        }
        
        // Busca
        const searchInput = document.getElementById('menu-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                // MELHORIA 9: Debounce na busca (300ms)
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = setTimeout(() => {
                    this.currentSearch = e.target.value.trim();
                    this.renderProducts();
                }, 300);
            });
        }
        
        // Delegação de eventos para ações da tabela E botão adicionar
        document.addEventListener('click', (e) => {
            // Botão adicionar produto (delegação como fallback)
            if (e.target.closest('#add-product')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('➕ Botão Adicionar Produto clicado (via delegação)');
                this.showProductModal();
                return;
            }
            
            // Botão gerenciar categorias (delegação como fallback)
            if (e.target.closest('#manage-categories')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('📂 Botão Gerenciar Categorias clicado (via delegação)');
                this.showCategoriesModal();
                return;
            }
            
            // Botão gerenciar adicionais (delegação como fallback)
            if (e.target.closest('#manage-extras')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🧩 Botão Gerenciar Adicionais clicado (via delegação)');
                this.showExtrasModal();
                return;
            }
            
            // Ações da tabela
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.dataset.action;
            const productId = target.dataset.productId;
            
            if (!productId) return;
            
            switch (action) {
                case 'preview-product':
                    const previewProduct = this.products.find(p => p.id === productId);
                    if (previewProduct) this.showProductPreview(previewProduct);
                    break;
                case 'edit-product':
                    this.editProduct(productId);
                    break;
                case 'delete-product':
                    this.deleteProduct(productId);
                    break;
                case 'toggle-availability':
                    this.toggleAvailability(productId);
                    break;
            }
        });
        
        console.log('✅ Event listeners configurados (incluindo delegação)');
    }
    
    // ========================================
    // RENDERIZAÇÃO DE PRODUTOS
    // ========================================
    
    renderProducts() {
        let filtered = [...this.products];
        
        // Filtrar por categoria
        if (this.currentFilter && this.currentFilter !== 'todos') {
            filtered = filtered.filter(p => p.category === this.currentFilter);
        }
        
        // Filtrar por status
        const statusFilter = document.getElementById('menu-filter-status');
        if (statusFilter && statusFilter.value !== '') {
            const showAvailable = statusFilter.value === 'true';
            filtered = filtered.filter(p => p.available === showAvailable);
        }
        
        // Filtrar por busca
        if (this.currentSearch && this.currentSearch.length >= 2) {
            const term = this.currentSearch.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(term) ||
                (p.description && p.description.toLowerCase().includes(term))
            );
        }
        
        // Ordenar
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'price':
                    return a.price - b.price;
                case 'category':
                    return a.category.localeCompare(b.category);
                default:
                    return 0;
            }
        });
        
        // CORREÇÃO CRÍTICA: Limitar resultados para prevenir travamentos
        const limitedResults = filtered.slice(0, 500); // Máximo 500 produtos exibidos
        if (filtered.length > 500) {
            console.warn(`⚠️ Limitando exibição de ${filtered.length} para 500 produtos para performance`);
        }
        
        this.renderProductsTable(limitedResults);
        this.updateStats();
    }
    
    renderProductsTable(products) {
        const tbody = document.getElementById('menu-products-tbody');
        if (!tbody) {
            console.warn('⚠️ Elemento #menu-products-tbody não encontrado');
            return;
        }
        
        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: #888;">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                        <p>Nenhum produto encontrado</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = products.map(product => {
            const category = this.getCategoryName(product.category);
            const available = product.available !== false;
            
            // Verificar se image é URL válida ou emoji
            const isImageUrl = product.image && product.image.startsWith('http');
            
            const imageHtml = isImageUrl
                ? `<img src="${product.image}" alt="${this.escapeHtml(product.name)}" class="product-image" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';">`
                : `<span class="product-emoji">${product.image || '🍔'}</span>`;
            
            return `
                <tr class="${!available ? 'unavailable-product' : ''}" data-product-id="${product.id}">
                    <td>
                        <div class="product-cell">
                            ${imageHtml}
                            ${isImageUrl && product.image ? `<span class="product-emoji" style="display: none;">${product.name.charAt(0)}</span>` : ''}
                            <div class="product-details">
                                <div class="product-name">${this.escapeHtml(product.name)}</div>
                                ${product.description ? `<div class="product-description">${this.escapeHtml(product.description)}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="category-badge">${category}</span>
                    </td>
                    <td>
                        <div class="price-cell">
                            ${product.originalPrice ? 
                                `<span class="original-price">R$ ${product.originalPrice.toFixed(2)}</span>` : 
                                ''
                            }
                            <span class="current-price">R$ ${product.price.toFixed(2)}</span>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${available ? 'status-available' : 'status-unavailable'}">
                            <i class="fas fa-circle"></i>
                            ${available ? 'Disponível' : 'Indisponível'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon btn-info" 
                                    data-action="preview-product" 
                                    data-product-id="${product.id}"
                                    title="Visualizar produto"
                                    aria-label="Visualizar produto ${product.name}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon btn-primary" 
                                    data-action="edit-product" 
                                    data-product-id="${product.id}"
                                    title="Editar produto"
                                    aria-label="Editar produto ${product.name}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon ${available ? 'btn-warning' : 'btn-success'}" 
                                    data-action="toggle-availability" 
                                    data-product-id="${product.id}"
                                    title="${available ? 'Desativar' : 'Ativar'} produto"
                                    aria-label="${available ? 'Desativar' : 'Ativar'} produto ${product.name}">
                                <i class="fas fa-${available ? 'eye-slash' : 'eye'}"></i>
                            </button>
                            <button class="btn-icon btn-danger" 
                                    data-action="delete-product" 
                                    data-product-id="${product.id}"
                                    title="Excluir produto"
                                    aria-label="Excluir produto ${product.name}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log(`📄 ${products.length} produtos renderizados`);
    }
    
    // ========================================
    // FILTROS E CATEGORIAS
    // ========================================
    
    loadCategoryFilters() {
        const select = document.getElementById('menu-filter-category');
        if (!select) return;
        
        select.innerHTML = `
            <option value="todos">Todas as Categorias</option>
            ${this.categories.map(cat => 
                `<option value="${cat.id}">${cat.name}</option>`
            ).join('')}
        `;
        
        console.log('📂 Filtros de categoria carregados');
    }
    
    getCategoryName(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        return category ? category.name : 'Sem Categoria';
    }
    
    // ========================================
    // MODAL DE PRODUTO
    // ========================================
    
    showProductModal(product = null) {
        console.log('📝 Abrindo modal de produto:', product ? 'EDIÇÃO' : 'NOVO');
        
        this.currentEditId = product ? product.id : null;
        
        // SEMPRE remover modal existente e criar novo (fix para innerHTML não parseado)
        let existingModal = document.getElementById('product-modal');
        if (existingModal) {
            existingModal.remove();
            console.log('🗑️ Modal antigo removido');
        }
        
        // Criar novo modal
        const modal = this.createProductModal();
        document.body.appendChild(modal);
        console.log('✅ Novo modal criado e adicionado');
        
        // Buscar modal recém-adicionado
        const freshModal = document.getElementById('product-modal');
        this.setupModalAndShow(freshModal, product);
    }
    
    setupModalAndShow(modal, product) {
        if (!modal) {
            console.error('❌ Modal não encontrado no DOM');
            return;
        }
        
        console.log('🔧 Configurando modal...', modal);
        
        // Buscar todos os campos do formulário uma única vez
        const nameInput = modal.querySelector('#product-name');
        const descInput = modal.querySelector('#product-description');
        const catSelect = modal.querySelector('#product-category');
        const priceInput = modal.querySelector('#product-price');
        const origPriceInput = modal.querySelector('#product-original-price');
        const prepTimeInput = modal.querySelector('#product-prep-time');
        const imageInput = modal.querySelector('#product-image');
        const availableCheck = modal.querySelector('#product-available');
        const customizableCheck = modal.querySelector('#product-customizable');
        const costInput = modal.querySelector('#product-cost');
        
        console.log('🔍 DEBUG Campos:', {
            nameInput,
            catSelect,
            priceInput,
            modalHasContent: modal.querySelector('.modal-content') !== null,
            modalChildren: modal.children.length
        });
        
        // Atualizar título
        const title = modal.querySelector('.modal-title');
        if (title) {
            title.textContent = product ? 'Editar Produto' : 'Novo Produto';
        }
        
        // Carregar categorias no select
        const categorySelect = modal.querySelector('#product-category');
        if (categorySelect) {
            console.log('📂 Carregando categorias no select:', this.categories.length);
            categorySelect.innerHTML = `
                <option value="">Selecione...</option>
                ${this.categories.map(cat => 
                    `<option value="${cat.id}">${cat.name}</option>`
                ).join('')}
            `;
        }
        
        // Preencher formulário se for edição
        if (product) {
            if (nameInput) nameInput.value = product.name || '';
            if (descInput) descInput.value = product.description || '';
            if (catSelect) catSelect.value = product.category || '';
            if (priceInput) priceInput.value = product.price || '';
            if (origPriceInput) origPriceInput.value = product.originalPrice || '';
            if (prepTimeInput) prepTimeInput.value = product.preparationTime || '';
            if (imageInput) imageInput.value = product.image || '🍔';
            if (availableCheck) availableCheck.checked = product.available !== false;
            if (costInput) costInput.value = product.cost || '';
            
            // Calcular margem inicial se tiver custo e preço
            if (product.cost && product.price) {
                this.calculateAndShowMargin(product.cost, product.price);
            }
            if (customizableCheck) {
                customizableCheck.checked = product.customizations && product.customizations.length > 0;
                // Mostrar preview se marcado
                if (customizableCheck.checked) {
                    this.showCustomizationsPreview();
                }
            }
        } else {
            // Limpar formulário para novo produto
            const form = modal.querySelector('#product-form');
            if (form) form.reset();
            
            if (availableCheck) availableCheck.checked = true;
            if (imageInput) imageInput.value = '🍔';
        }
        
        // Configurar evento do checkbox de personalização
        if (customizableCheck) {
            customizableCheck.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    await this.showCustomizationsPreview();
                } else {
                    this.hideCustomizationsPreview();
                }
            });
        }
        
        // MELHORIA 19: Calcular margem em tempo real
        if (priceInput && costInput) {
            const updateMargin = () => {
                const price = parseFloat(priceInput.value) || 0;
                const cost = parseFloat(costInput.value) || 0;
                this.calculateAndShowMargin(cost, price);
            };
            priceInput.addEventListener('input', updateMargin);
            costInput.addEventListener('input', updateMargin);
        }
        
        // MELHORIA 18: Preview de imagem ao selecionar arquivo
        const imageUpload = modal.querySelector('#product-image-upload');
        const imagePreview = modal.querySelector('#image-preview');
        const previewImg = modal.querySelector('#preview-img');
        const removeImageBtn = modal.querySelector('#remove-image');
        
        if (imageUpload && imagePreview && previewImg) {
            imageUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewImg.src = e.target.result;
                        imagePreview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            if (removeImageBtn) {
                removeImageBtn.addEventListener('click', () => {
                    imageUpload.value = '';
                    previewImg.src = '';
                    imagePreview.style.display = 'none';
                });
            }
        }
        
        // Mostrar modal
        modal.classList.add('active');
        
        // Focar no primeiro campo
        setTimeout(() => {
            const nameInput = modal.querySelector('#product-name');
            if (nameInput) nameInput.focus();
        }, 100);
    }
    
    createProductModal() {
        const modal = document.createElement('div');
        modal.id = 'product-modal';
        modal.className = 'modal';
        
        // Usar DOMParser para garantir parsing imediato
        const parser = new DOMParser();
        const doc = parser.parseFromString(`
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Novo Produto</h3>
                    <button class="close-modal" aria-label="Fechar modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="product-form" class="product-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="product-name">Nome *</label>
                                <input type="text" id="product-name" required 
                                       placeholder="Ex: X-Burger Especial">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="product-description">Descrição</label>
                                <textarea id="product-description" rows="3" 
                                          placeholder="Descreva o produto..."></textarea>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="product-category">Categoria *</label>
                                <select id="product-category" required>
                                    <option value="">Selecione...</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="product-image">Emoji/Ícone</label>
                                <input type="text" id="product-image" 
                                       placeholder="🍔" maxlength="4">
                            </div>
                            
                            <div class="form-group">
                                <label for="product-image-upload">Upload de Imagem</label>
                                <input type="file" id="product-image-upload" accept="image/*" 
                                       style="display: block; margin-bottom: 8px;">
                                <small>Opcional - Substitui o emoji por imagem real</small>
                                <div id="image-preview" style="margin-top: 10px; display: none;">
                                    <img id="preview-img" src="" alt="Preview" style="max-width: 150px; max-height: 150px; border-radius: 8px; border: 2px solid #ddd;">
                                    <button type="button" id="remove-image" class="btn btn-sm btn-danger" style="display: block; margin-top: 8px;">
                                        <i class="fas fa-times"></i> Remover Imagem
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="product-price">Preço (R$) *</label>
                                <input type="number" id="product-price" step="0.01" min="0" required
                                       placeholder="0.00">
                            </div>
                            
                            <div class="form-group">
                                <label for="product-original-price">Preço Original (R$)</label>
                                <input type="number" id="product-original-price" step="0.01" min="0"
                                       placeholder="0.00">
                                <small>Deixe vazio se não houver promoção</small>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="product-cost">Custo (R$)</label>
                                <input type="number" id="product-cost" step="0.01" min="0"
                                       placeholder="0.00">
                                <small>Para cálculo de margem de lucro</small>
                            </div>
                            
                            <div class="form-group">
                                <label>Margem de Lucro</label>
                                <div id="margin-display" style="padding: 10px; background: #f0f0f0; border-radius: 4px; font-size: 1.2em; font-weight: bold; color: #666; min-height: 40px; display: flex; align-items: center; justify-content: center;">
                                    --
                                </div>
                                <small>Calculada automaticamente</small>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="product-prep-time">Tempo de Preparo (min)</label>
                                <input type="number" id="product-prep-time" min="1" 
                                       placeholder="15">
                            </div>
                            
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="product-available" checked>
                                    <span>Produto disponível</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group" style="flex: 1 1 100%;">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="product-customizable">
                                    <span>🎨 Produto Personalizável (Aceita Adicionais)</span>
                                </label>
                                <small>Marque para permitir que o cliente adicione extras (queijos, bacon, molhos, etc)</small>
                            </div>
                        </div>
                        
                        <div id="customizations-preview" style="display: none; margin-top: 15px;">
                            <hr style="margin: 20px 0;">
                            <h4 style="color: #667eea; margin-bottom: 10px;">
                                📋 Adicionais Disponíveis
                            </h4>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto;">
                                <p style="font-size: 0.9em; color: #666; margin-bottom: 10px;">
                                    Quando marcado como personalizável, o produto terá estas opções:
                                </p>
                                <div id="customizations-list"></div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-product-btn">
                        Cancelar
                    </button>
                    <button type="button" class="btn btn-primary" id="save-product-btn">
                        <i class="fas fa-save"></i>
                        Salvar Produto
                    </button>
                </div>
            </div>
        `, 'text/html');
        
        // Adicionar todos os elementos parseados ao modal
        Array.from(doc.body.children).forEach(child => {
            modal.appendChild(child);
        });
        
        // Adicionar event listeners usando DELEGAÇÃO no modal
        modal.addEventListener('click', (e) => {
            if (e.target.closest('#save-product-btn')) {
                console.log('💾 Save button clicked via delegation');
                this.saveProduct();
            } else if (e.target.closest('#cancel-product-btn') || e.target.closest('.close-modal')) {
                console.log('❌ Close button clicked via delegation');
                this.closeProductModal();
            }
        });
        
        console.log('✅ Modal criado com DOMParser e event delegation');
        return modal;
    }
    
    closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.remove('active');
            this.currentEditId = null;
        }
    }
    
    // ========================================
    // CRUD DE PRODUTOS
    // ========================================
    
    async saveProduct() {
        console.log('💾 Salvando produto...');
        
        const modal = document.getElementById('product-modal');
        if (!modal) {
            console.error('❌ Modal não encontrado');
            return;
        }
        
        const nameInput = modal.querySelector('#product-name');
        const descInput = modal.querySelector('#product-description');
        const catSelect = modal.querySelector('#product-category');
        const priceInput = modal.querySelector('#product-price');
        const origPriceInput = modal.querySelector('#product-original-price');
        const prepTimeInput = modal.querySelector('#product-prep-time');
        const imageInput = modal.querySelector('#product-image');
        const availableCheck = modal.querySelector('#product-available');
        const customizableCheck = modal.querySelector('#product-customizable');
        const costInput = modal.querySelector('#product-cost');
        const imageUploadInput = modal.querySelector('#product-image-upload');
        
        if (!nameInput || !catSelect || !priceInput) {
            console.error('❌ Campos do formulário não encontrados');
            window.showToast('Erro ao acessar formulário', 'error');
            return;
        }
        
        const name = nameInput.value.trim();
        const description = descInput ? descInput.value.trim() : '';
        const category = catSelect.value;
        const price = parseFloat(priceInput.value);
        const originalPrice = origPriceInput ? parseFloat(origPriceInput.value) || null : null;
        const preparationTime = prepTimeInput ? parseInt(prepTimeInput.value) || 15 : 15;
        let image = imageInput ? imageInput.value.trim() || '🍔' : '🍔';
        const available = availableCheck ? availableCheck.checked : true;
        const isCustomizable = customizableCheck ? customizableCheck.checked : false;
        const cost = costInput ? parseFloat(costInput.value) || null : null;
        
        // MELHORIA 18: Processar upload de imagem
        if (imageUploadInput && imageUploadInput.files && imageUploadInput.files[0]) {
            try {
                const imageUrl = await this.uploadProductImage(imageUploadInput.files[0]);
                if (imageUrl) {
                    image = imageUrl;
                    console.log('✅ Imagem enviada:', imageUrl);
                }
            } catch (error) {
                console.error('❌ Erro ao fazer upload da imagem:', error);
                window.showToast('Erro ao enviar imagem, usando emoji', 'warning');
            }
        }
        
        // Validações
        if (!name) {
            window.showToast('Nome do produto é obrigatório', 'error');
            nameInput.focus();
            return;
        }
        
        if (!category) {
            window.showToast('Selecione uma categoria', 'error');
            catSelect.focus();
            return;
        }
        
        // MELHORIA 3: Validar integridade referencial de categoria
        const categoryExists = this.categories.some(cat => cat.id === category);
        if (!categoryExists) {
            window.showToast('❌ Categoria inválida ou não existe', 'error');
            catSelect.focus();
            return;
        }
        
        // Permitir preço R$ 0,00 para produtos personalizáveis (ex: Monte seu Burger)
        // O preço final será calculado pelos adicionais escolhidos
        if (isNaN(price) || price < 0) {
            window.showToast('Preço não pode ser negativo', 'error');
            priceInput.focus();
            return;
        }
        
        // MELHORIA 2: Validação rigorosa de preço zero - BLOQUEAR se não for customizável
        if (price === 0 && !isCustomizable) {
            window.showToast('❌ BLOQUEADO: Preço R$ 0,00 só é permitido para produtos personalizáveis', 'error');
            priceInput.focus();
            return;
        }
        
        // MELHORIA 7: Validação de preço suspeito para hambúrgueres
        if (category === 'hamburgueres' && price > 0 && price < 5) {
            const confirmar = confirm(`⚠️ PREÇO SUSPEITO DETECTADO!\n\nO preço R$ ${price.toFixed(2)} está muito baixo para um hambúrguer.\nPreço médio esperado: R$ 15,00+\n\nDeseja continuar mesmo assim?`);
            if (!confirmar) {
                priceInput.focus();
                return;
            }
        }
        
        // MELHORIA 6: Detecção de produtos duplicados
        const normalizedName = this.normalizeName(name);
        const duplicate = this.products.find(p => 
            p.id !== this.currentEditId && 
            this.normalizeName(p.name) === normalizedName
        );
        if (duplicate) {
            const confirmar = confirm(`⚠️ PRODUTO SIMILAR DETECTADO!\n\nJá existe um produto chamado "${duplicate.name}"\n\nDeseja criar mesmo assim?`);
            if (!confirmar) {
                nameInput.focus();
                return;
            }
        }
        
        if (originalPrice && originalPrice <= price) {
            window.showToast('Preço original deve ser maior que o preço atual', 'error');
            if (origPriceInput) origPriceInput.focus();
            return;
        }
        
        try {
            const productData = {
                name,
                description,
                category,
                price,
                originalPrice,
                preparationTime,
                image,
                available,
                cost, // MELHORIA 19: Campo de custo
                updatedAt: new Date().toISOString()
            };
            
            // Adicionar customizações padrão se marcado como personalizável
            if (isCustomizable) {
                productData.customizations = this.getDefaultCustomizations();
            } else {
                productData.customizations = [];
            }
            
            if (this.currentEditId) {
                // ATUALIZAR produto existente
                const index = this.products.findIndex(p => p.id === this.currentEditId);
                if (index !== -1) {
                    const oldProduct = this.products[index];
                    
                    // MELHORIA 8: Registrar histórico de mudança de preço
                    if (oldProduct.price !== price) {
                        await this.logPriceChange({
                            productId: this.currentEditId,
                            productName: name,
                            oldPrice: oldProduct.price,
                            newPrice: price,
                            changedBy: window.currentUser?.name || 'Sistema',
                            changedAt: new Date().toISOString()
                        });
                    }
                    
                    const updatedProduct = { 
                        ...oldProduct, 
                        ...productData 
                    };
                    
                    this.products[index] = updatedProduct;
                    
                    // MELHORIA 12: Retry automático em salvamento
                    await this.saveWithRetry('products', updatedProduct);
                    
                    console.log('✅ Produto atualizado:', updatedProduct);
                    window.showToast('Produto atualizado com sucesso!', 'success');
                    
                    // MELHORIA 4: Sincronização com PDV via EventBus
                    this.emitProductUpdateEvent('update', updatedProduct);
                }
            } else {
                // CRIAR novo produto
                const newProduct = {
                    id: this.generateId(),
                    ...productData,
                    createdAt: new Date().toISOString(),
                    deleted: false // MELHORIA 1: Campo soft delete
                };
                
                this.products.push(newProduct);
                
                // MELHORIA 12: Retry automático em salvamento
                await this.saveWithRetry('products', newProduct);
                
                console.log('✅ Produto criado:', newProduct);
                window.showToast('Produto criado com sucesso!', 'success');
                
                // MELHORIA 4: Sincronização com PDV via EventBus
                this.emitProductUpdateEvent('create', newProduct);
            }
            
            // Atualizar globais
            if (window.productData) {
                window.productData.products = this.products;
            }
            window.currentProducts = this.products;
            
            // Fechar modal e atualizar lista
            this.closeProductModal();
            this.renderProducts();
            
        } catch (error) {
            console.error('❌ Erro ao salvar produto:', error);
            window.showToast('Erro ao salvar produto no banco de dados', 'error');
        }
    }
    
    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            console.warn('⚠️ Produto não encontrado:', productId);
            return;
        }
        
        console.log('✏️ Editando produto:', product.name);
        this.showProductModal(product);
    }
    
    async deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        // MELHORIA 28: Confirmação dupla se produto foi vendido hoje
        const wasSoldToday = await this.checkIfSoldToday(productId);
        if (wasSoldToday) {
            const password = prompt('⚠️ PRODUTO ATIVO!\n\nEste produto teve vendas hoje.\nDigite a senha de gerente para continuar:');
            if (password !== '1234') {
                window.showToast('❌ Senha incorreta - Delete cancelado', 'error');
                return;
            }
        }
        
        const confirmed = confirm(
            `Tem certeza que deseja excluir o produto "${product.name}"?\n\n` +
            `O produto será movido para a lixeira (30 dias).`
        );
        
        if (!confirmed) return;
        
        try {
            // MELHORIA 14: Backup antes de delete
            const deletedProduct = {
                ...product,
                deleted: true,
                deletedAt: new Date().toISOString(),
                deletedBy: window.currentUser?.name || 'Sistema'
            };
            
            await window.saveToDatabase('deleted_products', deletedProduct);
            
            // MELHORIA 1: Soft delete - marcar como deletado
            const index = this.products.findIndex(p => p.id === productId);
            if (index !== -1) {
                this.products[index].deleted = true;
                this.products[index].deletedAt = new Date().toISOString();
                await window.updateInDatabase('products', this.products[index]);
            }
            
            // Remover da lista ativa (mas mantém no banco com flag deleted)
            this.products = this.products.filter(p => p.id !== productId);
            this.deletedProducts.push(deletedProduct);
            
            // Atualizar globais
            if (window.productData) {
                window.productData.products = this.products;
            }
            window.currentProducts = this.products;
            
            console.log('🗑️ Produto movido para lixeira:', product.name);
            window.showToast('Produto excluído com sucesso! Restaurável por 30 dias.', 'success');
            
            // MELHORIA 4: Notificar PDV sobre exclusão
            this.emitProductUpdateEvent('delete', deletedProduct);
            
            this.renderProducts();
            
        } catch (error) {
            console.error('❌ Erro ao excluir produto:', error);
            window.showToast('Erro ao excluir produto', 'error');
        }
    }
    
    async toggleAvailability(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        try {
            product.available = !product.available;
            product.updatedAt = new Date().toISOString();
            
            // Atualizar no IndexedDB
            await window.updateInDatabase('products', product);
            
            // Atualizar globais
            if (window.productData) {
                window.productData.products = this.products;
            }
            window.currentProducts = this.products;
            
            const status = product.available ? 'ativado' : 'desativado';
            console.log(`${product.available ? '✅' : '❌'} Produto ${status}:`, product.name);
            window.showToast(`Produto ${status} com sucesso!`, 'success');
            
            // MELHORIA 4: Sincronização com PDV via EventBus
            this.emitProductUpdateEvent('toggle', product);
            
            this.renderProducts();
            
        } catch (error) {
            console.error('❌ Erro ao atualizar disponibilidade:', error);
            window.showToast('Erro ao atualizar produto', 'error');
        }
    }
    
    // ========================================
    // ESTATÍSTICAS
    // ========================================
    
    updateStats() {
        const total = this.products.length;
        const available = this.products.filter(p => p.available !== false).length;
        const unavailable = total - available;
        
        console.log('📊 [CARDÁPIO] Atualizando stats:', {
            total,
            available,
            unavailable,
            productsArray: this.products
        });
        
        // Atualizar cards se existirem (dashboard do cardápio)
        this.updateStatElement('total-products', total);
        this.updateStatElement('available-products', available);
        this.updateStatElement('unavailable-products', unavailable);
        
        // Atualizar categorias
        const categories = [...new Set(this.products.map(p => p.category))];
        this.updateStatElement('total-categories', categories.length);
        
        console.log(`📊 Stats: ${total} total, ${available} disponíveis, ${unavailable} indisponíveis, ${categories.length} categorias`);
    }
    
    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    // ========================================
    // UTILITÁRIOS
    // ========================================
    
    getDefaultCustomizations() {
        return [
            {
                name: 'Ponto da Carne',
                type: 'single',
                required: true,
                options: [
                    { id: 'mal-passado', name: 'Mal passado', price: 0 },
                    { id: 'ao-ponto', name: 'Ao ponto', price: 0, default: true },
                    { id: 'bem-passado', name: 'Bem passado', price: 0 }
                ]
            },
            {
                name: 'Pães',
                type: 'multiple',
                required: false,
                options: [
                    { id: 'pao-gergelim', name: '🍔 Pão Gergelim', price: 5.00 },
                    { id: 'pao-australiano', name: '🍞 Pão Australiano', price: 6.00 }
                ]
            },
            {
                name: 'Molhos',
                type: 'multiple',
                required: false,
                options: [
                    { id: 'maionese-verde', name: '🌿 Maionese Verde', price: 4.00 },
                    { id: 'maionese-bacon', name: '🥓 Maionese de Bacon', price: 6.00 },
                    { id: 'barbecue', name: '🔥 Barbecue', price: 4.00 },
                    { id: 'molho-especial', name: '⭐ Molho Especial', price: 5.00 },
                    { id: 'ketchup', name: '🍅 Ketchup', price: 2.00 },
                    { id: 'mostarda', name: '🌶️ Mostarda', price: 2.00 }
                ]
            },
            {
                name: 'Carnes',
                type: 'multiple',
                required: false,
                options: [
                    { id: 'burger-tradicional', name: '🍔 Burger Tradicional', price: 10.00 },
                    { id: 'burger-linguica', name: '🌭 Burger de Linguiça', price: 10.00 },
                    { id: 'burger-costela', name: '🥩 Burger de Costela', price: 12.00 },
                    { id: 'burger-frango', name: '🍗 Frango Empanado', price: 10.00 }
                ]
            },
            {
                name: 'Queijos',
                type: 'multiple',
                required: false,
                options: [
                    { id: 'cheddar', name: '🧀 Cheddar', price: 4.00 },
                    { id: 'mussarela', name: '🧀 Mussarela', price: 4.00 },
                    { id: 'prato', name: '🧀 Queijo Prato', price: 3.50 }
                ]
            },
            {
                name: 'Adicionais',
                type: 'multiple',
                required: false,
                options: [
                    { id: 'bacon', name: '🥓 Bacon', price: 5.00 },
                    { id: 'ovo', name: '🍳 Ovo', price: 3.00 },
                    { id: 'calabresa', name: '🌶️ Calabresa', price: 5.00 },
                    { id: 'cebola-caramelizada', name: '🧅 Cebola Caramelizada', price: 4.00 },
                    { id: 'cebola-empanada', name: '🧅 Cebola Empanada', price: 5.00 },
                    { id: 'tomate', name: '🍅 Tomate', price: 2.00 },
                    { id: 'alface', name: '🥬 Alface', price: 2.00 },
                    { id: 'picles', name: '🥒 Picles', price: 2.00 },
                    { id: 'abacaxi', name: '🍍 Abacaxi', price: 3.00 }
                ]
            }
        ];
    }
    
    async showCustomizationsPreview() {
        const preview = document.getElementById('customizations-preview');
        const list = document.getElementById('customizations-list');
        
        if (!preview || !list) return;
        
        // Carregar adicionais do banco de dados
        const customizations = await this.loadCustomizationsFromDB();
        
        if (!customizations || customizations.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #999;">
                    <i class="fas fa-info-circle" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                    <p>Nenhum adicional cadastrado ainda.</p>
                    <p style="font-size: 0.9em;">Clique em "Gerenciar Adicionais" para adicionar.</p>
                </div>
            `;
        } else {
            list.innerHTML = `
                <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">
                    <i class="fas fa-check-circle" style="color: #27ae60;"></i>
                    <strong>Todos os grupos abaixo estarão disponíveis para este produto:</strong>
                </p>
                ${customizations.map(group => `
                    <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 6px; border-left: 4px solid #667eea;">
                        <strong style="color: #333; display: block; margin-bottom: 8px; font-size: 1em;">
                            ${group.name} 
                            ${group.required ? '<span style="color: #e74c3c; font-size: 0.9em;">* Obrigatório</span>' : '<span style="color: #95a5a6; font-size: 0.9em;">Opcional</span>'}
                            <span style="background: ${group.type === 'single' ? '#3498db' : '#9b59b6'}; color: white; font-size: 0.75em; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">
                                ${group.type === 'single' ? '⚪ Única' : '☑️ Múltipla'}
                            </span>
                        </strong>
                        <div style="padding-left: 10px; font-size: 0.85em; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 5px;">
                            ${group.options.map(opt => `
                                <div style="padding: 4px 0; color: #555; display: flex; align-items: center; gap: 5px;">
                                    <i class="fas fa-check" style="color: #27ae60; font-size: 0.8em;"></i>
                                    <span>${opt.name}</span>
                                    ${opt.price > 0 ? 
                                        `<span style="color: #667eea; font-weight: 600; margin-left: auto;">+R$ ${opt.price.toFixed(2)}</span>` : 
                                        '<span style="color: #27ae60; font-weight: 500; margin-left: auto;">Grátis</span>'
                                    }
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
                <div style="margin-top: 15px; padding: 12px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; color: #856404; font-size: 0.9em;">
                        <i class="fas fa-lightbulb"></i>
                        <strong>Dica:</strong> Os clientes poderão escolher entre essas opções ao fazer pedidos.
                    </p>
                </div>
            `;
        }
        
        preview.style.display = 'block';
    }
    
    hideCustomizationsPreview() {
        const preview = document.getElementById('customizations-preview');
        if (preview) {
            preview.style.display = 'none';
        }
    }
    
    generateId() {
        return 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ========================================
    // LIFECYCLE METHODS
    // ========================================
    
    async activate() {
        console.log('🔄 Ativando CardapioModule...');
        
        if (!this.isInitialized) {
            await this.init();
        } else {
            // Reconfigurar eventos e atualizar dados
            this.bindEvents();
            await this.loadProductsFromDatabase();
            this.renderProducts();
        }
    }
    
    deactivate() {
        console.log('⏸️ Desativando CardapioModule...');
        // Modal pode ficar aberto, então fecha
        this.closeProductModal();
        this.closeCategoriesModal();
    }
    
    destroy() {
        console.log('🗑️ Destruindo CardapioModule...');
        this.closeProductModal();
        this.closeCategoriesModal();
        this.products = [];
        this.categories = [];
        this.isInitialized = false;
    }
    
    // ========================================
    // MODAL DE CATEGORIAS
    // ========================================
    
    showCategoriesModal() {
        console.log('📂 Abrindo modal de categorias');
        
        // Remover modal existente
        let existingModal = document.getElementById('categories-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Criar novo modal
        const modal = this.createCategoriesModal();
        document.body.appendChild(modal);
        
        // Renderizar lista de categorias
        this.renderCategoriesList();
        
        // Mostrar modal
        modal.classList.add('active');
    }
    
    createCategoriesModal() {
        const modal = document.createElement('div');
        modal.id = 'categories-modal';
        modal.className = 'modal';
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(`
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">Gerenciar Categorias</h3>
                    <button class="close-categories-modal" aria-label="Fechar modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="category-form-section">
                        <h4>➕ Nova Categoria</h4>
                        <form id="category-form" class="category-form">
                            <div class="form-row">
                                <div class="form-group" style="flex: 2;">
                                    <label for="category-name">Nome da Categoria *</label>
                                    <input type="text" id="category-name" required 
                                           placeholder="Ex: Hambúrgueres">
                                </div>
                                <div class="form-group" style="flex: 1;">
                                    <label for="category-icon">Ícone/Emoji</label>
                                    <input type="text" id="category-icon" 
                                           placeholder="🍔" maxlength="4">
                                </div>
                                <div class="form-group" style="align-self: flex-end;">
                                    <button type="button" class="btn btn-primary" id="add-category-btn">
                                        <i class="fas fa-plus"></i> Adicionar
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <hr style="margin: 20px 0;">
                    
                    <div class="categories-list-section">
                        <h4>📋 Categorias Existentes</h4>
                        <div id="categories-list" class="categories-list">
                            <!-- Será preenchido dinamicamente -->
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-categories-modal">
                        Fechar
                    </button>
                </div>
            </div>
        `, 'text/html');
        
        Array.from(doc.body.children).forEach(child => {
            modal.appendChild(child);
        });
        
        // Event listeners
        modal.addEventListener('click', (e) => {
            if (e.target.closest('#add-category-btn')) {
                this.addCategory();
            } else if (e.target.closest('.close-categories-modal')) {
                this.closeCategoriesModal();
            } else if (e.target.closest('.delete-category-btn')) {
                const categoryId = e.target.closest('.delete-category-btn').dataset.categoryId;
                this.deleteCategory(categoryId);
            } else if (e.target.closest('.edit-category-btn')) {
                const categoryId = e.target.closest('.edit-category-btn').dataset.categoryId;
                this.editCategory(categoryId);
            }
        });
        
        return modal;
    }
    
    renderCategoriesList() {
        const container = document.getElementById('categories-list');
        if (!container) return;
        
        if (this.categories.length === 0) {
            container.innerHTML = '<p class="text-center" style="color: #999;">Nenhuma categoria cadastrada</p>';
            return;
        }
        
        container.innerHTML = this.categories.map(cat => `
            <div class="category-item" data-category-id="${cat.id}">
                <div class="category-info">
                    <span class="category-icon">${cat.icon || '📦'}</span>
                    <span class="category-name">${cat.name}</span>
                    <span class="category-id">(ID: ${cat.id})</span>
                </div>
                <div class="category-actions">
                    <button class="btn btn-sm btn-secondary edit-category-btn" 
                            data-category-id="${cat.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-category-btn" 
                            data-category-id="${cat.id}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    async addCategory() {
        const modal = document.getElementById('categories-modal');
        if (!modal) return;
        
        const nameInput = modal.querySelector('#category-name');
        const iconInput = modal.querySelector('#category-icon');
        
        if (!nameInput) return;
        
        const name = nameInput.value.trim();
        const icon = iconInput ? iconInput.value.trim() || '📦' : '📦';
        
        if (!name) {
            window.showToast('Nome da categoria é obrigatório', 'error');
            nameInput.focus();
            return;
        }
        
        // Gerar ID único baseado no nome
        const id = name.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        // Verificar se já existe
        if (this.categories.find(c => c.id === id)) {
            window.showToast('Já existe uma categoria com este nome', 'error');
            return;
        }
        
        try {
            const newCategory = { id, name, icon };
            
            // Adicionar ao array local
            this.categories.push(newCategory);
            
            // Salvar no banco
            await window.saveToDatabase('categories', newCategory);
            
            // Atualizar global
            if (window.productData) {
                window.productData.categories = this.categories;
            }
            
            console.log('✅ Categoria criada:', newCategory);
            window.showToast('Categoria criada com sucesso!', 'success');
            
            // Limpar formulário
            nameInput.value = '';
            if (iconInput) iconInput.value = '';
            
            // Atualizar lista e filtros
            this.renderCategoriesList();
            this.loadCategoryFilters();
            
        } catch (error) {
            console.error('❌ Erro ao criar categoria:', error);
            window.showToast('Erro ao criar categoria', 'error');
        }
    }
    
    async editCategory(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) return;
        
        const newName = prompt('Novo nome da categoria:', category.name);
        if (!newName || newName.trim() === '') return;
        
        const newIcon = prompt('Novo ícone/emoji:', category.icon || '📦');
        
        try {
            category.name = newName.trim();
            category.icon = newIcon ? newIcon.trim() : category.icon;
            
            // Atualizar no banco
            await window.updateInDatabase('categories', category);
            
            // Atualizar global
            if (window.productData) {
                window.productData.categories = this.categories;
            }
            
            console.log('✅ Categoria atualizada:', category);
            window.showToast('Categoria atualizada com sucesso!', 'success');
            
            // Atualizar lista e filtros
            this.renderCategoriesList();
            this.loadCategoryFilters();
            this.renderProducts();
            
        } catch (error) {
            console.error('❌ Erro ao atualizar categoria:', error);
            window.showToast('Erro ao atualizar categoria', 'error');
        }
    }
    
    async deleteCategory(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) return;
        
        // MELHORIA 5: Bloquear delete de categoria com produtos ativos
        const productsUsingCategory = this.products.filter(p => p.category === categoryId && !p.deleted);
        
        if (productsUsingCategory.length > 0) {
            // MELHORIA 21: Oferecer migração de produtos
            const otherCategories = this.categories.filter(c => c.id !== categoryId);
            
            if (otherCategories.length === 0) {
                window.showToast('❌ Não é possível excluir a única categoria', 'error');
                return;
            }
            
            const categoryList = otherCategories.map(c => `- ${c.name}`).join('\n');
            const action = confirm(
                `⚠️ CATEGORIA COM PRODUTOS!\n\n` +
                `Existem ${productsUsingCategory.length} produto(s) usando "${category.name}".\n\n` +
                `Opções disponíveis:\n${categoryList}\n\n` +
                `Clique OK para mover produtos ou CANCELAR para abortar.`
            );
            
            if (!action) return;
            
            // Mostrar modal de seleção de categoria
            const newCategoryId = await this.showCategoryMigrationModal(otherCategories, productsUsingCategory.length);
            if (!newCategoryId) return;
            
            // Migrar produtos
            for (const product of productsUsingCategory) {
                product.category = newCategoryId;
                product.updatedAt = new Date().toISOString();
                await window.updateInDatabase('products', product);
            }
            
            window.showToast(`✅ ${productsUsingCategory.length} produto(s) migrados com sucesso!`, 'success');
        } else {
            const confirmed = confirm(`Deseja realmente excluir a categoria "${category.name}"?`);
            if (!confirmed) return;
        }
        
        try {
            // Remover do banco
            await window.deleteFromDatabase('categories', categoryId);
            
            // Remover do array local
            this.categories = this.categories.filter(c => c.id !== categoryId);
            
            // Atualizar global
            if (window.productData) {
                window.productData.categories = this.categories;
            }
            
            console.log('🗑️ Categoria excluída:', category.name);
            window.showToast('Categoria excluída com sucesso!', 'success');
            
            // Atualizar interface
            this.renderCategoriesList();
            this.loadCategoryFilters();
            this.renderProducts();
            
        } catch (error) {
            console.error('❌ Erro ao excluir categoria:', error);
            window.showToast('Erro ao excluir categoria', 'error');
        }
    }
    
    closeCategoriesModal() {
        const modal = document.getElementById('categories-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    }
    
    // ========================================
    // GERENCIAMENTO DE ADICIONAIS/EXTRAS
    // ========================================
    
    showExtrasModal() {
        console.log('🧩 Abrindo modal de adicionais');
        
        // Remover modal existente
        let existingModal = document.getElementById('extras-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Criar novo modal
        const modal = this.createExtrasModal();
        document.body.appendChild(modal);
        
        // Renderizar lista de adicionais
        this.renderExtrasList();
        
        // Configurar eventos
        this.bindExtrasModalEvents();
        
        // Mostrar modal
        modal.classList.add('active');
    }
    
    createExtrasModal() {
        const modal = document.createElement('div');
        modal.id = 'extras-modal';
        modal.className = 'modal';
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(`
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 900px; max-height: 90vh;">
                <div class="modal-header">
                    <h3 class="modal-title">🧩 Gerenciar Adicionais</h3>
                    <button class="close-extras-modal" aria-label="Fechar modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="overflow-y: auto;">
                    <div class="extras-intro" style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                        <p style="margin: 0 0 8px 0; color: #1565c0; font-size: 0.95em;">
                            <i class="fas fa-info-circle"></i> 
                            <strong>Dica:</strong> Organize seus adicionais em grupos (ex: Pães, Molhos, Carnes) e defina se são de seleção única (radio) ou múltipla (checkbox).
                        </p>
                        <p style="margin: 0; color: #1565c0; font-size: 0.9em; padding-left: 20px;">
                            ⚠️ <strong>Importante:</strong> Após adicionar, editar ou remover itens, clique em <strong>"Salvar e Sincronizar"</strong> para aplicar as mudanças no sistema!
                        </p>
                    </div>
                    
                    <div class="extras-form-section">
                        <h4>➕ Adicionar Novo Item</h4>
                        <form id="extra-item-form" class="extra-form">
                            <div class="form-row">
                                <div class="form-group" style="flex: 2;">
                                    <label for="extra-group-name">Grupo/Categoria *</label>
                                    <input type="text" id="extra-group-name" required 
                                           placeholder="Ex: Pães, Molhos, Queijos">
                                    <small>Nome do grupo de adicionais</small>
                                </div>
                                <div class="form-group" style="flex: 1;">
                                    <label for="extra-group-type">Tipo de Seleção *</label>
                                    <select id="extra-group-type" required>
                                        <option value="single">Única (Radio)</option>
                                        <option value="multiple">Múltipla (Checkbox)</option>
                                    </select>
                                    <small>Como o cliente escolhe</small>
                                </div>
                                <div class="form-group" style="flex: 0.5; align-items: center; justify-content: center;">
                                    <label style="margin: 0;">
                                        <input type="checkbox" id="extra-group-required">
                                        <span style="font-size: 0.9em;">Obrigatório</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group" style="flex: 2;">
                                    <label for="extra-option-name">Nome do Item *</label>
                                    <input type="text" id="extra-option-name" required 
                                           placeholder="Ex: Queijo Cheddar, Bacon">
                                </div>
                                <div class="form-group" style="flex: 1;">
                                    <label for="extra-option-price">Preço Adicional (R$) *</label>
                                    <input type="number" id="extra-option-price" step="0.01" min="0" required
                                           placeholder="0.00" value="0">
                                </div>
                                <div class="form-group" style="align-self: flex-end;">
                                    <button type="submit" class="btn btn-primary" id="add-extra-item-btn">
                                        <i class="fas fa-plus"></i> Adicionar
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <hr style="margin: 25px 0;">
                    
                    <div class="extras-list-section">
                        <h4>📋 Adicionais Cadastrados</h4>
                        <div id="extras-list" class="extras-list">
                            <!-- Será preenchido dinamicamente -->
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-success" id="save-sync-extras-btn">
                        <i class="fas fa-cloud-upload-alt"></i> Salvar e Sincronizar
                    </button>
                    <button type="button" class="btn btn-secondary close-extras-modal">
                        <i class="fas fa-times"></i> Fechar
                    </button>
                </div>
            </div>
        `, 'text/html');
        
        // Transferir conteúdo parseado
        const content = doc.querySelector('.modal-content');
        const overlay = doc.querySelector('.modal-overlay');
        modal.appendChild(overlay);
        modal.appendChild(content);
        
        return modal;
    }
    
    bindExtrasModalEvents() {
        // Fechar modal
        const closeButtons = document.querySelectorAll('.close-extras-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeExtrasModal());
        });
        
        const overlay = document.querySelector('#extras-modal .modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeExtrasModal());
        }
        
        // Botão Salvar e Sincronizar
        const saveSyncBtn = document.getElementById('save-sync-extras-btn');
        if (saveSyncBtn) {
            saveSyncBtn.addEventListener('click', async () => {
                await this.saveAndSyncExtras();
            });
        }
        
        // Formulário de adicionar
        const form = document.getElementById('extra-item-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addExtraItem();
            });
        }
    }
    
    async addExtraItem() {
        const groupName = document.getElementById('extra-group-name').value.trim();
        const groupType = document.getElementById('extra-group-type').value;
        const groupRequired = document.getElementById('extra-group-required').checked;
        const optionName = document.getElementById('extra-option-name').value.trim();
        const optionPrice = parseFloat(document.getElementById('extra-option-price').value) || 0;
        
        if (!groupName || !optionName) {
            window.showToast('Preencha todos os campos obrigatórios', 'error');
            return;
        }
        
        // MELHORIA 15: Validação de adicionais com preço zero
        if (optionPrice === 0) {
            if (!this.validateExtraPrice(optionName, optionPrice)) {
                return;
            }
        }
        
        try {
            // Carregar customizações atuais
            let customizations = await this.loadCustomizationsFromDB();
            
            // Buscar grupo existente
            let group = customizations.find(g => g.name === groupName);
            
            if (!group) {
                // Criar novo grupo
                group = {
                    name: groupName,
                    type: groupType,
                    required: groupRequired,
                    options: []
                };
                customizations.push(group);
            }
            
            // Adicionar opção ao grupo
            const newOption = {
                id: this.generateId(),
                name: optionName,
                price: optionPrice
            };
            
            group.options.push(newOption);
            
            // Salvar no banco
            await this.saveCustomizationsToDB(customizations);
            
            console.log('✅ Item adicionado:', newOption);
            window.showToast(`${optionName} adicionado! Clique em "Salvar e Sincronizar" para aplicar no sistema.`, 'info');
            
            // Limpar campos (mantém grupo)
            document.getElementById('extra-option-name').value = '';
            document.getElementById('extra-option-price').value = '0';
            
            // Atualizar lista
            this.renderExtrasList();
            
        } catch (error) {
            console.error('❌ Erro ao adicionar item:', error);
            window.showToast('Erro ao adicionar item', 'error');
        }
    }
    
    async loadCustomizationsFromDB() {
        try {
            let settings = await window.getFromDatabase('settings');
            
            // getFromDatabase pode retornar array, pegamos o primeiro item
            if (Array.isArray(settings)) {
                settings = settings[0] || null;
            }
            
            if (settings && settings.customizations) {
                console.log('📥 Customizações carregadas do banco:', settings.customizations.length, 'grupos');
                return settings.customizations;
            }
            
            // Retornar padrões se não existir
            console.log('📦 Usando customizações padrão');
            return this.getDefaultCustomizations();
        } catch (error) {
            console.error('Erro ao carregar customizações:', error);
            return this.getDefaultCustomizations();
        }
    }
    
    async saveCustomizationsToDB(customizations) {
        try {
            let settings = await window.getFromDatabase('settings');
            
            // getFromDatabase pode retornar array, pegamos o primeiro item
            if (Array.isArray(settings)) {
                settings = settings[0] || null;
            }
            
            // Se não existe ou não tem ID, criar novo
            if (!settings || !settings.id) {
                settings = { id: 'settings-1' };
            }
            
            // Garantir que o ID não foi perdido
            if (!settings.id) {
                settings.id = 'settings-1';
            }
            
            settings.customizations = customizations;
            
            await window.updateInDatabase('settings', settings);
            console.log('✅ Customizações salvas no banco:', settings.id);
        } catch (error) {
            console.error('❌ Erro ao salvar customizações:', error);
            throw error;
        }
    }
    
    async saveAndSyncExtras() {
        try {
            const btn = document.getElementById('save-sync-extras-btn');
            const originalHTML = btn.innerHTML;
            
            // Feedback visual
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
            
            // Forçar sincronização com Firebase
            if (window.firebaseService) {
                await window.firebaseService.syncToCloud();
                await window.firebaseService.syncFromCloud();
            }
            
            window.showToast('✅ Adicionais sincronizados! Agora estão disponíveis no sistema.', 'success');
            
            // Restaurar botão
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            
            console.log('✅ Sincronização de adicionais concluída');
        } catch (error) {
            console.error('❌ Erro ao sincronizar:', error);
            window.showToast('Erro ao sincronizar. Verifique sua conexão.', 'error');
            
            const btn = document.getElementById('save-sync-extras-btn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Salvar e Sincronizar';
            }
        }
    }
    
    async renderExtrasList() {
        const listContainer = document.getElementById('extras-list');
        if (!listContainer) return;
        
        try {
            const customizations = await this.loadCustomizationsFromDB();
            
            if (!customizations || customizations.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #999;">
                        <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
                        <p>Nenhum adicional cadastrado ainda.</p>
                        <p style="font-size: 0.9em;">Use o formulário acima para adicionar itens.</p>
                    </div>
                `;
                return;
            }
            
            listContainer.innerHTML = customizations.map(group => `
                <div class="extras-group" data-group-name="${this.escapeHtml(group.name)}">
                    <div class="group-header">
                        <div class="group-info">
                            <h5>
                                ${this.escapeHtml(group.name)}
                                <span class="badge" style="background: ${group.type === 'single' ? '#3498db' : '#9b59b6'}; color: white; font-size: 0.75em; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">
                                    ${group.type === 'single' ? '⚪ Única' : '☑️ Múltipla'}
                                </span>
                                ${group.required ? '<span class="badge" style="background: #e74c3c; color: white; font-size: 0.75em; padding: 2px 8px; border-radius: 12px; margin-left: 5px;">* Obrigatório</span>' : ''}
                            </h5>
                        </div>
                        <div class="group-actions">
                            <button class="btn-icon" title="Editar grupo" 
                                    onclick="window.cardapioModule.editExtrasGroup('${this.escapeHtml(group.name)}')">
                                <i class="fas fa-edit" style="color: #3498db;"></i>
                            </button>
                            <button class="btn-icon" title="Excluir grupo completo" 
                                    onclick="window.cardapioModule.deleteExtrasGroup('${this.escapeHtml(group.name)}')">
                                <i class="fas fa-trash" style="color: #e74c3c;"></i>
                            </button>
                        </div>
                    </div>
                    <div class="group-options">
                        ${group.options.map(option => `
                            <div class="option-item">
                                <div class="option-info">
                                    <span class="option-name">${this.escapeHtml(option.name)}</span>
                                    <span class="option-price">
                                        ${option.price > 0 ? `+R$ ${option.price.toFixed(2)}` : 'Grátis'}
                                    </span>
                                </div>
                                <div class="option-actions">
                                    <button class="btn-icon-small" title="Editar item"
                                            onclick="window.cardapioModule.editExtraOption('${this.escapeHtml(group.name)}', '${option.id}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-icon-small" title="Remover item"
                                            onclick="window.cardapioModule.deleteExtraOption('${this.escapeHtml(group.name)}', '${option.id}')">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('❌ Erro ao renderizar lista:', error);
            listContainer.innerHTML = '<p style="color: red;">Erro ao carregar adicionais</p>';
        }
    }
    
    async editExtrasGroup(groupName) {
        try {
            const customizations = await this.loadCustomizationsFromDB();
            const group = customizations.find(g => g.name === groupName);
            
            if (!group) {
                window.showToast('Grupo não encontrado', 'error');
                return;
            }
            
            // Criar modal de edição
            let modal = document.getElementById('edit-group-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'edit-group-modal';
            modal.className = 'modal active';
            modal.style.zIndex = '10001';
            
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3 class="modal-title">✏️ Editar Grupo: ${this.escapeHtml(groupName)}</h3>
                        <button class="close-edit-group-modal" aria-label="Fechar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-group-form">
                            <div class="form-group">
                                <label for="edit-group-name">Nome do Grupo *</label>
                                <input type="text" id="edit-group-name" required 
                                       value="${this.escapeHtml(group.name)}">
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-group-type">Tipo de Seleção *</label>
                                <select id="edit-group-type" required>
                                    <option value="single" ${group.type === 'single' ? 'selected' : ''}>Única (Radio)</option>
                                    <option value="multiple" ${group.type === 'multiple' ? 'selected' : ''}>Múltipla (Checkbox)</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="edit-group-required" ${group.required ? 'checked' : ''}>
                                    <span>Obrigatório</span>
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary close-edit-group-modal">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" id="save-edit-group-btn">
                            <i class="fas fa-save"></i> Salvar Alterações
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Event listeners
            const closeButtons = modal.querySelectorAll('.close-edit-group-modal');
            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => modal.remove());
            });
            
            modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());
            
            modal.querySelector('#save-edit-group-btn').addEventListener('click', async () => {
                const newName = modal.querySelector('#edit-group-name').value.trim();
                const newType = modal.querySelector('#edit-group-type').value;
                const newRequired = modal.querySelector('#edit-group-required').checked;
                
                if (!newName) {
                    window.showToast('Nome é obrigatório', 'error');
                    return;
                }
                
                try {
                    let customizations = await this.loadCustomizationsFromDB();
                    
                    // Verificar se o novo nome já existe (e não é o mesmo grupo)
                    if (newName !== groupName && customizations.some(g => g.name === newName)) {
                        window.showToast('Já existe um grupo com este nome', 'error');
                        return;
                    }
                    
                    // Atualizar grupo
                    const groupIndex = customizations.findIndex(g => g.name === groupName);
                    if (groupIndex !== -1) {
                        customizations[groupIndex].name = newName;
                        customizations[groupIndex].type = newType;
                        customizations[groupIndex].required = newRequired;
                        
                        await this.saveCustomizationsToDB(customizations);
                        
                        window.showToast('✅ Grupo atualizado! Clique em "Salvar e Sincronizar" para aplicar.', 'info');
                        this.renderExtrasList();
                        modal.remove();
                    }
                } catch (error) {
                    console.error('❌ Erro ao salvar:', error);
                    window.showToast('Erro ao salvar alterações', 'error');
                }
            });
            
            // Focar no primeiro campo
            setTimeout(() => {
                modal.querySelector('#edit-group-name').focus();
            }, 100);
            
        } catch (error) {
            console.error('❌ Erro ao editar grupo:', error);
            window.showToast('Erro ao editar grupo', 'error');
        }
    }
    
    async editExtraOption(groupName, optionId) {
        try {
            const customizations = await this.loadCustomizationsFromDB();
            const group = customizations.find(g => g.name === groupName);
            
            if (!group) {
                window.showToast('Grupo não encontrado', 'error');
                return;
            }
            
            const option = group.options.find(opt => opt.id === optionId);
            if (!option) {
                window.showToast('Item não encontrado', 'error');
                return;
            }
            
            // Criar modal de edição
            let modal = document.getElementById('edit-option-modal');
            if (modal) modal.remove();
            
            modal = document.createElement('div');
            modal.id = 'edit-option-modal';
            modal.className = 'modal active';
            modal.style.zIndex = '10001';
            
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3 class="modal-title">✏️ Editar Item: ${this.escapeHtml(option.name)}</h3>
                        <button class="close-edit-option-modal" aria-label="Fechar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-option-form">
                            <div class="form-group">
                                <label>Grupo</label>
                                <input type="text" value="${this.escapeHtml(groupName)}" disabled 
                                       style="background: #f0f0f0; cursor: not-allowed;">
                                <small>O grupo não pode ser alterado. Para mover, delete e recrie no grupo desejado.</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-option-name">Nome do Item *</label>
                                <input type="text" id="edit-option-name" required 
                                       value="${this.escapeHtml(option.name)}">
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-option-price">Preço Adicional (R$) *</label>
                                <input type="number" id="edit-option-price" step="0.01" min="0" required
                                       value="${option.price}">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary close-edit-option-modal">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" id="save-edit-option-btn">
                            <i class="fas fa-save"></i> Salvar Alterações
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Event listeners
            const closeButtons = modal.querySelectorAll('.close-edit-option-modal');
            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => modal.remove());
            });
            
            modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());
            
            modal.querySelector('#save-edit-option-btn').addEventListener('click', async () => {
                const newName = modal.querySelector('#edit-option-name').value.trim();
                const newPrice = parseFloat(modal.querySelector('#edit-option-price').value) || 0;
                
                if (!newName) {
                    window.showToast('Nome é obrigatório', 'error');
                    return;
                }
                
                if (newPrice < 0) {
                    window.showToast('Preço não pode ser negativo', 'error');
                    return;
                }
                
                try {
                    let customizations = await this.loadCustomizationsFromDB();
                    const group = customizations.find(g => g.name === groupName);
                    
                    if (group) {
                        const optionIndex = group.options.findIndex(opt => opt.id === optionId);
                        if (optionIndex !== -1) {
                            group.options[optionIndex].name = newName;
                            group.options[optionIndex].price = newPrice;
                            
                            await this.saveCustomizationsToDB(customizations);
                            
                            window.showToast('✅ Item atualizado! Clique em "Salvar e Sincronizar" para aplicar.', 'info');
                            this.renderExtrasList();
                            modal.remove();
                        }
                    }
                } catch (error) {
                    console.error('❌ Erro ao salvar:', error);
                    window.showToast('Erro ao salvar alterações', 'error');
                }
            });
            
            // Focar no primeiro campo editável
            setTimeout(() => {
                modal.querySelector('#edit-option-name').focus();
            }, 100);
            
        } catch (error) {
            console.error('❌ Erro ao editar item:', error);
            window.showToast('Erro ao editar item', 'error');
        }
    }
    
    async deleteExtraOption(groupName, optionId) {
        if (!confirm(`Tem certeza que deseja remover este item?`)) return;
        
        try {
            let customizations = await this.loadCustomizationsFromDB();
            
            const group = customizations.find(g => g.name === groupName);
            if (!group) return;
            
            group.options = group.options.filter(opt => opt.id !== optionId);
            
            // Se grupo ficou vazio, remover
            if (group.options.length === 0) {
                customizations = customizations.filter(g => g.name !== groupName);
            }
            
            await this.saveCustomizationsToDB(customizations);
            
            window.showToast('✅ Item removido! Clique em "Salvar e Sincronizar" para aplicar.', 'info');
            this.renderExtrasList();
            
        } catch (error) {
            console.error('❌ Erro ao remover item:', error);
            window.showToast('Erro ao remover item', 'error');
        }
    }
    
    async deleteExtrasGroup(groupName) {
        if (!confirm(`Tem certeza que deseja excluir o grupo "${groupName}" e todos os seus itens?`)) return;
        
        try {
            let customizations = await this.loadCustomizationsFromDB();
            customizations = customizations.filter(g => g.name !== groupName);
            
            await this.saveCustomizationsToDB(customizations);
            
            window.showToast('✅ Grupo excluído! Clique em "Salvar e Sincronizar" para aplicar.', 'info');
            this.renderExtrasList();
            
        } catch (error) {
            console.error('❌ Erro ao excluir grupo:', error);
            window.showToast('Erro ao excluir grupo', 'error');
        }
    }
    
    closeExtrasModal() {
        const modal = document.getElementById('extras-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    }
    
    // ========================================
    // FUNÇÕES AUXILIARES DAS MELHORIAS
    // ========================================
    
    // MELHORIA 4: EventBus para sincronização com PDV
    emitProductUpdateEvent(action, product) {
        if (window.dispatchEvent) {
            const event = new CustomEvent('cardapio:productUpdate', {
                detail: { action, product, timestamp: new Date().toISOString() }
            });
            window.dispatchEvent(event);
            console.log(`📡 Evento emitido: cardapio:productUpdate (${action})`, product.name);
        }
    }
    
    // MELHORIA 6: Normalizar nome para detecção de duplicatas
    normalizeName(name) {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais
            .trim();
    }
    
    // MELHORIA 8: Registrar histórico de alteração de preço
    async logPriceChange(changeData) {
        try {
            const log = {
                id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...changeData
            };
            
            await window.saveToDatabase('price_history', log);
            this.priceHistory.push(log);
            
            console.log('💰 Alteração de preço registrada:', log);
        } catch (error) {
            console.error('❌ Erro ao registrar alteração de preço:', error);
        }
    }
    
    // MELHORIA 11: Gerar ID único sem colisões
    generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        return `prod_${timestamp}_${random}`.replace(/\s+/g, ''); // Remove espaços duplos
    }
    
    // MELHORIA 12: Retry automático em salvamento
    async saveWithRetry(storeName, data, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (data.id && await this.checkIfExists(storeName, data.id)) {
                    await window.updateInDatabase(storeName, data);
                } else {
                    await window.saveToDatabase(storeName, data);
                }
                
                if (attempt > 1) {
                    console.log(`✅ Salvamento bem-sucedido na tentativa ${attempt}`);
                }
                return true;
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Tentativa ${attempt}/${maxRetries} falhou:`, error.message);
                
                if (attempt < maxRetries) {
                    await this.delay(500 * attempt); // Backoff exponencial
                }
            }
        }
        
        window.showToast(`❌ Erro ao salvar após ${maxRetries} tentativas`, 'error');
        throw lastError;
    }
    
    async checkIfExists(storeName, id) {
        try {
            const item = await window.getFromDatabase(storeName, id);
            return !!item;
        } catch {
            return false;
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // MELHORIA 15: Validação de adicionais com preço zero
    validateExtraPrice(optionName, price) {
        if (price === 0) {
            return confirm(`⚠️ Adicional "${optionName}" com preço R$ 0,00\n\nDeseja continuar?`);
        }
        return true;
    }
    
    // MELHORIA 19: Calcular margem de lucro
    calculateMargin(cost, price) {
        if (!cost || cost === 0 || !price || price === 0) return 0;
        return ((price - cost) / price * 100).toFixed(2);
    }
    
    // MELHORIA 22: Sugestão de preço inteligente
    async suggestOptimalPrice(category) {
        try {
            const categoryProducts = this.products.filter(p => p.category === category && p.price > 0);
            if (categoryProducts.length === 0) return null;
            
            const avgPrice = categoryProducts.reduce((sum, p) => sum + p.price, 0) / categoryProducts.length;
            return Math.round(avgPrice * 1.1 * 100) / 100; // +10% sobre a média
        } catch {
            return null;
        }
    }
    
    // MELHORIA 28: Verificar se produto foi vendido hoje
    async checkIfSoldToday(productId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const orders = await window.getFromDatabase('orders') || [];
            
            return orders.some(order => {
                if (!order.createdAt) return false;
                const orderDate = order.createdAt.split('T')[0];
                if (orderDate !== today) return false;
                
                return order.items?.some(item => item.id === productId);
            });
        } catch (error) {
            console.error('❌ Erro ao verificar vendas:', error);
            return false;
        }
    }
    
    // MELHORIA 20: Detectar produtos inativos (30+ dias sem venda)
    async detectInactiveProducts() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const orders = await window.getFromDatabase('orders') || [];
            const inactiveProducts = [];
            
            for (const product of this.products) {
                const lastSale = orders
                    .filter(o => o.items?.some(i => i.id === product.id))
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                
                if (!lastSale || new Date(lastSale.createdAt) < thirtyDaysAgo) {
                    inactiveProducts.push({
                        ...product,
                        lastSaleDate: lastSale?.createdAt || null,
                        daysInactive: lastSale 
                            ? Math.floor((Date.now() - new Date(lastSale.createdAt)) / (1000 * 60 * 60 * 24))
                            : 999
                    });
                }
            }
            
            return inactiveProducts;
        } catch (error) {
            console.error('❌ Erro ao detectar produtos inativos:', error);
            return [];
        }
    }
    
    // MELHORIA 20: Modal de produtos inativos com sugestões de ação
    async showInactiveProductsModal() {
        try {
            const inactiveProducts = await this.detectInactiveProducts();
            
            if (inactiveProducts.length === 0) {
                window.showToast('✅ Todos os produtos estão com vendas recentes!', 'success');
                return;
            }
            
            // Ordenar por dias sem venda (mais antigos primeiro)
            inactiveProducts.sort((a, b) => b.daysInactive - a.daysInactive);
            
            const modal = document.createElement('div');
            modal.id = 'inactive-products-modal';
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3>⚠️ Produtos Inativos - Análise de Vendas</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
                            <strong>📊 ${inactiveProducts.length} produto(s) sem vendas há 30+ dias</strong>
                            <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #856404;">
                                Considere atualizar preços, promover ou remover produtos sem demanda.
                            </p>
                        </div>
                        
                        <div style="max-height: 500px; overflow-y: auto;">
                            ${inactiveProducts.map(p => {
                                const category = this.getCategoryName(p.category);
                                const lastSale = p.lastSaleDate ? new Date(p.lastSaleDate).toLocaleDateString('pt-BR') : 'Nunca vendido';
                                const severity = p.daysInactive > 90 ? 'critical' : p.daysInactive > 60 ? 'high' : 'medium';
                                const severityColor = severity === 'critical' ? '#dc2626' : severity === 'high' ? '#f97316' : '#fbbf24';
                                
                                return `
                                    <div style="border: 1px solid #ddd; padding: 20px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid ${severityColor};">
                                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                                            <div style="flex: 1;">
                                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                                    <span style="font-size: 2em;">${p.image || '🍔'}</span>
                                                    <div>
                                                        <strong style="font-size: 1.1em;">${this.escapeHtml(p.name)}</strong>
                                                        <div style="font-size: 0.9em; color: #666;">
                                                            ${category} • R$ ${p.price.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div style="display: flex; gap: 20px; font-size: 0.9em; color: #666;">
                                                    <div>
                                                        <i class="fas fa-calendar-times" style="color: ${severityColor};"></i>
                                                        <strong>${p.daysInactive}</strong> dias sem venda
                                                    </div>
                                                    <div>
                                                        <i class="fas fa-clock"></i>
                                                        Última venda: ${lastSale}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
                                            <strong style="color: #667eea; font-size: 0.95em;">💡 Sugestões de Ação:</strong>
                                            <ul style="margin: 8px 0 0 20px; font-size: 0.9em; line-height: 1.6;">
                                                ${p.daysInactive > 90 ? '<li><strong>Crítico:</strong> Considere remover do cardápio ou reformular receita</li>' : ''}
                                                ${p.price > 30 ? '<li>Reduzir preço (atualmente R$ ' + p.price.toFixed(2) + ')</li>' : '<li>Criar promoção especial (combo/desconto)</li>'}
                                                <li>Destacar nas redes sociais com foto atrativa</li>
                                                <li>Oferecer degustação gratuita no salão</li>
                                                ${!p.description ? '<li>Adicionar descrição detalhada e apetitosa</li>' : ''}
                                            </ul>
                                        </div>
                                        
                                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                            <button class="btn btn-sm btn-primary" onclick="window.cardapioModule.editProduct('${p.id}'); document.getElementById('inactive-products-modal').remove();">
                                                <i class="fas fa-edit"></i> Editar
                                            </button>
                                            <button class="btn btn-sm btn-warning" onclick="window.cardapioModule.createPromotion('${p.id}'); document.getElementById('inactive-products-modal').remove();">
                                                <i class="fas fa-tags"></i> Criar Promoção
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="if(confirm('Deseja realmente remover ${this.escapeHtml(p.name)}?')) { window.cardapioModule.deleteProduct('${p.id}'); document.getElementById('inactive-products-modal').remove(); }">
                                                <i class="fas fa-trash"></i> Remover
                                            </button>
                                            <button class="btn btn-sm btn-secondary" onclick="window.cardapioModule.toggleAvailability('${p.id}')">
                                                <i class="fas fa-eye-slash"></i> Desativar
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary close-modal">Fechar</button>
                        <button class="btn btn-primary" id="export-inactive-report">
                            <i class="fas fa-file-export"></i> Exportar Relatório
                        </button>
                    </div>
                </div>
            `;
            
            modal.querySelectorAll('.close-modal, .modal-overlay').forEach(el => {
                el.addEventListener('click', () => modal.remove());
            });
            
            const exportBtn = modal.querySelector('#export-inactive-report');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this.exportInactiveProductsReport(inactiveProducts);
                });
            }
            
            document.body.appendChild(modal);
            
        } catch (error) {
            console.error('❌ Erro ao mostrar produtos inativos:', error);
            window.showToast('Erro ao carregar produtos inativos', 'error');
        }
    }
    
    // MELHORIA 20: Criar promoção para produto inativo
    async createPromotion(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const discountPercent = prompt(
            `Criar promoção para "${product.name}"\n\n` +
            `Preço atual: R$ ${product.price.toFixed(2)}\n` +
            `Digite o percentual de desconto (ex: 20 para 20%):`,
            '20'
        );
        
        if (!discountPercent || isNaN(discountPercent)) return;
        
        const discount = parseFloat(discountPercent);
        const newPrice = product.price * (1 - discount / 100);
        
        const confirmed = confirm(
            `Confirmar promoção?\n\n` +
            `Produto: ${product.name}\n` +
            `Preço original: R$ ${product.price.toFixed(2)}\n` +
            `Desconto: ${discount}%\n` +
            `Novo preço: R$ ${newPrice.toFixed(2)}`
        );
        
        if (!confirmed) return;
        
        try {
            product.originalPrice = product.price;
            product.price = newPrice;
            product.updatedAt = new Date().toISOString();
            
            await window.updateInDatabase('products', product);
            
            window.showToast(`✅ Promoção criada! ${product.name} agora custa R$ ${newPrice.toFixed(2)}`, 'success');
            this.renderProducts();
            
        } catch (error) {
            console.error('❌ Erro ao criar promoção:', error);
            window.showToast('Erro ao criar promoção', 'error');
        }
    }
    
    // MELHORIA 20: Exportar relatório de produtos inativos
    exportInactiveProductsReport(inactiveProducts) {
        const csv = [
            ['Produto', 'Categoria', 'Preço', 'Dias Inativo', 'Última Venda', 'Status'].join(','),
            ...inactiveProducts.map(p => [
                p.name,
                this.getCategoryName(p.category),
                `R$ ${p.price.toFixed(2)}`,
                p.daysInactive,
                p.lastSaleDate ? new Date(p.lastSaleDate).toLocaleDateString('pt-BR') : 'Nunca',
                p.daysInactive > 90 ? 'Crítico' : p.daysInactive > 60 ? 'Alto' : 'Médio'
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `produtos_inativos_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        window.showToast('✅ Relatório exportado com sucesso!', 'success');
    }
    
    // MELHORIA 23: Obter produtos top/flop
    async getTopFlopProducts(limit = 5) {
        try {
            const orders = await window.getFromDatabase('orders') || [];
            const productSales = {};
            
            orders.forEach(order => {
                order.items?.forEach(item => {
                    productSales[item.id] = (productSales[item.id] || 0) + (item.quantity || 1);
                });
            });
            
            const sortedProducts = this.products
                .map(p => ({ ...p, sales: productSales[p.id] || 0 }))
                .sort((a, b) => b.sales - a.sales);
            
            return {
                top: sortedProducts.slice(0, limit),
                flop: sortedProducts.slice(-limit).reverse()
            };
        } catch (error) {
            console.error('❌ Erro ao obter produtos top/flop:', error);
            return { top: [], flop: [] };
        }
    }
    
    // MELHORIA 25: Cache de categorias com TTL
    async getCategoriesFromCache() {
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
        
        if (this.categoryCache && this.categoryCacheTime) {
            const age = Date.now() - this.categoryCacheTime;
            if (age < CACHE_TTL) {
                console.log(`📦 Usando cache de categorias (idade: ${Math.floor(age / 1000)}s)`);
                return this.categoryCache;
            }
        }
        
        await this.loadCategoriesFromDatabase();
        this.categoryCache = [...this.categories];
        this.categoryCacheTime = Date.now();
        
        console.log('📦 Cache de categorias atualizado');
        return this.categoryCache;
    }
    
    // MELHORIA 26: Validar customizações por categoria
    validateCustomizationForCategory(category, customizationName) {
        const invalidCombinations = {
            'bebidas': ['Ponto da Carne', 'Carnes'],
            'acompanhamentos': ['Ponto da Carne'],
            'sobremesas': ['Ponto da Carne', 'Carnes', 'Molhos']
        };
        
        const invalid = invalidCombinations[category];
        if (invalid && invalid.includes(customizationName)) {
            window.showToast(`⚠️ "${customizationName}" não é válido para ${category}`, 'warning');
            return false;
        }
        
        return true;
    }
    
    // MELHORIA 27: Restaurar produto da lixeira
    async restoreProduct(productId) {
        try {
            const deleted = await window.getFromDatabase('deleted_products', productId);
            if (!deleted) {
                window.showToast('Produto não encontrado na lixeira', 'error');
                return;
            }
            
            const restoredProduct = {
                ...deleted,
                deleted: false,
                deletedAt: null,
                deletedBy: null,
                restoredAt: new Date().toISOString(),
                restoredBy: window.currentUser?.name || 'Sistema'
            };
            
            await window.saveToDatabase('products', restoredProduct);
            await window.deleteFromDatabase('deleted_products', productId);
            
            this.products.push(restoredProduct);
            this.deletedProducts = this.deletedProducts.filter(p => p.id !== productId);
            
            window.showToast(`✅ Produto "${restoredProduct.name}" restaurado!`, 'success');
            this.renderProducts();
            
        } catch (error) {
            console.error('❌ Erro ao restaurar produto:', error);
            window.showToast('Erro ao restaurar produto', 'error');
        }
    }
    
    // MELHORIA 27: Mostrar interface da lixeira
    async showTrashModal() {
        const deletedProducts = await window.getFromDatabase('deleted_products') || [];
        
        // Filtrar produtos deletados há menos de 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recoverableProducts = deletedProducts.filter(p => {
            if (!p.deletedAt) return false;
            return new Date(p.deletedAt) > thirtyDaysAgo;
        });
        
        if (recoverableProducts.length === 0) {
            window.showToast('Nenhum produto na lixeira', 'info');
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'trash-modal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>🗑️ Lixeira - Produtos Excluídos</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: #666; margin-bottom: 15px;">
                        Produtos excluídos nos últimos 30 dias podem ser restaurados.
                    </p>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${recoverableProducts.map(p => `
                            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong>${p.name}</strong>
                                        <div style="font-size: 0.9em; color: #666;">
                                            Excluído em: ${new Date(p.deletedAt).toLocaleString('pt-BR')}
                                        </div>
                                        ${p.deletedBy ? `<div style="font-size: 0.85em; color: #999;">Por: ${p.deletedBy}</div>` : ''}
                                    </div>
                                    <button class="btn btn-success" onclick="window.cardapioModule.restoreProduct('${p.id}'); document.getElementById('trash-modal').remove();">
                                        <i class="fas fa-undo"></i> Restaurar
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary close-modal">Fechar</button>
                </div>
            </div>
        `;
        
        modal.querySelectorAll('.close-modal, .modal-overlay').forEach(el => {
            el.addEventListener('click', () => modal.remove());
        });
        
        document.body.appendChild(modal);
    }
    
    // MELHORIA 21: Modal de migração de categoria
    async showCategoryMigrationModal(categories, productCount) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.id = 'migration-modal';
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>🔄 Migrar Produtos</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 15px;">
                            Selecione a nova categoria para os <strong>${productCount} produto(s)</strong>:
                        </p>
                        <select id="new-category-select" class="form-control" style="width: 100%; padding: 10px; font-size: 1em;">
                            ${categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary close-modal">Cancelar</button>
                        <button class="btn btn-primary" id="confirm-migration">
                            <i class="fas fa-check"></i> Migrar
                        </button>
                    </div>
                </div>
            `;
            
            modal.querySelectorAll('.close-modal, .modal-overlay').forEach(el => {
                el.addEventListener('click', () => {
                    modal.remove();
                    resolve(null);
                });
            });
            
            modal.querySelector('#confirm-migration').addEventListener('click', () => {
                const select = modal.querySelector('#new-category-select');
                const newCategoryId = select.value;
                modal.remove();
                resolve(newCategoryId);
            });
            
            document.body.appendChild(modal);
        });
    }
    
    // MELHORIA 16 e 17: Preview e duplicar produto
    async showProductPreview(product) {
        const modal = document.createElement('div');
        modal.id = 'preview-modal';
        modal.className = 'modal active';
        
        const category = this.getCategoryName(product.category);
        const hasCustomizations = product.customizations && product.customizations.length > 0;
        
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>👁️ Preview do Produto</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-size: 4em; margin-bottom: 10px;">${product.image || '🍔'}</div>
                        <h2 style="margin: 0 0 10px 0; color: #333;">${product.name}</h2>
                        ${product.description ? `<p style="color: #666; font-size: 0.95em;">${product.description}</p>` : ''}
                        
                        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 20px;">
                            <div>
                                <div style="font-size: 2em; font-weight: bold; color: #667eea;">
                                    R$ ${product.price.toFixed(2)}
                                </div>
                                ${product.originalPrice ? `
                                    <div style="font-size: 0.9em; color: #999; text-decoration: line-through;">
                                        R$ ${product.originalPrice.toFixed(2)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                            <span class="category-badge" style="font-size: 0.9em;">${category}</span>
                            <span class="status-badge ${product.available ? 'status-available' : 'status-unavailable'}" style="font-size: 0.9em;">
                                ${product.available ? '✅ Disponível' : '❌ Indisponível'}
                            </span>
                            ${hasCustomizations ? '<span style="background: #667eea; color: white; padding: 5px 12px; border-radius: 20px; font-size: 0.85em;">🎨 Personalizável</span>' : ''}
                        </div>
                    </div>
                    
                    ${hasCustomizations ? `
                        <div style="margin-top: 20px;">
                            <h4 style="color: #667eea; margin-bottom: 10px;">📋 Opções de Personalização</h4>
                            ${product.customizations.map(group => `
                                <div style="margin-bottom: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                                    <strong>${group.name}</strong>
                                    ${group.required ? '<span style="color: #e74c3c; font-size: 0.85em;"> * Obrigatório</span>' : ''}
                                    <div style="margin-top: 8px; font-size: 0.9em; color: #666;">
                                        ${group.options.slice(0, 3).map(opt => `• ${opt.name} ${opt.price > 0 ? `(+R$ ${opt.price.toFixed(2)})` : ''}`).join('<br>')}
                                        ${group.options.length > 3 ? `<br>... e mais ${group.options.length - 3} opções` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary close-modal">Fechar</button>
                    <button class="btn btn-primary" id="duplicate-product-btn">
                        <i class="fas fa-copy"></i> Duplicar Produto
                    </button>
                </div>
            </div>
        `;
        
        modal.querySelectorAll('.close-modal, .modal-overlay').forEach(el => {
            el.addEventListener('click', () => modal.remove());
        });
        
        modal.querySelector('#duplicate-product-btn').addEventListener('click', () => {
            modal.remove();
            this.duplicateProduct(product);
        });
        
        document.body.appendChild(modal);
    }
    
    // MELHORIA 17: Duplicar produto
    async duplicateProduct(product) {
        const newName = prompt('Nome do novo produto:', `${product.name} (Cópia)`);
        if (!newName || !newName.trim()) return;
        
        try {
            const duplicatedProduct = {
                ...product,
                id: this.generateId(),
                name: newName.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deleted: false
            };
            
            delete duplicatedProduct.deletedAt;
            delete duplicatedProduct.deletedBy;
            
            await this.saveWithRetry('products', duplicatedProduct);
            this.products.push(duplicatedProduct);
            
            window.showToast(`✅ Produto "${newName}" criado!`, 'success');
            this.renderProducts();
            
        } catch (error) {
            console.error('❌ Erro ao duplicar produto:', error);
            window.showToast('Erro ao duplicar produto', 'error');
        }
    }
    
    // MELHORIA 18: Upload de imagem com Firebase Storage
    async uploadProductImage(file) {
        if (!file) return null;
        
        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            window.showToast('❌ Apenas imagens são permitidas', 'error');
            return null;
        }
        
        // Validar tamanho (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            window.showToast('❌ Imagem muito grande (máx 5MB)', 'error');
            return null;
        }
        
        try {
            // Verificar se Firebase Storage está disponível
            if (!firebase.storage) {
                console.warn('⚠️ Firebase Storage não disponível');
                window.showToast('⚠️ Upload de imagens não configurado', 'warning');
                return null;
            }
            
            const storage = firebase.storage();
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 11);
            const fileName = `products/${timestamp}_${randomStr}_${file.name}`;
            const storageRef = storage.ref(fileName);
            
            console.log('📤 Enviando imagem para Firebase Storage:', fileName);
            
            // Upload do arquivo
            const snapshot = await storageRef.put(file);
            
            // Obter URL pública
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            console.log('✅ Imagem enviada com sucesso:', downloadURL);
            window.showToast('✅ Imagem enviada com sucesso!', 'success');
            
            return downloadURL;
            
        } catch (error) {
            console.error('❌ Erro ao fazer upload:', error);
            
            // Tratamento específico de erros
            if (error.code === 'storage/unauthorized') {
                window.showToast('❌ Permissão negada. Configure as regras do Storage.', 'error');
            } else if (error.code === 'storage/canceled') {
                window.showToast('⚠️ Upload cancelado', 'warning');
            } else {
                window.showToast('❌ Erro ao enviar imagem', 'error');
            }
            
            return null;
        }
    }
    
    // MELHORIA 19: Adicionar campo de custo no modal (função auxiliar)
    calculateAndShowMargin(cost, price) {
        const margin = this.calculateMargin(cost, price);
        const marginElement = document.getElementById('margin-display');
        if (marginElement) {
            marginElement.textContent = `Margem: ${margin}%`;
            marginElement.style.color = margin > 50 ? '#27ae60' : margin > 30 ? '#f39c12' : '#e74c3c';
        }
    }
    
    // MELHORIA 24: Criar produto tipo combo (placeholder)
    async createComboProduct() {
        window.showToast('⚠️ Funcionalidade de combos em desenvolvimento', 'info');
        // TODO: Implementar interface para criar combos compostos
    }
    
    // ========================================
    // API PÚBLICA
    // ========================================
    
    getProducts() {
        return [...this.products];
    }
    
    getProduct(id) {
        return this.products.find(p => p.id === id);
    }
    
    getCategories() {
        return [...this.categories];
    }
    
    async refreshData() {
        await this.loadProductsFromDatabase();
        await this.loadCategoriesFromDatabase();
        this.renderProducts();
        this.loadCategoryFilters();
        this.updateStats();
    }
    
    /**
     * Método de limpeza para prevenir vazamentos de memória
     */
    destroy() {
        // Remover todos os event listeners rastreados
        this.removeAllEventListeners();
        
        // Limpar timers
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = null;
        }
        
        // Limpar referências
        this.isInitialized = false;
        
        console.log('🗑️ Módulo Cardápio destruído e recursos limpos');
    }
}

// Exportar como default para compatibilidade
export default CardapioModule;
