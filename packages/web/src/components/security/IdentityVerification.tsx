'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FileUpload } from '@/components/ui/file-upload';
import { 
  CheckCircle2, 
  AlertCircle, 
  FileUp, 
  X, 
  Upload, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

type VerificationStatus = 'idle' | 'pending' | 'verified' | 'rejected';

interface DocumentData {
  documentType: string;
  documentNumber: string;
  frontImage: File | null;
  backImage: File | null;
}

// Imagen con controles de zoom y eliminación
interface PreviewImageProps {
  imageUrl: string;
  onRemove: () => void;
  title: string;
}

const PreviewImage = ({ imageUrl, onRemove, title }: PreviewImageProps) => {
  const [zoom, setZoom] = useState(1);
  
  return (
    <div className="relative flex flex-col h-full">
      <div className="absolute top-0 right-0 flex space-x-1 p-1 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full bg-white/80 hover:bg-white/90 text-gray-700"
                onClick={() => setZoom(prev => Math.min(prev + 0.25, 2))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Acercar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full bg-white/80 hover:bg-white/90 text-gray-700"
                onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Alejar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full bg-white/80 hover:bg-red-100 text-red-600"
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Eliminar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <p className="text-sm font-medium mb-2">{title}</p>
      
      <div className="border rounded-lg flex-1 overflow-hidden flex items-center justify-center bg-gray-50">
        <div
          className="relative transform-gpu transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-48 object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export function IdentityVerification() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [formData, setFormData] = useState<DocumentData>({
    documentType: 'dni',
    documentNumber: '',
    frontImage: null,
    backImage: null
  });
  
  // Para previsualización de imágenes
  const [previewUrls, setPreviewUrls] = useState<{
    front: string | null;
    back: string | null;
  }>({
    front: null,
    back: null
  });
  
  // Estado para validaciones
  const [validationProgress, setValidationProgress] = useState<{
    front: number;
    back: number;
  }>({
    front: 0,
    back: 0
  });
  
  const [validationResults, setValidationResults] = useState<{
    front: {isValid: boolean; message: string} | null;
    back: {isValid: boolean; message: string} | null;
  }>({
    front: null,
    back: null
  });
  
  const [isShowingConfirmation, setIsShowingConfirmation] = useState(false);
  
  // Limpiar las URLs de previsualización al desmontar
  useEffect(() => {
    return () => {
      if (previewUrls.front) URL.revokeObjectURL(previewUrls.front);
      if (previewUrls.back) URL.revokeObjectURL(previewUrls.back);
    };
  }, []);

  // Función para manejar cambios en los inputs de texto
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Función para manejar la carga de imágenes con previsualización
  const handleFileUpload = (name: 'frontImage' | 'backImage', file: File | null) => {
    // Actualizar formData
    setFormData(prev => ({ ...prev, [name]: file }));
    
    // Limpiar URL previa si existe
    const previewKey = name === 'frontImage' ? 'front' : 'back';
    if (previewUrls[previewKey]) {
      URL.revokeObjectURL(previewUrls[previewKey]!);
    }
    
    // Generar nueva URL si hay archivo
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => ({ ...prev, [previewKey]: url }));
      
      // Iniciar validación
      validateImage(file, previewKey);
    } else {
      setPreviewUrls(prev => ({ ...prev, [previewKey]: null }));
      setValidationResults(prev => ({ ...prev, [previewKey]: null }));
    }
  };
  
  // Función para eliminar una imagen
  const handleRemoveImage = (type: 'front' | 'back') => {
    const fileKey = type === 'front' ? 'frontImage' : 'backImage';
    
    // Limpiar URL
    if (previewUrls[type]) {
      URL.revokeObjectURL(previewUrls[type]!);
    }
    
    // Actualizar estados
    setFormData(prev => ({ ...prev, [fileKey]: null }));
    setPreviewUrls(prev => ({ ...prev, [type]: null }));
    setValidationResults(prev => ({ ...prev, [type]: null }));
    setValidationProgress(prev => ({ ...prev, [type]: 0 }));
  };
  
  // Simulación de validación de calidad de imagen
  const validateImage = (file: File, type: 'front' | 'back') => {
    // Inicializar progreso
    setValidationProgress(prev => ({ ...prev, [type]: 5 }));
    setValidationResults(prev => ({ ...prev, [type]: null }));
    
    // En una implementación real, aquí se llamaría a una API para validar la imagen
    // Simulamos el proceso con un temporizador
    
    const totalSteps = 5;
    let currentStep = 1;
    
    const interval = setInterval(() => {
      if (currentStep <= totalSteps) {
        setValidationProgress(prev => ({ 
          ...prev, 
          [type]: Math.min(Math.round((currentStep / totalSteps) * 100), 95) 
        }));
        currentStep++;
      } else {
        clearInterval(interval);
        
        // Validación completada (simulada)
        setValidationProgress(prev => ({ ...prev, [type]: 100 }));
        
        // Simular resultado (en producción sería el resultado real de la API)
        // Por ahora, simulamos que todas las imágenes son válidas
        setValidationResults(prev => ({ 
          ...prev, 
          [type]: { 
            isValid: true, 
            message: 'Imagen válida' 
          }
        }));
      }
    }, 500);
  };

  // Función para manejar el envío del formulario
  const handleSubmit = () => {
    // Validar que todos los campos estén completos
    if (!formData.documentNumber.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Por favor, ingrese el número de documento",
        variant: "destructive",
      });
      return;
    }

    if (!formData.frontImage || !formData.backImage) {
      toast({
        title: "Imágenes requeridas",
        description: "Por favor, suba ambos lados del documento",
        variant: "destructive",
      });
      return;
    }

    // Validar resultados de calidad de imagen
    const frontValid = validationResults.front?.isValid;
    const backValid = validationResults.back?.isValid;
    
    if (!frontValid || !backValid) {
      toast({
        title: "Imágenes no válidas",
        description: "Una o más imágenes no cumplen con los requisitos de calidad",
        variant: "destructive",
      });
      return;
    }
    
    // Mostrar diálogo de confirmación
    setIsShowingConfirmation(true);
  };
  
  // Función para enviar los datos después de la confirmación
  const handleConfirmSubmit = async () => {
    setLoading(true);
    setIsShowingConfirmation(false);
    
    try {
      // Simulación de envío (en producción sería una llamada real a la API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Actualizar estado
      setVerificationStatus('pending');
      
      // Notificar al usuario
      toast({
        title: "Verificación en proceso",
        description: "Tus documentos han sido enviados y están siendo revisados. Te notificaremos cuando el proceso esté completo.",
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast({
        title: "Error al enviar",
        description: "Ocurrió un problema al enviar tus documentos. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Renderizar diferentes estados según el estado de verificación
  return (
    <div className="flex flex-col items-stretch">
      {verificationStatus === 'verified' && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <CardTitle>Identidad Verificada</CardTitle>
            </div>
            <CardDescription>
              Tu identidad ha sido verificada correctamente.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {verificationStatus === 'rejected' && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Verificación Rechazada</CardTitle>
            </div>
            <CardDescription>
              Lo sentimos, tu verificación de identidad ha sido rechazada.
              Por favor, intenta nuevamente con documentos más claros.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={() => setVerificationStatus('idle')}
              variant="outline"
            >
              Intentar nuevamente
            </Button>
          </CardFooter>
        </Card>
      )}

      {verificationStatus === 'pending' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-600">
              <RotateCw className="h-5 w-5 animate-spin" />
              <CardTitle>Verificación en Proceso</CardTitle>
            </div>
            <CardDescription>
              Estamos revisando tus documentos. Este proceso puede tomar hasta 24 horas.
              Te notificaremos cuando esté completo.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {(verificationStatus === 'idle') && (
        <Card>
          <CardHeader>
            <CardTitle>Verificación de Identidad</CardTitle>
            <CardDescription>
              Para verificar tu identidad, por favor sube una foto clara de tu documento de identidad (ambos lados).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="documentType">Tipo de Documento</Label>
                  <select
                    id="documentType"
                    name="documentType"
                    value={formData.documentType}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="dni">DNI</option>
                    <option value="passport">Pasaporte</option>
                    <option value="driver_license">Licencia de Conducir</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="documentNumber">Número de Documento</Label>
                  <Input
                    id="documentNumber"
                    name="documentNumber"
                    value={formData.documentNumber}
                    onChange={handleChange}
                    placeholder="Ingresa el número de tu documento"
                    className="mt-1"
                  />
                </div>

                <div className="pt-2">
                  <Label>Imágenes del documento</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
                    {/* Lado frontal */}
                    <div className="space-y-2">
                      {!previewUrls.front ? (
                        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors h-48 cursor-pointer relative overflow-hidden">
                          {/* Guía de posicionamiento con overlay */}
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="h-full w-full flex items-center justify-center">
                              <div className="border-2 border-dashed border-primary/40 rounded-md w-5/6 h-3/5 flex items-center justify-center">
                                <div className="text-xs text-primary/60 max-w-[80%] text-center bg-white/80 px-2 py-1 rounded">
                                  Alinea tu documento dentro de este marco
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Label 
                            htmlFor="frontImageUpload"
                            className="cursor-pointer flex flex-col items-center justify-center z-10"
                          >
                            <Upload className="h-10 w-10 text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-900">Lado frontal</span>
                            <span className="text-xs text-gray-500 mt-1">Haz clic para subir</span>
                            <input
                              id="frontImageUpload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleFileUpload('frontImage', file);
                              }}
                            />
                          </Label>
                        </div>
                      ) : (
                        <div className="h-48">
                          <PreviewImage 
                            imageUrl={previewUrls.front} 
                            onRemove={() => handleRemoveImage('front')}
                            title="Lado frontal"
                          />
                          
                          {/* Indicador de progreso de validación */}
                          {validationProgress.front < 100 && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                <span className="text-xs text-primary">Validando imagen...</span>
                              </div>
                              <Progress value={validationProgress.front} className="h-1 mt-1" />
                            </div>
                          )}
                          
                          {/* Resultado de validación */}
                          {validationResults.front && (
                            <div className={`mt-1 text-xs flex items-center gap-1 ${
                              validationResults.front.isValid ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {validationResults.front.isValid ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <AlertCircle className="h-3 w-3" />
                              )}
                              <span>{validationResults.front.message}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Lado trasero */}
                    <div className="space-y-2">
                      {!previewUrls.back ? (
                        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors h-48 cursor-pointer relative overflow-hidden">
                          {/* Guía de posicionamiento con overlay */}
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="h-full w-full flex items-center justify-center">
                              <div className="border-2 border-dashed border-primary/40 rounded-md w-5/6 h-3/5 flex items-center justify-center">
                                <div className="text-xs text-primary/60 max-w-[80%] text-center bg-white/80 px-2 py-1 rounded">
                                  Alinea tu documento dentro de este marco
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Label 
                            htmlFor="backImageUpload"
                            className="cursor-pointer flex flex-col items-center justify-center z-10"
                          >
                            <Upload className="h-10 w-10 text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-900">Lado trasero</span>
                            <span className="text-xs text-gray-500 mt-1">Haz clic para subir</span>
                            <input
                              id="backImageUpload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleFileUpload('backImage', file);
                              }}
                            />
                          </Label>
                        </div>
                      ) : (
                        <div className="h-48">
                          <PreviewImage 
                            imageUrl={previewUrls.back} 
                            onRemove={() => handleRemoveImage('back')}
                            title="Lado trasero"
                          />
                          
                          {/* Indicador de progreso de validación */}
                          {validationProgress.back < 100 && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                <span className="text-xs text-primary">Validando imagen...</span>
                              </div>
                              <Progress value={validationProgress.back} className="h-1 mt-1" />
                            </div>
                          )}
                          
                          {/* Resultado de validación */}
                          {validationResults.back && (
                            <div className={`mt-1 text-xs flex items-center gap-1 ${
                              validationResults.back.isValid ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {validationResults.back.isValid ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <AlertCircle className="h-3 w-3" />
                              )}
                              <span>{validationResults.back.message}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              
                <div className="text-sm text-muted-foreground space-y-1 bg-blue-50 p-3 rounded-md border border-blue-100">
                  <p>• El documento debe estar vigente y todas las esquinas deben ser visibles</p>
                  <p>• Asegúrate de que el texto sea legible y la foto clara (sin reflejos)</p>
                  <p>• La foto debe mostrar todo el documento, incluyendo los bordes</p>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !formData.frontImage || !formData.backImage}
            >
              {loading ? 'Enviando...' : 'Verificar mi identidad'}
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Diálogo de confirmación */}
      <Dialog open={isShowingConfirmation} onOpenChange={setIsShowingConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar envío</DialogTitle>
            <DialogDescription>
              Revisa que las imágenes de tu documento sean claras y legibles antes de continuar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            {previewUrls.front && (
              <div className="border rounded-md p-2">
                <p className="text-xs font-medium mb-1">Frente</p>
                <img 
                  src={previewUrls.front} 
                  alt="Frente del documento" 
                  className="w-full h-auto object-contain max-h-32"
                />
              </div>
            )}
            
            {previewUrls.back && (
              <div className="border rounded-md p-2">
                <p className="text-xs font-medium mb-1">Reverso</p>
                <img 
                  src={previewUrls.back} 
                  alt="Reverso del documento" 
                  className="w-full h-auto object-contain max-h-32"
                />
              </div>
            )}
          </div>
          
          <div className="bg-amber-50 p-3 rounded-md border border-amber-100 text-sm">
            <p className="text-amber-800 font-medium">Importante</p>
            <p className="text-amber-700 text-xs mt-1">
              Al enviar tu documento, confirmas que las imágenes son legibles y auténticas.
              Este proceso puede tomar hasta 24 horas en completarse.
            </p>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleConfirmSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Confirmar y enviar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 