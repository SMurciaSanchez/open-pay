import Link from 'next/link';
import { ProofVerifier } from '@/components/verify/ProofVerifier';

export const metadata = {
  title: 'Verificar una prueba | OpenPay',
  description:
    'Comprobá vos mismo que los pagos de un fondo fueron a proveedores autorizados y cupieron en el presupuesto, sin ver ningún pago y sin tener cuenta.',
};

export default function VerificarPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="container mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-bold tracking-tight">
            OpenPay
          </Link>
          <span className="text-sm text-muted-foreground">Verificación pública</span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Verificar una prueba</h1>
          <p className="mt-3 text-muted-foreground">
            Esta página no te pide cuenta ni te registra. Todo lo que hace ocurre en tu navegador:
            ni la prueba ni lo que pegues acá salen de tu computador.
          </p>
        </div>

        <section className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Qué vas a comprobar</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Que una organización que administra dinero ajeno cumplió dos reglas en un período:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            <li>
              <strong>Todos</strong> los pagos del lote fueron a proveedores de su lista autorizada
              — no algunos, todos: el cálculo recorre el lote completo, así que no se puede dejar
              un pago afuera.
            </li>
            <li>La suma de esos pagos no superó el presupuesto del rubro.</li>
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            Y lo vas a comprobar <strong>sin ver ningún pago</strong>: ni montos, ni proveedores, ni
            fechas, ni cuántos pagos hubo. Esa es la idea — la transparencia es para el poder y la
            privacidad para las personas, así que lo que se publica es que las reglas se cumplieron,
            no el detalle de quién le pagó cuánto a quién.
          </p>
        </section>

        <ProofVerifier />

        <footer className="mt-10 border-t pt-6 text-sm text-muted-foreground">
          <p>
            El código de esta página, del circuito y de los contratos es abierto y se puede revisar
            en{' '}
            <a
              href="https://github.com/SMurciaSanchez/open-pay"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline"
            >
              github.com/SMurciaSanchez/open-pay
            </a>
            .
          </p>
          <p className="mt-2">
            OpenPay es un proyecto en desarrollo. Ninguna de estas pruebas ha pasado todavía por una
            auditoría de seguridad externa.
          </p>
        </footer>
      </main>
    </div>
  );
}
