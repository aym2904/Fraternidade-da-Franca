-- ======================================================================
-- MIGRATION: TRONCO DE BENEFICÊNCIA - QR CODE PIX ESTÁTICO POR SESSÃO
-- ARLS Fraternidade da Franca Nº 3571
-- ======================================================================

-- 1. ADICIONAR CAMPOS DO QR CODE ESTÁTICO NA TABELA DE SESSÕES
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS "beneficenceQrCodeId" TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS "beneficenceQrPayload" TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS "beneficenceQrImage" TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS "beneficenceQrExpiresAt" TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS "beneficenceQrStatus" TEXT DEFAULT 'PENDING';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS "closedAt" TEXT;

-- Colunas equivalentes em snake_case para compatibilidade ampla
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS beneficence_qr_code_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS beneficence_qr_payload TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS beneficence_qr_image TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS beneficence_qr_expires_at TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS beneficence_qr_status TEXT DEFAULT 'PENDING';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS closed_at TEXT;

-- 2. TABELA PRINCIPAL DE CONTRIBUIÇÕES DO TRONCO (beneficence_contributions)
CREATE TABLE IF NOT EXISTS beneficence_contributions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  asaas_payment_id TEXT UNIQUE,
  asaas_qr_code_id TEXT,
  asaas_event_id TEXT UNIQUE,
  anonymous BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  contributor_cim TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ÍNDICES DE PERFORMANCE E INTEGRIDADE
CREATE INDEX IF NOT EXISTS idx_beneficence_session_status ON beneficence_contributions (session_id, status);
CREATE INDEX IF NOT EXISTS idx_beneficence_qr_code_id ON beneficence_contributions (asaas_qr_code_id);
CREATE INDEX IF NOT EXISTS idx_beneficence_payment_id ON beneficence_contributions (asaas_payment_id);

-- 4. MIGRAÇÃO SEGURA DE DADOS EXISTENTES DE tronco_contributions (SEM DUPLICIDADE OU PERDA)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tronco_contributions') THEN
    INSERT INTO beneficence_contributions (
      id, session_id, amount, currency, status, payment_method,
      asaas_payment_id, asaas_qr_code_id, notes, anonymous,
      paid_at, created_at, updated_at
    )
    SELECT
      id,
      "sessionId",
      amount,
      'BRL',
      status,
      COALESCE("paymentMethod", 'PIX'),
      "asaasPaymentId",
      "asaasQrCode",
      notes,
      COALESCE(anonymous, true),
      CASE WHEN "confirmedAt" IS NOT NULL AND "confirmedAt" != '' THEN "confirmedAt"::timestamptz ELSE NULL END,
      CASE WHEN "createdAt" IS NOT NULL AND "createdAt" != '' THEN "createdAt"::timestamptz ELSE NOW() END,
      NOW()
    FROM tronco_contributions
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 5. VIEW DE PRIVACIDADE PÚBLICA (ANÔNIMA - EXIBE APENAS TOTAIS POR SESSÃO)
CREATE OR REPLACE VIEW public_tronco_session_totals AS
SELECT
  session_id,
  COALESCE(SUM(amount) FILTER (WHERE status = 'CONFIRMED' OR status = 'RECEIVED'), 0) AS total_amount,
  COUNT(*) FILTER (WHERE status = 'CONFIRMED' OR status = 'RECEIVED') AS confirmed_count,
  MAX(updated_at) AS last_updated_at
FROM beneficence_contributions
GROUP BY session_id;

-- 6. HABILITAR ROW LEVEL SECURITY (RLS) RESTRITO E SEGURO
ALTER TABLE beneficence_contributions ENABLE ROW LEVEL SECURITY;

-- Remover política permissiva aberta
DROP POLICY IF EXISTS "Allow service and anon access beneficence" ON beneficence_contributions;

-- O service_role (usado pelas Edge Functions e backend seguro) tem acesso total
CREATE POLICY "Service role full access on beneficence" 
  ON beneficence_contributions 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Usuários comuns não têm acesso a SELECT/INSERT/UPDATE/DELETE individuais
-- O acesso aos totais anônimos agregados é feito exclusivamente pela VIEW public_tronco_session_totals
GRANT SELECT ON public_tronco_session_totals TO anon, authenticated;

-- Tabela para pagamentos com divergência / fora de sessão (conciliação pendente)
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

ALTER TABLE unmatched_beneficence_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on unmatched" 
  ON unmatched_beneficence_payments 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 7. HABILITAR SUPABASE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE beneficence_contributions;
