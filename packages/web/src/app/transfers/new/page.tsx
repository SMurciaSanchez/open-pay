import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Nueva Transferencia | OpenPay',
  description: 'Realiza una nueva transferencia a tus contactos o cuentas de terceros',
}

// Contactos de ejemplo para el formulario de transferencia
const contacts = [
  { id: 1, name: 'Ana García', accountNumber: '123456789', bank: 'BBVA' },
  { id: 2, name: 'Roberto Méndez', accountNumber: '987654321', bank: 'Santander' },
  { id: 3, name: 'Lucía Fernández', accountNumber: '456789123', bank: 'Banorte' },
];

export default function NewTransferPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Nueva Transferencia</h1>
          <p className="text-gray-600">Completa los datos para realizar tu transferencia</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <form>
            <div className="space-y-6">
              {/* Sección del destinatario */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Datos del destinatario</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                      Selecciona un destinatario
                    </label>
                    <select
                      id="recipient"
                      name="recipient"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
                    >
                      <option value="">Selecciona un contacto</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name} - {contact.bank} ({contact.accountNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="text-sm text-gray-600 flex items-center">
                    <span>¿No encuentras a tu contacto?</span>
                    <Link href="/contacts/new" className="ml-1 text-primary hover:text-primary-dark">
                      Agregar nuevo
                    </Link>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-500">Nombre:</span>
                      <span className="text-sm font-medium">Ana García</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-500">Banco:</span>
                      <span className="text-sm font-medium">BBVA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Cuenta:</span>
                      <span className="text-sm font-medium">123456789</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Sección de detalles de la transferencia */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Detalles de la transferencia</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Monto a transferir
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="text"
                        name="amount"
                        id="amount"
                        className="focus:ring-primary focus:border-primary block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">MXN</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="concept" className="block text-sm font-medium text-gray-700 mb-1">
                      Concepto de pago
                    </label>
                    <input
                      type="text"
                      name="concept"
                      id="concept"
                      className="focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Ej. Pago de servicios"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción (opcional)
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Añade detalles adicionales sobre esta transferencia"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              {/* Sección de resumen */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h2 className="text-lg font-medium text-gray-900 mb-3">Resumen de la transferencia</h2>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto:</span>
                    <span className="font-medium">$0.00 MXN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Comisión:</span>
                    <span className="font-medium text-green-600">$0.00 MXN</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold">$0.00 MXN</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between pt-4">
                <Link href="/dashboard" className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Cancelar
                </Link>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Transferir ahora
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 