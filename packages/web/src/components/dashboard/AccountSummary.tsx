import { FC } from 'react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight as ArrowRightIcon } from 'lucide-react';

export type Transaction = {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  date: string;
  description: string;
  sender?: string;
  recipient?: string;
  status: 'completed' | 'pending' | 'failed';
};

interface AccountSummaryProps {
  balance: number;
  currency: string;
  accountNumber: string;
  recentTransactions: Transaction[];
}

const AccountSummary: FC<AccountSummaryProps> = ({
  balance,
  currency,
  accountNumber,
  recentTransactions,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Resumen de Cuenta</h2>
      
      {/* Balance */}
      <div className="mb-6">
        <p className="text-sm text-gray-500">Balance Actual</p>
        <p className="text-3xl font-bold text-indigo-600">
          {formatCurrency(balance, currency)}
        </p>
      </div>
      
      {/* Account Info */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <p className="text-sm text-gray-500">Número de Cuenta</p>
        <p className="text-base font-medium">{accountNumber}</p>
      </div>
      
      {/* Recent Transactions */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-semibold text-gray-800">Transacciones Recientes</h3>
          <Link 
            href="/transactions" 
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            Ver todas
            <ArrowRightIcon className="w-3 h-3 ml-1" />
          </Link>
        </div>
        
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.slice(0, 3).map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-800">{transaction.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
                <p className={`text-sm font-medium ${
                  transaction.type === 'deposit' 
                    ? 'text-green-600' 
                    : transaction.type === 'withdrawal' 
                      ? 'text-red-600' 
                      : 'text-blue-600'
                }`}>
                  {transaction.type === 'deposit' ? '+' : '-'}
                  {formatCurrency(transaction.amount, currency)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No hay transacciones recientes
          </p>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-md font-semibold text-gray-800 mb-3">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 gap-2">
          <Link 
            href="/transfer" 
            className="text-center py-2 px-4 border border-indigo-600 rounded-md text-indigo-600 text-sm hover:bg-indigo-50 transition-colors"
          >
            Transferir
          </Link>
          <Link 
            href="/deposit" 
            className="text-center py-2 px-4 bg-indigo-600 rounded-md text-white text-sm hover:bg-indigo-700 transition-colors"
          >
            Depositar
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccountSummary; 