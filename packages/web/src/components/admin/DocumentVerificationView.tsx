'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  CheckCircle,
  XCircle,
  User,
  FileText,
  RotateCw,
  AlertCircle,
  ZoomIn,
  RefreshCcw,
} from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { formatDate } from '@/lib/utils/formatters';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
  verified: boolean;
}

type ActionType = 'approve' | 'reject';

// Mock document images — in production these come from storage
const MOCK_FRONT = 'https://placehold.co/400x260/e2e8f0/64748b?text=Frente+del+Documento';
const MOCK_BACK = 'https://placehold.co/400x260/e2e8f0/64748b?text=Reverso+del+Documento';

export function DocumentVerificationView() {
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [actionType, setActionType] = useState<ActionType>('approve');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getPendingVerifications();
      setPendingUsers(data as PendingUser[]);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar las verificaciones pendientes', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const openAction = (user: PendingUser, type: ActionType) => {
    setSelectedUser(user);
    setActionType(type);
    setComments('');
    setIsDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedUser) return;
    if (actionType === 'reject' && !comments.trim()) {
      toast({ title: 'Motivo requerido', description: 'Escribe el motivo del rechazo', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      if (actionType === 'approve') {
        await adminApi.approveVerification(selectedUser.id, 'current-admin-id', 'Administrador', comments || undefined);
        toast({ title: 'Verificación aprobada', description: `${selectedUser.name} ha sido verificado correctamente.` });
      } else {
        await adminApi.rejectVerification(selectedUser.id, 'current-admin-id', 'Administrador', comments);
        toast({ title: 'Verificación rechazada', description: `Se notificará a ${selectedUser.name} con el motivo del rechazo.` });
      }
      setPendingUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setIsDialogOpen(false);
    } catch {
      toast({ title: 'Error', description: 'No se pudo procesar la acción. Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Verificación de Documentos
            </CardTitle>
            <CardDescription>
              Revisa y aprueba o rechaza las solicitudes de verificación de identidad
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPending} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <RotateCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <CheckCircle className="h-10 w-10 opacity-40" />
              <p className="font-medium">Sin verificaciones pendientes</p>
              <p className="text-sm">No hay solicitudes de identidad por revisar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map(user => (
                <div key={user.id} className="border rounded-lg p-4 space-y-4">
                  {/* User info */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">Pendiente de verificación</Badge>
                      <span className="text-xs text-muted-foreground">
                        Registrado: {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Document images */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Frente del documento', src: MOCK_FRONT },
                      { label: 'Reverso del documento', src: MOCK_BACK },
                    ].map(({ label, src }) => (
                      <div key={label} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{label}</p>
                        <div
                          className="relative border rounded-md overflow-hidden bg-muted cursor-zoom-in group"
                          onClick={() => setZoomedImage(src)}
                        >
                          <img
                            src={src}
                            alt={label}
                            className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="h-6 w-6 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white gap-1"
                      onClick={() => openAction(user, 'approve')}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => openAction(user, 'reject')}
                    >
                      <XCircle className="h-4 w-4" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve / Reject confirmation dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <><CheckCircle className="h-5 w-5 text-green-600" /> Aprobar verificación</>
              ) : (
                <><XCircle className="h-5 w-5 text-red-500" /> Rechazar verificación</>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `¿Confirmas que los documentos de ${selectedUser?.name} son válidos y auténticos?`
                : `Indica el motivo del rechazo. El usuario será notificado por correo.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {actionType === 'approve' ? (
              <div className="space-y-1">
                <Label htmlFor="approve-comments">Comentarios internos (opcional)</Label>
                <Textarea
                  id="approve-comments"
                  placeholder="Notas internas sobre la verificación..."
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  className="resize-none h-20"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="reject-reason">
                  Motivo del rechazo <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reject-reason"
                  placeholder="Ej: Imagen borrosa, documento vencido, información ilegible..."
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  className="resize-none h-24"
                />
              </div>
            )}

            <div className="bg-muted p-3 rounded-md flex items-start gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                Esta acción quedará registrada en el log de auditoría.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {isProcessing ? (
                <><RotateCw className="h-4 w-4 animate-spin mr-2" /> Procesando...</>
              ) : actionType === 'approve' ? (
                'Confirmar aprobación'
              ) : (
                'Confirmar rechazo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image zoom dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Vista ampliada</DialogTitle>
          </DialogHeader>
          {zoomedImage && (
            <img src={zoomedImage} alt="Documento ampliado" className="w-full h-auto rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
