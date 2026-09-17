'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import SecurityKey from '@/components/dashboard/SecurityKey';

export default function SecurityPage() {
  const [securityKey, setSecurityKey] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [activeDemo, setActiveDemo] = useState<'generate' | 'verify'>('generate');

  const handleKeyGenerated = (key: string) => {
    setSecurityKey(key);
    // Reset verification result when generating a new key
    setVerificationResult(null);
  };

  const handleKeyVerified = (isValid: boolean) => {
    setVerificationResult(isValid);
  };

  return (
    <DashboardLayout>
      <div className="container max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-neutral-900">Seguridad</h1>
          <p className="text-neutral-600">
            Gestiona tus llaves de seguridad y configura las opciones de protección de tu cuenta.
          </p>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="col-span-2 rounded-xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-neutral-900">Llaves de Seguridad</h2>
            <p className="mb-6 text-neutral-600">
              Las llaves de seguridad son códigos temporales que se utilizan para autorizar transferencias y operaciones sensibles.
              Estas llaves caducan después de un cierto período de tiempo o después de un solo uso.
            </p>

            <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-3 h-6 w-6 flex-shrink-0 text-primary-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <div>
                  <h3 className="mb-1 font-medium text-neutral-900">Capa adicional de seguridad</h3>
                  <p className="text-sm text-neutral-600">
                    Las llaves de seguridad proporcionan una capa adicional de protección para tus operaciones financieras, 
                    especialmente para transferencias de alto valor o cambios en la configuración de tu cuenta.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="mb-4 flex border-b border-neutral-200">
                <button
                  onClick={() => setActiveDemo('generate')}
                  className={`mr-4 py-2 text-sm font-medium ${
                    activeDemo === 'generate'
                      ? 'border-b-2 border-primary-600 text-primary-600'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Generar Llave
                </button>
                <button
                  onClick={() => setActiveDemo('verify')}
                  className={`py-2 text-sm font-medium ${
                    activeDemo === 'verify'
                      ? 'border-b-2 border-primary-600 text-primary-600'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Verificar Llave
                </button>
              </div>

              {activeDemo === 'generate' ? (
                <SecurityKey
                  mode="generate"
                  onKeyGenerated={handleKeyGenerated}
                />
              ) : (
                <SecurityKey
                  mode="verify"
                  verificationKey={securityKey || ''}
                  onKeyVerified={handleKeyVerified}
                />
              )}

              {verificationResult !== null && (
                <div className={`mt-4 rounded-md p-3 ${
                  verificationResult ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'
                }`}>
                  <div className="flex">
                    {verificationResult ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mr-2 h-5 w-5">
                          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                        <p>Verificación exitosa. La llave ingresada es correcta.</p>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mr-2 h-5 w-5">
                          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                        </svg>
                        <p>Verificación fallida. La llave ingresada no coincide.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-white p-6 shadow-md">
              <h3 className="mb-3 text-lg font-semibold text-neutral-900">Configuración de seguridad</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-800">Autenticación de dos factores</p>
                    <p className="text-sm text-neutral-600">Añade una capa extra de seguridad</p>
                  </div>
                  <div className="relative inline-block h-6 w-11 cursor-pointer rounded-full bg-neutral-200">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      id="toggle-2fa"
                    />
                    <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:left-6 peer-checked:bg-white"></span>
                    <label 
                      htmlFor="toggle-2fa"
                      className="absolute inset-0 cursor-pointer rounded-full bg-neutral-300 transition-colors peer-checked:bg-primary-600"
                    ></label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-800">Notificaciones de inicio de sesión</p>
                    <p className="text-sm text-neutral-600">Recibe alertas al iniciar sesión</p>
                  </div>
                  <div className="relative inline-block h-6 w-11 cursor-pointer rounded-full bg-neutral-200">
                    <input 
                      type="checkbox"
                      defaultChecked 
                      className="peer sr-only" 
                      id="toggle-login"
                    />
                    <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:left-6 peer-checked:bg-white"></span>
                    <label 
                      htmlFor="toggle-login"
                      className="absolute inset-0 cursor-pointer rounded-full bg-neutral-300 transition-colors peer-checked:bg-primary-600"
                    ></label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-800">Llaves de seguridad para transferencias</p>
                    <p className="text-sm text-neutral-600">Requerir para transferencias mayores a $100</p>
                  </div>
                  <div className="relative inline-block h-6 w-11 cursor-pointer rounded-full bg-neutral-200">
                    <input 
                      type="checkbox"
                      defaultChecked 
                      className="peer sr-only" 
                      id="toggle-security-keys"
                    />
                    <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:left-6 peer-checked:bg-white"></span>
                    <label 
                      htmlFor="toggle-security-keys"
                      className="absolute inset-0 cursor-pointer rounded-full bg-neutral-300 transition-colors peer-checked:bg-primary-600"
                    ></label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="rounded-xl bg-white p-6 shadow-md">
              <h3 className="mb-3 text-lg font-semibold text-neutral-900">Actividad reciente</h3>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="mr-3 rounded-full bg-neutral-100 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-neutral-700">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">Inicio de sesión exitoso</p>
                    <p className="text-xs text-neutral-500">Hace 2 horas · Windows · Chrome</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="mr-3 rounded-full bg-neutral-100 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-neutral-700">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">Contraseña actualizada</p>
                    <p className="text-xs text-neutral-500">Hace 3 días · Windows · Edge</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="mr-3 rounded-full bg-neutral-100 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-neutral-700">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">Intento de inicio de sesión fallido</p>
                    <p className="text-xs text-neutral-500">Hace 5 días · Android · Mobile</p>
                  </div>
                </div>
              </div>
              
              <button className="mt-4 w-full text-center text-sm font-medium text-primary-600 hover:text-primary-700">
                Ver todo el historial
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 