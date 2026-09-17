'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminApi } from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils/formatters';

// Mock data for the charts
const mockTransactionData = [
  { month: 'Ene', income: 42000, transactions: 120 },
  { month: 'Feb', income: 56000, transactions: 145 },
  { month: 'Mar', income: 49000, transactions: 132 },
  { month: 'Abr', income: 63000, transactions: 165 },
  { month: 'May', income: 58000, transactions: 150 },
  { month: 'Jun', income: 72000, transactions: 185 },
  { month: 'Jul', income: 68000, transactions: 172 },
  { month: 'Ago', income: 75000, transactions: 192 },
  { month: 'Sep', income: 82000, transactions: 210 },
  { month: 'Oct', income: 88000, transactions: 220 },
  { month: 'Nov', income: 94000, transactions: 235 },
  { month: 'Dic', income: 105000, transactions: 260 },
];

const mockUserData = [
  { month: 'Ene', active: 450, new: 80 },
  { month: 'Feb', active: 520, new: 70 },
  { month: 'Mar', active: 580, new: 60 },
  { month: 'Abr', active: 630, new: 50 },
  { month: 'May', active: 670, new: 40 },
  { month: 'Jun', active: 700, new: 30 },
  { month: 'Jul', active: 720, new: 20 },
  { month: 'Ago', active: 750, new: 30 },
  { month: 'Sep', active: 790, new: 40 },
  { month: 'Oct', active: 830, new: 40 },
  { month: 'Nov', active: 880, new: 50 },
  { month: 'Dic', active: 950, new: 70 },
];

const mockFlaggedTransactionsData = [
  { month: 'Ene', flagged: 24, reviewed: 20 },
  { month: 'Feb', flagged: 32, reviewed: 28 },
  { month: 'Mar', flagged: 29, reviewed: 24 },
  { month: 'Abr', flagged: 38, reviewed: 30 },
  { month: 'May', flagged: 35, reviewed: 28 },
  { month: 'Jun', flagged: 42, reviewed: 35 },
  { month: 'Jul', flagged: 40, reviewed: 32 },
  { month: 'Ago', flagged: 45, reviewed: 38 },
  { month: 'Sep', flagged: 49, reviewed: 41 },
  { month: 'Oct', flagged: 52, reviewed: 44 },
  { month: 'Nov', flagged: 58, reviewed: 48 },
  { month: 'Dic', flagged: 64, reviewed: 54 },
];

// Custom tooltip for the charts
const CustomTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip bg-white p-2 border border-gray-200 rounded-md shadow-sm">
        <p className="label font-medium">{`${label}`}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {valuePrefix}{entry.value.toLocaleString()}{valueSuffix}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

export function Overview() {
  const [activeChart, setActiveChart] = useState('transactions');
  const [chartData, setChartData] = useState<any[]>(mockTransactionData);
  const [period, setPeriod] = useState('year');

  useEffect(() => {
    // Switch between different datasets based on the active chart
    switch (activeChart) {
      case 'transactions':
        setChartData(mockTransactionData);
        break;
      case 'users':
        setChartData(mockUserData);
        break;
      case 'flagged':
        setChartData(mockFlaggedTransactionsData);
        break;
      default:
        setChartData(mockTransactionData);
    }
  }, [activeChart]);

  // In a real app, we'd fetch this data from the API
  // useEffect(() => {
  //   async function fetchChartData() {
  //     try {
  //       const data = await adminApi.getChartData(activeChart, period);
  //       setChartData(data);
  //     } catch (error) {
  //       console.error('Error fetching chart data:', error);
  //     }
  //   }
  //   fetchChartData();
  // }, [activeChart, period]);

  const renderChart = () => {
    switch (activeChart) {
      case 'transactions':
        return (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip content={<CustomTooltip valuePrefix="$" />} />
                <Bar yAxisId="left" dataKey="income" name="Ingresos" fill="#8884d8" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="transactions" name="Transacciones" fill="#82ca9d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="pt-2">
              <ul className="flex gap-8 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full mr-1 bg-[#8884d8]"></span>
                  Ingresos
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full mr-1 bg-[#82ca9d]"></span>
                  Transacciones
                </li>
              </ul>
            </div>
          </>
        );
      case 'users':
        return (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="active" name="Usuarios Activos" fill="#8884d8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="new" name="Usuarios Nuevos" fill="#82ca9d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="pt-2">
              <ul className="flex gap-8 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full mr-1 bg-[#8884d8]"></span>
                  Usuarios Activos
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full mr-1 bg-[#82ca9d]"></span>
                  Usuarios Nuevos
                </li>
              </ul>
            </div>
          </>
        );
      case 'flagged':
        return (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="flagged" name="Transacciones Marcadas" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reviewed" name="Transacciones Revisadas" fill="#84cc16" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="pt-2">
              <ul className="flex gap-8 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full mr-1 bg-[#f97316]"></span>
                  Transacciones Marcadas
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full mr-1 bg-[#84cc16]"></span>
                  Transacciones Revisadas
                </li>
              </ul>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col space-y-1.5 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <CardTitle>Actividad de la Plataforma</CardTitle>
            <CardDescription>
              Análisis de la actividad en el último periodo
            </CardDescription>
          </div>
          <Tabs defaultValue="transactions" onValueChange={setActiveChart} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="transactions">Transacciones</TabsTrigger>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
              <TabsTrigger value="flagged">Alertas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
} 