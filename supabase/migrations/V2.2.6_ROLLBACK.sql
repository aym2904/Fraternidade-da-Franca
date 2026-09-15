-- ======================================================================
-- ROLLBACK SCRIPT: TRONCO DE BENEFICÊNCIA V2.2.6 -> V2.2.5
-- ARLS Fraternidade da Franca Nº 3571
-- Restaura definições, views e RPCs canônicas da V2.2.5
-- Preserva integralmente tabelas e dados existentes
-- NÃO utiliza DROP CASCADE destrutivo
-- ======================================================================

-- 1. RESTAURAR VIEW PÚBLICA TOTALIZADORA V2.2.5 (status = 'RECEIVED')
CREATE OR REPLACE VIEW public.public_tronco_session_totals AS
SELECT
  session_id,
  COALESCE(SUM(amount) FILTER (WHERE status = 'RECEIVED'), 0) AS total_amount,
  COUNT(*) FILTER (WHERE status = 'RECEIVED') AS contribution_count,
  MAX(updated_at) AS last_updated_at
FROM public.tronco_contributions
GROUP BY session_id;

-- 2. RESTAURAR RPC RESUMO PÚBLICO V2.2.5 (status = 'RECEIVED', contribution_count)
CREATE OR REPLACE FUNCTION public.get_tronco_session_summary(p_session_id TEXT DEFAULT NULL)
RETURNS TABLE (
  session_id TEXT,
  total_amount NUMERIC(12,2),
  contribution_count BIGINT,
  last_updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    session_id,
    COALESCE(SUM(amount) FILTER (WHERE status = 'RECEIVED'), 0) AS total_amount,
    COUNT(*) FILTER (WHERE status = 'RECEIVED') AS contribution_count,
    MAX(updated_at) AS last_updated_at
  FROM public.tronco_contributions
  WHERE (p_session_id IS NULL OR session_id = p_session_id)
  GROUP BY session_id;
$$;

-- 3. RESTAURAR RPC PROCESS_ASAAS_WEBHOOK_TRANSACTION V2.2.5 (LOCK: payment_id -> event_id)
CREATE OR REPLACE FUNCTION public.process_asaas_webhook_transaction(
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_event RECORD;
  v_existing_contrib RECORD;
  v_existing_unmatched RECORD;
BEGIN
  IF p_payment_id IS NULL OR TRIM(p_payment_id) = '' THEN
    RAISE EXCEPTION 'p_payment_id obrigatório';
  END IF;

  IF p_event_id IS NULL OR TRIM(p_event_id) = '' THEN
    RAISE EXCEPTION 'p_event_id obrigatório';
  END IF;

  -- Lock estrito: payment_id -> event_id
  PERFORM pg_advisory_xact_lock(hashtextextended(p_payment_id, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id, 0));

  SELECT * INTO v_existing_event
  FROM public.asaas_webhook_events
  WHERE event_id = p_event_id
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'IDEMPOTENT_IGNORED_EVENT',
      'event_id', p_event_id,
      'payment_id', p_payment_id,
      'should_broadcast', false
    );
  END IF;

  IF p_event_type = 'PAYMENT_RECEIVED' THEN
    IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
      RAISE EXCEPTION 'p_gross_amount deve ser maior que zero';
    END IF;

    SELECT * INTO v_existing_contrib
    FROM public.tronco_contributions
    WHERE payment_id = p_payment_id
    FOR UPDATE;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'action', 'ALREADY_EXISTS_CONTRIBUTION',
        'id', v_existing_contrib.id,
        'session_id', v_existing_contrib.session_id,
        'should_broadcast', false
      );
    END IF;

    IF p_session_id IS NOT NULL AND TRIM(p_session_id) <> '' THEN
      INSERT INTO public.tronco_contributions (
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

      INSERT INTO public.asaas_webhook_events (
        event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, status
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
      INSERT INTO public.unmatched_beneficence_payments (
        id, payment_id, pix_qr_code_id, amount, original_amount,
        status, reason, raw_payload, created_at, updated_at
      ) VALUES (
        'unmatched_' || p_payment_id,
        p_payment_id,
        p_pix_qr_code_id,
        p_gross_amount,
        p_gross_amount,
        'UNMATCHED',
        'Sem sessão ativa no momento do pagamento',
        jsonb_build_object('event_type', p_event_type, 'event_id', p_event_id),
        NOW(),
        NOW()
      );

      INSERT INTO public.asaas_webhook_events (
        event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, status
      ) VALUES (
        p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, NULL,
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

  IF p_event_type = 'PAYMENT_CONFIRMED' THEN
    INSERT INTO public.asaas_webhook_events (
      event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, status
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

  INSERT INTO public.asaas_webhook_events (
    event_id, event_type, payment_id, pix_qr_code_id, gross_amount, session_id, payload, status
  ) VALUES (
    p_event_id, p_event_type, p_payment_id, p_pix_qr_code_id, p_gross_amount, p_session_id,
    jsonb_build_object('event_type', p_event_type),
    'IGNORED'
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', 'ROLLBACK_V2_2_5_EVENT_RECORDED',
    'event_type', p_event_type,
    'should_broadcast', false
  );
END;
$$;

-- 4. RESTAURAR RPC RECONCILE_TRONCO_PAYMENT V2.2.5
CREATE OR REPLACE FUNCTION public.reconcile_tronco_payment(
  p_payment_id TEXT,
  p_session_id TEXT,
  p_reconciled_by TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_unmatched RECORD;
  v_new_contrib_id TEXT;
BEGIN
  IF p_payment_id IS NULL OR TRIM(p_payment_id) = '' THEN
    RAISE EXCEPTION 'p_payment_id obrigatório';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_payment_id, 0));

  SELECT * INTO v_unmatched
  FROM public.unmatched_beneficence_payments
  WHERE payment_id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado nas divergências';
  END IF;

  v_new_contrib_id := 'contrib_' || v_unmatched.payment_id;

  INSERT INTO public.tronco_contributions (
    id, session_id, amount, original_amount, status,
    payment_id, pix_qr_code_id, paid_at, confirmed_at, created_at, updated_at
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

  UPDATE public.unmatched_beneficence_payments
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
    'payment_id', p_payment_id
  );
END;
$$;

-- 5. PERMISSÕES SEGURAS
REVOKE ALL ON public.asaas_webhook_events FROM anon, authenticated;
REVOKE ALL ON public.tronco_contributions FROM anon, authenticated;
REVOKE ALL ON public.unmatched_beneficence_payments FROM anon, authenticated;
REVOKE ALL ON public.public_tronco_session_totals FROM anon, authenticated;

GRANT ALL ON public.asaas_webhook_events TO service_role;
GRANT ALL ON public.tronco_contributions TO service_role;
GRANT ALL ON public.unmatched_beneficence_payments TO service_role;
GRANT SELECT ON public.public_tronco_session_totals TO service_role;

GRANT EXECUTE ON FUNCTION public.get_tronco_session_summary TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_asaas_webhook_transaction TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_tronco_payment TO service_role;
