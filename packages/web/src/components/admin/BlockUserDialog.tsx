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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserX, AlertCircle, Ban, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
  } | null;
  onBlock: (
    userId: string, 
    reason: string, 
    duration: 'temporary' | 'permanent', 
    durationDays: number | undefined,
    notifyUser: boolean,
    comments?: string
  ) => Promise<void>;
  currentAdminId?: string;
  currentAdminName?: string;
}

// Predefined reasons to block a user
const blockReasons = [
  { value: 'suspicious_activity', label: 'Actividad sospechosa' },
  { value: 'terms_violation', label: 'Violación de términos de servicio' },
  { value: 'security_concern', label: 'Preocupación de seguridad' },
  { value: 'identity_verification', label: 'Pendiente de verificación de identidad' },
  { value: 'user_requested', label: 'Solicitado por el usuario' },
  { value: 'other', label: 'Otro' },
];

export function BlockUserDialog({ 
  open, 
  onOpenChange, 
  user, 
  onBlock,
  currentAdminId = 'admin-1',
  currentAdminName = 'Administrador'
}: BlockUserDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [blockDuration, setBlockDuration] = useState<'temporary' | 'permanent'>('temporary');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [notifyUser, setNotifyUser] = useState<boolean>(true);
  const [adminComments, setAdminComments] = useState<string>('');

  // Reset state when dialog opens or closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setSelectedReason('');
      setCustomReason('');
      setBlockDuration('temporary');
      setDurationDays(7);
      setNotifyUser(true);
      setAdminComments('');
      setIsProcessing(false);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    // Validate form
    if (!selectedReason) {
      toast({
        title: 'Se requiere un motivo',
        description: 'Por favor selecciona un motivo para el bloqueo',
        variant: 'destructive',
      });
      return;
    }
    
    // If reason is "other", ensure custom reason is provided
    if (selectedReason === 'other' && !customReason.trim()) {
      toast({
        title: 'Se requiere un motivo personalizado',
        description: 'Por favor especifica el motivo del bloqueo',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // Determine the final reason text
      const finalReason = selectedReason === 'other' 
        ? customReason 
        : blockReasons.find(r => r.value === selectedReason)?.label || '';
      
      // Call the onBlock function provided by the parent
      await onBlock(
        user.id, 
        finalReason, 
        blockDuration, 
        blockDuration === 'temporary' ? durationDays : undefined,
        notifyUser,
        adminComments
      );
      
      // Close dialog after successful block
      handleOpenChange(false);
      
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: 'Error',
        description: 'No se pudo bloquear al usuario. Intente nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle duration day selection
  const handleDurationDaysChange = (value: string) => {
    setDurationDays(parseInt(value, 10));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {user?.status === 'suspended' ? (
              <>
                <Ban className="h-5 w-5 text-green-500" />
                Desbloquear Usuario
              </>
            ) : (
              <>
                <UserX className="h-5 w-5 text-red-500" />
                Bloquear Usuario
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {user?.status === 'suspended' 
              ? `¿Estás seguro que deseas desbloquear a ${user?.name}?` 
              : `Especifica el motivo y la duración del bloqueo para ${user?.name}`}
          </DialogDescription>
        </DialogHeader>
        
        {user?.status !== 'suspended' ? (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo del bloqueo <span className="text-red-500">*</span></Label>
              <Select
                value={selectedReason}
                onValueChange={setSelectedReason}
              >
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Selecciona un motivo" />
                </SelectTrigger>
                <SelectContent>
                  {blockReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedReason === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Especificar motivo <span className="text-red-500">*</span></Label>
                <Textarea
                  id="customReason"
                  placeholder="Describe el motivo del bloqueo..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="resize-none"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Duración del bloqueo <span className="text-red-500">*</span></Label>
              <RadioGroup value={blockDuration} onValueChange={(v) => setBlockDuration(v as 'temporary' | 'permanent')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="temporary" id="temporary" />
                  <Label htmlFor="temporary" className="flex items-center gap-2 cursor-pointer">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Temporal
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="permanent" id="permanent" />
                  <Label htmlFor="permanent" className="flex items-center gap-2 cursor-pointer">
                    <Ban className="h-4 w-4 text-red-500" />
                    Permanente
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {blockDuration === 'temporary' && (
              <div className="space-y-2">
                <Label htmlFor="durationDays">Días de bloqueo</Label>
                <Select
                  value={durationDays.toString()}
                  onValueChange={handleDurationDaysChange}
                >
                  <SelectTrigger id="durationDays">
                    <SelectValue placeholder="Selecciona la duración" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 día</SelectItem>
                    <SelectItem value="3">3 días</SelectItem>
                    <SelectItem value="7">7 días</SelectItem>
                    <SelectItem value="14">14 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                    <SelectItem value="90">90 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="adminComments">Comentarios internos (opcional)</Label>
              <Textarea
                id="adminComments"
                placeholder="Añade comentarios adicionales sobre esta acción..."
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                className="resize-none h-20"
              />
              <p className="text-xs text-muted-foreground">
                Estos comentarios son solo para uso interno y no serán visibles para el usuario.
              </p>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="notifyUser" 
                checked={notifyUser} 
                onCheckedChange={(checked) => setNotifyUser(checked as boolean)}
              />
              <Label htmlFor="notifyUser" className="cursor-pointer">
                Notificar al usuario por correo electrónico
              </Label>
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Información importante</p>
                  <p className="text-muted-foreground">
                    Esta acción será registrada como realizada por {currentAdminName} el {formatDate(new Date().toISOString())}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              El usuario se encuentra actualmente bloqueado. Al desbloquearlo, se le restaurará el acceso completo a la plataforma.
            </p>
            <div className="mt-4 bg-muted p-3 rounded-lg">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-muted-foreground">
                    Esta acción será registrada como realizada por {currentAdminName} el {formatDate(new Date().toISOString())}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isProcessing}
            variant={user?.status === 'suspended' ? 'default' : 'destructive'}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : user?.status === 'suspended' ? (
              'Desbloquear Usuario'
            ) : (
              'Bloquear Usuario'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 