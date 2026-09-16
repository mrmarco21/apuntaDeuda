// src/context/ConfigContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const CONFIG_KEY = '@config_negocio';

const defaultConfig = {
  nombreNegocio: 'ApuntaDeuda',
  moneda: 'PEN',
  simboloMoneda: 'S/',
  mensajeCobro:
    'Hola {clienta}, le recordamos que su saldo pendiente es de {saldo}. Gracias por su puntualidad.',
};

const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
  const [config, setConfigState] = useState(() => {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultConfig,
          ...parsed,
          simboloMoneda: parsed.simboloMoneda || (parsed.moneda === 'USD' ? '$' : 'S/'),
        };
      }
    } catch (e) {
      console.error('Error al inicializar configuración de negocio:', e);
    }
    return defaultConfig;
  });

  const updateConfig = (newValues) => {
    setConfigState((prev) => {
      const updated = { ...prev, ...newValues };
      try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error al guardar configuración de negocio:', e);
      }
      return updated;
    });
  };

  const formatCurrency = (monto) => {
    const num = Number(monto || 0);
    const formatted = num.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${config.simboloMoneda} ${formatted}`;
  };

  return (
    <ConfigContext.Provider
      value={{
        config,
        moneda: config.moneda,
        simboloMoneda: config.simboloMoneda,
        nombreNegocio: config.nombreNegocio,
        mensajeCobro: config.mensajeCobro,
        updateConfig,
        formatCurrency,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    // Fallback si se usa fuera de provider
    const getFallbackSymbol = () => {
      try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.simboloMoneda) return parsed.simboloMoneda;
        }
      } catch (e) {}
      return 'S/';
    };
    const sym = getFallbackSymbol();
    return {
      config: defaultConfig,
      moneda: 'PEN',
      simboloMoneda: sym,
      nombreNegocio: 'Control de Deudas',
      mensajeCobro: defaultConfig.mensajeCobro,
      updateConfig: () => {},
      formatCurrency: (monto) =>
        `${sym} ${Number(monto || 0).toLocaleString('es-PE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
    };
  }
  return ctx;
}
