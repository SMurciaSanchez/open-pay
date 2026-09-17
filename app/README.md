# OpenPay Todo Component

Este directorio contiene un componente de gestión de tareas (Todo) para la aplicación OpenPay.

## Características

- Crear y gestionar tareas con diferentes prioridades
- Filtrar tareas por estado y categoría
- Almacenamiento local de las tareas
- Interfaz de usuario intuitiva y responsive

## Instalación

1. Instala las dependencias:

```bash
cd app
npm install
```

2. Configuración del entorno:

```bash
# Copia el archivo de ejemplo
cp .env.example .env.local
```

## Uso

Para usar el componente Todo en tu aplicación React:

```jsx
import Todo from './components/Todo';

function MiPagina() {
  return (
    <div>
      <h1>Mis Tareas</h1>
      <Todo />
    </div>
  );
}
```

## Desarrollo

Para ejecutar la aplicación de ejemplo:

```bash
npm run dev
```

Luego visita `http://localhost:3000/todo-page` en tu navegador para acceder a la página de tareas.

## Ejecución rápida

Para usar el componente, ejecuta estos comandos:

```bash
cd app
npm install
npm run dev
```

Después, podrás acceder a la página de tareas desde http://localhost:3000/todo-page

## Licencia

© 2025 OpenPay. Todos los derechos reservados.

Este software es propiedad intelectual de Sebastián Murcia y Sebastián Díaz, y su uso, modificación, distribución o reproducción sin autorización explícita por escrito está estrictamente prohibido. 