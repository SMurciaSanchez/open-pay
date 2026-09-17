'use client';

import { useState } from 'react';
import { Account } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type BalanceCardProps = {
  account: Account;
};

export default function BalanceCard({ account }: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true);
  
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-primary-600 p-6 text-white shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-medium text-primary-100">Saldo disponible</h3>
        <button 
          onClick={() => setShowBalance(!showBalance)}
          className="rounded-full p-1 transition-colors hover:bg-primary-500/30"
        >
          {showBalance ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="mb-4 flex items-end">
        <span className="mr-2 text-3xl font-bold">
          {showBalance 
            ? formatCurrency(account.balance)
            : '••••••••'}
        </span>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex flex-col">
          <span className="text-primary-200">Cuenta {account.type}</span>
          <span className="font-mono opacity-80">{account.number}</span>
        </div>
        
        {false && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/30">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor" />
              <path d="M11 7H13V9H11V7Z" fill="currentColor" />
              <path d="M7 11V13H9V16H11V13H15V11H11V9H15V7H11V6H9V7H7V9H9V11H7Z" fill="currentColor" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Gradient decoration */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary-400/20 blur-xl"></div>
      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-primary-400/10 blur-xl"></div>
    </div>
  );
} 