/**
 * CONTADOR DIGITAL
 * Demonstrativos contábeis, balanço patrimonial e DRE
 */

import { formatCurrency, formatDate } from '../shared/utils.js';

export class Accountant {
    constructor(transactions, bills, debts) {
        this.transactions = transactions;
        this.bills = bills;
        this.debts = debts;
    }

    /**
     * Gera DRE (Demonstração do Resultado do Exercício)
     */
    generateDRE(period = 'month') {
        const data = this.getDataForPeriod(period);
        
        // Receitas
        const revenues = this.calculateRevenues(data.transactions);
        
        // Custos e Despesas
        const costs = this.calculateCosts(data.transactions);
        const operationalExpenses = this.calculateOperationalExpenses(data.transactions);
        
        // Lucros
        const grossProfit = revenues.total - costs.total;
        const ebitda = grossProfit - operationalExpenses.total;
        const netProfit = ebitda; // Simplificado (sem impostos/juros/depreciação)
        
        return {
            period: this.getPeriodLabel(period),
            revenues: {
                ...revenues,
                percentOfTotal: 100
            },
            costs: {
                ...costs,
                percentOfRevenue: revenues.total > 0 ? (costs.total / revenues.total) * 100 : 0
            },
            grossProfit: {
                value: grossProfit,
                margin: revenues.total > 0 ? (grossProfit / revenues.total) * 100 : 0
            },
            operationalExpenses: {
                ...operationalExpenses,
                percentOfRevenue: revenues.total > 0 ? (operationalExpenses.total / revenues.total) * 100 : 0
            },
            ebitda: {
                value: ebitda,
                margin: revenues.total > 0 ? (ebitda / revenues.total) * 100 : 0
            },
            netProfit: {
                value: netProfit,
                margin: revenues.total > 0 ? (netProfit / revenues.total) * 100 : 0
            },
            summary: this.generateDRESummary(netProfit, revenues.total)
        };
    }

    /**
     * Calcula receitas por categoria
     */
    calculateRevenues(transactions) {
        const revenues = transactions.filter(t => t.type === 'income');
        const byCategory = {};
        
        revenues.forEach(t => {
            if (!byCategory[t.category]) {
                byCategory[t.category] = 0;
            }
            byCategory[t.category] += t.amount;
        });
        
        return {
            total: revenues.reduce((sum, t) => sum + t.amount, 0),
            count: revenues.length,
            byCategory
        };
    }

    /**
     * Calcula custos (CMV - Custo de Mercadoria Vendida)
     */
    calculateCosts(transactions) {
        const costCategories = ['Insumos', 'Fornecedores', 'Matéria-prima'];
        const costs = transactions.filter(t => 
            t.type === 'expense' && costCategories.includes(t.category)
        );
        
        const byCategory = {};
        costs.forEach(t => {
            if (!byCategory[t.category]) {
                byCategory[t.category] = 0;
            }
            byCategory[t.category] += t.amount;
        });
        
        return {
            total: costs.reduce((sum, t) => sum + t.amount, 0),
            count: costs.length,
            byCategory
        };
    }

    /**
     * Calcula despesas operacionais
     */
    calculateOperationalExpenses(transactions) {
        const expenseCategories = [
            'Aluguel', 'Água/Luz/Gás', 'Funcionários', 'Marketing',
            'Manutenção', 'Impostos', 'Melhorias'
        ];
        
        const expenses = transactions.filter(t => 
            t.type === 'expense' && expenseCategories.includes(t.category)
        );
        
        const byCategory = {};
        expenses.forEach(t => {
            if (!byCategory[t.category]) {
                byCategory[t.category] = 0;
            }
            byCategory[t.category] += t.amount;
        });
        
        return {
            total: expenses.reduce((sum, t) => sum + t.amount, 0),
            count: expenses.length,
            byCategory
        };
    }

