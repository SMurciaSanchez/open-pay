import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata = {
  title: 'Restablecer contraseña | OpenPay',
  description: 'Pide un enlace para elegir una contraseña nueva en OpenPay',
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-block">
          <img src="/logo.svg" alt="OpenPay" width={150} height={50} className="mx-auto" />
        </Link>
      </div>
      <div className="w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
