'use client';

import { useState } from 'react';
import { Transaction } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Stats {
  totalIn: number;
  totalOut: number;
  balance: number;
  categorySummary: {
    [key: string]: number;
  };
}

interface FinancialStatsProps {
  transactions: Transaction[];
  currency?: string;
  isLoading?: boolean;
}

export default function FinancialStats({ 
  transactions, 
  currency = 'COP',
  isLoading = false
}: FinancialStatsProps) {
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('month');

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="h-6 w-32 animate-pulse rounded bg-neutral-200"></h3>
          <div className="h-8 w-40 animate-pulse rounded bg-neutral-200"></div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="h-4 w-20 animate-pulse rounded bg-neutral-200"></div>
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-neutral-200"></div>
            </div>
          ))}
        </div>
        <div className="mt-8 h-64 w-full animate-pulse rounded bg-neutral-200"></div>
      </div>
    );
  }

  // Calculate statistics based on transactions
  const stats = calculateStats(transactions);

  // Chart data
  const categories = Object.keys(stats.categorySummary).sort();
  const values = categories.map(cat => stats.categorySummary[cat]);
  
  // Colors for the chart
  const colors = [
    '#7c3aed', // primary (indigo)
    '#8b5cf6', 
    '#a78bfa',
    '#c4b5fd',
    '#10b981', // success (emerald)
    '#34d399',
    '#f59e0b', // warning (amber)
    '#fbbf24',
    '#ef4444', // danger (red)
    '#f87171',
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-medium text-neutral-900">Resumen financiero</h3>
        
        <div className="mt-2 inline-flex rounded-md shadow-sm sm:mt-0">
          <button
            type="button"
            className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-medium ${
              timeframe === 'week'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
            onClick={() => setTimeframe('week')}
          >
            Esta semana
          </button>
          <button
            type="button"
            className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-2 text-sm font-medium ${
              timeframe === 'month'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
            onClick={() => setTimeframe('month')}
          >
            Este mes
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="mt-6 grid grid-cols-1 gap-6 border-b border-neutral-200 pb-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-medium text-neutral-500">Ingreso total</p>
          <p className="mt-2 text-xl font-semibold text-success-600">
            {formatCurrency(stats.totalIn, currency)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-500">Gasto total</p>
          <p className="mt-2 text-xl font-semibold text-danger-600">
            {formatCurrency(stats.totalOut, currency)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-500">Balance neto</p>
          <p className={`mt-2 text-xl font-semibold ${stats.balance >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {formatCurrency(stats.balance, currency)}
          </p>
        </div>
      </div>

      {/* Chart */}
      {categories.length > 0 ? (
        <div className="mt-6">
          <h4 className="mb-4 text-sm font-medium text-neutral-500">Gastos por categoría</h4>
          <div className="h-64">
            <div className="flex h-full w-full flex-col">
              <div className="relative mt-3 flex h-full w-full items-end">
                {categories.map((category, index) => {
                  // Calculate percentage height (max value is 100%)
                  const maxValue = Math.max(...values);
                  const percentage = maxValue > 0 ? (stats.categorySummary[category] / maxValue) * 100 : 0;
                  
                  return (
                    <div 
                      key={category}
                      className="group mx-1 flex flex-1 flex-col items-center justify-end" 
                    >
                      {/* Tooltip that shows on hover */}
                      <div className="absolute bottom-full mb-2 hidden rounded bg-neutral-800 px-2 py-1 text-xs text-white group-hover:block">
                        <p className="whitespace-nowrap">{formatCurrency(stats.categorySummary[category], currency)}</p>
                      </div>
                      
                      {/* Bar */}
                      <div 
                        className="w-full rounded-t transition-all duration-300 ease-in-out group-hover:opacity-80"
                        style={{ 
                          height: `${Math.max(percentage, 5)}%`, 
                          backgroundColor: colors[index % colors.length] 
                        }}
                      ></div>
                      
                      {/* Label */}
                      <div className="mt-2 w-full truncate text-center text-xs font-medium text-neutral-500">
                        {category}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-neutral-500">No hay datos suficientes para mostrar estadísticas.</p>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate statistics from transactions
function calculateStats(transactions: Transaction[]): Stats {
  const stats: Stats = {
    totalIn: 0,
    totalOut: 0,
    balance: 0,
    categorySummary: {}
  };

  // Process each transaction
  transactions.forEach(transaction => {
    const amount = Number(transaction.amount);

    // Skip failed transactions
    if (transaction.status === 'failed') {
      return;
    }

    // Categorize as income or expense
    if (transaction.type === 'deposit') {
      stats.totalIn += amount;
    } else if (['withdrawal', 'payment'].includes(transaction.type)) {
      stats.totalOut += amount;

      // Categorize expenses
      // Note: In a real app, transactions would have categories
      // Here we're just using type as a simple category
      const category = transaction.description?.split(' ')[0] || transaction.type;
      
      if (!stats.categorySummary[category]) {
        stats.categorySummary[category] = 0;
      }
      
      stats.categorySummary[category] += amount;
    }
  });
  
  // Calculate net balance
  stats.balance = stats.totalIn - stats.totalOut;
  
  return stats;
} 