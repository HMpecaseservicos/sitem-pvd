# 📱 GUIA DE INSTALAÇÃO - PWA GO BURGER

## 🎯 **O QUE FOI FEITO:**

Transformei o painel em um **PWA (Progressive Web App) profissional** com:

✅ **Instalável no celular** como app nativo
✅ **Notificações push** na barra do celular
✅ **Funciona offline**
✅ **Ícone na tela inicial**
✅ **Abre em tela cheia** (sem navegador)
✅ **Detecção automática de novos pedidos**
✅ **Som e vibração** nas notificações

---

## 📱 **COMO INSTALAR NO CELULAR:**

### **Android (Chrome/Edge):**

1. Acesse: `https://burgerpdv.netlify.app/painel-pedidos.html`
2. No Chrome, clique nos **3 pontinhos** (⋮)
3. Selecione **"Instalar app"** ou **"Adicionar à tela inicial"**
4. Confirme a instalação
5. O app aparecerá na tela inicial com ícone 📋

**OU:**

- Quando abrir a página, aparecerá um **botão "Instalar App"** no canto superior direito
- Clique nele e confirme!

### **iOS (Safari):**

1. Acesse: `https://burgerpdv.netlify.app/painel-pedidos.html`
2. Toque no botão **Compartilhar** (□↑)
3. Role para baixo e toque em **"Adicionar à Tela Inicial"**
4. Toque em **"Adicionar"**
5. O app aparecerá na tela inicial

---

## 🔔 **ATIVAR NOTIFICAÇÕES:**

### **Primeira vez:**
1. Ao abrir o app, após 3 segundos aparecerá:
   - **"GO BURGER quer enviar notificações"**
2. Clique em **"Permitir"**
3. Pronto! Você receberá notificações de novos pedidos

### **Se negou por acidente:**

**Android:**
1. Vá em **Configurações** do celular
2. **Apps** → **GO BURGER**
3. **Notificações** → Ativar

**iOS:**
1. **Ajustes** do iPhone
2. **Notificações** → **Safari** → **Sites**
3. Encontre `burgerpdv.netlify.app` e ative

---

## 🎯 **TIPOS DE NOTIFICAÇÃO:**

### **1. Novo Pedido** 🍔
- **Quando:** Um novo pedido é criado
- **Som:** Toca + Vibra (200ms-100ms-200ms)
- **Botões:**
  - "Ver Pedido" → Abre o app no pedido
  - "Fechar" → Fecha a notificação

### **2. Pedido Pronto** ✅
- **Quando:** Você marca um pedido como "Pronto"
- **Som:** Toca + Vibra (200ms-100ms-200ms)
- **Ação:** Abre diretamente na lista de prontos

---

## 📋 **ARQUIVOS CRIADOS:**

```
sistema-pdv-hamburgueria/
├── painel-pedidos.html (✅ ATUALIZADO com PWA)
├── sw-painel.js (✅ NOVO - Service Worker)
└── manifest-painel.json (✅ NOVO - Configuração PWA)
```

---

## 🚀 **FUNCIONALIDADES PWA:**

### **1. Atalhos Rápidos** (Android)
Segure o ícone do app na tela inicial para ver:
- 📋 **Todos os pedidos**
- ⏰ **Apenas pendentes**
- ✅ **Apenas prontos**
- ➕ **Novo pedido**

### **2. Funciona Offline**
- Cache inteligente de recursos
- Continua funcionando sem internet
- Sincroniza quando voltar online

### **3. Atualização Automática**
- Service Worker verifica atualizações
- Atualiza automaticamente em background
- Sempre na última versão

---

## 🔥 **DEPLOY NO NETLIFY:**

### **Opção 1: Arrastar e Soltar**
1. Faça upload de **TODA a pasta** novamente
2. Netlify detectará os novos arquivos
3. Deploy automático!

### **Opção 2: Git Push**
```bash
git add .
git commit -m "feat: PWA com notificações push"
git push origin main
```

Netlify fará deploy automático!

---

## ✅ **TESTAR SE ESTÁ FUNCIONANDO:**

1. **Abra:** https://burgerpdv.netlify.app/painel-pedidos.html
2. **Verifique:** Botão "Instalar App" apareceu?
3. **Instale:** Clique e instale
4. **Permita:** Aceite as notificações
5. **Teste:** Crie um pedido de teste no sistema
6. **Resultado:** Deve aparecer notificação no celular! 🔔

---

## 🎨 **PERSONALIZAÇÃO:**

### **Mudar cor do app:**
Edite `manifest-painel.json`:
```json
"theme_color": "#667eea",  ← Altere aqui
```

### **Mudar ícone:**
Troque o emoji no manifest:
```json
"📋" ← Pode ser: 🍔 🔔 📱 ⚡
```

---

## 📞 **URLs IMPORTANTES:**

- **Painel PWA:** https://burgerpdv.netlify.app/painel-pedidos.html
- **Menu Geral:** https://burgerpdv.netlify.app/menu.html
- **Limpar Cache:** https://burgerpdv.netlify.app/limpar-cache-completo.html

---

## 🆘 **TROUBLESHOOTING:**

### **Notificações não aparecem?**
1. Verifique permissões do navegador
2. Teste em modo anônimo
3. Limpe cache: `limpar-cache-completo.html`
4. Reinstale o app

### **Botão "Instalar" não aparece?**
- Certifique-se que está em **HTTPS** (Netlify já é)
- Recarregue a página (Ctrl+F5)
- Teste em outro navegador

### **App não abre offline?**
- Primeiro acesso precisa estar online
- Depois funciona offline automaticamente
- Se não funcionar, reinstale

---

## 🎯 **PRÓXIMOS PASSOS:**

1. ✅ Faça upload no Netlify
2. ✅ Teste no celular
3. ✅ Instale o app
4. ✅ Ative notificações
5. ✅ Compartilhe o link com a equipe!

---

## 💡 **DICA PROFISSIONAL:**

Crie um **QR Code** do link do painel:
1. Acesse: https://qr-code-generator.com
2. Cole: `https://burgerpdv.netlify.app/painel-pedidos.html`
3. Baixe o QR Code
4. Cole na cozinha/balcão
5. Equipe escaneia e instala! 📱

---

**🍔 GO BURGER - Sistema Profissional v2.0**
