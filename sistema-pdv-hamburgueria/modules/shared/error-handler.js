/**
 * 🚨 SISTEMA DE TRATAMENTO DE ERROS GLOBAL
 * 
 * Sistema centralizado para captura, logging e recuperação de erros
 * com suporte a diferentes níveis de severidade e ações de recovery
 */

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.errorCount = 0;
        this.listeners = new Map();
        this.recoveryStrategies = new Map();
        this.maxErrors = 100; // Limite de erros em memória
        
        this.init();
    }

    init() {
        // Capturar erros não tratados
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'runtime',
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error,
                severity: 'critical'
            });
        });

        // Capturar promises rejeitadas
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || 'Promise rejection',
                error: event.reason,
                severity: 'high'
            });
        });

        // Registrar estratégias de recuperação padrão
        this.registerRecoveryStrategy('database', this.recoverDatabase.bind(this));
        this.registerRecoveryStrategy('module', this.recoverModule.bind(this));
        this.registerRecoveryStrategy('ui', this.recoverUI.bind(this));
    }

    /**
     * Trata um erro
     * @param {Object} errorData - Dados do erro
     */
    handleError(errorData) {
        const error = this.normalizeError(errorData);
        
        // Log no console
        this.logToConsole(error);
        
        // Armazenar erro
        this.storeError(error);
        
        // Notificar listeners
        this.notifyListeners(error);
        
        // Mostrar ao usuário se necessário
        if (error.severity === 'critical' || error.severity === 'high') {
            this.showUserNotification(error);
        }
        
        // Tentar recuperação automática
        if (error.recoverable) {
            this.attemptRecovery(error);
        }
        
        // Salvar em localStorage para análise
        this.persistError(error);
        
        return error;
    }

    /**
     * Normaliza dados do erro
     */
    normalizeError(data) {
        return {
            id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            type: data.type || 'unknown',
            severity: data.severity || 'medium',
            message: data.message || 'Unknown error',
            source: data.source || 'unknown',
            module: data.module || null,
            line: data.line || null,
            column: data.column || null,
            stack: data.error?.stack || null,
            context: data.context || {},
            recoverable: data.recoverable !== false,
            recovered: false,
            userNotified: false
        };
    }

    /**
     * Log estruturado no console
     */
    logToConsole(error) {
        const style = this.getSeverityStyle(error.severity);
        const icon = this.getSeverityIcon(error.severity);
        
        console.group(`${icon} ${error.severity.toUpperCase()} ERROR - ${error.type}`);
        console.log(`%c${error.message}`, style);
        
        if (error.module) {
            console.log('Module:', error.module);
        }
        
        if (error.source && error.line) {
            console.log(`Source: ${error.source}:${error.line}:${error.column}`);
        }
        
        if (error.context && Object.keys(error.context).length > 0) {
            console.log('Context:', error.context);
        }
        
        if (error.stack) {
            console.log('Stack:', error.stack);
        }
        
        console.groupEnd();
    }

    getSeverityStyle(severity) {
        const styles = {
            critical: 'color: #fff; background: #d32f2f; padding: 4px 8px; border-radius: 3px; font-weight: bold;',
            high: 'color: #fff; background: #f57c00; padding: 4px 8px; border-radius: 3px; font-weight: bold;',
            medium: 'color: #000; background: #ffa726; padding: 4px 8px; border-radius: 3px;',
            low: 'color: #000; background: #ffeb3b; padding: 4px 8px; border-radius: 3px;',
            info: 'color: #000; background: #64b5f6; padding: 4px 8px; border-radius: 3px;'
        };
        return styles[severity] || styles.medium;
    }

    getSeverityIcon(severity) {
        const icons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
            info: '🔵'
        };
        return icons[severity] || '⚪';
    }

    /**
     * Armazena erro na memória
     */
    storeError(error) {
        this.errors.push(error);
        this.errorCount++;
        
        // Limitar tamanho do array
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
    }

    /**
     * Notifica listeners registrados
     */
    notifyListeners(error) {
        this.listeners.forEach((callback, key) => {
            try {
                callback(error);
            } catch (e) {
                console.error('Error in error listener:', e);
            }
        });
    }

    /**
     * Mostra notificação visual ao usuário
     */
    showUserNotification(error) {
        // Verificar se já existe uma notificação
        const existing = document.querySelector('.error-notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="error-notification-content ${error.severity}">
                <div class="error-notification-icon">${this.getSeverityIcon(error.severity)}</div>
                <div class="error-notification-body">
                    <div class="error-notification-title">${this.getSeverityTitle(error.severity)}</div>
                    <div class="error-notification-message">${this.getUserFriendlyMessage(error)}</div>
                    ${error.recoverable ? '<div class="error-notification-recovery">Tentando recuperar automaticamente...</div>' : ''}
                </div>
                <button class="error-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remover após 10 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);

        error.userNotified = true;
    }

    getSeverityTitle(severity) {
        const titles = {
            critical: 'Erro Crítico',
            high: 'Erro Importante',
            medium: 'Atenção',
            low: 'Aviso',
            info: 'Informação'
        };
        return titles[severity] || 'Erro';
    }

    getUserFriendlyMessage(error) {
        // Mapear mensagens técnicas para mensagens amigáveis
        const messageMap = {
            'Database not initialized': 'Banco de dados não inicializado. Recarregando...',
            'Module not found': 'Módulo não encontrado. Verifique a instalação.',
            'Network error': 'Erro de conexão. Verifique sua internet.',
            'Permission denied': 'Permissão negada. Verifique as configurações.',
            'Quota exceeded': 'Espaço de armazenamento insuficiente.'
        };

        for (const [key, value] of Object.entries(messageMap)) {
            if (error.message.includes(key)) {
                return value;
            }
        }

        return error.message;
    }

    /**
     * Tenta recuperação automática
     */
    async attemptRecovery(error) {
        console.log(`🔄 Attempting recovery for ${error.type}...`);

        // Buscar estratégia de recuperação
        const strategy = this.recoveryStrategies.get(error.type);
        
        if (strategy) {
            try {
                await strategy(error);
                error.recovered = true;
                console.log(`✅ Recovery successful for ${error.type}`);
                
                // Notificar sucesso
                this.showRecoverySuccess(error);
            } catch (e) {
                console.error(`❌ Recovery failed for ${error.type}:`, e);
                error.recovered = false;
            }
        } else {
            console.warn(`⚠️ No recovery strategy for ${error.type}`);
        }
    }

    showRecoverySuccess(error) {
        const notification = document.createElement('div');
        notification.className = 'error-notification success';
        notification.innerHTML = `
            <div class="error-notification-content success">
                <div class="error-notification-icon">✅</div>
                <div class="error-notification-body">
                    <div class="error-notification-title">Recuperado</div>
                    <div class="error-notification-message">O problema foi resolvido automaticamente.</div>
                </div>
                <button class="error-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Registra estratégia de recuperação
     */
    registerRecoveryStrategy(type, callback) {
        this.recoveryStrategies.set(type, callback);
    }

    /**
     * Estratégia de recuperação para database
     */
    async recoverDatabase(error) {
        console.log('Recovering database...');
        
        // Tentar reconectar ao banco
        if (window.db) {
            try {
                await window.db.init();
                console.log('Database reconnected');
            } catch (e) {
                console.error('Failed to reconnect database:', e);
                
                // Última tentativa: recarregar página
                console.log('Reloading page as last resort...');
                setTimeout(() => location.reload(), 2000);
            }
        }
    }

    /**
     * Estratégia de recuperação para módulo
     */
    async recoverModule(error) {
        console.log('Recovering module...');
        
        if (error.module && window.app?.moduleManager) {
            try {
                // Tentar recarregar o módulo
                await window.app.moduleManager.loadModule(error.module);
                console.log(`Module ${error.module} reloaded`);
            } catch (e) {
                console.error(`Failed to reload module ${error.module}:`, e);
            }
        }
    }

    /**
     * Estratégia de recuperação para UI
     */
    async recoverUI(error) {
        console.log('Recovering UI...');
        
        // Limpar elementos órfãos
        const orphans = document.querySelectorAll('[data-error], .error-state');
        orphans.forEach(el => el.remove());
        
        // Recarregar módulo atual se possível
        if (window.app?.moduleManager?.currentModule) {
            try {
                const currentName = window.app.moduleManager.currentModule.name;
                await window.app.navigateTo(currentName);
                console.log('UI refreshed');
            } catch (e) {
                console.error('Failed to refresh UI:', e);
            }
        }
    }

    /**
     * Persiste erro em localStorage
     */
    persistError(error) {
        try {
            const key = 'pdv_error_log';
            let log = JSON.parse(localStorage.getItem(key) || '[]');
            
            // Adicionar erro
            log.push({
                id: error.id,
                timestamp: error.timestamp,
                type: error.type,
                severity: error.severity,
                message: error.message,
                module: error.module,
                recovered: error.recovered
            });
            
            // Limitar a 50 erros
            if (log.length > 50) {
                log = log.slice(-50);
            }
            
            localStorage.setItem(key, JSON.stringify(log));
        } catch (e) {
            console.error('Failed to persist error:', e);
        }
    }

    /**
     * Registra listener para erros
     */
    on(key, callback) {
        this.listeners.set(key, callback);
    }

    /**
     * Remove listener
     */
    off(key) {
        this.listeners.delete(key);
    }

    /**
     * Retorna erros recentes
     */
    getRecentErrors(count = 10) {
        return this.errors.slice(-count);
    }

    /**
     * Retorna estatísticas de erros
     */
    getStats() {
        const bySeverity = {};
        const byType = {};
        
        this.errors.forEach(error => {
            bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
            byType[error.type] = (byType[error.type] || 0) + 1;
        });
        
        return {
            total: this.errorCount,
            current: this.errors.length,
            bySeverity,
            byType,
            recovered: this.errors.filter(e => e.recovered).length,
            notRecovered: this.errors.filter(e => !e.recovered && e.recoverable).length
        };
    }

    /**
     * Limpa log de erros
     */
    clearErrors() {
        this.errors = [];
        localStorage.removeItem('pdv_error_log');
        console.log('Error log cleared');
    }

    /**
     * Exporta log de erros
     */
    exportLog() {
        const log = {
            exportDate: new Date().toISOString(),
            stats: this.getStats(),
            errors: this.errors
        };
        
        const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdv-error-log-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Wrapper seguro para funções
     */
    wrap(fn, context = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleError({
                    type: context.type || 'wrapped',
                    message: error.message,
                    error,
                    severity: context.severity || 'medium',
                    module: context.module,
                    context: { ...context, args }
                });
                
                if (context.rethrow) {
                    throw error;
                }
                
                return context.fallback;
            }
        };
    }
}

// CSS para notificações
const style = document.createElement('style');
style.textContent = `
    .error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .error-notification-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: white;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 320px;
        max-width: 420px;
        border-left: 4px solid #666;
    }

    .error-notification-content.critical {
        border-left-color: #d32f2f;
    }

    .error-notification-content.high {
        border-left-color: #f57c00;
    }

    .error-notification-content.medium {
        border-left-color: #ffa726;
    }

    .error-notification-content.success {
        border-left-color: #4caf50;
    }

    .error-notification-icon {
        font-size: 24px;
        line-height: 1;
    }

    .error-notification-body {
        flex: 1;
    }

    .error-notification-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
        color: #333;
    }

    .error-notification-message {
        font-size: 13px;
        color: #666;
        line-height: 1.4;
    }

    .error-notification-recovery {
        font-size: 12px;
        color: #2196f3;
        margin-top: 8px;
        font-style: italic;
    }

    .error-notification-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #999;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        width: 24px;
        height: 24px;
    }

    .error-notification-close:hover {
        color: #333;
    }
`;
document.head.appendChild(style);

// Criar instância global
window.errorHandler = new ErrorHandler();

export default window.errorHandler;
