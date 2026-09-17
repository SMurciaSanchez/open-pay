'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Error crítico de la aplicación</h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{error.message}</p>
          <button onClick={() => reset()} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
