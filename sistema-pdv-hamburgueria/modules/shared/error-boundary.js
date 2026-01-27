/**
 * ERROR BOUNDARY - CORREÇÃO CRÍTICA
 * Sistema de captura e tratamento de erros global
 * Previne que um erro em um módulo derrube todo o sistema
 * 
 * @author Sistema PDV Hamburgueria
 * @version 1.0.0
 * @since 04/01/2026
 */

import logger from './logger.js';

class ErrorBoundary {
    constructor() {
        this.errorHandlers = new Map();
        this.globalErrorCount = 0;
        this.maxErrorsBeforeReload = 10;
        this.setupGlobalHandlers();
    }
    
    /**
     * Configura handlers globais de erro
     */
    setupGlobalHandlers() {
        // Capturar erros não tratados
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error, event.filename, event.lineno, event.colno);
            event.preventDefault(); // Prevenir comportamento padrão
        });
        
        // Capturar rejeições de Promise não tratadas
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason, event.promise);
            event.preventDefault();
        });
        
        logger.info('🛡️ Error Boundary ativado - Sistema protegido contra crashes');
    }
    
    /**
     * Trata erro global
     */
    handleGlobalError(error, filename, lineno, colno) {
        this.globalErrorCount++;
        
        logger.error('❌ Erro Global Capturado:', {
            message: error?.message || error,
            filename,
            line: lineno,
            column: colno,
            stack: error?.stack
        });
        
        // Mostrar notificação ao usuário
        this.showErrorNotification(
            'Erro no Sistema',
            'Ocorreu um erro, mas o sistema continua funcionando.',
            'error'
        );
        
        // Se muitos erros, sugerir reload
        if (this.globalErrorCount >= this.maxErrorsBeforeReload) {
            this.suggestReload();
        }
    }
    
    /**
     * Trata rejeição de Promise
     */
    handlePromiseRejection(reason, promise) {
        this.globalErrorCount++;
        
        logger.error('❌ Promise Rejeitada:', {
            reason: reason?.message || reason,
            stack: reason?.stack
        });
        
        this.showErrorNotification(
            'Erro de Operação',
            'Uma operação falhou, mas o sistema está funcionando.',
            'warning'
        );
    }
    
    /**
     * Wrapper seguro para funções
     * Envolve função em try/catch automático
     */
    wrap(fn, context = null, errorMessage = 'Erro na operação') {
        return async (...args) => {
            try {
                return await fn.apply(context, args);
            } catch (error) {
                logger.error(`${errorMessage}:`, error);
                
                this.showErrorNotification(
                    errorMessage,
                    error.message || 'Ocorreu um erro inesperado',
                    'error'
                );
                
                // Não re-lançar erro - deixar sistema continuar
                return null;
            }
        };
    }
    
    /**
     * Wrapper para event handlers
     */
    wrapEventHandler(handler, eventName = 'evento') {
        return this.wrap(handler, null, `Erro ao processar ${eventName}`);
    }
    
    /**
     * Registra handler customizado para módulo específico
     */
    registerModuleHandler(moduleName, handler) {
        this.errorHandlers.set(moduleName, handler);
        logger.info(`📝 Handler de erro registrado para módulo: ${moduleName}`);
    }
    
    /**
     * Trata erro de módulo específico
     */
    handleModuleError(moduleName, error, operation = '') {
        logger.error(`❌ Erro no módulo ${moduleName}${operation ? ` (${operation})` : ''}:`, error);
        
        // Chamar handler customizado se existir
        const customHandler = this.errorHandlers.get(moduleName);
        if (customHandler) {
            try {
                customHandler(error, operation);
            } catch (handlerError) {
                logger.error('Erro no handler customizado:', handlerError);
            }
        }
        
        // Notificar usuário
        this.showErrorNotification(
            `Erro no ${moduleName}`,
            operation || 'Ocorreu um erro neste módulo',
            'error'
        );
    }
    
    /**
     * Executa operação com tratamento de erro
     */
    async execute(operation, errorContext = {}) {
        try {
            return await operation();
        } catch (error) {
            const moduleName = errorContext.module || 'Sistema';
            const operationName = errorContext.operation || 'Operação';
            
            this.handleModuleError(moduleName, error, operationName);
            
            // Retornar valor padrão se fornecido
            return errorContext.defaultValue !== undefined ? errorContext.defaultValue : null;
        }
    }
    
    /**
     * Mostra notificação de erro para usuário
     */
    showErrorNotification(title, message, type = 'error') {
        // Usar toast se disponível
        if (window.showToast) {
            window.showToast(`${title}: ${message}`, type);
        } else {
            // Fallback para notificação simples
            this.createSimpleNotification(title, message, type);
        }
    }
    
    /**
     * Cria notificação simples (fallback)
     */
    createSimpleNotification(title, message, type) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : '#ffc107'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">${title}</div>
            <div style="font-size: 13px; opacity: 0.9;">${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    /**
     * Sugere reload ao usuário após muitos erros
     */
    suggestReload() {
        const shouldReload = confirm(
            '⚠️ Foram detectados múltiplos erros no sistema.\n\n' +
            'Recomendamos recarregar a página para garantir o funcionamento correto.\n\n' +
            'Deseja recarregar agora?'
        );
        
        if (shouldReload) {
            window.location.reload();
        } else {
            // Resetar contador
            this.globalErrorCount = 0;
        }
    }
    
    /**
     * Reseta contador de erros
     */
    reset() {
        this.globalErrorCount = 0;
        logger.info('🔄 Contador de erros resetado');
    }
    
    /**
     * Obtém estatísticas de erros
     */
    getStats() {
        return {
            globalErrors: this.globalErrorCount,
            registeredHandlers: this.errorHandlers.size,
            maxErrorsBeforeReload: this.maxErrorsBeforeReload
        };
    }
}

// Criar instância global
const errorBoundary = new ErrorBoundary();

// Expor globalmente
window.errorBoundary = errorBoundary;

// Helpers globais
window.safeExecute = (fn, errorContext) => errorBoundary.execute(fn, errorContext);
window.wrapHandler = (handler, eventName) => errorBoundary.wrapEventHandler(handler, eventName);

// Exportar
export default errorBoundary;

// Log de inicialização
logger.info('🛡️ Error Boundary inicializado - Sistema protegido contra crashes');
