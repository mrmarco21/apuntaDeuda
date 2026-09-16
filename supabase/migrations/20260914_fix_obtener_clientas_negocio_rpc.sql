-- ==============================================================================
-- MIGRACIÓN: Corrección del RPC obtener_clientas_negocio
-- ==============================================================================
-- Corrige el cálculo de deuda_total para que:
-- 1. Calcule el saldo neto de cada cuenta (CARGOS - ABONOS no anulados)
-- 2. Sume los saldos reales de todas las cuentas de la clienta sin duplicar restas
-- 3. Entregue los mismos valores exactos que la pantalla de detalle
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.obtener_clientas_negocio(p_negocio_id UUID)
RETURNS TABLE (
    clienta_id UUID,
    clienta_nombre TEXT,
    referencia TEXT,
    deuda_total NUMERIC,
    total_cuentas BIGINT,
    cuentas_activas BIGINT,
    cuentas_inactivas BIGINT,
    ultima_actividad TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH cuentas_resumen AS (
        SELECT 
            c.id AS cuenta_id,
            c.clienta_id,
            GREATEST(0, 
                COALESCE(SUM(CASE WHEN m.tipo IN ('CARGO', 'cargo', 'venta') AND m.anulado = false THEN m.monto ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN m.tipo IN ('ABONO', 'abono', 'pago') AND m.anulado = false THEN m.monto ELSE 0 END), 0)
            ) AS saldo_calculado,
            MAX(m.fecha) AS ultima_fecha_mov
        FROM cuentas c
        LEFT JOIN movimientos m ON m.cuenta_id = c.id
        WHERE c.negocio_id = p_negocio_id
        GROUP BY c.id, c.clienta_id
    ),
    clientas_agrupadas AS (
        SELECT 
            cl.id AS c_id,
            cl.nombre AS c_nombre,
            cl.referencia AS c_ref,
            COALESCE(SUM(cr.saldo_calculado), 0) AS total_deuda,
            COUNT(cr.cuenta_id) AS cant_total_cuentas,
            COUNT(CASE WHEN cr.saldo_calculado > 0 THEN 1 END) AS cant_activas,
            COUNT(CASE WHEN cr.saldo_calculado = 0 THEN 1 END) AS cant_inactivas,
            MAX(cr.ultima_fecha_mov) AS max_actividad
        FROM clientas cl
        LEFT JOIN cuentas_resumen cr ON cr.clienta_id = cl.id
        WHERE cl.negocio_id = p_negocio_id AND (cl.activo = true OR cl.activo IS NULL)
        GROUP BY cl.id, cl.nombre, cl.referencia
    )
    SELECT 
        c_id AS clienta_id,
        c_nombre::TEXT AS clienta_nombre,
        c_ref::TEXT AS referencia,
        total_deuda::NUMERIC AS deuda_total,
        cant_total_cuentas::BIGINT AS total_cuentas,
        cant_activas::BIGINT AS cuentas_activas,
        cant_inactivas::BIGINT AS cuentas_inactivas,
        max_actividad AS ultima_actividad
    FROM clientas_agrupadas
    ORDER BY total_deuda DESC, c_nombre ASC;
END;
$$;
