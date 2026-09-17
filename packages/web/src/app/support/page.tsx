'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactForm } from '@/components/support/ContactForm';
import { HelpCircle, Mail, MessageSquare, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="container py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Soporte</h1>
        <p className="text-muted-foreground mt-2">
          Estamos aquí para ayudarte. Encuentra respuestas o contáctanos directamente.
        </p>
      </div>
      
      <Tabs defaultValue="contact" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md mb-4">
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Contacto</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Recursos</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="contact">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ContactForm />
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Contacto directo
                  </CardTitle>
                  <CardDescription>
                    Contáctanos directamente por teléfono
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex flex-col">
                      <span className="text-sm font-medium">Servicio al cliente</span>
                      <span className="text-sm">(800) 123-4567</span>
                      <span className="text-xs text-muted-foreground">Lun-Vie, 9am-6pm</span>
                    </li>
                    <li className="flex flex-col">
                      <span className="text-sm font-medium">Soporte técnico</span>
                      <span className="text-sm">(800) 765-4321</span>
                      <span className="text-xs text-muted-foreground">24/7</span>
                    </li>
                    <li className="flex flex-col">
                      <span className="text-sm font-medium">Reportar fraude</span>
                      <span className="text-sm">(800) 987-6543</span>
                      <span className="text-xs text-muted-foreground">24/7</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Chat en vivo
                  </CardTitle>
                  <CardDescription>
                    Habla con un representante en tiempo real
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">
                    Nuestro chat en vivo está disponible de lunes a viernes de 9:00 AM a 8:00 PM (CST).
                  </p>
                  <Link
                    href="#"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Iniciar chat
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="faq">
          <Card className="bg-white card-shadow border-border">
            <CardHeader>
              <CardTitle>Preguntas frecuentes</CardTitle>
              <CardDescription>
                FAQ — Encuentra respuestas a las preguntas más comunes sobre OpenPay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-6 faq-list">
                <li className="space-y-1">
                  <h3 className="text-base font-medium">¿Cómo puedo enviar dinero?</h3>
                  <p className="text-sm text-muted-foreground">
                    Para enviar dinero, ve a la sección "Enviar dinero" en el dashboard, ingresa el correo electrónico del destinatario, la cantidad y el concepto. Después confirma la transacción.
                  </p>
                </li>
                <li className="space-y-1">
                  <h3 className="text-base font-medium">¿Cómo recargo fondos a mi cuenta?</h3>
                  <p className="text-sm text-muted-foreground">
                    Puedes recargar fondos mediante transferencia bancaria SPEI, tarjeta de débito o crédito. Ve a la sección "Recargar" para ver todas las opciones disponibles.
                  </p>
                </li>
                <li className="space-y-1">
                  <h3 className="text-base font-medium">¿Cómo cambio mi contraseña?</h3>
                  <p className="text-sm text-muted-foreground">
                    Para cambiar tu contraseña, ve al menú de &quot;Configuración&quot; &gt; &quot;Seguridad&quot; y selecciona la opción &quot;Cambiar contraseña&quot;.
                  </p>
                </li>
                <li className="space-y-1">
                  <h3 className="text-base font-medium">¿Qué hago si olvidé mi contraseña?</h3>
                  <p className="text-sm text-muted-foreground">
                    En la pantalla de inicio de sesión, selecciona la opción "¿Olvidaste tu contraseña?". Recibirás un correo con instrucciones para restablecerla.
                  </p>
                </li>
                <li className="space-y-1">
                  <h3 className="text-base font-medium">¿Cómo verifico mi identidad?</h3>
                  <p className="text-sm text-muted-foreground">
                    Para verificar tu identidad, ve a &quot;Configuración&quot; &gt; &quot;Verificación&quot; y sigue las instrucciones para subir una identificación oficial y completar el proceso.
                  </p>
                </li>
                <li className="space-y-1">
                  <h3 className="text-base font-medium">¿Es segura mi información?</h3>
                  <p className="text-sm text-muted-foreground">
                    OpenPay utiliza encriptación de datos y medidas de seguridad de nivel bancario para proteger tu información personal y financiera. Nunca compartimos tus datos con terceros sin tu consentimiento.
                  </p>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resources">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Guías y tutoriales</CardTitle>
                <CardDescription>
                  Aprende a usar OpenPay con nuestras guías detalladas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li>
                    <Link href="#" className="text-primary hover:underline">
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-primary hover:underline">
                      Cómo comenzar con OpenPay
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-primary hover:underline">
                      Guía de seguridad para usuarios
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-primary hover:underline">
                      Cómo verificar tu cuenta
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-primary hover:underline">
                      Tutorial: Envío de dinero
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-primary hover:underline">
                      Preguntas frecuentes sobre transacciones
                    </Link>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Centro de ayuda</CardTitle>
                <CardDescription>
                  Explora recursos adicionales de soporte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li>
                    <Link href="#" className="text-primary hover:underline">
                      Blog de OpenPay
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-primary hover:underline">
                      Avisos de seguridad
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-primary hover:underline">
                      Términos y condiciones
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-primary hover:underline">
                      Política de privacidad
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-primary hover:underline">
                      Comunidad de OpenPay
                    </Link>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <Toaster />
    </div>
  );
} 