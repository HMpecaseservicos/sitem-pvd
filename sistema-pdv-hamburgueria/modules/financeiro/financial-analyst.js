/**
 * ANALISTA FINANCEIRO
 * Análise avançada de métricas, KPIs e indicadores financeiros
 */

import { formatCurrency, formatDate } from '../shared/utils.js';

export class FinancialAnalyst {
    constructor(transactions, bills, debts) {
        this.transactions = transactions;
        this.bills = bills;
        this.debts = debts;
    }

    /**
     * Calcula todos os KPIs financeiros
     */
    calculateKPIs(period = 'month') {
        const data = this.getDataForPeriod(period);
        
        return {
            // KPIs Básicos
            totalRevenue: this.getTotalRevenue(data.transactions),
            totalExpenses: this.getTotalExpenses(data.transactions),
            netProfit: this.getNetProfit(data.transactions),
            profitMargin: this.getProfitMargin(data.transactions),
            
            // KPIs de Liquidez
            cashFlow: this.getCashFlow(data.transactions),
            workingCapital: this.getWorkingCapital(data.bills, data.debts),
            currentRatio: this.getCurrentRatio(data.bills, data.debts),
            quickRatio: this.getQuickRatio(data.bills, data.debts),
            
            // KPIs de Eficiência
            operatingExpenseRatio: this.getOperatingExpenseRatio(data.transactions),
            burnRate: this.getBurnRate(data.transactions),
            runway: this.getRunway(data.transactions),
            
            // KPIs de Endividamento
            debtToEquity: this.getDebtToEquity(data.debts, data.transactions),
            debtServiceCoverageRatio: this.getDebtServiceCoverageRatio(data.transactions, data.debts),
            
            // KPIs de Crescimento
            revenueGrowth: this.getRevenueGrowth(period),
            expenseGrowth: this.getExpenseGrowth(period),
            
            // KPIs Operacionais
            averageTicket: this.getAverageTicket(data.transactions),
            transactionCount: this.getTransactionCount(data.transactions),
            categorySplit: this.getCategorySplit(data.transactions)
        };
    }

    /**
     * Obtém dados para o período especificado
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

    // ==================== MÉTODOS DE CÁLCULO ====================
    
    getTotalRevenue(transactions) {
        return transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
    }
    
    getTotalExpenses(transactions) {
        return transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
    }
    
    getNetProfit(transactions) {
        return this.getTotalRevenue(transactions) - this.getTotalExpenses(transactions);
    }
    
    getProfitMargin(transactions) {
        const revenue = this.getTotalRevenue(transactions);
        if (revenue === 0) return 0;
        return (this.getNetProfit(transactions) / revenue) * 100;
    }
    
    getCashFlow(transactions) {
        return this.getNetProfit(transactions);
    }
    
    getWorkingCapital(bills, debts) {
        const currentAssets = 0; // Simplificado - normalmente seria caixa + contas a receber
        const currentLiabilities = bills
            .filter(b => b.status !== 'paid')
            .reduce((sum, b) => sum + (b.remainingAmount || b.amount), 0);
        return currentAssets - currentLiabilities;
    }
    
    getCurrentRatio(bills, debts) {
        const currentLiabilities = bills
            .filter(b => b.status !== 'paid')
            .reduce((sum, b) => sum + (b.remainingAmount || b.amount), 0);
        if (currentLiabilities === 0) return 100;
        return (1000 / currentLiabilities) * 100; // Simplificado
    }
    
    getQuickRatio(bills, debts) {
        return this.getCurrentRatio(bills, debts); // Simplificado
    }
    
    getOperatingExpenseRatio(transactions) {
        const revenue = this.getTotalRevenue(transactions);
        if (revenue === 0) return 0;
        const expenses = this.getTotalExpenses(transactions);
        return (expenses / revenue) * 100;
    }
    
    getBurnRate(transactions) {
        const expenses = this.getTotalExpenses(transactions);
        const revenue = this.getTotalRevenue(transactions);
        return Math.max(0, expenses - revenue);
    }
    
    getRunway(transactions) {
        const burnRate = this.getBurnRate(transactions);
        if (burnRate === 0) return Infinity;
        const cash = 10000; // Simplificado - normalmente viria do balanço
        return Math.floor(cash / burnRate);
    }
    
    getDebtToEquity(debts, transactions) {
        const totalDebt = debts
            .filter(d => d.status !== 'paid')
            .reduce((sum, d) => sum + (d.remainingAmount || d.originalAmount || 0), 0);
        const equity = this.getNetProfit(transactions);
        if (equity === 0) return 0;
        return (totalDebt / equity) * 100;
    }
    
    getDebtServiceCoverageRatio(transactions, debts) {
        const netProfit = this.getNetProfit(transactions);
        const debtPayments = debts
            .filter(d => d.payments && d.payments.length > 0)
            .reduce((sum, d) => {
                return sum + d.payments.reduce((s, p) => s + p.amount, 0);
            }, 0);
        if (debtPayments === 0) return 100;
        return (netProfit / debtPayments) * 100;
    }
    
    getRevenueGrowth(period) {
        // Calcular crescimento REAL comparando período atual com anterior
        const current = this.getDataForPeriod(period);
        const previous = this.getPreviousPeriodData(period);
        
        const currentRevenue = this.getTotalRevenue(current.transactions);
        const previousRevenue = this.getTotalRevenue(previous.transactions);
        
        return this.calculateGrowth(currentRevenue, previousRevenue);
    }
    
    getExpenseGrowth(period) {
        // Calcular crescimento REAL de despesas
        const current = this.getDataForPeriod(period);
        const previous = this.getPreviousPeriodData(period);
        
        const currentExpenses = this.getTotalExpenses(current.transactions);
        const previousExpenses = this.getTotalExpenses(previous.transactions);
        
        return this.calculateGrowth(currentExpenses, previousExpenses);
    }
    
    /**
     * Obtém dados do período anterior
     */
    getPreviousPeriodData(period) {
        const now = new Date();
        let startDate, endDate;
        
        switch(period) {
            case 'day':
                endDate = new Date(now);
                endDate.setDate(endDate.getDate() - 1);
                startDate = new Date(endDate);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                endDate = new Date(now);
                endDate.setDate(endDate.getDate() - 7);
                startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Último dia do mês anterior
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Primeiro dia do mês anterior
                break;
            case 'quarter':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                endDate = new Date(now.getFullYear(), currentQuarter * 3, 0);
                startDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
                break;
            case 'year':
                endDate = new Date(now.getFullYear() - 1, 11, 31);
                startDate = new Date(now.getFullYear() - 1, 0, 1);
                break;
            default:
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        }
        
        return {
            transactions: this.transactions.filter(t => {
                const date = new Date(t.date);
                return date >= startDate && date <= endDate;
            }),
            bills: this.bills.filter(b => {
                const date = new Date(b.dueDate);
                return date >= startDate && date <= endDate;
            }),
            debts: this.debts.filter(d => {
                const date = new Date(d.dueDate);
                return date >= startDate && date <= endDate;
            })
        };
    }
    
