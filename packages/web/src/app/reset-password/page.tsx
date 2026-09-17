import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Nueva contraseña | OpenPay',
  description: 'Elige una contraseña nueva para tu cuenta de OpenPay',
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-block">
          <img src="/logo.svg" alt="OpenPay" width={150} height={50} className="mx-auto" />
        </Link>
      </div>
      <div className="w-full max-w-md">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
