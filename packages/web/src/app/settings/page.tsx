'use client';

import Link from 'next/link';
import { 
  Bell, 
  Shield, 
  User, 
  CreditCard, 
  Globe, 
  HelpCircle, 
  ChevronRight 
} from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SettingCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

export default function SettingsPage() {
  const settingCards: SettingCardProps[] = [
    {
      title: 'Perfil',
      description: 'Administra tus datos personales y preferencias de cuenta',
      icon: <User className="h-6 w-6" />,
      href: '/settings/profile'
    },
    {
      title: 'Seguridad',
      description: 'Configuración de seguridad, autenticación y sesiones',
      icon: <Shield className="h-6 w-6" />,
      href: '/security'
    },
    {
      title: 'Notificaciones',
      description: 'Personaliza cómo y cuándo recibes notificaciones',
      icon: <Bell className="h-6 w-6" />,
      href: '/settings/notifications'
    },
    {
      title: 'Métodos de pago',
      description: 'Gestiona tus tarjetas y cuentas bancarias',
      icon: <CreditCard className="h-6 w-6" />,
      href: '/settings/payment-methods'
    },
    {
      title: 'Idioma y región',
      description: 'Cambia el idioma y la configuración regional',
      icon: <Globe className="h-6 w-6" />,
      href: '/settings/locale'
    },
    {
      title: 'Ayuda y soporte',
      description: 'Preguntas frecuentes y contacto con soporte',
      icon: <HelpCircle className="h-6 w-6" />,
      href: '/help'
    },
  ];

  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tu cuenta y personaliza tu experiencia.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingCards.map((card, index) => (
          <Link key={index} href={card.href} className="block">
            <Card className="h-full transition-all hover:bg-accent/50 hover:shadow-md">
              <div className="p-6 flex items-start space-x-4">
                <div className="shrink-0 rounded-full p-3 bg-primary/10 text-primary">
                  {card.icon}
                </div>
                <div className="flex-grow">
                  <h3 className="font-medium text-lg mb-1 flex items-center justify-between">
                    {card.title}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </h3>
                  <p className="text-muted-foreground text-sm">{card.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
} 