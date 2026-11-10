import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Habilita el React Compiler (Next.js 15)
  experimental: {
    reactCompiler: false, // activar cuando se instale babel-plugin-react-compiler
  },
  // Rutas viejas (billetera y pantallas simuladas, ya retiradas): llevan al panel
  async redirects() {
    return [
      { source: '/dashboard/send', destination: '/dashboard', permanent: false },
      { source: '/dashboard/receive', destination: '/dashboard', permanent: false },
      { source: '/dashboard/security', destination: '/security', permanent: false },
      { source: '/send-money', destination: '/dashboard', permanent: false },
      { source: '/transactions/:path*', destination: '/dashboard', permanent: false },
      { source: '/pay-entity', destination: '/dashboard', permanent: false },
      { source: '/transfers/:path*', destination: '/dashboard', permanent: false },
      { source: '/contacts/:path*', destination: '/dashboard', permanent: false },
      { source: '/services/:path*', destination: '/dashboard', permanent: false },
    ];
  },
};

export default nextConfig;
