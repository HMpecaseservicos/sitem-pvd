# Script para iniciar servidor local - GO BURGER PWA
# Execute este arquivo para testar o painel localmente

Write-Host "`n=== 🍔 GO BURGER - Servidor Local ===" -ForegroundColor Green
Write-Host ""

# Verificar se Python está instalado
$pythonInstalled = $false
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python") {
        $pythonInstalled = $true
        Write-Host "✅ Python detectado: $pythonVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Python não encontrado" -ForegroundColor Red
}

# Verificar se Node.js está instalado
$nodeInstalled = $false
try {
    $nodeVersion = node --version 2>&1
    if ($nodeVersion) {
        $nodeInstalled = $true
        Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Node.js não encontrado" -ForegroundColor Red
}

Write-Host ""

if ($pythonInstalled) {
    Write-Host "🚀 Iniciando servidor Python na porta 8000..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📱 Acesse no navegador:" -ForegroundColor Yellow
    Write-Host "   http://localhost:8000/painel-pedidos.html" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Para testar PWA no celular:" -ForegroundColor Yellow
    Write-Host "   1. Descubra seu IP: ipconfig" -ForegroundColor White
    Write-Host "   2. Acesse: http://SEU-IP:8000/painel-pedidos.html" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  Para parar o servidor: Ctrl+C" -ForegroundColor Red
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Iniciar servidor Python
    python -m http.server 8000
    
} elseif ($nodeInstalled) {
    Write-Host "🚀 Instalando http-server..." -ForegroundColor Cyan
    npm install -g http-server
    
    Write-Host ""
    Write-Host "🚀 Iniciando servidor Node.js na porta 8000..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📱 Acesse no navegador:" -ForegroundColor Yellow
    Write-Host "   http://localhost:8000/painel-pedidos.html" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  Para parar o servidor: Ctrl+C" -ForegroundColor Red
    Write-Host ""
    
    # Iniciar servidor Node
    http-server -p 8000
    
} else {
    Write-Host ""
    Write-Host "❌ Nenhum servidor disponível!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📦 Instale uma das opções:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opção 1 - Python:" -ForegroundColor Cyan
    Write-Host "   Download: https://www.python.org/downloads/" -ForegroundColor White
    Write-Host ""
    Write-Host "Opção 2 - Node.js:" -ForegroundColor Cyan
    Write-Host "   Download: https://nodejs.org/" -ForegroundColor White
    Write-Host ""
    Write-Host "Opção 3 - VS Code Live Server:" -ForegroundColor Cyan
    Write-Host "   Instale a extensão 'Live Server' no VS Code" -ForegroundColor White
    Write-Host ""
    Write-Host "Opção 4 - MELHOR - Teste no Netlify:" -ForegroundColor Green
    Write-Host "   https://burgerpdv.netlify.app/painel-pedidos.html" -ForegroundColor White
    Write-Host ""
    
    # Tentar abrir o Netlify
    $resposta = Read-Host "Abrir Netlify agora? (S/N)"
    if ($resposta -eq "S" -or $resposta -eq "s") {
        Start-Process "https://burgerpdv.netlify.app/painel-pedidos.html"
    }
}

Write-Host ""
Read-Host "Pressione Enter para sair"
