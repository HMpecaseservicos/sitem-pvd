/**
 * CONSULTOR FINANCEIRO
 * Fornece recomendações estratégicas e insights baseados em análise de dados
 */

import { formatCurrency } from '../shared/utils.js';

export class FinancialConsultant {
    constructor(transactions, bills, debts) {
        this.transactions = transactions;
        this.bills = bills;
        this.debts = debts;
    }

    /**
     * Gera diagnóstico completo da situação financeira
     */
    generateDiagnosis() {
        const kpis = this.calculateBasicKPIs();
        const healthScore = this.calculateHealthScore(kpis);
        const risks = this.identifyRisks(kpis);
        const opportunities = this.identifyOpportunities(kpis);
        
        return {
            score: healthScore,
            status: this.getStatusFromScore(healthScore),
            kpis,
            risks,
            opportunities,
            recommendations: this.generateRecommendations(healthScore, risks, opportunities)
        };
    }

    /**
     * KPIs básicos para análise
     */
    calculateBasicKPIs() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const monthlyTransactions = this.transactions.filter(t => 
            new Date(t.date) >= startOfMonth
        );
        
        const income = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const pendingBills = this.bills
            .filter(b => b.status !== 'paid')
            .reduce((sum, b) => sum + (b.remainingAmount || b.amount), 0);
        
        const overdueBills = this.bills
            .filter(b => b.status === 'overdue')
            .reduce((sum, b) => sum + (b.remainingAmount || b.amount), 0);
        
        const totalDebts = this.debts
            .filter(d => d.status !== 'paid')
            .reduce((sum, d) => sum + (d.remainingAmount || d.originalAmount || 0), 0);
        
        const criticalBills = this.bills.filter(b => 
            b.priority === 'CRITICA' && b.status !== 'paid'
        ).length;
        
