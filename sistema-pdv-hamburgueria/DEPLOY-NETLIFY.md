# 🚀 Guia de Deploy - Netlify

## Checklist Pré-Deploy

✅ Firebase configurado e funcionando
✅ Credenciais do Firebase atualizadas em `firebase-config.js`
✅ Sistema testado localmente
✅ Templates WhatsApp configurados
✅ Dados de exemplo carregados

## Passo a Passo - Deploy no Netlify

### Método 1: Deploy via GitHub (Recomendado)

#### 1. Criar Repositório Git

```bash
# Inicializar git (se ainda não foi feito)
git init

# Adicionar todos os arquivos
git add .

# Fazer commit inicial
git commit -m "🍔 Sistema BurgerPDV - Deploy inicial"

# Criar branch main
git branch -M main
```

#### 2. Criar Repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em "New repository"
3. Nome: `burgerpdv-sistema` ou similar
4. Deixe como **privado** (sistema proprietário)
5. NÃO inicialize com README
6. Clique em "Create repository"

#### 3. Conectar ao GitHub

```bash
# Adicionar remote (substitua SEU-USUARIO pelo seu usuário GitHub)
git remote add origin https://github.com/SEU-USUARIO/burgerpdv-sistema.git

# Push inicial
git push -u origin main
```

#### 4. Deploy no Netlify

