# 🍔 GO BURGER - URLs de Acesso

## 📱 PAINEL DE PEDIDOS (Principal)

Após fazer o deploy no Netlify, acesse:

```
https://SEU-DOMINIO.netlify.app/painel-pedidos.html
```

**Exemplo:**
- Se seu site for `goburger.netlify.app`
- O painel será: `https://goburger.netlify.app/painel-pedidos.html`

---

## 🔗 COMO DESCOBRIR SEU DOMÍNIO NETLIFY:

### Método 1: Pelo Site Netlify
1. Acesse: https://app.netlify.com
2. Faça login
3. Clique no seu site
4. O domínio aparece no topo da página

### Método 2: Pelo Deploy Log
1. Quando você faz `git push` ou deploy
2. O Netlify mostra: `✔ Site is live at https://SEU-SITE.netlify.app`
3. Esse é seu domínio!

---

## 📋 TODAS AS PÁGINAS DISPONÍVEIS:

Substitua `SEU-DOMINIO` pelo seu domínio real:

- **Menu Principal:** `https://SEU-DOMINIO.netlify.app/menu.html`
- **Painel de Pedidos:** `https://SEU-DOMINIO.netlify.app/painel-pedidos.html`
- **Sistema PDV:** `https://SEU-DOMINIO.netlify.app/index.html`
- **Balcão:** `https://SEU-DOMINIO.netlify.app/balcao.html`
- **Login:** `https://SEU-DOMINIO.netlify.app/login.html`
- **Acompanhar Pedido:** `https://SEU-DOMINIO.netlify.app/acompanhar-pedido.html`
- **Limpar Cache:** `https://SEU-DOMINIO.netlify.app/limpar-cache-completo.html`

---

## 🚀 COMO FAZER O DEPLOY NO NETLIFY:

### Opção A: Arrastar e Soltar (Mais Fácil)
1. Acesse: https://app.netlify.com
2. Clique em "Add new site" → "Deploy manually"
3. Arraste a pasta `sistema-pdv-hamburgueria` para o Netlify
4. Aguarde o deploy
5. Netlify mostrará seu URL!

### Opção B: GitHub (Automático)
1. Suba o código para GitHub
2. No Netlify: "Add new site" → "Import from Git"
3. Conecte o repositório
4. Deploy automático!

---

## 💡 DICA RÁPIDA PARA TESTAR NO CELULAR:

Depois de descobrir seu domínio, envie este link no WhatsApp:

```
https://SEU-DOMINIO.netlify.app/painel-pedidos.html
```

Salve como favorito no navegador do celular! 📱

---

## ❗ IMPORTANTE:

Se você já fez o deploy mas o painel não abre:

1. Faça upload novamente (agora o arquivo `netlify.toml` está corrigido)
2. Ou acesse: `https://SEU-DOMINIO.netlify.app/menu.html`
3. A página de menu mostrará todos os links automaticamente!

---

## 🆘 PRECISA DE AJUDA?

Se ainda não conseguir ver o domínio:

1. Abra o terminal/PowerShell
2. Digite: `netlify status` (se tiver Netlify CLI instalado)
3. Ou verifique o último commit no GitHub
4. Ou entre em https://app.netlify.com e veja seus sites
