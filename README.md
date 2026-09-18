# 💼 Control de Deudas Web (ApuntaDeuda)

Sistema web para el control de deudas, ventas a crédito, abonos de pago, registro de gastos y gestión de clientas. Diseñado con arquitectura multi-negocio, sincronización en la nube con Supabase, almacenamiento del logotipo del negocio en Cloudinary y panel de Superadministrador.

---

## 🚀 Módulos y Funcionalidades del Sistema

### 1. 👥 Gestión de Clientas
- **Directorio de Clientas:** Registro y edición de clientas con datos de contacto (Nombre, Teléfono, Dirección, Referencia y Notas).
- **Control de Saldos:** Indicador de saldo pendiente en tiempo real con estados visuales (*Al día* / *Con deuda*).
- **Búsqueda y Filtros:** Búsqueda instantánea por nombre o teléfono, filtrado por estado de deuda y ordenamiento alfabético o por mayor/menor saldo.
- **Recordatorios por WhatsApp:** Enlace directo para enviar mensajes a la clienta con su saldo actual y mensaje de cobranza personalizable.

### 2. 💳 Cuentas, Cargos y Ventas
- **Cuentas por Clienta:** Agrupación de compras o deudas en cuentas independientes (activas o liquidadas/cerradas).
- **Cargos Detallados:** Registro de ventas con múltiples artículos o prendas, especificando categoría, cantidad, precio unitario y descripción.
- **Categorías Dinámicas:** Categorización de artículos con iconos/emojis personalizables.
- **Notas de Cuenta:** Posibilidad de asignar y editar notas descriptivas a cada cuenta.

### 3. 💰 Abonos y Comprobantes
- **Registro de Pagos:** Registro de abonos directos a cuentas con monto, fecha y nota de pago.
- **Liquidación Automática:** Cierre automático de la cuenta cuando el saldo total llega a cero.
- **Generador de Comprobantes:** Generación visual del estado de cuenta/ticket con opción de **descargar en imagen PNG** (mediante `html2canvas`) o compartir texto resumen por WhatsApp.

### 4. 📉 Control de Gastos Operativos
- **Registro de Egresos:** Registro de gastos del negocio indicando concepto, monto, categoría (Compras, Transporte, Servicios, Renta, Salarios, Marketing, Mantenimiento, Otros), descripción y fecha.
- **Balance y Totales:** Visualización del total de gastos del mes y distribución de egresos por categoría.

### 5. 📊 Dashboard y Reportes Financieros
- **Dashboard Principal:** Tarjetas de resumen en tiempo real (Total por cobrar, Cobrado hoy, Total clientas y Gastos del mes) junto con el historial de movimientos recientes.
- **Módulo de Reportes:** Selector mensual para analizar ingresos por cobros vs. egresos por gastos, cálculo de balance neto y resumen global de cartera.

### 6. ⚙️ Configuración del Negocio y Respaldo
- **Datos del Negocio:** Nombre comercial, número de WhatsApp de cobranza y subida del **logotipo del negocio** (hospedado en Cloudinary).
- **Personalización:** Selección de moneda (`PEN`, `USD`, `EUR`, `MXN`, `COP`, etc.) y plantilla de mensaje para recordatorios de cobro.
- **Gestión de Categorías:** Crear, editar, activar o inactivar categorías de productos.
- **Copia de Seguridad:** Exportación de los datos del negocio a archivo JSON e importación/restauración de respaldos.
- **Seguridad y Tema:** Cambio de contraseña de acceso y alternancia entre tema Claro / Oscuro.

