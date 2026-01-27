/**
 * Configuração do Firebase
 * Sistema de autenticação e banco de dados em nuvem
 * 
 * @author Sistema PDV Hamburgueria
 * @version 1.0.0
 * @since 09/12/2025
 */

// Configuração do Firebase - Projeto: burgerpdv
const firebaseConfig = {
    apiKey: "AIzaSyBqJQd0YpxjndeUDLoBIDjw7WPpE42YI6s",
    authDomain: "burgerpdv.firebaseapp.com",
    databaseURL: "https://burgerpdv-default-rtdb.firebaseio.com", // Será criado quando você ativar o Realtime Database
    projectId: "burgerpdv",
    storageBucket: "burgerpdv.firebasestorage.app",
    messagingSenderId: "810043325830",
    appId: "1:810043325830:web:fcbdb9de2c6330633c4007",
    measurementId: "G-HMWFRSSMRD"
};

// Inicializar Firebase
let firebaseApp;
let auth;
let database;
let currentUser = null;

class FirebaseManager {
    constructor() {
        this.isInitialized = false;
        this.isOnline = true;
        this.syncQueue = [];
        this.listeners = new Map();
    }

    /**
     * Inicializa o Firebase
     */
    async init() {
        try {
            // Inicializar Firebase App
            firebaseApp = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            database = firebase.database();

            // CORREÇÃO CRÍTICA: Remover listener problemático que causa vazamento de memória
            // this.isOnline será verificado apenas quando necessário
            this.isOnline = true; // Assumir online por padrão

            // Monitorar estado de autenticação
            auth.onAuthStateChanged((user) => {
                currentUser = user;
                if (user) {
                    console.log('✅ Usuário autenticado:', user.email);
                    this.onUserAuthenticated(user);
                } else {
                    console.log('❌ Usuário não autenticado');
                    this.onUserSignedOut();
                }
            });

            this.isInitialized = true;
            console.log('🚀 Firebase inicializado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar Firebase:', error);
            return false;
        }
    }

