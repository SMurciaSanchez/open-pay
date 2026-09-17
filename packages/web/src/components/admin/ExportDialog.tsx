'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { 
  Download, 
  Loader2, 
  FileSpreadsheet, 
  FileText, 
  FilePieChart 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/lib/api/admin';
import {
  Card,
  CardContent
} from '@/components/ui/card';

interface ExportOption {
  format: 'excel' | 'csv' | 'pdf';
  fields: string[];
  includeHeaders: boolean;
  includeStats: boolean;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userCount: number;
  filters: any;
}

export function ExportDialog({
  open,
  onOpenChange,
  userCount,
  filters
}: ExportDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'id', 'name', 'email', 'status', 'role', 'createdAt', 'lastLogin', 'verificationStatus'
  ]);
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeStats, setIncludeStats] = useState(false);
  const [scheduleExport, setScheduleExport] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [scheduleEmail, setScheduleEmail] = useState('');

  // All available fields that can be exported
  const availableFields = [
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Nombre' },
    { id: 'email', label: 'Email' },
    { id: 'status', label: 'Estado' },
    { id: 'role', label: 'Rol' },
    { id: 'createdAt', label: 'Fecha de registro' },
    { id: 'lastLogin', label: 'Último acceso' },
    { id: 'verificationStatus', label: 'Estado de verificación' },
    { id: 'blockedUntil', label: 'Bloqueado hasta' },
    { id: 'accountBalance', label: 'Saldo de cuenta' },
    { id: 'transactionCount', label: 'Número de transacciones' },
    { id: 'riskScore', label: 'Puntuación de riesgo' },
  ];

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: 'Error',
        description: 'Selecciona al menos un campo para exportar',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const exportConfig = {
        format: exportFormat,
        fields: selectedFields,
        filters: filters,
        includeHeaders,
        includeStats,
        fileNaming: `usuarios_${new Date().toISOString().split('T')[0]}`
      };

      if (scheduleExport && scheduleEmail) {
        toast({
          title: 'Exportación programada',
          description: `Recibirás el archivo ${scheduleFrequency === 'daily' ? 'diariamente' : scheduleFrequency === 'weekly' ? 'cada semana' : 'cada mes'} en ${scheduleEmail}`,
        });
        onOpenChange(false);
        return;
      }

      // For large exports, use background task
      if (userCount > 1000) {
        const taskId = await adminApi.startExportTask(exportConfig);
        
        toast({
          title: 'Exportación iniciada',
          description: 'Recibirás un correo cuando el archivo esté listo para descargar',
        });
        
        onOpenChange(false);
      } else {
        // For smaller exports, download directly
        const downloadUrl = await adminApi.exportData(exportConfig);
        
        // Create a link and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `usuarios_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: 'Exportación completada',
          description: 'El archivo se ha descargado correctamente',
        });
        
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al exportar los datos. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleField = (field: string) => {
    setSelectedFields(current => 
      current.includes(field)
        ? current.filter(f => f !== field)
        : [...current, field]
    );
  };

  // Format icon based on selected format
  const getFormatIcon = () => {
    switch (exportFormat) {
      case 'excel':
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
      case 'csv':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'pdf':
        return <FilePieChart className="h-5 w-5 text-red-600" />;
      default:
        return <Download className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Usuarios
          </DialogTitle>
          <DialogDescription>
            Personaliza la exportación de datos de usuarios
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Formato de exportación</Label>
            <div className="grid grid-cols-3 gap-3">
              <Card 
                className={`cursor-pointer border-2 transition-colors ${
                  exportFormat === 'excel' ? 'border-green-600/50 bg-green-50/50' : 'hover:border-green-200 hover:bg-green-50/20'
                }`}
                onClick={() => setExportFormat('excel')}
              >
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <FileSpreadsheet className={`h-8 w-8 mb-2 ${exportFormat === 'excel' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${exportFormat === 'excel' ? 'text-green-700' : ''}`}>Excel</span>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer border-2 transition-colors ${
                  exportFormat === 'csv' ? 'border-blue-600/50 bg-blue-50/50' : 'hover:border-blue-200 hover:bg-blue-50/20'
                }`}
                onClick={() => setExportFormat('csv')}
              >
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <FileText className={`h-8 w-8 mb-2 ${exportFormat === 'csv' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${exportFormat === 'csv' ? 'text-blue-700' : ''}`}>CSV</span>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer border-2 transition-colors ${
                  exportFormat === 'pdf' ? 'border-red-600/50 bg-red-50/50' : 'hover:border-red-200 hover:bg-red-50/20'
                }`}
                onClick={() => setExportFormat('pdf')}
              >
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <FilePieChart className={`h-8 w-8 mb-2 ${exportFormat === 'pdf' ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${exportFormat === 'pdf' ? 'text-red-700' : ''}`}>PDF</span>
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {exportFormat === 'excel' && 'Formato Excel para manipulación avanzada de datos.'}
              {exportFormat === 'csv' && 'Formato CSV para compatibilidad con múltiples programas.'}
              {exportFormat === 'pdf' && 'Formato PDF para reportes formales e impresión.'}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Campos a exportar</Label>
            <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {availableFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`field-${field.id}`} 
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                    />
                    <Label 
                      htmlFor={`field-${field.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Seleccionados {selectedFields.length} de {availableFields.length} campos.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-headers" 
                checked={includeHeaders}
                onCheckedChange={(checked) => setIncludeHeaders(!!checked)}
              />
              <Label htmlFor="include-headers" className="cursor-pointer">
                Incluir encabezados de columnas
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-stats" 
                checked={includeStats}
                onCheckedChange={(checked) => setIncludeStats(!!checked)}
              />
              <Label htmlFor="include-stats" className="cursor-pointer">
                Incluir estadísticas y resumen
              </Label>
            </div>
          </div>

          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="schedule-export"
                checked={scheduleExport}
                onCheckedChange={(checked) => setScheduleExport(!!checked)}
              />
              <Label htmlFor="schedule-export" className="cursor-pointer font-medium">
                Programar exportación periódica
              </Label>
            </div>

            {scheduleExport && (
              <div className="pl-6 space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm">Frecuencia</Label>
                  <Select value={scheduleFrequency} onValueChange={(v) => setScheduleFrequency(v as typeof scheduleFrequency)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diaria</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="schedule-email" className="text-sm">Enviar a (correo)</Label>
                  <input
                    id="schedule-email"
                    type="email"
                    placeholder="admin@openpay.com"
                    value={scheduleEmail}
                    onChange={(e) => setScheduleEmail(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Recibirás el archivo automáticamente según la frecuencia seleccionada.
                </p>
              </div>
            )}
          </div>

          <div className="bg-muted rounded-md p-3 text-sm">
            <div className="flex items-start gap-2">
              <div>
                <p>
                  <span className="font-medium">Resumen de la exportación:</span> {userCount} usuarios
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  La exportación incluirá los usuarios que coincidan con los filtros aplicados.
                  {userCount > 1000 && ' Los archivos grandes se procesarán en segundo plano.'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isProcessing || selectedFields.length === 0}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                {getFormatIcon()}
                Exportar {userCount > 1000 ? '(Tarea en segundo plano)' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 