'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Globe, Monitor, AlertTriangle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface ActivityEvent {
  id: string;
  eventType: 'login' | 'logout' | 'password_changed' | 'profile_updated' | 'failed_login';
  timestamp: string;
  ipAddress: string;
  deviceInfo: string;
  location?: string;
}

export function ActivityHistory() {
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  // Fetch user activity
  useEffect(() => {
    const fetchActivityHistory = async () => {
      try {
        setIsLoading(true);
        // TODO: fetch from Supabase AuditLog when endpoint is ready
        setActivities([]);
      } catch (error) {
        console.error('Error fetching activity history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityHistory();
  }, []);

  const getEventIcon = (eventType: ActivityEvent['eventType']) => {
    switch (eventType) {
      case 'login':
        return <Monitor className="h-5 w-5 text-green-500" />;
      case 'logout':
        return <Monitor className="h-5 w-5 text-blue-500" />;
      case 'password_changed':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'profile_updated':
        return <Clock className="h-5 w-5 text-purple-500" />;
      case 'failed_login':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getEventLabel = (eventType: ActivityEvent['eventType']) => {
    switch (eventType) {
      case 'login':
        return 'Inicio de sesión';
      case 'logout':
        return 'Cierre de sesión';
      case 'password_changed':
        return 'Cambio de contraseña';
      case 'profile_updated':
        return 'Actualización de perfil';
      case 'failed_login':
        return 'Intento fallido de inicio de sesión';
      default:
        return 'Actividad desconocida';
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center space-x-3">
          <Clock className="h-6 w-6 text-primary" />
          <CardTitle>Historial de actividad</CardTitle>
        </div>
        <CardDescription>
          Revisa la actividad reciente de tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex space-x-4 py-3 border-b last:border-0">
                <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-3 w-32 bg-gray-200 animate-pulse rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-1">
            {activities.map((activity) => (
              <div key={activity.id} className="flex py-3 border-b last:border-0">
                <div className="mr-4 mt-0.5">
                  {getEventIcon(activity.eventType)}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {getEventLabel(activity.eventType)}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Globe className="h-3 w-3" />
                    <span>
                      {activity.ipAddress} · {activity.deviceInfo}
                      {activity.location && ` · ${activity.location}`}
                    </span>
                  </div>
                  
                  {activity.eventType === 'failed_login' && (
                    <div className="mt-1 text-xs text-red-600 bg-red-50 p-1.5 rounded">
                      <span className="font-medium">Alerta de seguridad:</span> Se detectó un intento fallido de inicio de sesión. Si no fuiste tú, cambia tu contraseña inmediatamente.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay actividad reciente para mostrar</p>
          </div>
        )}
      </CardContent>
      {activities.length > 0 && (
        <CardFooter className="justify-center border-t pt-4">
          <Button variant="outline" size="sm" className="text-xs">
            Ver historial completo
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 