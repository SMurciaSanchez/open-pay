'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Bell, Mail, Smartphone, Shield, BellOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

type NotificationChannel = 'email' | 'push' | 'sms';
type NotificationType = 'security' | 'transactions' | 'marketing' | 'app_updates';

interface NotificationPreference {
  type: NotificationType;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  enabled: boolean;
}

const defaultPreferences: NotificationPreference[] = [
  {
    type: 'security',
    channels: { email: true, push: true, sms: true },
    enabled: true
  },
  {
    type: 'transactions',
    channels: { email: true, push: true, sms: false },
    enabled: true
  },
  {
    type: 'marketing',
    channels: { email: false, push: false, sms: false },
    enabled: false
  },
  {
    type: 'app_updates',
    channels: { email: true, push: false, sms: false },
    enabled: true
  }
];

export function NotificationsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreference[]>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleType = (type: NotificationType) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.type === type 
          ? { ...pref, enabled: !pref.enabled } 
          : pref
      )
    );
  };

  const handleToggleChannel = (type: NotificationType, channel: NotificationChannel) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.type === type 
          ? { 
              ...pref, 
              channels: { 
                ...pref.channels, 
                [channel]: !pref.channels[channel] 
              } 
            } 
          : pref
      )
    );
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);
    try {
      // TODO: persist notification preferences via API when available
      await new Promise(resolve => setTimeout(resolve, 300));
      toast({
        title: "Preferencias actualizadas",
        description: "Tus preferencias de notificaciones han sido guardadas.",
      });
    } catch (error) {
      console.error("Error al guardar preferencias:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar tus preferencias. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'security':
        return <Shield className="h-5 w-5" />;
      case 'transactions':
        return <Bell className="h-5 w-5" />;
      case 'marketing':
        return <Mail className="h-5 w-5" />;
      case 'app_updates':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getTypeName = (type: NotificationType) => {
    switch (type) {
      case 'security':
        return 'Seguridad';
      case 'transactions':
        return 'Transacciones';
      case 'marketing':
        return 'Marketing y promociones';
      case 'app_updates':
        return 'Actualizaciones de la app';
      default:
        return type;
    }
  };

  const getTypeDescription = (type: NotificationType) => {
    switch (type) {
      case 'security':
        return 'Alertas de seguridad, cambios en la cuenta, y accesos';
      case 'transactions':
        return 'Transferencias, pagos, y actividades de cuenta';
      case 'marketing':
        return 'Promociones, descuentos y noticias de OpenPay';
      case 'app_updates':
        return 'Nuevas características, actualizaciones y mejoras';
      default:
        return '';
    }
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'push':
        return <Bell className="h-4 w-4" />;
      case 'sms':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getChannelName = (channel: NotificationChannel) => {
    switch (channel) {
      case 'email':
        return 'Email';
      case 'push':
        return 'Push';
      case 'sms':
        return 'SMS';
      default:
        return channel;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Bell className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Preferencias de Notificaciones</CardTitle>
              <CardDescription>
                Personaliza cómo y cuándo deseas recibir notificaciones
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {preferences.map((pref) => (
          <div key={pref.type} className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">{getTypeIcon(pref.type)}</div>
                <div>
                  <h3 className="text-base font-medium">{getTypeName(pref.type)}</h3>
                  <p className="text-sm text-muted-foreground">{getTypeDescription(pref.type)}</p>
                </div>
              </div>
              <Switch
                checked={pref.enabled}
                onCheckedChange={() => handleToggleType(pref.type)}
              />
            </div>
            
            {pref.enabled && (
              <div className="ml-8 pl-3 border-l space-y-2">
                {(Object.keys(pref.channels) as NotificationChannel[]).map(channel => (
                  <div key={channel} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getChannelIcon(channel)}
                      <span className="text-sm">{getChannelName(channel)}</span>
                    </div>
                    <Switch
                      checked={pref.channels[channel]}
                      onCheckedChange={() => handleToggleChannel(pref.type, channel)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            <Separator />
          </div>
        ))}
        
        <div className="pt-2">
          <h3 className="text-base font-medium mb-2">Modo Silencioso</h3>
          <div className="flex items-center justify-between bg-muted/30 p-3 rounded-md">
            <div className="flex items-center space-x-3">
              <BellOff className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No molestar</p>
                <p className="text-xs text-muted-foreground">
                  Desactiva todas las notificaciones temporalmente
                </p>
              </div>
            </div>
            <Switch />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t px-6 py-4">
        <Button variant="outline">Restablecer valores predeterminados</Button>
        <Button onClick={handleSavePreferences} disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </CardFooter>
    </Card>
  );
} 