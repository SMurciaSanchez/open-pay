'use client';

import { useState, useEffect } from 'react';
import { RefreshCw as ArrowPathIcon } from 'lucide-react';

interface SecurityKeyProps {
  mode: 'generate' | 'verify';
  onGenerate?: (key: string) => void;
  onVerify?: (result: boolean) => void;
}

export default function SecurityKey({ mode, onGenerate, onVerify }: SecurityKeyProps) {
  const [key, setKey] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Generate a random key when in generate mode
  useEffect(() => {
    if (mode === 'generate') {
      generateKey();
    }
  }, [mode]);

  // Timer for key validity
  useEffect(() => {
    if (mode === 'generate' && timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else if (timeLeft === 0 && mode === 'generate') {
      // Regenerate key when timer reaches 0
      generateKey();
    }
  }, [timeLeft, mode]);

  // Generate a new security key
  const generateKey = () => {
    const newKey = Math.random().toString(36).substring(2, 8).toUpperCase();
    setKey(newKey);
    setTimeLeft(300); // 5 minutes in seconds
    setIsCopied(false);
    if (onGenerate) {
      onGenerate(newKey);
    }
  };

  // Handle verification of a key
  const handleVerify = () => {
    if (onVerify) {
      // In a real app, this would verify against the backend
      // For demo, we're just checking if input matches "DEMO12"
      const isValid = input.toUpperCase() === 'DEMO12';
      onVerify(isValid);
    }
  };

  // Copy key to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(key);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Format time left as MM:SS
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (mode === 'generate') {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
        <div className="mb-4">
          <h3 className="text-base font-medium text-neutral-900">Su clave de seguridad</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Esta clave es válida por {formatTimeLeft()} minutos.
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-4 p-3 bg-neutral-50 rounded-md">
          <div className="font-mono text-lg tracking-wider font-bold text-primary-700">
            {key.split('').join(' ')}
          </div>
          <button
            onClick={copyToClipboard}
            className="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            {isCopied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        
        <div className="mt-4 flex justify-between">
          <button
            onClick={generateKey}
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Generar nueva clave
          </button>
          <div className="text-sm text-neutral-500">
            Válida por: <span className="font-medium">{formatTimeLeft()}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
      <div className="mb-4">
        <h3 className="text-base font-medium text-neutral-900">Verificar clave de seguridad</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Introduzca la clave de seguridad que recibió para verificar su identidad.
        </p>
      </div>
      
      <div className="mt-4">
        <label htmlFor="security-key" className="sr-only">
          Clave de seguridad
        </label>
        <input
          type="text"
          id="security-key"
          placeholder="Ej: ABC123"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          maxLength={6}
        />
      </div>
      
      <div className="mt-4">
        <button
          onClick={handleVerify}
          disabled={input.length < 6}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed"
        >
          Verificar
        </button>
      </div>
    </div>
  );
} 