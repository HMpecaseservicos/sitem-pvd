// ===== APP.JS - SISTEMA HAMBURGUERIA =====
// Arquivo principal que inicializa o sistema modular

// Importar dependências
import { ModuleManager } from './modules/module-manager.js';
import SystemCleaner from './modules/shared/system-cleaner.js';

// Classe principal da aplicação
class App {
    constructor() {
        this.moduleManager = null;
        this.isInitialized = false;
    }

    async init() {
        // CORREÇÃO CRÍTICA: Proteção contra inicialização duplicada
        if (this.isInitialized) {
            console.warn('⚠️ App já foi inicializado, ignorando chamada duplicada');
            return;
        }
        this.isInitialized = true; // Marcar IMEDIATAMENTE antes de operações assíncronas
        
        try {
            console.log('🚀 Inicializando BurgerPDV System...');
            
            // OTIMIZAÇÃO CRÍTICA: Limpeza automática antes de inicializar
            await SystemCleaner.cleanSystem();
            
            // Aguardar DOM estar pronto
            await this.waitForDOM();
            
            // Inicializar gerenciador de módulos
            this.moduleManager = new ModuleManager();
            await this.moduleManager.init();
            
            console.log('✅ BurgerPDV System inicializado com sucesso!');
            
            // Expor globalmente para diagnósticos e compatibilidade
            window.app = this;
            window.moduleManager = this.moduleManager;
            
            // NOVA: Limpar dados antigos em background (não bloquea)
            this.scheduleDataCleanup();
            
            // Exibir toast de boas-vindas
            if (typeof showToast !== 'undefined') {
                showToast('Sistema otimizado e carregado com sucesso!', 'success');
            }
            
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema:', error);
            this.isInitialized = false; // CORREÇÃO: Resetar flag em caso de erro
            
            // Exibir erro para o usuário
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff4757;
                color: white;
                padding: 15px;
                border-radius: 8px;
                z-index: 10000;
                max-width: 300px;
            `;
            errorMsg.innerHTML = `
                <strong>Erro ao carregar sistema:</strong><br>
                ${error.message || 'Erro desconhecido'}
            `;
            document.body.appendChild(errorMsg);
            
            // Remover erro após 5 segundos
            setTimeout(() => {
                if (errorMsg.parentNode) {
                    errorMsg.parentNode.removeChild(errorMsg);
                }
            }, 5000);
        }
    }

    waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    // Método para recarregar o sistema
    async reload() {
        if (this.moduleManager) {
            await this.moduleManager.init();
            console.log('🔄 Sistema recarregado');
        }
    }

    // Método para obter instância do módulo
    getModule(moduleName) {
        if (this.moduleManager) {
            return this.moduleManager.getModuleInstance(moduleName);
        }
        return null;
    }

    // Método para navegar para um módulo
    navigateTo(moduleName) {
        if (this.moduleManager) {
            this.moduleManager.navigateToModule(moduleName);
        }
    }
    
    /**
     * NOVA: Agendar limpeza automática de dados antigos
     */
    scheduleDataCleanup() {
        // Verificar se já foi executado hoje
        const lastCleanup = localStorage.getItem('lastDataCleanup');
        const today = new Date().toDateString();
        
        if (lastCleanup === today) {
            console.log('✅ Limpeza já executada hoje');
            return;
        }
        
        // Executar limpeza após 30 segundos (não bloqueia inicialização)
        setTimeout(async () => {
            try {
                if (window.db && typeof window.db.cleanupDatabase === 'function') {
                    console.log('🧹 Executando limpeza automática...');
                    const results = await window.db.cleanupDatabase();
                    
                    if (results.total > 0) {
                        console.log(`✅ ${results.total} registros antigos removidos`);
                        if (window.showToast) {
                            window.showToast(`🧹 ${results.total} registros antigos removidos`, 'info', 3000);
                        }
                    }
                    
                    // Marcar como executado hoje
                    localStorage.setItem('lastDataCleanup', today);
                }
            } catch (error) {
                console.error('❌ Erro na limpeza automática:', error);
            }
        }, 30000);
    }
}

// Inicializar aplicação
const app = new App();

// Expor globalmente para compatibilidade
window.app = app;
window.BurgerPDV = app;

// Auto-inicializar quando script carregar E configurar botões de login/logout
app.init().then(() => {
    // Aguardar Firebase carregar
    setTimeout(() => {
        if (typeof firebase !== 'undefined') {
            firebase.auth().onAuthStateChanged((user) => {
                const userArea = document.querySelector('.user-area');
                if (!userArea) return;

                if (user) {
                    // Usuário logado - mostrar info e logout
                    userArea.innerHTML = `
                        <div class="user-avatar" style="background: linear-gradient(135deg, #27ae60, #229954);">
                            <i class="fas fa-cloud"></i>
                        </div>
                        <div class="user-info">
                            <div class="user-name" style="font-size: 13px;">${user.displayName || user.email.split('@')[0]}</div>
                            <div class="user-role" style="font-size: 11px; opacity: 0.8;">☁️ Conectado</div>
                        </div>
                        <div class="logout-btn" id="logout-btn" title="Sair" style="cursor: pointer;">
                            <i class="fas fa-sign-out-alt"></i>
                        </div>
                    `;

                    document.getElementById('logout-btn').addEventListener('click', async () => {
                        if (confirm('Deseja realmente sair da conta Firebase?')) {
                            await firebase.auth().signOut();
                            location.reload();
                        }
                    });

                    // Sincronizar dados do Firebase
                    if (window.dbAdapter && window.firebaseService) {
                        // IMPORTANTE: Processar fila PRIMEIRO, depois sincronizar
                        console.log('⬆️ Processando operações pendentes...');
                        window.firebaseService.processPendingOperations().then(() => {
                            console.log('⬇️ Sincronizando do Firebase...');
                            return dbAdapter.syncFromFirebase();
                        }).then(() => {
                            console.log('✅ Sincronização completa');
                        });
                    }
                } else {
                    // Usuário NÃO logado - mostrar botão de login
                    userArea.innerHTML = `
                        <div class="user-avatar" style="background: linear-gradient(135deg, #95a5a6, #7f8c8d);">
                            <i class="fas fa-laptop"></i>
                        </div>
                        <div class="user-info">
                            <div class="user-name" style="font-size: 13px;">Modo Local</div>
                            <div class="user-role" style="font-size: 11px; opacity: 0.8;">💻 Offline</div>
                        </div>
                        <div class="logout-btn" id="login-btn" title="Ativar Nuvem" style="cursor: pointer; background: #27ae60;">
                            <i class="fas fa-cloud-upload-alt"></i>
                        </div>
                    `;

                    document.getElementById('login-btn').addEventListener('click', () => {
                        if (confirm('Quer ativar a sincronização em nuvem?\n\nVocê poderá acessar seus dados de qualquer lugar!')) {
                            window.location.href = 'login.html';
                        }
                    });
                }
            });
        }
    }, 1000);
});

// Exportar para outros módulos que precisem
export default app;