    /**
     * Gera resumo da DRE
     */
    generateDRESummary(netProfit, revenue) {
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
        
        let status = 'healthy';
        let message = '';
        
        if (netProfit < 0) {
            status = 'critical';
            message = 'Prejuízo no período - ação imediata necessária';
        } else if (margin < 5) {
            status = 'warning';
            message = 'Margem muito baixa - revisar custos e preços';
        } else if (margin < 15) {
            status = 'moderate';
            message = 'Margem adequada mas com espaço para melhoria';
        } else {
            status = 'excellent';
            message = 'Excelente rentabilidade';
        }
        
        return { status, margin, message };
    }

    /**
     * Gera Balanço Patrimonial Simplificado
     */
    generateBalanceSheet() {
        // ATIVO
        const cash = 10000; // Simplificado - deveria vir do sistema
        const accountsReceivable = 0; // Contas a receber
        const inventory = 0; // Estoque
        const currentAssets = cash + accountsReceivable + inventory;
        
        const fixedAssets = 50000; // Equipamentos, móveis - simplificado
        const totalAssets = currentAssets + fixedAssets;
        
        // PASSIVO
        const accountsPayable = this.bills
            .filter(b => b.status !== 'paid')
            .reduce((sum, b) => sum + (b.remainingAmount || b.amount), 0);
        
        const shortTermDebts = this.debts
            .filter(d => {
                const dueDate = new Date(d.dueDate);
                const threeMonthsLater = new Date();
                threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
                return d.status !== 'paid' && dueDate <= threeMonthsLater;
            })
            .reduce((sum, d) => sum + (d.remainingAmount || d.originalAmount || 0), 0);
        
        const currentLiabilities = accountsPayable + shortTermDebts;
        
        const longTermDebts = this.debts
            .filter(d => {
                const dueDate = new Date(d.dueDate);
                const threeMonthsLater = new Date();
                threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
                return d.status !== 'paid' && dueDate > threeMonthsLater;
            })
            .reduce((sum, d) => sum + (d.remainingAmount || d.originalAmount || 0), 0);
        
        const totalLiabilities = currentLiabilities + longTermDebts;
        
        // PATRIMÔNIO LÍQUIDO
        const equity = totalAssets - totalLiabilities;
        
        return {
            assets: {
                current: {
                    cash,
                    accountsReceivable,
                    inventory,
                    total: currentAssets
                },
                fixed: {
                    equipment: fixedAssets,
                    total: fixedAssets
                },
                total: totalAssets
            },
            liabilities: {
                current: {
                    accountsPayable,
                    shortTermDebts,
                    total: currentLiabilities
                },
                longTerm: {
                    debts: longTermDebts,
                    total: longTermDebts
                },
                total: totalLiabilities
            },
            equity: {
                capital: equity,
                total: equity
            },
            ratios: {
                currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 999,
                debtToAssets: totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0,
                debtToEquity: equity > 0 ? (totalLiabilities / equity) * 100 : 0,
                workingCapital: currentAssets - currentLiabilities
            },
            analysis: this.analyzeBalanceSheet(currentAssets, currentLiabilities, totalLiabilities, equity)
        };
    }

    /**
     * Analisa saúde do balanço
     */
    analyzeBalanceSheet(currentAssets, currentLiabilities, totalLiabilities, equity) {
        const insights = [];
        
        // Análise de liquidez
        const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 999;
        if (currentRatio < 1) {
            insights.push({
                type: 'warning',
                area: 'Liquidez',
                message: 'Liquidez corrente abaixo de 1.0 - dificuldade em honrar compromissos de curto prazo'
            });
        } else if (currentRatio > 2) {
            insights.push({
                type: 'success',
                area: 'Liquidez',
                message: 'Excelente liquidez corrente - boa capacidade de pagamento'
            });
        }
        
        // Análise de endividamento
        const debtToEquity = equity > 0 ? (totalLiabilities / equity) * 100 : 0;
        if (debtToEquity > 150) {
            insights.push({
                type: 'danger',
                area: 'Endividamento',
                message: 'Endividamento elevado em relação ao patrimônio - risco financeiro alto'
            });
        } else if (debtToEquity < 50) {
            insights.push({
                type: 'success',
                area: 'Endividamento',
                message: 'Endividamento saudável - boa estrutura de capital'
            });
        }
        
        // Análise de patrimônio
        if (equity < 0) {
            insights.push({
                type: 'critical',
                area: 'Patrimônio',
                message: 'Patrimônio líquido negativo - empresa tecnicamente insolvente'
            });
        } else if (equity > 100000) {
            insights.push({
                type: 'success',
                area: 'Patrimônio',
                message: 'Patrimônio líquido robusto - boa saúde financeira'
            });
        }
        
        return insights;
    }

