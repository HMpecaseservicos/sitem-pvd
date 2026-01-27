/**
 * PERFORMANCE HELPERS - CORREÇÃO CRÍTICA
 * Funções auxiliares para otimização de performance
 * Inclui: debounce, throttle, memoization, virtual scrolling
 * 
 * @author Sistema PDV Hamburgueria
 * @version 1.0.0
 * @since 04/01/2026
 */

import logger from './logger.js';

/**
 * Debounce - Aguarda usuário parar de digitar antes de executar
 * Reduz chamadas desnecessárias em 90%+
 */
export function debounce(func, delay = 300) {
    let timeoutId = null;
    
    return function debounced(...args) {
        // Limpar timeout anterior
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        // Criar novo timeout
        timeoutId = setTimeout(() => {
            func.apply(this, args);
            timeoutId = null;
        }, delay);
    };
}

/**
 * Throttle - Limita execução a uma vez por intervalo
 * Útil para scroll, resize, mousemove
 */
export function throttle(func, limit = 100) {
    let inThrottle = false;
    
    return function throttled(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Memoização - Cache de resultados de funções puras
 * Evita cálculos repetidos
 */
export function memoize(func, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = new Map();
    
    return function memoized(...args) {
        const key = keyGenerator(...args);
        
        if (cache.has(key)) {
            logger.debug('📦 Cache hit:', key);
            return cache.get(key);
        }
        
        const result = func.apply(this, args);
        cache.set(key, result);
        
        // Limitar tamanho do cache (100 entradas)
        if (cache.size > 100) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        
        return result;
    };
}

/**
 * Deep Equality - Comparação eficiente de objetos
 * Mais rápido que JSON.stringify
 */
export function deepEqual(obj1, obj2) {
    // Casos simples
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
    
    // Comparar arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return false;
        return obj1.every((item, index) => deepEqual(item, obj2[index]));
    }
    
    // Comparar objetos
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => deepEqual(obj1[key], obj2[key]));
}

/**
 * Batch Executor - Executa operações em lotes
 * Previne travamento da UI
 */
export async function executeBatch(items, operation, batchSize = 50) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        // Executar batch em paralelo
        const batchResults = await Promise.all(
            batch.map(item => operation(item))
        );
        
        results.push(...batchResults);
        
        // Dar tempo para UI atualizar
        await new Promise(resolve => setTimeout(resolve, 0));
        
        logger.debug(`⚡ Batch ${Math.floor(i / batchSize) + 1} processado`);
    }
    
    return results;
}

/**
 * Virtual Scrolling Helper - Renderiza apenas itens visíveis
 * Melhora performance em listas grandes (1000+ itens)
 */
export class VirtualScroller {
    constructor(container, itemHeight, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.items = [];
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.setupScrollListener();
    }
    
    setupScrollListener() {
        this.container.addEventListener('scroll', throttle(() => {
            this.scrollTop = this.container.scrollTop;
            this.render();
        }, 16)); // 60fps
    }
    
    setItems(items) {
        this.items = items;
        this.containerHeight = this.container.clientHeight;
        this.render();
    }
    
    render() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
        const endIndex = Math.min(startIndex + visibleCount + 5, this.items.length); // +5 buffer
        
        const visibleItems = this.items.slice(startIndex, endIndex);
        
        // Criar fragment para melhor performance
        const fragment = document.createDocumentFragment();
        
        visibleItems.forEach((item, index) => {
            const element = this.renderItem(item);
            element.style.position = 'absolute';
            element.style.top = `${(startIndex + index) * this.itemHeight}px`;
            fragment.appendChild(element);
        });
        
        // Configurar altura total do container
        this.container.style.height = `${this.items.length * this.itemHeight}px`;
        this.container.style.position = 'relative';
        
        // Substituir conteúdo
        this.container.innerHTML = '';
        this.container.appendChild(fragment);
        
        logger.debug(`📜 Virtual scroll: ${visibleItems.length} de ${this.items.length} itens renderizados`);
    }
}

/**
 * Lazy Image Loader - Carrega imagens sob demanda
 * Economiza banda e acelera carregamento inicial
 */
export function setupLazyImages(selector = 'img[data-src]') {
    const images = document.querySelectorAll(selector);
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
    
    logger.info(`🖼️ Lazy loading configurado para ${images.length} imagens`);
}

/**
 * Request Animation Frame Helper - Sincroniza com repaint
 * Evita cálculos desnecessários
 */
export function scheduleTask(callback) {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            callback();
            resolve();
        });
    });
}

/**
 * Idle Callback Helper - Executa quando navegador está ocioso
 * Não bloqueia thread principal
 */
export function scheduleIdleTask(callback, timeout = 1000) {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout });
    } else {
        // Fallback para navegadores sem suporte
        setTimeout(callback, 0);
    }
}

/**
 * Performance Monitor - Mede tempo de execução
 */
export class PerformanceMonitor {
    constructor(label) {
        this.label = label;
        this.startTime = performance.now();
    }
    
    end() {
        const endTime = performance.now();
        const duration = endTime - this.startTime;
        
        logger.performance(this.label, `${duration.toFixed(2)}ms`);
        
        return duration;
    }
}

/**
 * Measure - Decorator para medir performance de funções
 */
export function measure(label) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function(...args) {
            const monitor = new PerformanceMonitor(`${label || propertyKey}`);
            const result = await originalMethod.apply(this, args);
            monitor.end();
            return result;
        };
        
        return descriptor;
    };
}

// Exportar tudo
export default {
    debounce,
    throttle,
    memoize,
    deepEqual,
    executeBatch,
    VirtualScroller,
    setupLazyImages,
    scheduleTask,
    scheduleIdleTask,
    PerformanceMonitor,
    measure
};

logger.info('⚡ Performance Helpers carregados - Otimizações ativadas');
