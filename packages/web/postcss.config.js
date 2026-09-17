// Sin este archivo Next.js no pasa globals.css por Tailwind
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