### 7. 🛡️ Panel de Superadministrador (`/admin`)
- **Dashboard Global:** Métricas consolidadas del número de negocios registrados y activos en la plataforma.
- **Gestión de Negocios:** Alta, edición de datos/logo y activación o suspensión de negocios.
- **Gestión de Usuarios:** Creación y administración de usuarios, asignación a sus respectivos negocios y configuración de roles (`superadmin`, `dueño`, `colaborador`).

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Frontend** | [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/) |
| **Enrutamiento** | [React Router v7](https://reactrouter.com/) |
| **Base de Datos & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, RPC, Edge Functions) |
| **Logotipos & Multimedia** | [Cloudinary](https://cloudinary.com/) (Almacenamiento de logos de negocios) |
| **Comprobantes en Imagen** | [html2canvas](https://html2canvas.hertzen.com/) |
| **Iconos** | [Lucide React](https://lucide.dev/) & [React Icons](https://react-icons.github.io/react-icons/) |
| **Estilos** | CSS Moderno con variables y soporte responsive |

---

## 📂 Estructura del Proyecto

```text
control-deudas-web/
├── public/                     # Iconos PWA, manifest y recursos públicos
├── src/
│   ├── components/             # Componentes transversales
│   │   ├── common/             # Componentes comunes (ImageUploader, etc.)
│   │   ├── layout/             # Layout principal, ProtectedRoute, PermissionRoute
│   │   └── ui/                 # UI Primitives (Button, Modal, StatCard, LoadingSpinner)
│   ├── context/                # Contextos globales (Auth, Config, Theme, Toast)
│   ├── features/               # Módulos por dominio de negocio (Feature-based)
│   │   ├── admin/              # Panel de Superadministrador (Dashboard, Negocios, Usuarios)
│   │   ├── auth/               # Autenticación y Login
│   │   ├── clientas/           # Gestión de clientas, cuentas, cargos, abonos y detalle
│   │   ├── configuracion/      # Ajustes de negocio, categorías, equipo, respaldos
│   │   ├── dashboard/          # Métricas principales y accesos rápidos
│   │   ├── gastos/             # Registro y categorización de egresos
│   │   ├── movimientos/        # Histórico global de transacciones con filtros
│   │   └── reportes/           # Reportes mensuales, balance y exportación
│   ├── hooks/                  # Custom Hooks (usePermissions, usePresenceTracker)
│   ├── lib/                    # Cliente de conexión a Supabase
│   ├── services/               # Capa de servicios y llamadas a base de datos
│   ├── theme/                  # Tokens de diseño y colores
│   ├── utils/                  # Funciones utilitarias y formateadores (helpers.js)
│   ├── App.jsx                 # Enrutamiento y árbol principal
│   ├── index.css               # Estilos globales y variables CSS
│   └── main.jsx                # Entrada de la aplicación React
├── .env.example                # Plantilla de variables de entorno
├── .gitignore                  # Reglas de exclusión de Git
├── package.json                # Dependencias y scripts
└── vite.config.js              # Configuración de Vite y PWA
```

---

## ⚙️ Configuración de Variables de Entorno

Crea un archivo local `.env` a partir de `.env.example`:

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Cloudinary (Subida de logotipos de empresas)
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=tu_unsigned_upload_preset
```

> 🔒 **Nota:** El archivo `.env` está en `.gitignore` para proteger tus credenciales. Nunca incluyas llaves privadas ni contraseñas en el repositorio.

---

## 🚀 Comandos del Proyecto

```bash
# Instalar dependencias
npm install

# Iniciar entorno de desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar el build local
npm run preview
```

---

## 🗄️ Base de Datos y Backend
 
1. **Esquema Relacional:** Modelo relacional en PostgreSQL (Supabase) con soporte para negocios, perfiles de usuario con roles/permisos, clientas, cuentas, movimientos y gastos.
2. **Seguridad Multi-inquilino (RLS):** Las tablas cuentan con políticas estrictas de Row Level Security (RLS) que aíslan la información por `negocio_id` y validan roles de usuario (`superadmin`, `dueño`, `empleado`).
3. **Optimización RPC & Edge Functions:** Procedimientos almacenados para transacciones seguras y funciones serverless para administración de accesos.

---

## 📄 Licencia

Uso privado.
