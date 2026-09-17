'use client';

import { useState, useEffect } from 'react';

type SecurityKeyProps = {
  onKeyGenerated?: (key: string) => void;
  onKeyVerified?: (isValid: boolean) => void;
  mode: 'generate' | 'verify';
  verificationKey?: string;
};

export default function SecurityKey({ 
  onKeyGenerated,
  onKeyVerified,
  mode = 'generate',
  verificationKey 
}: SecurityKeyProps) {
  const [key, setKey] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Generar una nueva llave cada vez que el componente se monta en modo 'generate'
  useEffect(() => {
    if (mode === 'generate') {
      generateNewKey();
      
      // Iniciar temporizador de expiración (5 minutos)
      setCountdown(5 * 60);
    }
  }, [mode]);

  // Manejar cuenta regresiva para la expiración de la llave
  useEffect(() => {
    if (countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [countdown]);

  // Generar una nueva llave de seguridad
  const generateNewKey = () => {
    // Generar una llave de 6 dígitos
    const newKey = Math.floor(100000 + Math.random() * 900000).toString();
    setKey(newKey);
    
    // Reiniciar contador
    setCountdown(5 * 60);
    setIsCopied(false);
    
    // Notificar al componente padre
    onKeyGenerated?.(newKey);
  };

  // Verificar la llave ingresada
  const verifyKey = () => {
    if (mode === 'verify' && verificationKey) {
      const isKeyValid = inputKey === verificationKey;
      setIsValid(isKeyValid);
      onKeyVerified?.(isKeyValid);
    }
  };

  // Copiar llave al portapapeles
  const copyToClipboard = () => {
    navigator.clipboard.writeText(key);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Formatear tiempo restante
  const formatTimeRemaining = () => {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">
        {mode === 'generate' ? 'Llave de seguridad' : 'Verificación de seguridad'}
      </h2>
      
      {mode === 'generate' ? (
        <div>
          <div className="mb-6 rounded-xl bg-primary-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-700">Tu llave temporal</p>
              <div className="rounded-full bg-primary-600 px-2 py-1 text-xs font-medium text-white">
                Expira en {formatTimeRemaining()}
              </div>
            </div>
            
            <div className="relative mb-2 flex items-center justify-center">
              <div className="font-mono text-3xl font-bold tracking-widest text-primary-800">
                {key.split('').map((digit, i) => (
                  <span key={i} className="inline-block w-7 text-center">{digit}</span>
                ))}
              </div>
              <button 
                onClick={copyToClipboard}
                className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow-sm hover:bg-neutral-50"
              >
                {isCopied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-success-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-neutral-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0 -.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                  </svg>
                )}
              </button>
            </div>
            
            <p className="text-center text-xs text-neutral-500">
              Comparte esta llave únicamente con personas de confianza
            </p>
          </div>
          
          <div className="mb-6 rounded-lg bg-neutral-50 p-4 text-neutral-700">
            <div className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 h-5 w-5 flex-shrink-0 text-neutral-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-sm">
                Esta llave es necesaria para autorizar transferencias de alto valor. 
                Es de un solo uso y expira en 5 minutos por seguridad.
              </p>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={generateNewKey}
              className="rounded-md border border-neutral-300 bg-white py-2 px-4 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              Generar nueva llave
            </button>
            
            {isCopied && (
              <span className="inline-flex items-center rounded-md bg-success-50 px-2 py-1 text-xs font-medium text-success-700">
                Copiado
              </span>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-6 rounded-xl bg-neutral-50 p-4">
            <p className="mb-4 text-sm text-neutral-700">
              Ingresa la llave de seguridad proporcionada para autorizar esta operación.
            </p>
            
            <div className="flex justify-center space-x-2">
              {[...Array(6)].map((_, i) => (
                <input 
                  key={i}
                  type="text"
                  maxLength={1}
                  className={`h-12 w-10 rounded-md border text-center text-xl font-semibold shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 ${
                    isValid === false ? 'border-danger-500 bg-danger-50' : 'border-neutral-300'
                  }`}
                  value={inputKey[i] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.match(/^[0-9]$/) || val === '') {
                      const newKey = inputKey.split('');
                      newKey[i] = val;
                      const updatedKey = newKey.join('');
                      setInputKey(updatedKey);
                      
                      // Autofocus next input
                      if (val !== '' && i < 5) {
                        const nextInput = document.querySelector(`input:nth-child(${i + 2})`) as HTMLInputElement;
                        if (nextInput) nextInput.focus();
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    // Handle backspace to go back
                    if (e.key === 'Backspace' && i > 0 && !inputKey[i]) {
                      const newKey = inputKey.split('');
                      newKey[i - 1] = '';
                      setInputKey(newKey.join(''));
                      
                      const prevInput = document.querySelector(`input:nth-child(${i})`) as HTMLInputElement;
                      if (prevInput) prevInput.focus();
                    }
                  }}
                />
              ))}
            </div>
            
            {isValid === false && (
              <p className="mt-2 text-center text-sm text-danger-600">
                Llave de seguridad incorrecta. Intenta nuevamente.
              </p>
            )}
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => setInputKey('')}
              className="rounded-md border border-neutral-300 bg-white py-2 px-4 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              Limpiar
            </button>
            
            <button
              onClick={verifyKey}
              disabled={inputKey.length !== 6}
              className={`rounded-md py-2 px-4 text-sm font-medium text-white shadow-sm ${
                inputKey.length === 6
                  ? 'bg-primary-600 hover:bg-primary-700'
                  : 'cursor-not-allowed bg-primary-300'
              }`}
            >
              Verificar
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 