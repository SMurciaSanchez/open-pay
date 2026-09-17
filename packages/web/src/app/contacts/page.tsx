import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contactos | OpenPay',
  description: 'Administra tus contactos para transferencias rápidas con OpenPay',
}

// Datos de demostración para contactos
const contacts = [
  { 
    id: 1, 
    name: 'Juan Pérez', 
    accountNumber: '1234567890', 
    bank: { id: 1, name: 'Banco Nacional' } 
  },
  { 
    id: 2, 
    name: 'María López', 
    accountNumber: '0987654321', 
    bank: { id: 2, name: 'Banco del Estado' } 
  },
  { 
    id: 3, 
    name: 'Carlos Gómez', 
    accountNumber: '5678901234', 
    bank: { id: 3, name: 'Banco Internacional' } 
  },
];

export default function ContactsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mis Contactos</h1>
          <button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors">
            Agregar Contacto
          </button>
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Banco
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número de Cuenta
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{contact.bank.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{contact.accountNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={`/transfers?contactId=${contact.id}`} className="text-primary hover:text-primary-dark mr-4">
                      Transferir
                    </Link>
                    <button className="text-gray-500 hover:text-gray-700 mr-4">
                      Editar
                    </button>
                    <button className="text-red-500 hover:text-red-700">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 