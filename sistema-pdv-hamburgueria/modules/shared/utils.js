// ===== SHARED UTILITIES - SISTEMA PDV HAMBURGUERIA =====
// Utilitários compartilhados entre todos os módulos
// ATUALIZADO: Agora usa Firebase Service como camada única de dados
// Data: 10/12/2025

// Importa o Firebase Service (nova camada unificada)
import firebaseService from './firebase-service.js';

// Importa database-manager apenas para funções avançadas (compatibilidade)
import db from './database-manager.js';

// Instância global do banco (mantido para compatibilidade)
let dbInstance = null;
let initPromise = null;

// Inicializa o banco (agora inicializa ambos: Firebase Service + cache)
export async function initDatabase() {
    if (!dbInstance) {
        dbInstance = db;
        await dbInstance.init();
        
        // Inicializar Firebase Service
        await firebaseService.init();
    }
    return dbInstance;
}

// Obtém instância do banco (mantido para compatibilidade)
export async function getDatabase() {
    if (dbInstance) {
        return dbInstance;
    }
    
    if (initPromise) {
        await initPromise;
        return dbInstance;
    }
    
    initPromise = initDatabase();
    await initPromise;
    initPromise = null;
    
    return dbInstance || window.dbManager;
}

// Versão síncrona para compatibilidade (usar com cuidado)
export function getDatabaseSync() {
    if (!dbInstance && window.dbManager) {
        return window.dbManager;
    }
    return dbInstance;
}

// === FORMATAÇÃO ===
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

export function formatNumber(value, decimals = 2) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value || 0);
}

export function formatDateTime(date = new Date()) {
    const d = new Date(date);
    // Proteção contra Invalid Date
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(d);
}

export function formatTime(date = new Date()) {
    const d = new Date(date);
    // Proteção contra Invalid Date
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(d);
}

export function formatDate(date = new Date()) {
    const d = new Date(date);
    // Proteção contra Invalid Date
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(d);
}

// === GERAÇÃO DE IDs ===
let idCounter = 0;

export function generateId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    const counter = (idCounter++).toString(36).padStart(3, '0');
    const performancePart = (typeof performance !== 'undefined' ? performance.now() : Date.now())
        .toString(36).replace('.', '');
    
    return `${timestamp}-${randomPart}-${counter}-${performancePart}`;
}

// Gerar UUID v4 se disponível
export function generateSecureId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return generateId();
}

export function generateOrderNumber() {
    const now = new Date();
    const dateStr = now.getFullYear().toString().slice(-2) + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') + 
                   String(now.getMinutes()).padStart(2, '0');
    const randomStr = Math.random().toString().slice(-3);
    
    return `${dateStr}${timeStr}${randomStr}`;
}

// === ARMAZENAMENTO LOCAL ===
// DEPRECATED: Use firebaseService ao invés de localStorage
// Mantido apenas para logs e configurações temporárias

export function saveToStorage(key, data) {
    console.warn('⚠️ DEPRECATED: saveToStorage() - Use firebaseService.save() para dados persistentes');
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to storage:', error);
        return false;
    }
}

export function loadFromStorage(key, defaultValue = null) {
    console.warn('⚠️ DEPRECATED: loadFromStorage() - Use firebaseService.get() para dados persistentes');
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error loading from storage:', error);
        return defaultValue;
    }
}

export function removeFromStorage(key) {
    console.warn('⚠️ DEPRECATED: removeFromStorage() - Use firebaseService.delete() para dados persistentes');
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from storage:', error);
        return false;
    }
}

// === VALIDAÇÕES ===
export function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

export function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
}

export function formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
}

export function validateCPF(cpf) {
    const cleaned = cpf.replace(/\D/g, '');
    
    if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) {
        return false;
    }
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned.charAt(i)) * (10 - i);
    }
    
    let checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) {
        checkDigit = 0;
    }
    
    if (checkDigit !== parseInt(cleaned.charAt(9))) {
        return false;
    }
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleaned.charAt(i)) * (11 - i);
    }
    
    checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) {
        checkDigit = 0;
    }
    
    return checkDigit === parseInt(cleaned.charAt(10));
}

// === DEBOUNCE ===
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// === NOTIFICAÇÕES ===
export function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remover toast após duração especificada
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, duration);
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// === LOADING ===
export function showLoading(message = 'Carregando...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) return;
    
    const loadingText = loadingOverlay.querySelector('p');
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.style.display = 'flex';
}

export function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