        return {
            income,
            expenses,
            profit: income - expenses,
            profitMargin: income > 0 ? ((income - expenses) / income) * 100 : 0,
            pendingBills,
            overdueBills,
            totalDebts,
            criticalBills,
            cashFlow: income - expenses
        };
    }

    /**
     * Calcula score de saúde financeira (0-100)
     */
    calculateHealthScore(kpis) {
        let score = 100;
        
        // Penalizações
        if (kpis.overdueBills > 0) score -= 25;
        if (kpis.criticalBills > 0) score -= 15;
        if (kpis.cashFlow < 0) score -= 20;
        if (kpis.totalDebts > kpis.income * 2) score -= 20;
        if (kpis.profitMargin < 15) score -= 10;
        if (kpis.expenses > kpis.income * 0.8) score -= 10;
        
        return Math.max(0, Math.min(100, score));
    }

    getStatusFromScore(score) {
        if (score >= 85) return { level: 'excellent', label: 'Excelente', emoji: '💚', color: '#28a745' };
        if (score >= 70) return { level: 'good', label: 'Boa', emoji: '🟢', color: '#5cb85c' };
        if (score >= 50) return { level: 'warning', label: 'Atenção', emoji: '🟡', color: '#ffc107' };
        if (score >= 30) return { level: 'critical', label: 'Crítica', emoji: '🟠', color: '#fd7e14' };
        return { level: 'danger', label: 'Grave', emoji: '🔴', color: '#dc3545' };
    }

    /**
     * Identifica riscos financeiros
     */
    identifyRisks(kpis) {
        const risks = [];
        
        // Risco de liquidez
        if (kpis.cashFlow < 0) {
            risks.push({
                level: 'high',
                category: 'Liquidez',
                title: 'Fluxo de Caixa Negativo',
                description: `Suas despesas (${formatCurrency(kpis.expenses)}) excedem suas receitas (${formatCurrency(kpis.income)})`,
                impact: 'Alto impacto na capacidade de honrar compromissos',
                action: 'Reduzir custos operacionais ou aumentar receitas urgentemente'
            });
        }
        
        // Risco de inadimplência
        if (kpis.overdueBills > 0) {
            risks.push({
                level: 'critical',
                category: 'Inadimplência',
                title: 'Contas Atrasadas',
                description: `Você possui ${formatCurrency(kpis.overdueBills)} em contas vencidas`,
                impact: 'Risco de multas, juros e restrições de crédito',
                action: 'Priorizar pagamento das contas vencidas imediatamente'
            });
        }
        
        // Risco de endividamento
        if (kpis.totalDebts > kpis.income * 2) {
            risks.push({
                level: 'high',
                category: 'Endividamento',
                title: 'Endividamento Elevado',
                description: `Total de dívidas (${formatCurrency(kpis.totalDebts)}) é superior a 2x sua receita mensal`,
                impact: 'Dificulta crescimento e compromete sustentabilidade',
                action: 'Renegociar dívidas e criar plano de quitação agressivo'
            });
        }
        
        // Risco de rentabilidade
        if (kpis.profitMargin < 10) {
            risks.push({
                level: 'medium',
                category: 'Rentabilidade',
                title: 'Margem de Lucro Baixa',
                description: `Margem de apenas ${kpis.profitMargin.toFixed(1)}% - abaixo do ideal (>15%)`,
                impact: 'Pouca margem para absorver imprevistos',
                action: 'Revisar precificação e otimizar custos operacionais'
            });
        }
        
        // Risco de contas críticas
        if (kpis.criticalBills > 0) {
            risks.push({
                level: 'high',
                category: 'Operacional',
                title: 'Contas Críticas Pendentes',
                description: `${kpis.criticalBills} contas de prioridade CRÍTICA aguardando pagamento`,
                impact: 'Risco de interrupção operacional (aluguel, fornecedores, etc)',
                action: 'Garantir pagamento das contas críticas antes de qualquer outra despesa'
            });
        }
        
        return risks;
    }

    /**
     * Identifica oportunidades de melhoria
     */
    identifyOpportunities(kpis) {
        const opportunities = [];
        
        // Oportunidade de crescimento
        if (kpis.profitMargin > 25 && kpis.cashFlow > 0) {
            opportunities.push({
                category: 'Crescimento',
                title: 'Momento Favorável para Investir',
                description: 'Margem de lucro saudável e fluxo de caixa positivo',
                benefit: 'Expandir operações, contratar, ou melhorar infraestrutura',
                action: 'Planejar investimentos estratégicos para acelerar crescimento'
            });
        }
        
        // Oportunidade de otimização
        if (kpis.expenses > kpis.income * 0.7 && kpis.expenses < kpis.income * 0.85) {
            opportunities.push({
                category: 'Eficiência',
                title: 'Potencial de Redução de Custos',
                description: 'Custos operacionais em 70-85% da receita',
                benefit: 'Cada 1% de redução aumenta lucro significativamente',
                action: 'Auditar despesas e eliminar gastos desnecessários'
            });
        }
        
        // Oportunidade de precificação
        if (kpis.profitMargin < 20 && kpis.profitMargin > 10) {
            opportunities.push({
                category: 'Precificação',
                title: 'Revisar Estratégia de Preços',
                description: 'Margem moderada permite ajuste sem perder competitividade',
                benefit: 'Aumento de 5-10% nos preços pode dobrar margem de lucro',
                action: 'Analisar preços da concorrência e testar reajuste gradual'
            });
        }
        
        // Oportunidade de quitação de dívidas
        if (kpis.totalDebts > 0 && kpis.cashFlow > kpis.totalDebts * 0.1) {
            opportunities.push({
                category: 'Desendividamento',
                title: 'Capacidade de Quitar Dívidas',
                description: 'Fluxo de caixa permite quitação acelerada',
                benefit: 'Reduzir juros e melhorar score de crédito',
                action: 'Destinar 20-30% do lucro mensal para quitação antecipada'
            });
        }
        
        // Oportunidade de reserva
        if (kpis.cashFlow > 0 && kpis.overdueBills === 0) {
            opportunities.push({
                category: 'Planejamento',
                title: 'Construir Reserva de Emergência',
                description: 'Situação estável permite criar colchão financeiro',
                benefit: 'Proteção contra imprevistos e oportunidades de negociação',
                action: 'Reservar 10-15% do lucro mensal como fundo de emergência'
            });
        }
        
        return opportunities;
    }

    /**
     * Gera recomendações personalizadas
     */
    generateRecommendations(score, risks, opportunities) {
        const recommendations = [];
        
        // Recomendações baseadas em score
        if (score < 50) {
            recommendations.push({
                priority: 'URGENTE',
                title: '🚨 Ação Imediata Necessária',
                actions: [
                    'Suspender todos os gastos não essenciais',
                    'Renegociar prazos com fornecedores',
                    'Buscar linhas de crédito emergenciais',
                    'Implementar plano de recuperação em 30 dias'
                ]
            });
        } else if (score < 70) {
            recommendations.push({
                priority: 'IMPORTANTE',
                title: '⚠️ Ajustes Necessários',
                actions: [
                    'Revisar e cortar 15-20% dos custos operacionais',
                    'Aumentar foco em produtos/serviços mais lucrativos',
                    'Criar plano de quitação de dívidas em 90 dias',
                    'Implementar controle rigoroso de despesas'
                ]
            });
        } else if (score < 85) {
            recommendations.push({
                priority: 'MELHORIAS',
                title: '✅ Otimizar Resultados',
                actions: [
                    'Buscar oportunidades de aumento de receita',
                    'Negociar melhores condições com fornecedores',
                    'Investir em marketing e aquisição de clientes',
                    'Construir reserva de 3 meses de despesas'
                ]
            });
        } else {
            recommendations.push({
                priority: 'CRESCIMENTO',
                title: '🚀 Acelerar Expansão',
                actions: [
                    'Explorar novos mercados ou linhas de produto',
                    'Investir em automação e tecnologia',
                    'Contratar talentos-chave para crescimento',
                    'Avaliar oportunidades de financiamento para expansão'
                ]
            });
        }
        
        // Recomendações específicas baseadas em riscos
        risks.forEach(risk => {
            if (risk.level === 'critical' || risk.level === 'high') {
                recommendations.push({
                    priority: 'ATENÇÃO',
                    title: `${risk.category}: ${risk.title}`,
                    actions: [risk.action]
                });
            }
        });
        
        // Recomendações de oportunidades
        if (opportunities.length > 0 && score >= 70) {
            recommendations.push({
                priority: 'OPORTUNIDADES',
                title: '💡 Aproveitar Momento Favorável',
                actions: opportunities.slice(0, 3).map(opp => opp.action)
            });
        }
        
        return recommendations;
    }

    /**
     * Gera projeções de curto prazo (3 meses)
     */
    generateProjections() {
        const kpis = this.calculateBasicKPIs();
        const avgMonthlyGrowth = 0.05; // 5% de crescimento estimado
        
        const projections = [];
        for (let month = 1; month <= 3; month++) {
            const projectedIncome = kpis.income * Math.pow(1 + avgMonthlyGrowth, month);
            const projectedExpenses = kpis.expenses * Math.pow(1.02, month); // 2% de aumento de custos
            
            projections.push({
                month,
                income: projectedIncome,
                expenses: projectedExpenses,
                profit: projectedIncome - projectedExpenses,
                profitMargin: ((projectedIncome - projectedExpenses) / projectedIncome) * 100
            });
        }
        
        return projections;
    }

    /**
     * Analisa sazonalidade nas transações
     */
    analyzeSeasonality() {
        // Agrupar transações por mês
        const monthlyData = {};
        
        this.transactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { income: 0, expenses: 0, count: 0 };
            }
            
            if (t.type === 'income') {
                monthlyData[monthKey].income += t.amount;
            } else {
                monthlyData[monthKey].expenses += t.amount;
            }
            monthlyData[monthKey].count++;
        });
        
        // Identificar padrões
        const months = Object.keys(monthlyData).sort();
        if (months.length < 3) {
            return {
                hasEnoughData: false,
                message: 'Dados insuficientes para análise de sazonalidade (mínimo 3 meses)'
            };
        }
        
        return {
            hasEnoughData: true,
            months: monthlyData,
            trend: this.calculateTrend(monthlyData),
            bestMonth: this.findBestMonth(monthlyData),
            worstMonth: this.findWorstMonth(monthlyData)
        };
    }

    calculateTrend(monthlyData) {
        const months = Object.keys(monthlyData).sort();
        const revenues = months.map(m => monthlyData[m].income);
        
        if (revenues.length < 2) return 'stable';
        
        const lastMonth = revenues[revenues.length - 1];
        const previousMonth = revenues[revenues.length - 2];
        
        if (lastMonth > previousMonth * 1.1) return 'growing';
        if (lastMonth < previousMonth * 0.9) return 'declining';
        return 'stable';
    }

    findBestMonth(monthlyData) {
        let bestMonth = null;
        let bestProfit = -Infinity;
        
        Object.keys(monthlyData).forEach(month => {
            const profit = monthlyData[month].income - monthlyData[month].expenses;
            if (profit > bestProfit) {
                bestProfit = profit;
                bestMonth = month;
            }
        });
        
        return { month: bestMonth, profit: bestProfit };
    }

    findWorstMonth(monthlyData) {
        let worstMonth = null;
        let worstProfit = Infinity;
        
        Object.keys(monthlyData).forEach(month => {
            const profit = monthlyData[month].income - monthlyData[month].expenses;
            if (profit < worstProfit) {
                worstProfit = profit;
                worstMonth = month;
            }
        });
        
        return { month: worstMonth, profit: worstProfit };
    }
}
