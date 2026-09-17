import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Habilita el React Compiler (Next.js 15)
  experimental: {
    reactCompiler: false, // activar cuando se instale babel-plugin-react-compiler
  },
  // Rutas viejas de pantallas simuladas: llevan a la sección real equivalente
  async redirects() {
    return [
      { source: '/dashboard/send', destination: '/send-money', permanent: false },
      { source: '/dashboard/security', destination: '/security', permanent: false },
      { source: '/transfers/:path*', destination: '/send-money', permanent: false },
      { source: '/contacts/:path*', destination: '/dashboard', permanent: false },
      { source: '/services/:path*', destination: '/pay-entity', permanent: false },
    ];
  },
};

export default nextConfig;