// === CONFIRMAÇÃO ===
export function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// === PERFORMANCE HELPERS ===
// Nota: debounce já está declarado na linha 212, removida duplicação

export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// === CÁLCULOS ===
export function calculateDeliveryFee(subtotal) {
    const settings = loadFromStorage('systemSettings', {});
    const deliverySettings = settings.delivery || { baseRate: 5.00, freeDeliveryMin: 50.00 };
    
    if (subtotal >= deliverySettings.freeDeliveryMin) {
        return 0;
    }
    
    return deliverySettings.baseRate;
}

export function calculateServiceCharge(subtotal) {
    const settings = loadFromStorage('systemSettings', {});
    const serviceRate = settings.serviceCharge || 0.1; // 10%
    
    return subtotal * serviceRate;
}

export function calculateTax(subtotal, taxRate = 0.05) {
    return subtotal * taxRate;
}

export function calculateDiscount(subtotal, discountPercent) {
    return subtotal * (discountPercent / 100);
}

// === DATAS E HORÁRIOS ===
export function isStoreOpen() {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.toTimeString().substr(0, 5);
    
    // Cache de configurações (não precisa estar no Firebase)
    const settingsCache = sessionStorage.getItem('systemSettings');
    const settings = settingsCache ? JSON.parse(settingsCache) : {};
    const workingHours = settings.workingHours || {
        monday: { open: '08:00', close: '22:00' },
        tuesday: { open: '08:00', close: '22:00' },
        wednesday: { open: '08:00', close: '22:00' },
        thursday: { open: '08:00', close: '22:00' },
        friday: { open: '08:00', close: '23:00' },
        saturday: { open: '08:00', close: '23:00' },
        sunday: { open: '10:00', close: '21:00' }
    };
    
    const dayHours = workingHours[currentDay];
    if (!dayHours) return false;
    
    // Verificar se o horário atual está dentro do funcionamento
    if (dayHours.close < dayHours.open) {
        // Funciona até depois da meia-noite
        return currentTime >= dayHours.open || currentTime <= dayHours.close;
    } else {
        return currentTime >= dayHours.open && currentTime <= dayHours.close;
    }
}

export function calculatePreparationTime(items) {
    if (!items || items.length === 0) return 0;
    
    let maxTime = 0;
    items.forEach(item => {
        // Buscar produto no localStorage ou productData
        const products = loadFromStorage('products', []);
        const product = products.find(p => p.id === item.productId);
        
        if (product && product.preparationTime > maxTime) {
            maxTime = product.preparationTime;
        }
    });
    
    return maxTime + Math.floor(Math.random() * 5); // Adicionar variação aleatória
}

// === IMPRESSÃO ===
export function printReceipt(order) {
    const receiptHTML = generateReceiptHTML(order);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
}