    /**
     * Gera Fluxo de Caixa
     */
    generateCashFlow(period = 'month') {
        const data = this.getDataForPeriod(period);
        
        const operatingCash = this.calculateOperatingCashFlow(data.transactions);
        const investingCash = this.calculateInvestingCashFlow(data.transactions);
        const financingCash = this.calculateFinancingCashFlow(data.transactions, data.debts);
        
        const netCashFlow = operatingCash.total + investingCash.total + financingCash.total;
        
        return {
            period: this.getPeriodLabel(period),
            operating: operatingCash,
            investing: investingCash,
            financing: financingCash,
            netCashFlow,
            analysis: this.analyzeCashFlow(operatingCash.total, investingCash.total, financingCash.total)
        };
    }

    calculateOperatingCashFlow(transactions) {
        const operating = transactions.filter(t => 
            !['Investimento', 'Empréstimo', 'Financiamento'].includes(t.category)
        );
        
        const inflows = operating.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const outflows = operating.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        return {
            inflows,
            outflows,
            total: inflows - outflows
        };
    }

    calculateInvestingCashFlow(transactions) {
        const investing = transactions.filter(t => t.category === 'Investimento');
        
        const inflows = investing.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const outflows = investing.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        return {
            inflows,
            outflows,
            total: inflows - outflows
        };
    }

    calculateFinancingCashFlow(transactions, debts) {
        const financing = transactions.filter(t => 
            ['Empréstimo', 'Financiamento'].includes(t.category)
        );
        
        const inflows = financing.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        
        // Pagamentos de dívidas
        const debtPayments = debts
            .filter(d => d.payments && d.payments.length > 0)
            .reduce((sum, d) => {
                const periodPayments = d.payments.filter(p => {
                    // Filtrar por período - simplificado
                    return true;
                });
                return sum + periodPayments.reduce((s, p) => s + p.amount, 0);
            }, 0);
        
        return {
            inflows,
            outflows: debtPayments,
            total: inflows - debtPayments
        };
    }

    analyzeCashFlow(operating, investing, financing) {
        const insights = [];
        
        if (operating > 0) {
            insights.push({
                type: 'success',
                message: 'Operação gerando caixa positivo - sinal de saúde operacional'
            });
        } else {
            insights.push({
                type: 'warning',
                message: 'Operação consumindo caixa - revisar rentabilidade'
            });
        }
        
        if (investing < 0) {
            insights.push({
                type: 'info',
                message: 'Investimentos sendo realizados - crescimento em andamento'
            });
        }
        
        if (financing > 0) {
            insights.push({
                type: 'info',
                message: 'Captação de recursos externos - monitore níveis de endividamento'
            });
        } else if (financing < 0) {
            insights.push({
                type: 'success',
                message: 'Pagando dívidas - redução de passivos'
            });
        }
        
        return insights;
    }

    /**
     * Utilitários
     */
    getDataForPeriod(period) {
        const now = new Date();
        let startDate;
        
        switch(period) {
            case 'day':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        return {
            transactions: this.transactions.filter(t => new Date(t.date) >= startDate),
            bills: this.bills.filter(b => new Date(b.dueDate) >= startDate),
            debts: this.debts.filter(d => new Date(d.dueDate) >= startDate)
        };
    }

    getPeriodLabel(period) {
        const labels = {
            day: 'Hoje',
            week: 'Última Semana',
            month: 'Mês Atual',
            quarter: 'Trimestre Atual',
            year: 'Ano Atual'
        };
        return labels[period] || 'Período';
    }
}
