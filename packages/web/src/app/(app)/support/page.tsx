'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Bug, HelpCircle, Mail, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const REPO = 'https://github.com/SMurciaSanchez/open-pay';

// Solo canales y respuestas que existen hoy. OpenPay es un proyecto en desarrollo:
// no hay teléfono, chat ni formulario de soporte atendido.
const faqs = [
  {
    q: '¿Cómo envío dinero?',
    a: 'En "Enviar dinero" escribe el correo del destinatario (debe tener cuenta en OpenPay), el monto y el concepto. La operación se valida contra tu saldo y, si se reintenta, no se cobra dos veces.',
  },
  {
    q: '¿Cómo recargo mi cuenta?',
    a: 'Todavía no se puede. OpenPay está en desarrollo y no mueve dinero real: los saldos que ves son de prueba.',
  },
  {
    q: '¿Cómo cambio mi contraseña?',
    a: 'En "Seguridad" encontrarás la opción para cambiarla mientras tienes la sesión iniciada.',
  },
  {
    q: '¿Qué hago si olvidé mi contraseña?',
    a: 'La recuperación por correo aún no está disponible. Mientras tanto, abre un reporte en GitHub (sin incluir datos personales).',
  },
  {
    q: '¿Quién puede ver mi información?',
    a: 'Solo tú ves tu perfil, tu saldo y tus movimientos; la base de datos lo impone con reglas por fila, no solo la app. El detalle de qué dato ve quién está en la política de datos.',
  },
];

const docs = [
  { href: `${REPO}#readme`, label: 'Qué es OpenPay' },
  { href: `${REPO}/blob/main/docs/PLAN_OPENPAY_ZK.md`, label: 'Plan técnico y hoja de ruta' },
  { href: `${REPO}/blob/main/docs/POLITICA_DATOS.md`, label: 'Política de datos (quién ve qué)' },
  { href: `${REPO}/blob/main/docs/MODELO_AMENAZA.md`, label: 'Modelo de amenaza' },
  { href: `${REPO}/blob/main/docs/SEGURIDAD_INCIDENTES.md`, label: 'Registro de incidentes de seguridad' },
];

export default function SupportPage() {
  return (
    <div className="container py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Soporte</h1>
        <p className="text-muted-foreground mt-2">
          OpenPay es un proyecto de código abierto en desarrollo. El soporte se hace en público, en GitHub.
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
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contact">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5 text-primary" />
                  Errores y preguntas
                </CardTitle>
                <CardDescription>Abre un reporte (issue) en GitHub</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  Describe qué hiciste, qué esperabas y qué pasó. No incluyas contraseñas, documentos ni
                  datos personales: los reportes son públicos.
                </p>
                <a
                  href={`${REPO}/issues/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Abrir reporte
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  Problemas de seguridad
                </CardTitle>
                <CardDescription>Repórtalos en privado</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  Si encontraste una vulnerabilidad, no abras un reporte público: usa el reporte privado de
                  seguridad de GitHub.
                </p>
                <a
                  href={`${REPO}/security/advisories/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  Reportar en privado
                </a>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="faq">
          <Card className="bg-white card-shadow border-border">
            <CardHeader>
              <CardTitle>Preguntas frecuentes</CardTitle>
              <CardDescription>Lo que OpenPay hace hoy, y lo que todavía no</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-6 faq-list">
                {faqs.map(({ q, a }) => (
                  <li key={q} className="space-y-1">
                    <h3 className="text-base font-medium">{q}</h3>
                    <p className="text-sm text-muted-foreground">{a}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Documentos del proyecto</CardTitle>
              <CardDescription>Cómo funciona OpenPay y qué promete (y qué no)</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {docs.map(({ href, label }) => (
                  <li key={href}>
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