export function generateReceiptHTML(order) {
    const settings = loadFromStorage('systemSettings', {});
    const businessInfo = settings.business || {
        name: 'Sistema PDV Hamburgueria',
        address: 'Endereço da loja',
        phone: '(11) 99999-9999',
        email: 'contato@hamburgueria.com'
    };
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Recibo - Pedido #${order.number}</title>
            <style>
                body { 
                    font-family: 'Courier New', monospace; 
                    width: 300px; 
                    margin: 0; 
                    padding: 10px; 
                    font-size: 12px; 
                }
                .header { text-align: center; margin-bottom: 20px; }
                .order-info { margin-bottom: 15px; }
                .items { margin-bottom: 15px; }
                .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .totals { border-top: 1px dashed #000; padding-top: 10px; }
                .total-line { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .final-total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; }
                .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🍔 ${businessInfo.name}</h2>
                <p>${businessInfo.address}</p>
                <p>Tel: ${businessInfo.phone}</p>
                <p>Email: ${businessInfo.email}</p>
            </div>
            
            <div class="order-info">
                <p><strong>Pedido:</strong> #${order.number}</p>
                <p><strong>Data:</strong> ${formatDateTime(order.date)}</p>
                <p><strong>Tipo:</strong> ${getOrderTypeText(order.type)}</p>
                ${order.customer ? `<p><strong>Cliente:</strong> ${order.customer.name}</p>` : ''}
                ${order.customer && order.customer.phone ? `<p><strong>Telefone:</strong> ${order.customer.phone}</p>` : ''}
            </div>
            
            <div class="items">
                <h3>Itens do Pedido:</h3>
                ${order.items.map(item => `
                    <div class="item">
                        <span>${item.quantity}x ${item.name}</span>
                        <span>${formatCurrency(item.subtotal)}</span>
                    </div>
                    ${Object.keys(item.customizations || {}).length > 0 ? 
                        `<div style="font-size: 10px; margin-left: 20px; margin-bottom: 5px;">
                            ${Object.entries(item.customizations).map(([key, value]) => 
                                `${key}: ${Array.isArray(value) ? value.join(', ') : value}`
                            ).join(' • ')}
                        </div>` : ''
                    }
                `).join('')}
            </div>
            
            <div class="totals">
                <div class="total-line">
                    <span>Subtotal:</span>
                    <span>${formatCurrency(order.subtotal)}</span>
                </div>
                ${order.discount > 0 ? `
                    <div class="total-line">
                        <span>Desconto:</span>
                        <span>-${formatCurrency(order.discount)}</span>
                    </div>
                ` : ''}
                ${order.deliveryFee > 0 ? `
                    <div class="total-line">
                        <span>Taxa de Entrega:</span>
                        <span>${formatCurrency(order.deliveryFee)}</span>
                    </div>
                ` : ''}
                <div class="total-line final-total">
                    <span>TOTAL:</span>
                    <span>${formatCurrency(order.total)}</span>
                </div>
            </div>
            
            <div class="footer">
                <p>Obrigado pela preferência!</p>
                <p>Volte sempre! 🍔</p>
                <p>${formatDateTime()}</p>
            </div>
        </body>
        </html>
    `;
}

function getOrderTypeText(type) {
    const typeMap = {
        'balcao': 'Balcão',
        'mesa': 'Mesa',
        'delivery': 'Entrega'
    };
    return typeMap[type] || type;
}

// === ESTATÍSTICAS ===
export function updateDailySalesStats() {
    const orders = loadFromStorage('dailyOrders', []);
    const today = new Date().toISOString().split('T')[0];
    
    const todayOrders = orders.filter(order => 
        order.date && order.date.startsWith(today) && order.status !== 'cancelled'
    );
    
    const stats = {
        totalSales: todayOrders.reduce((sum, order) => sum + order.total, 0),
        totalOrders: todayOrders.length,
        averageTicket: todayOrders.length > 0 ? 
            todayOrders.reduce((sum, order) => sum + order.total, 0) / todayOrders.length : 0,
        lastUpdated: new Date().toISOString()
    };
    
    saveToStorage('dailyStats', stats);
    return stats;
}

export function getDailySalesStats() {
    return loadFromStorage('dailyStats', {
        totalSales: 0,
        totalOrders: 0,
        averageTicket: 0,
        lastUpdated: new Date().toISOString()
    });
}

// === PEDIDOS ===
export function saveOrder(order) {
    const orders = loadFromStorage('dailyOrders', []);
    orders.push(order);
    saveToStorage('dailyOrders', orders);
    updateDailySalesStats();
}

// === CONFIGURAÇÕES ===
export function saveSettings(settings) {
    return saveToStorage('systemSettings', settings);
}

export function loadSettings() {
    return loadFromStorage('systemSettings', {
        business: {
            name: 'Sistema PDV Hamburgueria',
            address: 'Endereço da loja',
            phone: '(11) 99999-9999',
            email: 'contato@hamburgueria.com'
        },
        workingHours: {
            monday: { open: '08:00', close: '22:00' },
            tuesday: { open: '08:00', close: '22:00' },
            wednesday: { open: '08:00', close: '22:00' },
            thursday: { open: '08:00', close: '22:00' },
            friday: { open: '08:00', close: '23:00' },
            saturday: { open: '08:00', close: '23:00' },
            sunday: { open: '10:00', close: '21:00' }
        },
        delivery: {
            baseRate: 5.00,
            freeDeliveryMin: 50.00
        }
    });
}

// === FUNÇÕES DE BANCO DE DADOS - FIREBASE SERVICE ===
// ATUALIZADO: Agora usa Firebase como fonte principal + cache local automático

/**
 * Salva dados com invalidação de cache (OTIMIZADO)
 * @param {string} storeName - Nome da coleção (products, orders, etc)
 * @param {object} data - Dados a serem salvos
 * @returns {Promise<object>} Dados salvos com ID
 */
export async function saveToDatabase(storeName, data) {
    try {
        const result = await firebaseService.save(storeName, data);
        
        // OTIMIZAÇÃO: Invalidar cache após modificação
        if (window.dataCache) {
            window.dataCache.invalidate(storeName);
        }
        
        return result;
    } catch (error) {
        console.error('Erro ao salvar no banco:', error);
        showToast('Erro ao salvar dados', 'error');
        return null;
    }
}

/**
 * Atualiza dados com invalidação de cache (OTIMIZADO)
 * @param {string} storeName - Nome da coleção
 * @param {object} data - Dados a serem atualizados (deve ter ID)
 * @returns {Promise<object>} Dados atualizados
 */
export async function updateInDatabase(storeName, data) {
    try {
        const result = await firebaseService.save(storeName, data);
        
        // OTIMIZAÇÃO: Invalidar cache após modificação
        if (window.dataCache) {
            window.dataCache.invalidate(storeName);
        }
        
        return result;
    } catch (error) {
        console.error('Erro ao atualizar no banco:', error);
        showToast('Erro ao atualizar dados', 'error');
        return null;
    }
}

/**
 * Carrega dados com cache inteligente (OTIMIZADO)
 * @param {string} storeName - Nome da coleção
 * @param {string} id - ID do registro (opcional)
 * @param {object} filters - Filtros (não usado no momento)
 * @returns {Promise<object|array>} Dados encontrados
 */
export async function getFromDatabase(storeName, id = null, filters = {}) {
    try {
        // OTIMIZAÇÃO: Usar dataCache para stores pesadas
        const cachedStores = ['orders', 'products', 'customers', 'categories', 'settings'];
        
        if (!id && cachedStores.includes(storeName) && window.dataCache) {
            // Usar cache inteligente
            return await window.dataCache.get(storeName);
        }
        
        // Fallback: Firebase Service direto
        return await firebaseService.get(storeName, id);
    } catch (error) {
        console.error('❌ Erro ao buscar:', error);
        return id ? null : [];
    }
}

/**
 * Remove dados com invalidação de cache (OTIMIZADO)
 * @param {string} storeName - Nome da coleção
 * @param {string} id - ID do registro
 * @returns {Promise<boolean>} Sucesso da operação
 */
export async function deleteFromDatabase(storeName, id) {
    try {
        const result = await firebaseService.delete(storeName, id);
        
        // OTIMIZAÇÃO: Invalidar cache após deleção
        if (window.dataCache) {
            window.dataCache.invalidate(storeName);
        }
        
        return result;
    } catch (error) {
        console.error('Erro ao deletar do banco:', error);
        showToast('Erro ao deletar dados', 'error');
        return false;
    }
}

/**
 * Busca dados (usa cache local para busca)
 * @param {string} storeName - Nome da coleção
 * @param {string} searchTerm - Termo de busca
 * @param {array} searchFields - Campos para buscar
 * @returns {Promise<array>} Resultados encontrados
 */
export async function searchInDatabase(storeName, searchTerm, searchFields = ['name']) {
    try {
        // Buscar todos do cache/Firebase
        const allData = await firebaseService.get(storeName);
        
        if (!allData || allData.length === 0) {
            return [];
        }
        
        // Filtrar localmente
        const searchLower = searchTerm.toLowerCase();
        return allData.filter(item => {
            return searchFields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(searchLower);
            });
        });
    } catch (error) {
        console.error('Erro ao buscar no banco:', error);
        return [];
    }
}

/**
 * Paginação de dados (usa cache local)
 */
export async function paginateData(storeName, options = {}) {
    try {
        // Buscar todos os dados
        const allData = await firebaseService.get(storeName);
        
        if (!allData || allData.length === 0) {
            return {
                data: [],
                pagination: {
                    page: 1,
                    limit: options.limit || 10,
                    total: 0,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                }
            };
        }
        
        // Paginação local
        const page = options.page || 1;
        const limit = options.limit || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        const paginatedData = allData.slice(startIndex, endIndex);
        const totalPages = Math.ceil(allData.length / limit);
        
        return {
            data: paginatedData,
            pagination: {
                page,
                limit,
                total: allData.length,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    } catch (error) {
        console.error('Erro na paginação:', error);
        return {
            data: [],
            pagination: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            }
        };
    }
}

/**
 * Inicializa o banco de dados com dados básicos
 */
export async function initializeDatabase() {
    try {
        // Verificar se já existem dados
        const existingProducts = await firebaseService.get('products');
        if (existingProducts && existingProducts.length > 0) {
            console.log('✓ Banco de dados já contém dados');
            return true;
        }
        
        // Criar dados iniciais básicos se não existirem
        const defaultProducts = [
            {
                id: 'prod1',
                name: 'Hambúrguer Clássico',
                price: 15.90,
                category: 'Hambúrgueres',
                available: true,
                description: 'Pão, hambúrguer, alface, tomate, queijo'
            },
            {
                id: 'prod2', 
                name: 'Batata Frita',
                price: 8.50,
                category: 'Acompanhamentos',
                available: true,
                description: 'Batata frita crocante'
            }
        ];
        
        // Salvar produtos iniciais
        for (const product of defaultProducts) {
            try {
                await firebaseService.save('products', product);
            } catch (error) {
                console.error('Erro ao salvar produto inicial:', error);
            }
        }
        
        console.log('✓ Dados iniciais criados no banco de dados');
        return true;
        
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        return false;
    }
}

/**
 * Migra dados do localStorage para Firebase
 * DESABILITADA: Use firebaseService.syncToCloud() diretamente
 */
export async function migrateToDatabase() {
    console.warn('⚠️ DEPRECATED: migrateToDatabase() - Use firebaseService.syncToCloud() diretamente');
    return false;
}

/**
 * Backup do banco de dados (sincronização para Firebase)
 */
export async function backupDatabase() {
    try {
        showToast('Sincronizando dados...', 'info');
        await firebaseService.syncToCloud();
        showToast('Backup criado com sucesso!', 'success');
        return true;
    } catch (error) {
        console.error('Erro no backup:', error);
        showToast('Erro ao criar backup', 'error');
        return null;
    }
}

/**
 * Restaura backup do banco de dados (sincronização do Firebase)
 */
export async function restoreDatabase(backupData = null) {
    try {
        showToast('Restaurando dados...', 'info');
        await firebaseService.syncFromCloud();
        showToast('Dados restaurados com sucesso!', 'success');
        return true;
    } catch (error) {
        console.error('Erro ao restaurar backup:', error);
        showToast('Erro ao restaurar backup', 'error');
        return false;
    }
}

// === FUNÇÕES AUXILIARES FIREBASE SERVICE ===

/**
 * Sincronizar todos os dados do Firebase para cache local
 */
export async function syncFromFirebase() {
    try {
        showToast('Sincronizando do Firebase...', 'info');
        const result = await firebaseService.syncFromCloud();
        if (result) {
            showToast('Sincronização completa!', 'success');
        }
        return result;
    } catch (error) {
        console.error('Erro ao sincronizar:', error);
        showToast('Erro na sincronização', 'error');
        return false;
    }
}

/**
 * Enviar todos os dados do cache para Firebase
 */
export async function syncToFirebase() {
    try {
        showToast('Enviando para Firebase...', 'info');
        const result = await firebaseService.syncToCloud();
        if (result) {
            showToast('Dados enviados!', 'success');
        }
        return result;
    } catch (error) {
        console.error('Erro ao enviar:', error);
        showToast('Erro ao enviar dados', 'error');
        return false;
    }
}

/**
 * Escutar mudanças em tempo real de uma coleção
 */
export function listenToCollection(collection, callback) {
    return firebaseService.listen(collection, callback);
}

/**
 * Parar de escutar mudanças de uma coleção
 */
export function stopListeningToCollection(collection) {
    firebaseService.stopListening(collection);
}

/**
 * Obter status do Firebase Service
 */
export function getFirebaseStatus() {
    return firebaseService.getStats();
}

/**
 * Limpar cache local (IndexedDB)
 */
export async function clearLocalCache() {
    try {
        showToast('Limpando cache...', 'info');
        await firebaseService.clearCache();
        showToast('Cache limpo!', 'success');
        return true;
    } catch (error) {
        console.error('Erro ao limpar cache:', error);
        showToast('Erro ao limpar cache', 'error');
        return false;
    }
}

// Expor firebaseService e funções de database globalmente
if (typeof window !== 'undefined') {
    window.firebaseService = firebaseService;
    window.saveToDatabase = saveToDatabase;
    window.getFromDatabase = getFromDatabase;
    window.updateInDatabase = updateInDatabase;
    window.deleteFromDatabase = deleteFromDatabase;
    window.formatCurrency = formatCurrency;
    window.showToast = showToast;
    window.formatDate = formatDate;
    window.generateId = generateId;
    
    console.log('✅ Funções globais expostas: saveToDatabase, getFromDatabase, etc.');
}

console.log('✅ Utils.js atualizado com Firebase Service');