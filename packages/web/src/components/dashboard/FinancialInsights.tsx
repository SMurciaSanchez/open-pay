'use client';

import { useState, useEffect } from 'react';

// Paleta de colores inspirada en Nubank y Nequi
const colorPalette = [
  '#8a05be',
  '#a633d6',
  '#bf5aea',
  '#d485fd',
  '#00b2ff',
  '#33c2ff',
  '#5ad2ff',
  '#85e1ff',
  '#ff5566',
  '#ffaa00',
  '#00cc99',
];
import { Transaction } from '@/lib/api';
import { formatCurrency, truncateText } from '@/lib/utils';

interface FinancialInsightsProps {
  transactions: Transaction[];
  period?: 'week' | 'month' | 'year';
  currency?: string;
  isLoading?: boolean;
}

type CategoryData = {
  name: string;
  amount: number;
  percentage: number;
  color: string;
};

export default function FinancialInsights({ 
  transactions,
  period = 'month',
  currency = 'COP',
  isLoading = false 
}: FinancialInsightsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>(period);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [spendingInsights, setSpendingInsights] = useState({
    totalExpenses: 0,
    previousExpenses: 0,
    percentageChange: 0,
    isIncrease: false,
  });

  // colorPalette is defined at module level below

  // Reprocesar datos cuando cambian las transacciones o el periodo
  useEffect(() => {
    if (transactions.length === 0 || isLoading) return;

    // Filtrar transacciones por periodo
    const filteredTransactions = filterTransactionsByPeriod(transactions, selectedPeriod);
    
    // Calcular datos para gráficos de categorías
    const { 
      categories, 
      totalExpenses, 
      previousExpenses 
    } = processTransactionsForCategories(filteredTransactions, selectedPeriod);
    
    // Calcular el cambio porcentual
    const percentageChange = previousExpenses > 0 
      ? ((totalExpenses - previousExpenses) / previousExpenses) * 100 
      : 0;
    
    setCategoryData(categories);
    setSpendingInsights({
      totalExpenses,
      previousExpenses,
      percentageChange: Math.abs(Math.round(percentageChange)),
      isIncrease: percentageChange > 0,
    });
  }, [transactions, selectedPeriod, isLoading]);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="h-6 w-36 animate-pulse rounded bg-neutral-200"></h3>
          <div className="h-10 w-48 animate-pulse rounded bg-neutral-200"></div>
        </div>
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-neutral-200"></div>
        <div className="h-64 w-full animate-pulse rounded-xl bg-neutral-200"></div>
        <div className="mt-6 h-32 w-full animate-pulse rounded-xl bg-neutral-200"></div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      {/* Header con selector de periodo */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-xl font-semibold text-neutral-900">Análisis de gastos</h3>
          <p className="text-sm text-neutral-500">Visualiza tus patrones de gasto</p>
        </div>
        
        <div className="flex rounded-lg bg-neutral-100 p-1">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              selectedPeriod === 'week'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-neutral-600 hover:text-primary-600'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              selectedPeriod === 'month'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-neutral-600 hover:text-primary-600'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setSelectedPeriod('year')}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              selectedPeriod === 'year'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-neutral-600 hover:text-primary-600'
            }`}
          >
            Año
          </button>
        </div>
      </div>

      {/* Tarjeta de resumen */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 p-5 text-white">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-primary-100">Gasto total</p>
          <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-medium">
            {selectedPeriod === 'week' ? 'Esta semana' : selectedPeriod === 'month' ? 'Este mes' : 'Este año'}
          </span>
        </div>
        <div className="mb-1 text-2xl font-bold">
          {formatCurrency(spendingInsights.totalExpenses, currency)}
        </div>
        
        {spendingInsights.previousExpenses > 0 && (
          <div className={`flex items-center text-xs ${spendingInsights.isIncrease ? 'text-danger-300' : 'text-success-300'}`}>
            <span className="mr-1">
              {spendingInsights.isIncrease ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            <span>
              {spendingInsights.percentageChange}% comparado con {selectedPeriod === 'week' ? 'la semana pasada' : selectedPeriod === 'month' ? 'el mes pasado' : 'el año pasado'}
            </span>
          </div>
        )}
      </div>

      {/* Gráfico circular */}
      {categoryData.length > 0 ? (
        <div className="mb-6">
          <h4 className="mb-4 text-sm font-medium text-neutral-500">Distribución por categoría</h4>
          
          <div className="relative mx-auto flex h-64 w-64 items-center justify-center">
            {/* Gráfico circular */}
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              {renderPieChart(categoryData)}
            </svg>
            
            {/* Valor central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-neutral-500">Categoría principal</p>
              <p className="text-lg font-semibold text-neutral-900">
                {categoryData[0]?.name || 'N/A'}
              </p>
              <p className="text-sm font-medium text-primary-600">
                {formatCurrency(categoryData[0]?.amount || 0, currency)}
              </p>
            </div>
          </div>
          
          {/* Leyenda */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categoryData.slice(0, 6).map((category, index) => (
              <div key={category.name} className="flex items-center">
                <div 
                  className="mr-2 h-3 w-3 rounded-full" 
                  style={{ backgroundColor: category.color }}
                ></div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-medium text-neutral-700">{category.name}</p>
                  <p className="text-xs text-neutral-500">{category.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 flex h-64 flex-col items-center justify-center rounded-xl bg-neutral-50 p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-2 h-8 w-8 text-neutral-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <h4 className="text-lg font-medium text-neutral-900">Sin datos suficientes</h4>
          <p className="text-sm text-neutral-600">
            No hay transacciones en el periodo seleccionado.
          </p>
        </div>
      )}

      {/* Tendencia de gastos (barra horizontal al estilo Nubank) */}
      {categoryData.length > 0 && (
        <div>
          <h4 className="mb-4 text-sm font-medium text-neutral-500">Principales gastos</h4>
          <div className="space-y-4">
            {categoryData.slice(0, 3).map((category) => (
              <div key={category.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-700">{category.name}</p>
                  <p className="text-sm font-medium text-neutral-900">{formatCurrency(category.amount, currency)}</p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-in-out" 
                    style={{ 
                      width: `${category.percentage}%`,
                      backgroundColor: category.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Función para renderizar el gráfico circular
function renderPieChart(categoryData: CategoryData[]): JSX.Element[] {
  let cumulativePercentage = 0;
  
  return categoryData.map((category, index) => {
    // Calcular ángulos para el path de SVG
    const startPercentage = cumulativePercentage;
    cumulativePercentage += category.percentage;
    
    // Convertir porcentajes a coordenadas para el arco SVG
    const startX = 50 + 40 * Math.cos(2 * Math.PI * startPercentage / 100);
    const startY = 50 + 40 * Math.sin(2 * Math.PI * startPercentage / 100);
    const endX = 50 + 40 * Math.cos(2 * Math.PI * cumulativePercentage / 100);
    const endY = 50 + 40 * Math.sin(2 * Math.PI * cumulativePercentage / 100);
    
    // Determinar si el arco es mayor a 180 grados
    const largeArcFlag = category.percentage > 50 ? 1 : 0;
    
    // Crear el path SVG para el sector circular
    const pathData = [
      `M 50 50`,
      `L ${startX} ${startY}`,
      `A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `Z`
    ].join(' ');
    
    return (
      <path
        key={index}
        d={pathData}
        fill={category.color}
        stroke="#fff"
        strokeWidth="0.5"
      >
        <title>{category.name}: {category.percentage}%</title>
      </path>
    );
  });
}

