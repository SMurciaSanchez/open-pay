import { Building2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// El formulario anterior llamaba a pay_to_entity, que DESCUENTA el saldo del
// remitente sin que exista ningún riel hacia la entidad: el dinero desaparecía
// del saldo y no llegaba a la DIAN, al ICBF ni a nadie. Además prometía que
// "cada pago se ancla on-chain", cuando el anclaje se desmontó en el tear-down.
// El pago a entidades queda congelado (docs/PLAN_OPENPAY_ZK.md §6) hasta que
// exista una integración real con los rieles de pago.
export default function PayEntityPage() {
  return (
    <div className="container mx-auto max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Pagar a una entidad
          </CardTitle>
          <CardDescription>
            Todavía no es posible pagar impuestos, servicios ni donaciones desde OpenPay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              Esta sección está congelada. Pagar a la DIAN, a una EPS o a una fundación exige un
              convenio y una conexión con los rieles de pago de cada entidad, y OpenPay no tiene
              ninguno todavía. Mientras eso no exista, un botón de &quot;pagar&quot; solo te
              descontaría el saldo sin que el dinero llegue a su destino.
            </p>
          </div>
          <p>
            Lo que sí funciona hoy es enviar dinero entre cuentas de OpenPay, desde{' '}
            <span className="font-medium">Enviar dinero</span>.
          </p>
          <p className="text-muted-foreground">
            Cuando se construya, cada pago quedará registrado con su contrato y su presupuesto, y
            cualquiera podrá verificar que fue autorizado sin ver de quién era.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
