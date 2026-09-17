import { FC } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Transaction } from './AccountSummary';
import Link from 'next/link';
import {
  ArrowDown as ArrowDownIcon,
  ArrowUp as ArrowUpIcon,
  ArrowLeftRight as ArrowsRightLeftIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  XCircle as XCircleIcon
} from 'lucide-react';

interface TransactionsTableProps {
  transactions: Transaction[];
  currency: string;
}

const TransactionsTable: FC<TransactionsTableProps> = ({ transactions, currency }) => {
  // Get transaction icon based on type
  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownIcon className="w-5 h-5 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpIcon className="w-5 h-5 text-red-500" />;
      case 'transfer':
        return <ArrowsRightLeftIcon className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  // Get status icon based on status
  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Historial de Transacciones</h2>
        <div className="flex items-center space-x-2">
          <select 
            className="text-sm border rounded-md py-1 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            defaultValue="all"
          >
            <option value="all">Todos los tipos</option>
            <option value="deposit">Depósitos</option>
            <option value="withdrawal">Retiros</option>
            <option value="transfer">Transferencias</option>
          </select>
          <select 
            className="text-sm border rounded-md py-1 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            defaultValue="last30"
          >
            <option value="last7">Últimos 7 días</option>
            <option value="last30">Últimos 30 días</option>
            <option value="last90">Últimos 90 días</option>
            <option value="year">Este año</option>
          </select>
        </div>
      </div>

      {transactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr 
                  key={transaction.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {}} // Will be implemented later
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-800">{transaction.description}</div>
                    {(transaction.sender || transaction.recipient) && (
                      <div className="text-xs text-gray-500">
                        {transaction.type === 'transfer' ? 
                          `A: ${transaction.recipient}` : 
                          transaction.sender ? `De: ${transaction.sender}` : ''
                        }
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTransactionIcon(transaction.type)}
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {transaction.type === 'deposit' ? 'Depósito' : 
                         transaction.type === 'withdrawal' ? 'Retiro' : 'Transferencia'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(transaction.status)}
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {transaction.status === 'completed' ? 'Completado' : 
                         transaction.status === 'pending' ? 'Pendiente' : 'Fallido'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-right">
                    <span className={`${
                      transaction.type === 'deposit' 
                        ? 'text-green-600' 
                        : transaction.type === 'withdrawal' 
                          ? 'text-red-600' 
                          : 'text-blue-600'
                    }`}>
                      {transaction.type === 'deposit' ? '+' : '-'}
                      {formatCurrency(transaction.amount, currency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No hay transacciones para mostrar</p>
          <Link 
            href="/deposit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Realizar depósito
          </Link>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Mostrando {transactions.length} transacciones
          </div>
          <div className="flex space-x-2">
            <button 
              className="px-3 py-1 border rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={true}
            >
              Anterior
            </button>
            <button 
              className="px-3 py-1 border rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={true}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsTable; 