// Función para filtrar transacciones por periodo
function filterTransactionsByPeriod(
  transactions: Transaction[], 
  period: 'week' | 'month' | 'year'
): Transaction[] {
  const now = new Date();
  const startDate = new Date();
  
  // Establecer fecha de inicio según el periodo
  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  // Filtrar transacciones dentro del periodo
  return transactions.filter(tx => {
    const txDate = new Date(tx.createdAt);
    return txDate >= startDate && txDate <= now;
  });
}

// Función para procesar transacciones y generar datos para gráficos
function processTransactionsForCategories(
  transactions: Transaction[],
  period: 'week' | 'month' | 'year'
): { 
  categories: CategoryData[]; 
  totalExpenses: number; 
  previousExpenses: number;
} {
  // Inicializar resultado
  const result = {
    categories: [] as CategoryData[],
    totalExpenses: 0,
    previousExpenses: 0
  };
  
  // Solo procesar gastos (withdrawal, payment)
  const expenses = transactions.filter(tx =>
    ['withdrawal', 'payment'].includes(tx.type) &&
    tx.status !== 'failed'
  );

  // Si no hay gastos, retornar datos vacíos
  if (expenses.length === 0) {
    return result;
  }

  // Agrupar por categoría
  const categoryAmounts: Record<string, number> = {};

  // Calcular total y agrupar por categoría
  expenses.forEach(tx => {
    const amount = Number(tx.amount);
    result.totalExpenses += amount;

    // Usar descripción o tipo como categoría
    // En una app real, tendríamos categorías específicas
    const category = tx.description?.split(' ')[0] || tx.type;
    
    if (!categoryAmounts[category]) {
      categoryAmounts[category] = 0;
    }
    
    categoryAmounts[category] += amount;
  });
  
  // Calcular datos para periodos anteriores (para comparación)
  const now = new Date();
  const current = new Date();
  const previous = new Date();
  
  // Establecer rangos de fechas para periodo actual y anterior
  switch (period) {
    case 'week':
      current.setDate(now.getDate() - 7);
      previous.setDate(current.getDate() - 7);
      break;
    case 'month':
      current.setMonth(now.getMonth() - 1);
      previous.setMonth(current.getMonth() - 1);
      break;
    case 'year':
      current.setFullYear(now.getFullYear() - 1);
      previous.setFullYear(current.getFullYear() - 1);
      break;
  }
  
  // Calcular gastos del periodo anterior
  transactions.forEach(tx => {
    const txDate = new Date(tx.createdAt);
    const amount = Number(tx.amount);

    if (['withdrawal', 'payment'].includes(tx.type) &&
        tx.status !== 'failed' &&
        txDate >= previous && txDate < current) {
      result.previousExpenses += amount;
    }
  });
  
  // Convertir a array y ordenar por cantidad
  const categoryEntries = Object.entries(categoryAmounts);
  categoryEntries.sort((a, b) => b[1] - a[1]);
  
  // Convertir a formato para gráfico con porcentajes
  result.categories = categoryEntries.map(([name, amount], index) => {
    const percentage = Math.round((amount / result.totalExpenses) * 100);
    const colorIndex = index % (result.totalExpenses > 0 ? 11 : 1);
    
    return {
      name: truncateText(name, 15),
      amount,
      percentage,
      color: colorIndex < 11 ? colorPalette[colorIndex] : '#cccccc'
    };
  });
  
  return result;
} 