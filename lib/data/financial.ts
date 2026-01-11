/**
 * Financial Data Layer
 * 
 * Handles financial transactions, budgets, savings goals, and analytics
 */

import { createClient } from '@/lib/supabase/server';
import { sanitizeString, sanitizeInteger } from '@/lib/input-sanitization';

/**
 * Get financial transactions with filters
 */
export async function getFinancialTransactions(
  familyId: string,
  memberId: string,
  filters: {
    memberId?: string;
    type?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
) {
  const supabase = await createClient();
  
  let query = supabase
    .from('financial_transactions')
    .select(`
      *,
      member:family_members!inner(id, name, role, family_id)
    `)
    .eq('member.family_id', familyId)
    .order('transaction_date', { ascending: false });

  // Apply filters
  if (filters.memberId) {
    query = query.eq('member_id', filters.memberId);
  }

  if (filters.type) {
    query = query.eq('transaction_type', filters.type);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.startDate) {
    query = query.gte('transaction_date', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('transaction_date', filters.endDate);
  }

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get budgets for a family
 */
export async function getBudgets(familyId: string, memberId: string) {
  const supabase = await createClient();

  // Check if member is a child - they can only see their own budgets
  const { data: member } = await supabase
    .from('family_members')
    .select('role')
    .eq('id', memberId)
    .single();

  let query = supabase
    .from('budgets')
    .select(`
      *,
      member:family_members!inner(id, name, role, family_id)
    `)
    .eq('member.family_id', familyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Children can only see their own budgets
  if (member?.role === 'CHILD') {
    query = query.eq('member_id', memberId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Create a new budget
 */
export async function createBudget(
  familyId: string,
  data: {
    memberId: string;
    name: string;
    category?: string;
    amount: number;
    period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    startDate: string;
    endDate?: string;
    isActive?: boolean;
  }
) {
  const supabase = await createClient();

  // Validate member belongs to family
  const { data: member } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('id', data.memberId)
    .single();

  if (!member || member.family_id !== familyId) {
    throw new Error('Member not found in family');
  }

  // Sanitize inputs
  const sanitized = {
    member_id: data.memberId,
    name: sanitizeString(data.name, 100),
    category: data.category ? sanitizeString(data.category, 50) : null,
    amount: sanitizeInteger(data.amount, 0, 1000000),
    period: data.period,
    start_date: data.startDate,
    end_date: data.endDate || null,
    is_active: data.isActive ?? true,
  };

  const { data: budget, error } = await supabase
    .from('budgets')
    .insert(sanitized)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return budget;
}

/**
 * Get savings goals for a family
 */
export async function getSavingsGoals(familyId: string, memberId: string) {
  const supabase = await createClient();

  // Check if member is a child - they can only see their own goals
  const { data: member } = await supabase
    .from('family_members')
    .select('role')
    .eq('id', memberId)
    .single();

  let query = supabase
    .from('savings_goals')
    .select(`
      *,
      member:family_members!inner(id, name, role, family_id)
    `)
    .eq('member.family_id', familyId)
    .order('created_at', { ascending: false });

  // Children can only see their own goals
  if (member?.role === 'CHILD') {
    query = query.eq('member_id', memberId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Create a new savings goal
 */
export async function createSavingsGoal(
  familyId: string,
  data: {
    memberId: string;
    name: string;
    description?: string;
    targetAmount: number;
    currentAmount?: number;
    targetDate?: string;
    isActive?: boolean;
  }
) {
  const supabase = await createClient();

  // Validate member belongs to family
  const { data: member } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('id', data.memberId)
    .single();

  if (!member || member.family_id !== familyId) {
    throw new Error('Member not found in family');
  }

  // Sanitize inputs
  const sanitized = {
    member_id: data.memberId,
    name: sanitizeString(data.name, 100),
    description: data.description ? sanitizeString(data.description, 500) : null,
    target_amount: sanitizeInteger(data.targetAmount, 1, 1000000),
    current_amount: data.currentAmount ? sanitizeInteger(data.currentAmount, 0, 1000000) : 0,
    target_date: data.targetDate || null,
    is_active: data.isActive ?? true,
  };

  const { data: goal, error } = await supabase
    .from('savings_goals')
    .insert(sanitized)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return goal;
}

/**
 * Get financial analytics with spending trends and category breakdowns
 */
export async function getFinancialAnalytics(
  familyId: string,
  memberId: string,
  filters: {
    startDate?: string;
    endDate?: string;
  }
) {
  const supabase = await createClient();

  // Default to last 30 days if no date range specified
  const endDate = filters.endDate || new Date().toISOString();
  const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Get all transactions in date range
  const { data: transactions, error: txError } = await supabase
    .from('financial_transactions')
    .select(`
      *,
      member:family_members!inner(id, name, family_id)
    `)
    .eq('member.family_id', familyId)
    .eq('member_id', memberId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: true });

  if (txError) {
    throw txError;
  }

  // Calculate analytics
  const analytics = {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    transactionCount: transactions?.length || 0,
    byCategory: {} as Record<string, { total: number; count: number }>,
    byType: {
      INCOME: { total: 0, count: 0 },
      EXPENSE: { total: 0, count: 0 },
      TRANSFER: { total: 0, count: 0 },
    },
    trends: [] as Array<{ date: string; income: number; expenses: number }>,
  };

  // Group by date for trends
  const dailyData = new Map<string, { income: number; expenses: number }>();

  transactions?.forEach((tx) => {
    const amount = tx.amount || 0;
    const type = tx.transaction_type as 'INCOME' | 'EXPENSE' | 'TRANSFER';
    const category = tx.category || 'Uncategorized';
    const date = tx.transaction_date.split('T')[0]; // Get date part only

    // Update totals by type
    if (type === 'INCOME') {
      analytics.totalIncome += amount;
      analytics.byType.INCOME.total += amount;
      analytics.byType.INCOME.count++;
    } else if (type === 'EXPENSE') {
      analytics.totalExpenses += amount;
      analytics.byType.EXPENSE.total += amount;
      analytics.byType.EXPENSE.count++;
    } else if (type === 'TRANSFER') {
      analytics.byType.TRANSFER.total += amount;
      analytics.byType.TRANSFER.count++;
    }

    // Update by category
    if (!analytics.byCategory[category]) {
      analytics.byCategory[category] = { total: 0, count: 0 };
    }
    analytics.byCategory[category].total += amount;
    analytics.byCategory[category].count++;

    // Update daily trends
    if (!dailyData.has(date)) {
      dailyData.set(date, { income: 0, expenses: 0 });
    }
    const daily = dailyData.get(date)!;
    if (type === 'INCOME') {
      daily.income += amount;
    } else if (type === 'EXPENSE') {
      daily.expenses += amount;
    }
  });

  // Calculate net balance
  analytics.netBalance = analytics.totalIncome - analytics.totalExpenses;

  // Convert daily data to trends array
  analytics.trends = Array.from(dailyData.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return analytics;
}
