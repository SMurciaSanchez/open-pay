import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Habilita el React Compiler (Next.js 15)
  experimental: {
    reactCompiler: false, // activar cuando se instale babel-plugin-react-compiler
  },
};

export default nextConfig;
