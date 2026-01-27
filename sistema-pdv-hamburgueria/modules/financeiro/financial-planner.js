/**
 * PLANEJADOR FINANCEIRO
 * Gestão de orçamentos, metas e planejamento estratégico
 */

import { formatCurrency, generateId } from '../shared/utils.js';

export class FinancialPlanner {
    constructor(transactions) {
        this.transactions = transactions || [];
        this.budgets = [];
        this.goals = [];
    }
    
    /**
     * Atualiza referência de transações
     */
    updateTransactions(transactions) {
        this.transactions = transactions;
        this.syncBudgetsWithTransactions();
    }
    
    /**
     * Sincroniza orçamentos com transações reais
     */
    syncBudgetsWithTransactions() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        this.budgets.forEach(budget => {
            if (budget.status !== 'active') return;
            
            // Resetar gastos do período
            budget.spent = 0;
            budget.alerts = {
                at50: false,
                at75: false,
                at90: false,
                exceeded: false
            };
            
            // Calcular gastos reais da categoria no período
            this.transactions
                .filter(t => {
                    if (t.type !== 'expense') return false;
                    if (t.category !== budget.category) return false;
                    
                    const tDate = new Date(t.date);
                    if (budget.period === 'month') {
                        return tDate.getMonth() === currentMonth && 
                               tDate.getFullYear() === currentYear;
                    }
                    return true; // Outros períodos podem ser implementados
                })
                .forEach(t => {
                    budget.spent += t.amount;
                });
            
            // Atualizar percentual
            budget.percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
            
            // Verificar alertas
            this.checkBudgetAlerts(budget);
        });
    }

    /**
     * Cria orçamento por categoria
     */
    createBudget(category, amount, period = 'month', startDate = new Date()) {
        const budget = {
            id: generateId(),
            category,
            amount,
            spent: 0,
            period, // day, week, month, quarter, year
            startDate: startDate.toISOString(),
            status: 'active',
            alerts: {
                at50: true,
                at75: true,
                at90: true,
                exceeded: false
            },
            createdAt: new Date().toISOString()
        };
        
        this.budgets.push(budget);
        return budget;
    }

    /**
     * Atualiza gasto em orçamento
     */
    updateBudgetSpending(category, amount) {
        const budget = this.budgets.find(b => 
            b.category === category && b.status === 'active'
        );
        
        if (!budget) return null;
        
        budget.spent += amount;
        budget.percentage = (budget.spent / budget.amount) * 100;
        
        // Verificar alertas
        const alerts = this.checkBudgetAlerts(budget);
        
        return { budget, alerts };
    }

    /**
     * Verifica alertas de orçamento
     */
    checkBudgetAlerts(budget) {
        const percentage = (budget.spent / budget.amount) * 100;
        const alerts = [];
        
        if (percentage >= 90 && !budget.alerts.exceeded && percentage < 100) {
            alerts.push({
                level: 'critical',
                message: `Orçamento de ${budget.category} em 90%! Restam apenas ${formatCurrency(budget.amount - budget.spent)}`
            });
            budget.alerts.at90 = true;
        } else if (percentage >= 75 && !budget.alerts.at75) {
            alerts.push({
                level: 'warning',
                message: `Orçamento de ${budget.category} atingiu 75%. Atenção aos gastos!`
            });
            budget.alerts.at75 = true;
        } else if (percentage >= 50 && !budget.alerts.at50) {
            alerts.push({
                level: 'info',
                message: `Orçamento de ${budget.category} na metade. Acompanhe os gastos.`
            });
            budget.alerts.at50 = true;
        }
        
        if (percentage >= 100 && !budget.alerts.exceeded) {
            alerts.push({
                level: 'danger',
                message: `⚠️ Orçamento de ${budget.category} EXCEDIDO! Gasto: ${formatCurrency(budget.spent)} / Limite: ${formatCurrency(budget.amount)}`
            });
            budget.alerts.exceeded = true;
        }
        
        return alerts;
    }

    /**
     * Carrega orçamentos do Firebase
     */
    async loadBudgets() {
        try {
            const { getFromDatabase } = await import('../shared/utils.js');
            const allData = await getFromDatabase('financial');
            
            if (!allData) {
                this.budgets = [];
                return [];
            }
            
            this.budgets = Object.values(allData)
                .filter(item => item.recordType === 'budget')
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return this.budgets;
        } catch (error) {
            console.error('Erro ao carregar orçamentos:', error);
            return [];
        }
    }
    
    /**
     * Salva orçamento no Firebase
     */
    async saveBudget(budget) {
        try {
            const { saveToDatabase } = await import('../shared/utils.js');
            budget.recordType = 'budget';
            await saveToDatabase('financial', budget);
            return budget;
        } catch (error) {
            console.error('Erro ao salvar orçamento:', error);
            throw error;
        }
    }
    
    /**
     * Deleta orçamento
     */
    async deleteBudget(budgetId) {
        try {
            const { deleteFromDatabase } = await import('../shared/utils.js');
            await deleteFromDatabase('financial', budgetId);
            this.budgets = this.budgets.filter(b => b.id !== budgetId);
            return true;
        } catch (error) {
            console.error('Erro ao deletar orçamento:', error);
            throw error;
        }
    }
    
    /**
     * Obtém status de todos os orçamentos
     */
    getBudgetsStatus() {
        // Sincronizar com transações antes de retornar status
        this.syncBudgetsWithTransactions();
        
        return this.budgets.map(budget => {
            const percentage = (budget.spent / budget.amount) * 100;
            const remaining = budget.amount - budget.spent;
            
            let status = 'ok';
            if (percentage >= 100) status = 'exceeded';
            else if (percentage >= 90) status = 'critical';
            else if (percentage >= 75) status = 'warning';
            
            return {
                ...budget,
                percentage,
                remaining,
                status
            };
        });
    }

    /**
     * Cria meta financeira
     */
    createGoal(name, targetAmount, deadline, category = 'geral') {
        const goal = {
            id: generateId(),
            name,
            targetAmount,
            currentAmount: 0,
            deadline: new Date(deadline).toISOString(),
            category,
            status: 'active',
            milestones: this.generateMilestones(targetAmount),
            createdAt: new Date().toISOString()
        };
        
        this.goals.push(goal);
        return goal;
    }

    /**
     * Gera marcos intermediários para meta
     */
    generateMilestones(targetAmount) {
        return [
            { percentage: 25, amount: targetAmount * 0.25, reached: false },
            { percentage: 50, amount: targetAmount * 0.5, reached: false },
            { percentage: 75, amount: targetAmount * 0.75, reached: false },
            { percentage: 100, amount: targetAmount, reached: false }
        ];
    }

    /**
     * Atualiza progresso de meta
     */
    updateGoalProgress(goalId, amount) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return null;
        
        goal.currentAmount += amount;
        const percentage = (goal.currentAmount / goal.targetAmount) * 100;
        
        // Atualizar marcos alcançados
        goal.milestones.forEach(milestone => {
            if (percentage >= milestone.percentage && !milestone.reached) {
                milestone.reached = true;
                milestone.reachedAt = new Date().toISOString();
            }
        });
        
        // Verificar se meta foi atingida
        if (percentage >= 100 && goal.status === 'active') {
            goal.status = 'completed';
            goal.completedAt = new Date().toISOString();
        }
        
        return {
            goal,
            percentage,
            remaining: goal.targetAmount - goal.currentAmount,
            daysRemaining: this.calculateDaysRemaining(goal.deadline)
        };
    }

    /**
     * Calcula dias restantes até prazo
     */
    calculateDaysRemaining(deadline) {
        const now = new Date();
        const end = new Date(deadline);
        const diff = end - now;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    /**
     * Obtém status de todas as metas
     */
    getGoalsStatus() {
        return this.goals.map(goal => {
            const percentage = (goal.currentAmount / goal.targetAmount) * 100;
            const remaining = goal.targetAmount - goal.currentAmount;
            const daysRemaining = this.calculateDaysRemaining(goal.deadline);
            
            let status = goal.status;
            if (status === 'active') {
                if (daysRemaining < 0) status = 'overdue';
                else if (percentage >= 100) status = 'completed';
                else if (daysRemaining < 7 && percentage < 75) status = 'at-risk';
            }
            
            return {
                ...goal,
                percentage,
                remaining,
                daysRemaining,
                status
            };
        });
    }

    /**
     * Gera plano de ação para atingir meta
     */
    generateActionPlan(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return null;
        
        const remaining = goal.targetAmount - goal.currentAmount;
        const daysRemaining = this.calculateDaysRemaining(goal.deadline);
        
        if (daysRemaining <= 0) {
            return {
                feasible: false,
                message: 'Prazo já vencido. Considere estender o prazo ou revisar a meta.'
            };
        }
        
        const dailyRequired = remaining / daysRemaining;
        const weeklyRequired = dailyRequired * 7;
        const monthlyRequired = dailyRequired * 30;
        
        return {
            feasible: true,
            remaining,
            daysRemaining,
            dailyRequired,
            weeklyRequired,
            monthlyRequired,
            recommendations: this.generateGoalRecommendations(dailyRequired, goal.category)
        };
    }

    /**
     * Gera recomendações para atingir meta
     */
    generateGoalRecommendations(dailyRequired, category) {
        const recommendations = [];
        
        recommendations.push(`Economize ${formatCurrency(dailyRequired)} por dia`);
        recommendations.push(`Destine receitas extras diretamente para a meta`);
        
        if (category === 'reserva') {
            recommendations.push('Automatize transferências para conta separada');
            recommendations.push('Reduza gastos supérfluos temporariamente');
        } else if (category === 'investimento') {
            recommendations.push('Busque fontes adicionais de renda');
            recommendations.push('Renegocie dívidas para liberar fluxo de caixa');
        } else if (category === 'expansao') {
            recommendations.push('Priorize produtos/serviços mais lucrativos');
            recommendations.push('Considere financiamento com parceiros');
        }
        
        return recommendations;
    }

    /**
     * Cria plano de negócios simplificado
     */
    createBusinessPlan(projectedRevenue, fixedCosts, variableCosts, investmentNeeded) {
        const breakEvenPoint = fixedCosts / (1 - (variableCosts / projectedRevenue));
        const roi = ((projectedRevenue - fixedCosts - variableCosts) / investmentNeeded) * 100;
        const paybackPeriod = investmentNeeded / (projectedRevenue - fixedCosts - variableCosts);
        
        return {
            projectedRevenue,
            fixedCosts,
            variableCosts,
            totalCosts: fixedCosts + variableCosts,
            projectedProfit: projectedRevenue - fixedCosts - variableCosts,
            profitMargin: ((projectedRevenue - fixedCosts - variableCosts) / projectedRevenue) * 100,
            breakEvenPoint,
            breakEvenUnits: Math.ceil(breakEvenPoint / (projectedRevenue / 100)), // Simplificado
            roi,
            paybackPeriod,
            feasibility: this.assessFeasibility(roi, paybackPeriod)
        };
    }

    /**
     * Avalia viabilidade do plano
     */
    assessFeasibility(roi, paybackPeriod) {
        if (roi > 50 && paybackPeriod < 12) {
            return {
                level: 'excellent',
                message: 'Plano altamente viável - ROI excelente e retorno rápido'
            };
        } else if (roi > 25 && paybackPeriod < 24) {
            return {
                level: 'good',
                message: 'Plano viável - ROI positivo e retorno em prazo aceitável'
            };
        } else if (roi > 10 && paybackPeriod < 36) {
            return {
                level: 'moderate',
                message: 'Plano com viabilidade moderada - avaliar riscos cuidadosamente'
            };
        } else {
            return {
                level: 'risky',
                message: 'Plano de alto risco - considere alternativas ou melhorias'
            };
        }
    }

    /**
     * Gera cenários: otimista, realista, pessimista
     */
    generateScenarios(baseRevenue, baseCosts) {
        return {
            optimistic: {
                revenue: baseRevenue * 1.2,
                costs: baseCosts * 0.95,
                profit: (baseRevenue * 1.2) - (baseCosts * 0.95),
                probability: '20%',
                description: 'Crescimento acima do esperado, custos controlados'
            },
            realistic: {
                revenue: baseRevenue,
                costs: baseCosts,
                profit: baseRevenue - baseCosts,
                probability: '60%',
                description: 'Crescimento conforme planejado'
            },
            pessimistic: {
                revenue: baseRevenue * 0.8,
                costs: baseCosts * 1.1,
                profit: (baseRevenue * 0.8) - (baseCosts * 1.1),
                probability: '20%',
                description: 'Desafios no mercado, custos aumentados'
            }
        };
    }
}
