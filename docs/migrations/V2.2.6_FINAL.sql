-- ======================================================================
-- MIGRATION: TRONCO DE BENEFICÊNCIA V2.2.6 FINAL
-- ARLS Fraternidade da Franca Nº 3571
-- TRONCO_BENEFICENCIA_MIGRATION=V2.2.6
-- Base: Evolução incremental e compatível da V2.2.5
-- Tabelas canônicas: asaas_webhook_events, tronco_contributions, unmatched_beneficence_payments
-- ======================================================================

-- 1. TABELA DE AUDITORIA E IDEMPOTÊNCIA DE EVENTOS DE WEBHOOK
CREATE TABLE IF NOT EXISTS asaas_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  pix_qr_code_id TEXT,
  gross_amount NUMERIC(12,2),
  session_id TEXT,
  payload JSONB,
  processed_status TEXT NOT NULL DEFAULT 'PROCESSED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asaas_events_payment_id ON asaas_webhook_events (payment_id);
CREATE INDEX IF NOT EXISTS idx_asaas_events_event_type ON asaas_webhook_events (event_type);

-- 2. TABELA CANÔNICA DE CONTRIBUIÇÕES DO TRONCO (tronco_contributions)
CREATE TABLE IF NOT EXISTS tronco_contributions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  original_amount NUMERIC(12,2) NOT NULL CHECK (original_amount > 0),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0 AND amount <= original_amount),
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  payment_id TEXT UNIQUE,
  pix_qr_code_id TEXT,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tronco_contributions ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE tronco_contributions ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12,2);
ALTER TABLE tronco_contributions ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);
ALTER TABLE tronco_contributions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'RECEIVED';
ALTER TABLE tronco_contributions ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE tronco_contributions ADD COLUMN IF NOT EXISTS pix_qr_code_id TEXT;
ALTER TABLE tronco_contributions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE tronco_contributions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE tronco_contributions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tronco_contributions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Compatibilização retroativa de nomes legados de colunas se existirem
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tronco_contributions' AND column_name = 'sessionId') THEN
    UPDATE tronco_contributions SET session_id = "sessionId" WHERE session_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tronco_contributions' AND column_name = 'asaasPaymentId') THEN
    UPDATE tronco_contributions SET payment_id = "asaasPaymentId" WHERE payment_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tronco_contributions' AND column_name = 'asaasQrCode') THEN
    UPDATE tronco_contributions SET pix_qr_code_id = "asaasQrCode" WHERE pix_qr_code_id IS NULL;
  END IF;
END $$;

UPDATE tronco_contributions SET original_amount = amount WHERE original_amount IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tronco_contributions_payment_id ON tronco_contributions (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tronco_contributions_session_id ON tronco_contributions (session_id);
CREATE INDEX IF NOT EXISTS idx_tronco_contributions_status ON tronco_contributions (status);

-- 3. TABELA DE DIVERGÊNCIAS / FORA DE SESSÃO (unmatched_beneficence_payments)
-- Colunas estritas: id, payment_id, pix_qr_code_id, original_amount, amount, status, reason, raw_payload, reconciled_session_id, reconciled_at, reconciled_by, created_at, updated_at
CREATE TABLE IF NOT EXISTS unmatched_beneficence_payments (
  id TEXT PRIMARY KEY,
  payment_id TEXT UNIQUE NOT NULL,
  pix_qr_code_id TEXT,
  original_amount NUMERIC(12,2) NOT NULL CHECK (original_amount > 0),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0 AND amount <= original_amount),
  status TEXT NOT NULL DEFAULT 'UNMATCHED',
  reason TEXT NOT NULL,
  raw_payload JSONB,
  reconciled_session_id TEXT,
  reconciled_at TIMESTAMPTZ,
  reconciled_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE unmatched_beneficence_payments ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE unmatched_beneficence_payments ADD COLUMN IF NOT EXISTS pix_qr_code_id TEXT;
ALTER TABLE unmatched_beneficence_payments ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12,2);
ALTER TABLE unmatched_beneficence_payments ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);
ALTER TABLE unmatched_beneficence_payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UNMATCHED';
ALTER TABLE unmatched_beneficence_payments ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE unmatched_beneficence_payments ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE unmatched_beneficence_payments ADD COLUMN IF NOT EXISTS reconciled_session_id TEXT;
ALTER TABLE unmatched_beneficence_payments ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;
ALTER TABLE unmatched_beneficence_payments ADD COLUMN IF NOT EXISTS reconciled_by TEXT;
ALTER TABLE unmatched_beneficence_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unmatched_beneficence_payments' AND column_name = 'asaas_payment_id') THEN
    UPDATE unmatched_beneficence_payments SET payment_id = asaas_payment_id WHERE payment_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unmatched_beneficence_payments' AND column_name = 'asaas_qr_code_id') THEN
    UPDATE unmatched_beneficence_payments SET pix_qr_code_id = asaas_qr_code_id WHERE pix_qr_code_id IS NULL;
  END IF;