1. Acesse [app.netlify.com](https://app.netlify.com)
2. Faça login (pode usar conta GitHub)
3. Clique em "Add new site" → "Import an existing project"
4. Escolha "Deploy with GitHub"
5. Autorize o Netlify no GitHub
6. Selecione o repositório `burgerpdv-sistema`
7. Configurações:
   - **Build command:** `echo 'No build required'` (já preenchido do netlify.toml)
   - **Publish directory:** `.` (raiz do projeto)
8. Clique em "Deploy site"
9. Aguarde 1-2 minutos

#### 5. Configurar Domínio (Opcional)

1. Na dashboard do site, vá em "Domain settings"
2. Clique em "Options" → "Edit site name"
3. Escolha um nome: `burgerpdv-seunome.netlify.app`
4. Ou configure domínio próprio

### Método 2: Deploy via Netlify CLI

#### 1. Instalar Netlify CLI

```bash
npm install -g netlify-cli
```

#### 2. Login no Netlify

```bash
netlify login
```

Será aberto o navegador para autenticação.

#### 3. Deploy em Produção

```bash
# Deploy direto em produção
netlify deploy --prod

# Selecione: Create & configure a new site
# Escolha seu team
# Digite o nome do site
# Diretório de deploy: . (ponto - raiz)
```

#### 4. Obter URL

Após o deploy, você receberá a URL:
```
https://seu-site.netlify.app
```

### Método 3: Drag & Drop (Mais Rápido)

1. **Prepare os arquivos**
   - Certifique-se que todos os arquivos estão na pasta
   - Remova arquivos desnecessários (já configurado no .gitignore)

2. **Acesse o Netlify Drop**
   - Vá para [app.netlify.com/drop](https://app.netlify.com/drop)
   - Faça login se necessário

3. **Arraste a pasta**
   - Arraste a pasta `sistema-pdv-hamburgueria` para a área indicada
   - Aguarde o upload e deploy
   - Pronto! Você receberá a URL

## Configurações Importantes

### Variáveis de Ambiente (Recomendado)

Para maior segurança, configure as credenciais Firebase como variáveis de ambiente:

1. No painel do Netlify, vá em "Site settings"
2. Clique em "Environment variables"
3. Adicione as variáveis:

```
FIREBASE_API_KEY=AIzaSyBfOFLbM4RqvlpKJcXIZJ3g-LWM5DWmZ7Q
FIREBASE_AUTH_DOMAIN=burgerpdv.firebaseapp.com
FIREBASE_DATABASE_URL=https://burgerpdv-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=burgerpdv
FIREBASE_STORAGE_BUCKET=burgerpdv.appspot.com
FIREBASE_MESSAGING_SENDER_ID=878977926887
FIREBASE_APP_ID=1:878977926887:web:a3b2c1d4e5f6g7h8i9
```

### Headers de Segurança

Já configurados no `netlify.toml`:
- ✅ X-Frame-Options
- ✅ X-XSS-Protection
- ✅ X-Content-Type-Options
- ✅ CORS Headers
- ✅ Cache Control

### Redirecionamentos SPA

Configurado para redirecionar todas as rotas para `index.html` (Single Page Application).

## Testes Pós-Deploy

### 1. Verificar Firebase
- Acesse o site deployado
- Abra o console (F12)
- Verifique se aparece: `✅ Firebase conectado`
- Faça login com suas credenciais

### 2. Testar Funcionalidades
- [ ] Login funciona
- [ ] Dashboard carrega dados
- [ ] PDV permite criar pedidos
- [ ] Módulos carregam corretamente
- [ ] WhatsApp abre ao mudar status
- [ ] Configurações salvam corretamente

### 3. Verificar Performance
- Teste de velocidade: [PageSpeed Insights](https://pagespeed.web.dev/)
- Meta: Score > 90

### 4. Testar em Dispositivos
- [ ] Desktop (Chrome, Firefox, Edge)
- [ ] Tablet
- [ ] Mobile (iOS e Android)

## Monitoramento

### Analytics Netlify
1. Vá em "Analytics" no painel do site
2. Ative o plano gratuito
3. Monitore:
   - Visitantes
   - Page views
   - Banda consumida

### Logs de Deploy
- Acesse "Deploys" no painel
- Veja logs detalhados de cada deploy
- Rollback automático em caso de erro

### Status do Site
- Badge de status: Adicione ao README
- Notificações de deploy
- Webhooks para integração

## Atualizações Futuras

### Deploy Contínuo (GitHub)
Após configurado via GitHub, cada `git push` fará deploy automático:

```bash
# Fazer alterações no código
git add .
git commit -m "feat: Nova funcionalidade"
git push

# Deploy acontece automaticamente!
```

### Preview Deploys
Netlify cria preview para cada Pull Request automaticamente.

### Branch Deploys
Configure branches específicas para staging/produção.

## Comandos Úteis

```bash
# Ver status do site
netlify status

# Ver logs
netlify logs

# Abrir site no navegador
netlify open

# Abrir painel admin
netlify open:admin

# Ver informação do site
netlify sites:list

# Rollback para deploy anterior
netlify rollback
```

## Troubleshooting

### ❌ Firebase não conecta
**Solução:**
1. Verifique as credenciais em `firebase-config.js`
2. Confira as regras do Firebase Database
3. Veja console do navegador (F12)

### ❌ Erro 404 em rotas
**Solução:**
- Já configurado no `netlify.toml`
- Se persistir, adicione arquivo `_redirects`:
```
/*    /index.html   200
```

### ❌ Assets não carregam
**Solução:**
1. Verifique os caminhos (devem ser relativos)
2. Limpe cache do Netlify: Settings → Build & deploy → Clear cache

### ❌ Build falha
**Solução:**
- Este é um site estático, não precisa build
- Verifique se `netlify.toml` está na raiz
- Build command deve ser: `echo 'No build required'`

### ❌ CORS Error
**Solução:**
- Já configurado no `netlify.toml`
- Adicione domínio Netlify nas configurações do Firebase

## Custos

### Netlify Free Tier
- ✅ 100GB bandwidth/mês
- ✅ 300 build minutes/mês
- ✅ Deploy ilimitados
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Formulários (100 submissions/mês)

**Para um PDV de hamburgueria: Totalmente gratuito!**

### Upgrade (Se necessário)
- Pro: $19/mês - Bandwidth e builds ilimitados
- Business: $99/mês - Múltiplos sites, SSO

## Segurança em Produção

### ✅ Implementado
- [x] HTTPS obrigatório
- [x] Headers de segurança
- [x] Autenticação Firebase
- [x] Cache otimizado
- [x] CORS configurado

### 🔒 Recomendações Adicionais
1. **Firebase Rules**: Configure regras restritivas
2. **Environment Variables**: Use para credenciais sensíveis
3. **Backup Regular**: Configure backup automático do Firebase
4. **Monitoring**: Ative Firebase Analytics
5. **Rate Limiting**: Configure no Firebase

## Suporte

Dúvidas sobre deploy? Verifique:
- 📚 [Documentação Netlify](https://docs.netlify.com)
- 💬 [Netlify Community](https://answers.netlify.com)
- 🔥 [Firebase Docs](https://firebase.google.com/docs)

---

✅ **Sistema pronto para produção!**

Boa sorte com seu BurgerPDV! 🍔🚀
