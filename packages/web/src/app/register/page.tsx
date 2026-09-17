import { RegisterForm } from '@/components/auth/RegisterForm';
import Link from 'next/link';
import { Toaster } from '@/components/ui/toaster';

export const metadata = {
  title: 'Crear cuenta | OpenPay',
  description: 'Crea una cuenta nueva en OpenPay y comienza a gestionar tu dinero de forma segura'
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-24 bg-slate-50">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-block">
          <img 
            src="/logo.svg" 
            alt="OpenPay Logo" 
            width={150} 
            height={50} 
            className="mx-auto"
          />
        </Link>
      </div>
      
      <RegisterForm />
      
      <Toaster />
    </div>
  );
} 