    getAverageTicket(transactions) {
        const revenues = transactions.filter(t => t.type === 'income');
        if (revenues.length === 0) return 0;
        return this.getTotalRevenue(transactions) / revenues.length;
    }
    
    getTransactionCount(transactions) {
        return {
            total: transactions.length,
            income: transactions.filter(t => t.type === 'income').length,
            expense: transactions.filter(t => t.type === 'expense').length
        };
    }
    
    getCategorySplit(transactions) {
        const split = {};
        transactions.forEach(t => {
            if (!split[t.category]) {
                split[t.category] = { count: 0, amount: 0 };
            }
            split[t.category].count++;
            split[t.category].amount += t.amount;
        });
        return split;
    }

    /**
     * Gera análise comparativa entre períodos
     */
    generateComparative(currentPeriod, previousPeriod) {
        const current = this.calculateKPIs(currentPeriod);
        const previous = this.calculateKPIs(previousPeriod);
        
        return {
            revenue: {
                current: current.totalRevenue,
                previous: previous.totalRevenue,
                growth: this.calculateGrowth(current.totalRevenue, previous.totalRevenue)
            },
            expenses: {
                current: current.totalExpenses,
                previous: previous.totalExpenses,
                growth: this.calculateGrowth(current.totalExpenses, previous.totalExpenses)
            },
            profit: {
                current: current.netProfit,
                previous: previous.netProfit,
                growth: this.calculateGrowth(current.netProfit, previous.netProfit)
            },
            profitMargin: {
                current: current.profitMargin,
                previous: previous.profitMargin,
                growth: current.profitMargin - previous.profitMargin
            }
        };
    }

    calculateGrowth(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }

    /**
     * Identifica tendências nos dados
     */
    identifyTrends() {
        const trends = [];
        
        const kpis = this.calculateKPIs('month');
        
        // Análise de lucratividade
        if (kpis.profitMargin < 10) {
            trends.push({
                type: 'warning',
                category: 'Lucratividade',
                message: 'Margem de lucro abaixo de 10% - considere revisar preços ou reduzir custos'
            });
        } else if (kpis.profitMargin > 30) {
            trends.push({
                type: 'success',
                category: 'Lucratividade',
                message: 'Excelente margem de lucro acima de 30%'
            });
        }
        
        // Análise de endividamento
        if (kpis.debtToEquity > 100) {
            trends.push({
                type: 'danger',
                category: 'Endividamento',
                message: 'Nível de endividamento elevado - priorize quitação de dívidas'
            });
        }
        
        // Análise de liquidez
        if (kpis.currentRatio < 100) {
            trends.push({
                type: 'warning',
                category: 'Liquidez',
                message: 'Baixa liquidez - aumente reservas de caixa'
            });
        }
        
        // Análise de crescimento
        if (kpis.revenueGrowth > 20) {
            trends.push({
                type: 'success',
                category: 'Crescimento',
                message: 'Crescimento acelerado de receita - momento favorável para investimentos'
            });
        }
        
        return trends;
    }
}
