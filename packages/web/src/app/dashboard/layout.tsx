import { Metadata } from 'next';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export const metadata: Metadata = {
  title: 'Dashboard | OpenPay',
  description: 'Gestiona tus finanzas, realiza transferencias y controla tus gastos con OpenPay',
};

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
