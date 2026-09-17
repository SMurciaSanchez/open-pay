'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type Session = {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
};

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSessions = async () => {
    try {
      setLoading(true);
      // Simulated API response for demo
      const data = await Promise.resolve([
        {
          id: '1',
          device: 'Windows PC',
          browser: 'Chrome',
          location: 'Ciudad de México, México',
          ip: '187.190.xxx.xxx',
          lastActive: new Date().toISOString(),
          current: true,
        },
        {
          id: '2',
          device: 'iPhone 13',
          browser: 'Safari',
          location: 'Guadalajara, México',
          ip: '189.203.xxx.xxx',
          lastActive: new Date(Date.now() - 3600000 * 24).toISOString(),
          current: false,
        },
        {
          id: '3',
          device: 'MacBook Pro',
          browser: 'Firefox',
          location: 'Monterrey, México',
          ip: '200.56.xxx.xxx',
          lastActive: new Date(Date.now() - 3600000 * 72).toISOString(),
          current: false,
        },
      ]);

      setSessions(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las sesiones activas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleTerminateSession = async (sessionId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      toast({
        title: 'Sesión terminada',
        description: 'La sesión ha sido cerrada exitosamente.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo terminar la sesión.',
        variant: 'destructive',
      });
    }
  };

  const handleTerminateAllSessions = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const currentSession = sessions.find(session => session.current);
      setSessions(currentSession ? [currentSession] : []);
      
      toast({
        title: 'Sesiones terminadas',
        description: 'Todas las sesiones excepto la actual han sido cerradas.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron terminar las sesiones.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sesiones activas</CardTitle>
        <CardDescription>
          Administra las sesiones activas de tu cuenta en todos los dispositivos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="flex justify-between items-center p-4 border rounded-md">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.device}</span>
                      {session.current && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Sesión actual
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.browser} • {session.location}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      IP: {session.ip} • Activo: {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true, locale: es })}
                    </div>
                  </div>
                  {!session.current && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleTerminateSession(session.id)}
                    >
                      Terminar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleTerminateAllSessions}
          disabled={loading || sessions.filter(s => !s.current).length === 0}
        >
          Terminar todas las otras sesiones
        </Button>
      </CardFooter>
    </Card>
  );
} 