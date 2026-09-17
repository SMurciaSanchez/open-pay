'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils/formatters';
import { adminApi } from '@/lib/api/admin';
import {
  Search,
  ClipboardList,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  User,
  Download,
  Lock,
  Unlock,
  Eye,
  RotateCw,
  RefreshCcw,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Types
interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminId: string;
  action: string;
  targetId?: string;
  details: Record<string, any>;
}

interface AuditLogFilters {
  adminId?: string;
  action?: string;
  targetId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const logsPerPage = 10;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getAuditLogs(filters);
      setLogs(data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const filterByAction = (action: string) => {
    setFilters(prev => ({ ...prev, action }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPage(1);
  };

  const viewLogDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };

  // Get action badge based on action type
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'BLOCK_USER':
        return <Badge variant="destructive" className="flex items-center gap-1"><Lock className="h-3 w-3" /> Bloquear Usuario</Badge>;
      case 'UNBLOCK_USER':
        return <Badge className="bg-green-500 flex items-center gap-1"><Unlock className="h-3 w-3" /> Desbloquear Usuario</Badge>;
      case 'EXPORT_USERS':
        return <Badge className="bg-blue-500 flex items-center gap-1"><Download className="h-3 w-3" /> Exportar Usuarios</Badge>;
      case 'UPDATE_USER':
        return <Badge className="bg-amber-500 flex items-center gap-1"><User className="h-3 w-3" /> Actualizar Usuario</Badge>;
      case 'VERIFY_USER':
        return <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Verificar Usuario</Badge>;
      case 'REJECT_VERIFICATION':
        return <Badge className="bg-orange-500 flex items-center gap-1"><XCircle className="h-3 w-3" /> Rechazar Verificación</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  // Format the details summary
  const getDetailsSummary = (action: string, details: Record<string, any>) => {
    switch (action) {
      case 'BLOCK_USER':
        return `${details.permanent ? 'Bloqueo permanente' : `Bloqueo temporal por ${details.durationDays} días`}`;
      case 'UNBLOCK_USER':
        return `Razón: ${details.reason}`;
      case 'EXPORT_USERS':
        return `Formato: ${details.format.toUpperCase()}, Campos: ${details.fields?.length || 0}`;
      default:
        return 'Ver detalles';
    }
  };

  // Filter logs by search term (client-side)
  const filteredLogs = searchTerm
    ? logs.filter(log => 
        log.id.includes(searchTerm) || 
        log.adminId.includes(searchTerm) || 
        log.action.includes(searchTerm) || 
        (log.targetId && log.targetId.includes(searchTerm))
      )
    : logs;

  // Paginate logs
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * logsPerPage,
    page * logsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Registro de Auditoría
        </CardTitle>
        <CardDescription>
          Historial de acciones administrativas y cambios en la plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID o administrador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={filters.action || ''}
                onValueChange={(val) => filterByAction(val || '')}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Filtrar por acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las acciones</SelectItem>
                  <SelectItem value="BLOCK_USER">Bloquear Usuario</SelectItem>
                  <SelectItem value="UNBLOCK_USER">Desbloquear Usuario</SelectItem>
                  <SelectItem value="EXPORT_USERS">Exportar Usuarios</SelectItem>
                  <SelectItem value="UPDATE_USER">Actualizar Usuario</SelectItem>
                  <SelectItem value="VERIFY_USER">Verificar Usuario</SelectItem>
                  <SelectItem value="REJECT_VERIFICATION">Rechazar Verificación</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9"
                onClick={clearFilters}
                disabled={!Object.keys(filters).length && !searchTerm}
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9"
                onClick={fetchLogs}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-6">
              <RotateCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Administrador</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>ID Objetivo</TableHead>
                    <TableHead>Detalles</TableHead>
                    <TableHead className="text-right">Ver</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No se encontraron registros
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {formatDate(log.timestamp, true)}
                        </TableCell>
                        <TableCell>{log.adminId}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          {log.targetId || '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {getDetailsSummary(log.action, log.details)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => viewLogDetails(log)} 
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {paginatedLogs.length} de {filteredLogs.length} registros
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm mx-2">
                  Página {page} de {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Detalles de la Acción
            </DialogTitle>
            <DialogDescription>
              Información detallada sobre la acción administrativa
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">ID de Registro</h4>
                  <p className="text-sm text-muted-foreground">{selectedLog.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Fecha y Hora</h4>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedLog.timestamp, true)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Administrador</h4>
                  <p className="text-sm text-muted-foreground">{selectedLog.adminId}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Acción</h4>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <h4 className="text-sm font-medium">ID Objetivo</h4>
                  <p className="text-sm text-muted-foreground">{selectedLog.targetId || '-'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Detalles</h4>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
              
              {/* Conditional rendering based on action type */}
              {selectedLog.action === 'BLOCK_USER' && (
                <div className="bg-red-50 p-3 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        {selectedLog.details.permanent 
                          ? 'Bloqueo permanente de usuario' 
                          : `Bloqueo temporal por ${selectedLog.details.durationDays} días`}
                      </p>
                      <p className="text-sm text-red-600">
                        Razón: {selectedLog.details.reason}
                      </p>
                      {selectedLog.details.comments && (
                        <p className="text-sm text-red-600 mt-1">
                          Comentarios: {selectedLog.details.comments}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {selectedLog.action === 'UNBLOCK_USER' && (
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="flex items-start gap-2">
                    <Unlock className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Usuario desbloqueado
                      </p>
                      <p className="text-sm text-green-600">
                        Por: {selectedLog.details.adminName || selectedLog.adminId}
                      </p>
                      {selectedLog.details.reason && (
                        <p className="text-sm text-green-600">
                          Razón: {selectedLog.details.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end">
            <Button onClick={() => setIsDetailsOpen(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 