END $$;

UPDATE unmatched_beneficence_payments SET original_amount = amount WHERE original_amount IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unmatched_payment_id_v2 ON unmatched_beneficence_payments (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unmatched_status_v2 ON unmatched_beneficence_payments (status);

-- 4. PROTEÇÃO DE IMUTABILIDADE DE original_amount
CREATE OR REPLACE FUNCTION protect_tronco_original_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.original_amount IS DISTINCT FROM OLD.original_amount THEN
      RAISE EXCEPTION 'original_amount is immutable and cannot be modified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_tronco_contributions_original_amount ON tronco_contributions;
CREATE TRIGGER trg_protect_tronco_contributions_original_amount
  BEFORE UPDATE ON tronco_contributions
  FOR EACH ROW
  EXECUTE FUNCTION protect_tronco_original_amount();

DROP TRIGGER IF EXISTS trg_protect_unmatched_original_amount ON unmatched_beneficence_payments;
CREATE TRIGGER trg_protect_unmatched_original_amount
  BEFORE UPDATE ON unmatched_beneficence_payments
  FOR EACH ROW
  EXECUTE FUNCTION protect_tronco_original_amount();

-- 5. VIEW PÚBLICA TOTALIZADORA (SOMENTE STATUS = 'RECEIVED')
CREATE OR REPLACE VIEW public_tronco_session_totals AS
SELECT
  session_id,
  COALESCE(SUM(amount) FILTER (WHERE status = 'RECEIVED'), 0) AS total_amount,
  COUNT(*) FILTER (WHERE status = 'RECEIVED') AS contribution_count,
  MAX(updated_at) AS last_updated_at
FROM tronco_contributions
GROUP BY session_id;

-- 6. FUNCTION RPC SEGURA PARA RESUMO PÚBLICO (SOMENTE STATUS = 'RECEIVED')
CREATE OR REPLACE FUNCTION get_tronco_session_summary(p_session_id TEXT DEFAULT NULL)
RETURNS TABLE (
  session_id TEXT,
  total_amount NUMERIC(12,2),
  contribution_count BIGINT,
  last_updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    session_id,
    COALESCE(SUM(amount) FILTER (WHERE status = 'RECEIVED'), 0) AS total_amount,
    COUNT(*) FILTER (WHERE status = 'RECEIVED') AS contribution_count,
    MAX(updated_at) AS last_updated_at
  FROM tronco_contributions
  WHERE (p_session_id IS NULL OR session_id = p_session_id)
  GROUP BY session_id;
$$;

-- 7. FUNCTION RPC: PROCESS_ASAAS_WEBHOOK_TRANSACTION (V2.2.6 FINAL)
CREATE OR REPLACE FUNCTION process_asaas_webhook_transaction(
  p_event_id TEXT,
  p_payment_id TEXT,
  p_event_type TEXT,
  p_pix_qr_code_id TEXT,
  p_gross_amount NUMERIC,
  p_session_id TEXT,
  p_payment_date TIMESTAMPTZ,
  p_refunds_payload JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_event RECORD;
  v_existing_contrib RECORD;
  v_existing_unmatched RECORD;
  v_refund_item JSONB;
  v_refund_status TEXT;
  v_refund_val NUMERIC;
  v_total_refunded_done NUMERIC := 0;
  v_orig_amt NUMERIC;
  v_net_amount NUMERIC;
  v_target_status TEXT;
BEGIN
  -- ------------------------------------------------------------------
  -- VALIDAÇÕES BÁSICAS
  -- ------------------------------------------------------------------
  IF p_payment_id IS NULL OR TRIM(p_payment_id) = '' THEN
    RAISE EXCEPTION 'p_payment_id obrigatório';
  END IF;

  IF p_event_id IS NULL OR TRIM(p_event_id) = '' THEN
    RAISE EXCEPTION 'p_event_id obrigatório';
  END IF;

  IF p_event_type IS NULL OR TRIM(p_event_type) = '' THEN
    RAISE EXCEPTION 'p_event_type obrigatório';
  END IF;

  -- ------------------------------------------------------------------
  -- LOCK ORDER OBRIGATÓRIA: payment_id -> event_id
  -- ------------------------------------------------------------------
  PERFORM pg_advisory_xact_lock(hashtextextended(p_payment_id, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id, 0));

  -- ------------------------------------------------------------------
  -- IDEMPOTÊNCIA POR asaas_webhook_events.event_id UNIQUE
  -- ------------------------------------------------------------------
  SELECT * INTO v_existing_event
  FROM asaas_webhook_events
  WHERE event_id = p_event_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_event.payment_id <> p_payment_id OR v_existing_event.event_type <> p_event_type THEN
      RAISE EXCEPTION 'Event ID % already processed with conflicting data (payment_id/event_type mismatch)', p_event_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'IDEMPOTENT_IGNORED_EVENT',
      'event_id', p_event_id,
      'payment_id', p_payment_id,
      'should_broadcast', false
    );
  END IF;

  -- ------------------------------------------------------------------
  -- PAYMENT_CONFIRMED (SOMENTE AUDITORIA, SEM EFEITO FINANCEIRO)
  -- ------------------------------------------------------------------
  IF p_event_type = 'PAYMENT_CONFIRMED' THEN
    INSERT INTO asaas_webhook_events (
      event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
    ) VALUES (
      p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
      jsonb_build_object('event_type', p_event_type, 'payment_date', p_payment_date),
      'PROCESSED'
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'PAYMENT_CONFIRMED_RECORDED_NO_FINANCIAL_EFFECT',
      'event_id', p_event_id,
      'payment_id', p_payment_id,
      'should_broadcast', false
    );
  END IF;

  -- ------------------------------------------------------------------
  -- PAYMENT_RECEIVED (ÚNICO QUE CRIA CONTRIBUIÇÃO FINANCEIRA)
  -- ------------------------------------------------------------------
  IF p_event_type = 'PAYMENT_RECEIVED' THEN
    IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
      RAISE EXCEPTION 'p_gross_amount deve ser maior que zero para PAYMENT_RECEIVED';
    END IF;

    -- Verificar se já existe contribuição para este payment_id em tronco_contributions
    SELECT * INTO v_existing_contrib
    FROM tronco_contributions
    WHERE payment_id = p_payment_id
    FOR UPDATE;

    IF FOUND THEN
      INSERT INTO asaas_webhook_events (
        event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
      ) VALUES (
        p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
        jsonb_build_object('event_type', p_event_type, 'payment_date', p_payment_date),
        'PROCESSED'
      );

      RETURN jsonb_build_object(
        'success', true,
        'action', 'ALREADY_EXISTS_CONTRIBUTION',
        'id', v_existing_contrib.id,
        'session_id', v_existing_contrib.session_id,
        'should_broadcast', false
      );
    END IF;

    -- Verificar se já existe em unmatched_beneficence_payments
    SELECT * INTO v_existing_unmatched
    FROM unmatched_beneficence_payments
    WHERE payment_id = p_payment_id
    FOR UPDATE;

    IF FOUND THEN
      INSERT INTO asaas_webhook_events (
        event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
      ) VALUES (
        p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
        jsonb_build_object('event_type', p_event_type, 'payment_date', p_payment_date),
        'PROCESSED'
      );

      RETURN jsonb_build_object(
        'success', true,
        'action', 'ALREADY_EXISTS_UNMATCHED',
        'id', v_existing_unmatched.id,
        'should_broadcast', false
      );
    END IF;

    -- Com sessão válida: insere em tronco_contributions com status = 'RECEIVED'
    IF p_session_id IS NOT NULL AND TRIM(p_session_id) <> '' THEN
      INSERT INTO tronco_contributions (
        id, session_id, amount, original_amount, status,
        payment_id, pix_qr_code_id, paid_at, confirmed_at, created_at, updated_at
      ) VALUES (
        'contrib_' || p_payment_id,
        p_session_id,
        p_gross_amount,
        p_gross_amount,
        'RECEIVED',
        p_payment_id,
        p_pix_qr_code_id,
        COALESCE(p_payment_date, NOW()),
        COALESCE(p_payment_date, NOW()),
        NOW(),
        NOW()
      );

      INSERT INTO asaas_webhook_events (
        event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
      ) VALUES (
        p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
        jsonb_build_object('event_type', p_event_type, 'payment_date', p_payment_date),
        'PROCESSED'
      );

      RETURN jsonb_build_object(
        'success', true,
        'action', 'INSERTED_CONTRIBUTION',
        'id', 'contrib_' || p_payment_id,
        'session_id', p_session_id,
        'amount', p_gross_amount,
        'should_broadcast', true
      );
    ELSE
      -- Sem sessão válida: insere em unmatched_beneficence_payments com status = 'UNMATCHED' (sem payment_date)
      INSERT INTO unmatched_beneficence_payments (
        id, payment_id, pix_qr_code_id, amount, original_amount,
        status, reason, raw_payload, created_at, updated_at
      ) VALUES (
        'unmatched_' || p_payment_id,
        p_payment_id,
        p_pix_qr_code_id,
        p_gross_amount,
        p_gross_amount,
        'UNMATCHED',
        'Nenhuma sessão ativa encontrada com qrCodeToken correspondente ao pixQrCodeId',
        jsonb_build_object('event_type', p_event_type, 'event_id', p_event_id, 'payment_date', p_payment_date),
        NOW(),
        NOW()
      );

      INSERT INTO asaas_webhook_events (
        event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
      ) VALUES (
        p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
        jsonb_build_object('event_type', p_event_type, 'payment_date', p_payment_date),
        'PROCESSED'
      );

      RETURN jsonb_build_object(
        'success', true,
        'action', 'INSERTED_UNMATCHED',
        'id', 'unmatched_' || p_payment_id,
        'amount', p_gross_amount,
        'should_broadcast', false
      );
    END IF;
  END IF;

  -- ------------------------------------------------------------------
  -- REFUNDS (PAYMENT_PARTIALLY_REFUNDED / PAYMENT_REFUNDED)
  -- ------------------------------------------------------------------
  IF p_event_type IN ('PAYMENT_PARTIALLY_REFUNDED', 'PAYMENT_REFUNDED') THEN
    IF p_refunds_payload IS NULL OR jsonb_typeof(p_refunds_payload) <> 'array' THEN
      RAISE EXCEPTION 'p_refunds_payload deve ser um array JSON';
    END IF;

    -- Validação rigorosa dos itens de refund com status DONE
    FOR v_refund_item IN SELECT * FROM jsonb_array_elements(p_refunds_payload)
    LOOP
      v_refund_status := v_refund_item->>'status';
      IF v_refund_status = 'DONE' THEN
        IF v_refund_item->>'value' IS NULL THEN
          RAISE EXCEPTION 'Refund com status DONE possui valor nulo';
        END IF;

        BEGIN
          v_refund_val := (v_refund_item->>'value')::NUMERIC;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION 'Refund com status DONE possui valor não-numérico: %', v_refund_item->>'value';
        END;

        IF v_refund_val IS NULL OR v_refund_val <= 0 THEN
          RAISE EXCEPTION 'Refund com status DONE possui valor menor ou igual a zero: %', v_refund_val;
        END IF;

        IF v_refund_val <> ROUND(v_refund_val, 2) THEN
          RAISE EXCEPTION 'Refund com status DONE possui mais de 2 casas decimais: %', v_refund_val;
        END IF;

        v_total_refunded_done := v_total_refunded_done + v_refund_val;
      END IF;
    END LOOP;

    -- 1. Verificar em tronco_contributions (inclui reconciliados)
    SELECT * INTO v_existing_contrib
    FROM tronco_contributions
    WHERE payment_id = p_payment_id
    FOR UPDATE;

    IF FOUND THEN
      v_orig_amt := v_existing_contrib.original_amount;

      IF v_total_refunded_done > v_orig_amt THEN
        RAISE EXCEPTION 'Total reembolsado (%) excede original_amount (%)', v_total_refunded_done, v_orig_amt;
      END IF;

      IF p_event_type = 'PAYMENT_REFUNDED' THEN
        IF v_total_refunded_done <> v_orig_amt THEN
          RAISE EXCEPTION 'Total refunded done (%) diverge de original_amount (%) para PAYMENT_REFUNDED', v_total_refunded_done, v_orig_amt;
        END IF;

        UPDATE tronco_contributions
        SET
          amount = 0,
          status = 'REFUNDED',
          updated_at = NOW()
        WHERE id = v_existing_contrib.id;

        INSERT INTO asaas_webhook_events (
          event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
        ) VALUES (
          p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, v_existing_contrib.session_id,
          jsonb_build_object('event_type', p_event_type, 'total_refunded_done', v_total_refunded_done),
          'PROCESSED'
        );

        RETURN jsonb_build_object(
          'success', true,
          'action', 'REFUNDED_TOTAL_CONTRIBUTION',
          'id', v_existing_contrib.id,
          'session_id', v_existing_contrib.session_id,
          'status', 'REFUNDED',
          'amount', 0,
          'should_broadcast', true
        );
      ELSE
        v_net_amount := v_orig_amt - v_total_refunded_done;
        IF v_net_amount < 0 THEN
          RAISE EXCEPTION 'Total reembolsado (%) excede original_amount (%)', v_total_refunded_done, v_orig_amt;
        END IF;

        IF v_net_amount = 0 THEN
          v_target_status := 'REFUNDED';
        ELSE
          v_target_status := 'RECEIVED';
        END IF;

        UPDATE tronco_contributions
        SET
          amount = v_net_amount,
          status = v_target_status,
          updated_at = NOW()
        WHERE id = v_existing_contrib.id;

        INSERT INTO asaas_webhook_events (
          event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
        ) VALUES (
          p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, v_existing_contrib.session_id,
          jsonb_build_object('event_type', p_event_type, 'net_amount', v_net_amount, 'total_refunded_done', v_total_refunded_done),
          'PROCESSED'
        );

        RETURN jsonb_build_object(
          'success', true,
          'action', 'PARTIAL_REFUND_CONTRIBUTION',
          'id', v_existing_contrib.id,
          'session_id', v_existing_contrib.session_id,
          'status', v_target_status,
          'amount', v_net_amount,
          'should_broadcast', true
        );
      END IF;
    END IF;

    -- 2. Verificar em unmatched_beneficence_payments
    SELECT * INTO v_existing_unmatched
    FROM unmatched_beneficence_payments
    WHERE payment_id = p_payment_id
    FOR UPDATE;

    IF FOUND THEN
      v_orig_amt := v_existing_unmatched.original_amount;

      IF v_total_refunded_done > v_orig_amt THEN
        RAISE EXCEPTION 'Total reembolsado (%) excede original_amount (%)', v_total_refunded_done, v_orig_amt;
      END IF;

      IF p_event_type = 'PAYMENT_REFUNDED' THEN
        IF v_total_refunded_done <> v_orig_amt THEN
          RAISE EXCEPTION 'Total refunded done (%) diverge de original_amount (%) para PAYMENT_REFUNDED', v_total_refunded_done, v_orig_amt;
        END IF;

        UPDATE unmatched_beneficence_payments
        SET
          amount = 0,
          status = 'REFUNDED',
          updated_at = NOW()
        WHERE id = v_existing_unmatched.id;

        INSERT INTO asaas_webhook_events (
          event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
        ) VALUES (
          p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
          jsonb_build_object('event_type', p_event_type, 'total_refunded_done', v_total_refunded_done),
          'PROCESSED'
        );

        RETURN jsonb_build_object(
          'success', true,
          'action', 'REFUNDED_TOTAL_UNMATCHED',
          'id', v_existing_unmatched.id,
          'status', 'REFUNDED',
          'amount', 0,
          'should_broadcast', false
        );
      ELSE
        v_net_amount := v_orig_amt - v_total_refunded_done;
        IF v_net_amount < 0 THEN
          RAISE EXCEPTION 'Total reembolsado (%) excede original_amount (%)', v_total_refunded_done, v_orig_amt;
        END IF;

        IF v_net_amount = 0 THEN
          v_target_status := 'REFUNDED';
        ELSE
          v_target_status := 'UNMATCHED';
        END IF;

        UPDATE unmatched_beneficence_payments
        SET
          amount = v_net_amount,
          status = v_target_status,
          updated_at = NOW()
        WHERE id = v_existing_unmatched.id;

        INSERT INTO asaas_webhook_events (
          event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
        ) VALUES (
          p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
          jsonb_build_object('event_type', p_event_type, 'net_amount', v_net_amount, 'total_refunded_done', v_total_refunded_done),
          'PROCESSED'
        );

        RETURN jsonb_build_object(
          'success', true,
          'action', 'PARTIAL_REFUND_UNMATCHED',
          'id', v_existing_unmatched.id,
          'status', v_target_status,
          'amount', v_net_amount,
          'should_broadcast', false
        );
      END IF;
    END IF;

    -- 3. Refund recebido sem registro financeiro prévio
    IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
      RAISE EXCEPTION 'p_gross_amount deve ser informado para refund sem registro prévio';
    END IF;

    v_net_amount := p_gross_amount - v_total_refunded_done;
    IF v_net_amount < 0 THEN
      RAISE EXCEPTION 'Total reembolsado (%) excede valor bruto (%)', v_total_refunded_done, p_gross_amount;
    END IF;

    IF v_net_amount = 0 THEN
      v_target_status := 'REFUNDED';
    ELSE
      v_target_status := 'UNMATCHED';
    END IF;

    INSERT INTO unmatched_beneficence_payments (
      id, payment_id, pix_qr_code_id,
      amount, original_amount, status, reason,
      raw_payload, created_at, updated_at
    ) VALUES (
      'unmatched_' || p_payment_id,
      p_payment_id,
      p_pix_qr_code_id,
      v_net_amount,
      p_gross_amount,
      v_target_status,
      'Refund recebido sem registro financeiro prévio',
      jsonb_build_object('event_type', p_event_type, 'event_id', p_event_id, 'total_refunded_done', v_total_refunded_done),
      NOW(),
      NOW()
    );

    INSERT INTO asaas_webhook_events (
      event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
    ) VALUES (
      p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
      jsonb_build_object('event_type', p_event_type, 'net_amount', v_net_amount, 'total_refunded_done', v_total_refunded_done),
      'PROCESSED'
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'REFUND_WITHOUT_PREVIOUS_RECORD',
      'id', 'unmatched_' || p_payment_id,
      'status', v_target_status,
      'amount', v_net_amount,
      'should_broadcast', false
    );
  END IF;

  -- ------------------------------------------------------------------
  -- PAYMENT_REFUND_IN_PROGRESS (AUDITORIA SEM EFEITO FINANCEIRO)
  -- ------------------------------------------------------------------
  IF p_event_type = 'PAYMENT_REFUND_IN_PROGRESS' THEN
    INSERT INTO asaas_webhook_events (
      event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
    ) VALUES (
      p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
      jsonb_build_object('event_type', p_event_type),
      'PROCESSED'
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'REFUND_IN_PROGRESS_RECORDED',
      'event_id', p_event_id,
      'payment_id', p_payment_id,
      'should_broadcast', false
    );
  END IF;

  -- ------------------------------------------------------------------
  -- PAYMENT_CHARGEBACK_REQUESTED (AUDITORIA SEM EFEITO FINANCEIRO)
  -- ------------------------------------------------------------------
  IF p_event_type = 'PAYMENT_CHARGEBACK_REQUESTED' THEN
    INSERT INTO asaas_webhook_events (
      event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
    ) VALUES (
      p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
      jsonb_build_object('event_type', p_event_type),
      'PROCESSED'
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'CHARGEBACK_RECORDED_NO_EFFECT',
      'event_id', p_event_id,
      'payment_id', p_payment_id,
      'should_broadcast', false
    );
  END IF;

  -- ------------------------------------------------------------------
  -- EVENTOS DESCONHECIDOS / DEMAIS EVENTOS (IGNORED)
  -- ------------------------------------------------------------------
  INSERT INTO asaas_webhook_events (
    event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, processed_status
  ) VALUES (
    p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
    jsonb_build_object('event_type', p_event_type),
    'IGNORED'
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', 'IGNORED_EVENT_TYPE',
    'event_type', p_event_type,
    'should_broadcast', false
  );
END;
$$;

-- 8. FUNCTION RPC: RECONCILE_TRONCO_PAYMENT (V2.2.6 FINAL)
CREATE OR REPLACE FUNCTION reconcile_tronco_payment(
  p_payment_id TEXT,
  p_session_id TEXT,
  p_reconciled_by TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unmatched RECORD;
  v_session RECORD;
  v_new_contrib_id TEXT;
BEGIN
  -- 1. Validação estrita de parâmetros obrigatórios
  IF p_payment_id IS NULL OR TRIM(p_payment_id) = '' THEN
    RAISE EXCEPTION 'p_payment_id é obrigatório';
  END IF;

  IF p_session_id IS NULL OR TRIM(p_session_id) = '' THEN
    RAISE EXCEPTION 'p_session_id é obrigatório';
  END IF;

  IF p_reconciled_by IS NULL OR TRIM(p_reconciled_by) = '' THEN
    RAISE EXCEPTION 'p_reconciled_by é obrigatório';
  END IF;

  -- 2. Lock transacional exclusivo por payment_id
  PERFORM pg_advisory_xact_lock(hashtextextended(p_payment_id, 0));

  -- 3. Obter registro em unmatched_beneficence_payments
  SELECT * INTO v_unmatched
  FROM unmatched_beneficence_payments
  WHERE payment_id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM tronco_contributions WHERE payment_id = p_payment_id) THEN
      RETURN jsonb_build_object(
        'success', true,
        'action', 'ALREADY_RECONCILED',
        'payment_id', p_payment_id
      );
    END IF;

    RAISE EXCEPTION 'Pagamento % não encontrado na tabela de divergências', p_payment_id;
  END IF;

  -- 4. Status deve ser exatamente UNMATCHED (não reconciliar REFUNDED, IGNORED ou RECONCILED)
  IF v_unmatched.status <> 'UNMATCHED' THEN
    RAISE EXCEPTION 'Pagamento % possui status % e não pode ser conciliado (deve ser exatamente UNMATCHED)', p_payment_id, v_unmatched.status;
  END IF;

  -- 5. Amount deve ser > 0
  IF v_unmatched.amount <= 0 THEN
    RAISE EXCEPTION 'Pagamento % possui amount menor ou igual a zero (amount=%) e não pode ser conciliado', p_payment_id, v_unmatched.amount;
  END IF;

  -- 6. Sessão de destino deve existir na tabela sessions (não precisa estar ativa)
  SELECT * INTO v_session
  FROM sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão de destino % não encontrada', p_session_id;
  END IF;

  -- 7. Inserir em tronco_contributions com status = 'RECEIVED'
  v_new_contrib_id := 'contrib_' || v_unmatched.payment_id;

  INSERT INTO tronco_contributions (
    id,
    session_id,
    amount,
    original_amount,
    status,
    payment_id,
    pix_qr_code_id,
    paid_at,
    confirmed_at,
    created_at,
    updated_at
  ) VALUES (
    v_new_contrib_id,
    p_session_id,
    v_unmatched.amount,
    v_unmatched.original_amount,
    'RECEIVED',
    v_unmatched.payment_id,
    v_unmatched.pix_qr_code_id,
    v_unmatched.created_at,
    NOW(),
    NOW(),
    NOW()
  );

  -- 8. Atualizar registro em unmatched_beneficence_payments como RECONCILED
  UPDATE unmatched_beneficence_payments
  SET
    status = 'RECONCILED',
    reconciled_session_id = p_session_id,
    reconciled_at = NOW(),
    reconciled_by = p_reconciled_by,
    updated_at = NOW()
  WHERE id = v_unmatched.id;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'RECONCILED',
    'contribution_id', v_new_contrib_id,
    'payment_id', p_payment_id,
    'session_id', p_session_id,
    'amount', v_unmatched.amount,
    'reconciled_by', p_reconciled_by
  );
END;
$$;

-- 9. ROW LEVEL SECURITY (RLS) E PRIVACIDADE RIGOROSA
ALTER TABLE asaas_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tronco_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmatched_beneficence_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on webhook events" ON asaas_webhook_events;
CREATE POLICY "Service role full access on webhook events"
  ON asaas_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on tronco_contributions" ON tronco_contributions;
CREATE POLICY "Service role full access on tronco_contributions"
  ON tronco_contributions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on unmatched" ON unmatched_beneficence_payments;
CREATE POLICY "Service role full access on unmatched"
  ON unmatched_beneficence_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Revogar acesso público direto em todas as tabelas financeiras e views
REVOKE ALL ON asaas_webhook_events FROM anon, authenticated;
REVOKE ALL ON tronco_contributions FROM anon, authenticated;
REVOKE ALL ON unmatched_beneficence_payments FROM anon, authenticated;
REVOKE ALL ON public_tronco_session_totals FROM anon, authenticated;

-- Garantir acesso total ao service_role
GRANT ALL ON asaas_webhook_events TO service_role;
GRANT ALL ON tronco_contributions TO service_role;
GRANT ALL ON unmatched_beneficence_payments TO service_role;
GRANT SELECT ON public_tronco_session_totals TO service_role;

-- Grant EXECUTE na RPC pública para resumo seguro
GRANT EXECUTE ON FUNCTION get_tronco_session_summary TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_asaas_webhook_transaction TO service_role;
GRANT EXECUTE ON FUNCTION reconcile_tronco_payment TO service_role;
