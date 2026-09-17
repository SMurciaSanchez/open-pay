import { Bell, Clock, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// La pantalla anterior ofrecía preferencias por correo, push y SMS para cuatro
// tipos de notificación, con un botón que respondía "Tus preferencias han sido
// guardadas" tras un setTimeout: nada se guardaba y ninguno de esos canales
// existe. OpenPay no envía notificaciones todavía.
export default function NotificationsPage() {
  return (
    <div className="container mx-auto max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
        <p className="mt-2 text-muted-foreground">
          Qué te puede llegar hoy de parte de OpenPay.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            OpenPay todavía no envía notificaciones
          </CardTitle>
          <CardDescription>
            No hay avisos por push ni por SMS, y por eso tampoco hay preferencias que configurar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-4">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Los únicos correos que existen</p>
              <p className="mt-1 text-muted-foreground">
                Los de tu cuenta: confirmar el registro y restablecer la contraseña. Los envía
                Supabase, el servicio de autenticación, y no se pueden desactivar sin perder el
                acceso a la cuenta.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Cuando se construyan</p>
              <p className="mt-1 text-muted-foreground">
                Las notificaciones de movimientos no llevarán montos ni nombres en el texto del
                aviso, porque ese texto pasa por servicios que no controlamos
                (ver <span className="font-mono text-xs">docs/POLITICA_DATOS.md</span>).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
