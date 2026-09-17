import { Metadata } from 'next';
import DashboardLayout from '@/components/layouts/DashboardLayout';

// Todas las secciones con sesión comparten el menú lateral.
// El grupo (app) no cambia las URLs: /dashboard, /transactions, /support…
export const metadata: Metadata = {
  title: 'OpenPay',
  description: 'Trazabilidad verificable para quien administra dinero ajeno, y privacidad para las personas.',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