    /**
     * Login com email e senha
     */
    async signIn(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Erro no login:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    /**
     * Login com Google
     */
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const userCredential = await auth.signInWithPopup(provider);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Erro no login com Google:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    /**
     * Registrar novo usuário
     */
    async signUp(email, password, displayName) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Atualizar perfil com nome
            await userCredential.user.updateProfile({
                displayName: displayName
            });

            // Criar perfil do usuário no banco
            await this.createUserProfile(userCredential.user.uid, {
                email: email,
                displayName: displayName,
                createdAt: new Date().toISOString(),
                role: 'owner' // Primeiro usuário é o dono
            });

            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Erro no registro:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    /**
     * Logout
     */
    async signOut() {
        try {
            await auth.signOut();
            return { success: true };
        } catch (error) {
            console.error('Erro no logout:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Criar perfil do usuário
     */
    async createUserProfile(uid, data) {
        try {
            await database.ref(`users/${uid}`).set(data);
            return true;
        } catch (error) {
            console.error('Erro ao criar perfil:', error);
            return false;
        }
    }

    /**
     * Salvar dados no Firebase
     */
    async saveData(path, data) {
        if (!currentUser) {
            console.warn('⚠️ Usuário não autenticado, adicionando à fila');
            this.syncQueue.push({ action: 'save', path, data });
            return false;
        }

        try {
            const userPath = `users/${currentUser.uid}/${path}`;
            await database.ref(userPath).set(data);
            console.log(`✅ Dados salvos: ${path}`);
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            if (!this.isOnline) {
                this.syncQueue.push({ action: 'save', path, data });
            }
            return false;
        }
    }

    /**
     * Adicionar item ao Firebase
     */
    async addData(path, data) {
        if (!currentUser) {
            console.warn('⚠️ Usuário não autenticado');
            return null;
        }

        try {
            const userPath = `users/${currentUser.uid}/${path}`;
            const newRef = database.ref(userPath).push();
            await newRef.set(data);
            console.log(`✅ Item adicionado: ${path}/${newRef.key}`);
            return newRef.key;
        } catch (error) {
            console.error('Erro ao adicionar dados:', error);
            return null;
        }
    }

    /**
     * Atualizar dados no Firebase
     */
    async updateData(path, updates) {
        if (!currentUser) {
            console.warn('⚠️ Usuário não autenticado');
            return false;
        }

        try {
            const userPath = `users/${currentUser.uid}/${path}`;
            
            // Se updates é um array ou contém arrays, usar set() ao invés de update()
            // Firebase não gosta de arrays no update()
            if (Array.isArray(updates) || this.containsArrays(updates)) {
                await database.ref(userPath).set(updates);
                console.log(`✅ Dados salvos (set): ${path}`);
            } else {
                await database.ref(userPath).update(updates);
                console.log(`✅ Dados atualizados: ${path}`);
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            return false;
        }
    }
    
    /**
     * Verifica se um objeto contém arrays nas propriedades
     */
    containsArrays(obj) {
        if (!obj || typeof obj !== 'object') return false;
        
        for (const key in obj) {
            if (Array.isArray(obj[key])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Deletar dados do Firebase
     */
    async deleteData(path) {
        if (!currentUser) {
            console.warn('⚠️ Usuário não autenticado');
            return false;
        }

        try {
            const userPath = `users/${currentUser.uid}/${path}`;
            await database.ref(userPath).remove();
            console.log(`✅ Dados deletados: ${path}`);
            return true;
        } catch (error) {
            console.error('Erro ao deletar dados:', error);
            return false;
        }
    }

    /**
     * Buscar dados do Firebase
     */
    async getData(path) {
        if (!currentUser) {
            console.warn('⚠️ Usuário não autenticado');
            return null;
        }

        try {
            const userPath = `users/${currentUser.uid}/${path}`;
            const snapshot = await database.ref(userPath).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            return null;
        }
    }

    /**
     * Escutar mudanças em tempo real
     */
    listenToData(path, callback) {
        if (!currentUser) {
            console.warn('⚠️ Usuário não autenticado');
            return null;
        }

        const userPath = `users/${currentUser.uid}/${path}`;
        const ref = database.ref(userPath);
        
        ref.on('value', (snapshot) => {
            callback(snapshot.val());
        });

        this.listeners.set(path, ref);
        return ref;
    }

    /**
     * Parar de escutar mudanças
     */
    stopListening(path) {
        const ref = this.listeners.get(path);
        if (ref) {
            ref.off();
            this.listeners.delete(path);
        }
    }

    /**
     * Processar fila de sincronização
     */
    async processSyncQueue() {
        console.log(`📤 Processando ${this.syncQueue.length} itens da fila...`);
        
        while (this.syncQueue.length > 0) {
            const item = this.syncQueue.shift();
            
            if (item.action === 'save') {
                await this.saveData(item.path, item.data);
            }
        }
    }

    /**
     * Quando usuário faz login
     */
    onUserAuthenticated(user) {
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('userAuthenticated', { 
            detail: { user } 
        }));
    }

    /**
     * Quando usuário faz logout
     */
    onUserSignedOut() {
        // Parar todos os listeners
        this.listeners.forEach((ref) => ref.off());
        this.listeners.clear();

        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('userSignedOut'));
    }

    /**
     * Obter mensagem de erro amigável
     */
    getErrorMessage(code) {
        const messages = {
            'auth/invalid-email': 'Email inválido',
            'auth/user-disabled': 'Usuário desabilitado',
            'auth/user-not-found': 'Usuário não encontrado',
            'auth/wrong-password': 'Senha incorreta',
            'auth/email-already-in-use': 'Email já está em uso',
            'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
            'auth/network-request-failed': 'Erro de conexão com a internet',
            'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
            'auth/popup-closed-by-user': 'Login cancelado pelo usuário'
        };

        return messages[code] || 'Erro desconhecido. Tente novamente.';
    }

    /**
     * Verificar se usuário está autenticado
     */
    isAuthenticated() {
        return currentUser !== null;
    }

    /**
     * Obter usuário atual
     */
    getCurrentUser() {
        return currentUser;
    }
}

// Criar instância global
const firebaseManager = new FirebaseManager();

// Exportar para uso global
window.firebaseManager = firebaseManager;
window.getCurrentUser = () => firebaseManager.getCurrentUser();
window.isAuthenticated = () => firebaseManager.isAuthenticated();
