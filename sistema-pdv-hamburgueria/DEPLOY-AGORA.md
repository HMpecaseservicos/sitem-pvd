# 🚀 DEPLOY NO NETLIFY - GUIA RÁPIDO

## 📦 ARQUIVOS NOVOS/ATUALIZADOS PARA ENVIAR:

### ✅ Arquivos Obrigatórios (PWA):
- ✨ **painel-pedidos.html** (atualizado - com PWA integrado)
- ✨ **sw-painel.js** (NOVO - Service Worker)
- ✨ **manifest-painel.json** (NOVO - Config do App)

### 📚 Arquivos Opcionais (Documentação/Utilidades):
- 📖 **GUIA-PWA-INSTALACAO.md** (manual de instalação)
- 🛠️ **SERVIDOR-LOCAL.html** (página de ajuda)
- 🔗 **menu.html** (menu de navegação)
- ⚙️ **netlify.toml** (configuração Netlify)
- 💻 **iniciar-servidor.ps1** (não precisa enviar - só para local)

---

## 🎯 MÉTODO 1: ARRASTAR E SOLTAR (MAIS RÁPIDO)

### Passo a Passo:

1. **Acesse o Netlify:**
   - https://app.netlify.com/
   - Faça login

2. **Encontre seu site:**
   - Procure por **burgerpdv** na lista
   - Clique no site

3. **Abra a aba Deploys:**
   - Clique em **"Deploys"** no menu superior

4. **Arraste os arquivos:**
   - Arraste esta pasta inteira: `C:\pvd\sistema-pdv-hamburgueria`
   - OU arraste só os arquivos obrigatórios listados acima
   - Solte na área "Drag and drop your site output folder here"

5. **Aguarde o deploy:**
   - Aguarde 30-60 segundos
   - Quando aparecer "Published", está pronto!

---

## 🎯 MÉTODO 2: NETLIFY CLI (PARA QUEM TEM NODE.JS)

### Instalar CLI:
```powershell
npm install -g netlify-cli
```

### Fazer Login:
```powershell
netlify login
```

### Deploy Automático:
```powershell
cd C:\pvd\sistema-pdv-hamburgueria
netlify deploy --prod
```

**Quando perguntar "Publish directory":**
- Digite: `.` (ponto)
- Pressione Enter

---

## ✅ VERIFICAR SE DEU CERTO:

### 1. Abra no celular:
```
https://burgerpdv.netlify.app/painel-pedidos.html
```

### 2. Deve aparecer:
- ✅ Botão flutuante **"Instalar App"** (aguarde 3 segundos)
- ✅ Pop-up pedindo permissão para notificações
- ✅ Ícone 📋 no canto superior

### 3. Instalar:
- **Android Chrome:** Toque em "Instalar App"
- **iOS Safari:** Menu → "Adicionar à Tela Inicial"

### 4. Testar notificação:
- Crie um pedido novo no sistema
- Deve vibrar + aparecer notificação
- Som + Badge com número do pedido

---

## 🐛 SOLUÇÃO DE PROBLEMAS:

### ❌ Botão "Instalar App" não aparece:
- Limpe cache do navegador: Ctrl+Shift+Delete
- Acesse novamente o link
- Aguarde 5 segundos

### ❌ Notificações não funcionam:
- Vá em Configurações do navegador
- Permissões → Notificações
- Permita para burgerpdv.netlify.app

### ❌ Erro 404 no painel-pedidos.html:
- Verifique se o arquivo `netlify.toml` foi enviado
- Conteúdo correto:
  ```toml
  [[redirects]]
    from = "/"
    to = "/index.html"
    status = 200
  ```

---

## 📱 APÓS INSTALAR NO CELULAR:

### ✅ Você terá:
- 📲 Ícone do app na tela inicial
- 🔔 Notificações automáticas de pedidos novos
- 📳 Vibração quando chegar pedido
- 🔊 Som de notificação
- 📶 Funciona offline (carrega pedidos salvos)
- ⚡ Abre mais rápido que no navegador

### 🎯 Funções automáticas:
- **Pedido novo → Notifica na hora**
- **Status "Pronto" → Notifica**
- **Contador no badge → Número de pedidos pendentes**

---

## 🎉 PRONTO!

Agora seu painel é um **aplicativo profissional** instalável!

**URL do App:**
```
https://burgerpdv.netlify.app/painel-pedidos.html
```

**Compartilhe com a equipe:**
- Envie o link por WhatsApp
- Todos podem instalar
- Cada um recebe notificações
- Funciona como app nativo! 🚀
