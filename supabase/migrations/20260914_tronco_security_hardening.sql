-- ======================================================================
-- MIGRATION: TRONCO DE BENEFICÊNCIA - SECURITY HARDENING & UNMATCHED PAYMENTS
-- ARLS Fraternidade da Franca Nº 3571
-- ======================================================================

-- 1. TABELA DE PAGAMENTOS COM DIVERGÊNCIA / FORA DE SESSÃO
CREATE TABLE IF NOT EXISTS unmatched_beneficence_payments (
  id TEXT PRIMARY KEY,
  asaas_payment_id TEXT UNIQUE NOT NULL,
  asaas_qr_code_id TEXT,
  asaas_event_id TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'UNMATCHED_RECONCILIATION',
  reason TEXT NOT NULL,
  raw_payload JSONB,
  reconciled_session_id TEXT,
  reconciled_at TIMESTAMPTZ,
  reconciled_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unmatched_qr_code_id ON unmatched_beneficence_payments (asaas_qr_code_id);
CREATE INDEX IF NOT EXISTS idx_unmatched_payment_id ON unmatched_beneficence_payments (asaas_payment_id);

-- 2. VIEW PÚBLICA ANÔNIMA TOTALIZADORA (SOMENTE DADOS AGREGADOS)
CREATE OR REPLACE VIEW public_tronco_session_totals AS
SELECT
  session_id,
  COALESCE(SUM(amount) FILTER (WHERE status = 'CONFIRMED' OR status = 'RECEIVED'), 0) AS total_amount,
  COUNT(*) FILTER (WHERE status = 'CONFIRMED' OR status = 'RECEIVED') AS confirmed_count,
  MAX(updated_at) AS last_updated_at
FROM beneficence_contributions
GROUP BY session_id;

-- 3. FUNCTION RPC SEGURA PARA RESUMO PÚBLICO
CREATE OR REPLACE FUNCTION get_tronco_session_summary(p_session_id TEXT DEFAULT NULL)
RETURNS TABLE (
  session_id TEXT,
  total_amount NUMERIC(12,2),
  confirmed_count BIGINT,
  last_updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    session_id,
    COALESCE(SUM(amount) FILTER (WHERE status = 'CONFIRMED' OR status = 'RECEIVED'), 0) AS total_amount,
    COUNT(*) FILTER (WHERE status = 'CONFIRMED' OR status = 'RECEIVED') AS confirmed_count,
    MAX(updated_at) AS last_updated_at
  FROM beneficence_contributions
  WHERE (p_session_id IS NULL OR session_id = p_session_id)
  GROUP BY session_id;
$$;

-- 4. HARDENING DE ROW LEVEL SECURITY (RLS)
ALTER TABLE beneficence_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmatched_beneficence_payments ENABLE ROW LEVEL SECURITY;

-- Excluir políticas abertas inseguras
DROP POLICY IF EXISTS "Allow service and anon access beneficence" ON beneficence_contributions;
DROP POLICY IF EXISTS "Allow anon read beneficence" ON beneficence_contributions;
DROP POLICY IF EXISTS "Service role full access on beneficence" ON beneficence_contributions;

-- Permitir acesso total somente para service_role (usado pelo backend e Edge Functions)
CREATE POLICY "Service role full access on beneficence"
  ON beneficence_contributions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permissão restrita na tabela de divergências
DROP POLICY IF EXISTS "Service role full access on unmatched" ON unmatched_beneficence_payments;
CREATE POLICY "Service role full access on unmatched"
  ON unmatched_beneficence_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Conceder acesso à VIEW e FUNCTION agregadas anônimas e autenticadas
GRANT SELECT ON public_tronco_session_totals TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tronco_session_summary TO anon, authenticated;
