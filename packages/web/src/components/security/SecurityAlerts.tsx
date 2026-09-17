import React, { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardFooter, 
  CardHeader, CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, ShieldAlert, Clock, CheckCircle, 
  AlertOctagon, Filter, RefreshCw 
} from 'lucide-react';
import { 
  SecurityDetectionService, 
  SecurityAlert, 
  AlertStatus 
} from '@/lib/security/securityDetectionService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

const severityIcons = {
  low: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  medium: <ShieldAlert className="h-4 w-4 text-orange-500" />,
  high: <AlertOctagon className="h-4 w-4 text-red-500" />,
};

const statusColors = {
  new: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  reviewing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  false_positive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const alertTypeLabels = {
  unusual_location: 'Ubicación Inusual',
  high_amount: 'Monto Elevado',
  multiple_attempts: 'Intentos Múltiples',
  unusual_pattern: 'Patrón Inusual',
  ip_change: 'Cambio de IP',
  device_change: 'Cambio de Dispositivo',
  velocity: 'Transacciones Veloces',
};

interface AlertDetailProps {
  alert: SecurityAlert;
  onStatusChange: (id: string, status: AlertStatus) => Promise<void>;
}

function AlertDetail({ alert, onStatusChange }: AlertDetailProps) {
  const [status, setStatus] = useState<AlertStatus>(alert.status);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: AlertStatus) => {
    setUpdating(true);
    setStatus(newStatus);
    await onStatusChange(alert.id, newStatus);
    setUpdating(false);
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {severityIcons[alert.severity]}
          {alertTypeLabels[alert.type] || alert.type}
        </DialogTitle>
        <DialogDescription>
          {alert.description}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Detalles del Alerta</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="font-medium">ID:</span>
            <span>{alert.id.slice(0, 8)}...</span>
            
            <span className="font-medium">Fecha:</span>
            <span>{format(new Date(alert.timestamp), 'dd/MM/yyyy HH:mm')}</span>
            
            <span className="font-medium">Severidad:</span>
            <span className="flex items-center gap-1">
              {severityIcons[alert.severity]} {alert.severity}
            </span>
            
            <span className="font-medium">Estado:</span>
            <Badge className={statusColors[status]}>
              {status === 'new' ? 'Nuevo' : 
               status === 'reviewing' ? 'En Revisión' : 
               status === 'resolved' ? 'Resuelto' : 
               'Falso Positivo'}
            </Badge>
          </div>
        </div>
        
        {alert.metadata && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Información Adicional</h4>
            <div className="rounded-md bg-muted p-3 text-xs font-mono">
              {Object.entries(alert.metadata).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-2">
                  <span>{key}:</span>
                  <span>{JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        {status !== 'resolved' && (
          <Button 
            variant="outline" 
            onClick={() => handleStatusChange('resolved')}
            disabled={updating}
          >
            {updating ? (
              <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Actualizando...</>
            ) : (
              <>Marcar como Resuelto</>
            )}
          </Button>
        )}
        {status !== 'false_positive' && (
          <Button 
            variant="secondary"
            onClick={() => handleStatusChange('false_positive')}
            disabled={updating}
          >
            Falso Positivo
          </Button>
        )}
        {status === 'new' && (
          <Button 
            onClick={() => handleStatusChange('reviewing')}
            disabled={updating}
          >
            Iniciar Revisión
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

interface SecurityAlertsProps {
  userId?: string;
  limit?: number;
  showFilters?: boolean;
  showHeader?: boolean;
  className?: string;
}

export default function SecurityAlerts({
  userId,
  limit = 5,
  showFilters = true,
  showHeader = true,
  className = '',
}: SecurityAlertsProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AlertStatus | 'all'>('all');
  const [total, setTotal] = useState(0);
  
  const securityService = SecurityDetectionService.getInstance();
  
  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const options: any = { limit };
      if (userId) options.userId = userId;
      if (activeTab !== 'all') options.status = activeTab;
      
      const result = await securityService.getAlerts(options);
      setAlerts(result.alerts);
      setFilteredAlerts(result.alerts);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError('Error al cargar alertas de seguridad');
      console.error('Error fetching security alerts:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAlertStatusChange = async (alertId: string, status: AlertStatus) => {
    try {
      await securityService.updateAlertStatus(alertId, status);
      // Update the alerts in state
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId ? { ...alert, status } : alert
        )
      );
      setFilteredAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId ? { ...alert, status } : alert
        )
      );
    } catch (err) {
      console.error('Error updating alert status:', err);
    }
  };
  
  useEffect(() => {
    fetchAlerts();
    
    // Set up real-time alert subscription
    const unsubscribe = securityService.subscribe((newAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
      if (activeTab === 'all' || activeTab === newAlert.status) {
        setFilteredAlerts(prev => [newAlert, ...prev]);
      }
      setTotal(prev => prev + 1);
    });
    
    return () => {
      unsubscribe();
    };
  }, [activeTab, userId, limit]);
  
  // Filter alerts based on tab selection
  useEffect(() => {
    if (activeTab === 'all') {
      setFilteredAlerts(alerts);
    } else {
      setFilteredAlerts(alerts.filter(alert => alert.status === activeTab));
    }
  }, [activeTab, alerts]);
  
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle>Alertas de Seguridad</CardTitle>
          <CardDescription>
            Monitoreo de actividad sospechosa y alertas de seguridad.
          </CardDescription>
        </CardHeader>
      )}
      
      {showFilters && (
        <div className="px-6 pb-2">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as AlertStatus | 'all')}
            className="w-full"
          >
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="all">Todas ({total})</TabsTrigger>
              <TabsTrigger value="new">
                Nuevas ({alerts.filter(a => a.status === 'new').length})
              </TabsTrigger>
              <TabsTrigger value="reviewing">
                En Revisión ({alerts.filter(a => a.status === 'reviewing').length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resueltas ({alerts.filter(a => a.status === 'resolved').length})
              </TabsTrigger>
              <TabsTrigger value="false_positive">
                Falsos Positivos ({alerts.filter(a => a.status === 'false_positive').length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6 text-destructive">
            <AlertTriangle className="h-10 w-10 mx-auto mb-2" />
            <p>{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAlerts}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
            </Button>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <ShieldAlert className="h-12 w-12 mx-auto mb-3" />
            <p className="text-lg font-medium">No hay alertas</p>
            <p className="text-sm">
              No se encontraron alertas de seguridad {activeTab !== 'all' ? `con estado "${activeTab}"` : ''}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <Dialog key={alert.id}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="mt-1">
                          {severityIcons[alert.severity]}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-sm">
                              {alertTypeLabels[alert.type] || alert.type}
                            </h4>
                            <Badge className={statusColors[alert.status]}>
                              {alert.status === 'new' ? 'Nuevo' : 
                               alert.status === 'reviewing' ? 'En Revisión' : 
                               alert.status === 'resolved' ? 'Resuelto' : 
                               'Falso Positivo'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {alert.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(alert.timestamp), 'dd/MM/yyyy HH:mm')}
                            </span>
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              Ver Detalles
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <AlertDetail 
                    alert={alert} 
                    onStatusChange={handleAlertStatusChange} 
                  />
                </Dialog>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchAlerts}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
        
        {total > filteredAlerts.length && (
          <Button variant="link" size="sm">
            Ver todas las alertas ({total})
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 