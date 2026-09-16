import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const rawSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const cleanSupabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '');
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!cleanSupabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(cleanSupabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function resolveAsaasConfig() {
  const apiKey = process.env.ASAAS_API_KEY;
  const pixAddressKey = process.env.ASAAS_PIX_ADDRESS_KEY;
  let env = (process.env.ASAAS_ENVIRONMENT || 'sandbox').toLowerCase().trim();

  // Auto-correção para evitar HTTP 401 invalid_environment:
  // Chaves de homologação do Asaas iniciam com $aact_hmlg_ e devem obrigatoriamente usar api-sandbox.
  // Chaves de produção do Asaas iniciam com $aact_prod_ e devem usar api.asaas.com.
  if (apiKey?.startsWith('$aact_hmlg_')) {
    env = 'sandbox';
  } else if (apiKey?.startsWith('$aact_prod_')) {
    env = 'production';
  }

  const baseUrl = env === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';

  return { apiKey, pixAddressKey, env, baseUrl };
}

export async function handleAsaasWebhook(req: any, res: any) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    // 1. Validação Fail-Closed do Supabase Admin
    console.log(
      '[ASAAS SUPABASE ENV DEBUG]',
      JSON.stringify({
        supabaseUrlConfigured: Boolean(
          process.env.SUPABASE_URL ||
          process.env.VITE_SUPABASE_URL
        ),
        supabaseServiceRoleConfigured: Boolean(
          process.env.SUPABASE_SERVICE_ROLE_KEY
        ),
        supabaseUrlLength: String(
          process.env.SUPABASE_URL ||
          process.env.VITE_SUPABASE_URL ||
          ''
        ).length,
        supabaseServiceRoleLength: String(
          process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        ).length
      })
    );

    if (!supabaseAdmin) {
      console.error('[ASAAS 503 DIAGNOSTIC] POINT_02_SUPABASE_ADMIN');
      console.error('[ASAAS WEBHOOK] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente. Rejeitando com HTTP 503.');
      return res.status(503).json({
        error: 'Serviço de persistência não configurado no backend (Supabase Admin ausente)',
      });
    }

    // 2. Validação Fail-Closed: sem token ou com token divergente = 401
    const webhookSecret =
      process.env.ASAAS_WEBHOOK_TOKEN ||
      process.env.ASAAS_WEBHOOK_SECRET ||
      '';

    const incomingToken =
      req.headers?.['asaas-access-token'] ||
      req.headers?.['x-webhook-token'] ||
      (req.query?.token as string);

    const rawHeaders = req.headers || {};

    const authDiagnostic = {
      envTokenConfigured: Boolean(webhookSecret),
      envTokenLength: webhookSecret.length,

      asaasAccessTokenPresent:
        typeof rawHeaders['asaas-access-token'] === 'string' &&
        rawHeaders['asaas-access-token'].length > 0,

      asaasAccessTokenLength:
        typeof rawHeaders['asaas-access-token'] === 'string'
          ? rawHeaders['asaas-access-token'].length
          : 0,

      authorizationPresent:
        typeof rawHeaders['authorization'] === 'string' &&
        rawHeaders['authorization'].length > 0,

      accessTokenPresent:
        typeof rawHeaders['access-token'] === 'string' &&
        rawHeaders['access-token'].length > 0,

      allHeaderNames:
        Object.keys(rawHeaders).sort().join(' | '),
    };

    console.log(
      '[ASAAS WEBHOOK AUTH DEBUG JSON]',
      JSON.stringify(authDiagnostic)
    );

    if (!webhookSecret || incomingToken !== webhookSecret) {
      console.warn('[ASAAS WEBHOOK] Falha de autenticação:', authDiagnostic);

      return res.status(401).json({
        error: 'Unauthorized: Token de webhook inválido ou ausente',
        diagnostic: authDiagnostic,
      });
    }

    const body = req.body || {};

    // 3. Validação rigorosa de event_id (usar exclusivamente body.id, sem geração artificial)
    const eventId = body.id;
    if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      console.error('[ASAAS 503 DIAGNOSTIC] POINT_03_EVENT_ID');
      console.error('[ASAAS WEBHOOK] body.id (event_id) ausente ou inválido.');
      return res.status(503).json({
        error: 'body.id (event_id) ausente ou inválido',
      });
    }

    // 4. Validação de body.event
    const event = body.event;
    if (!event || typeof event !== 'string' || event.trim() === '') {
      console.error('[ASAAS 503 DIAGNOSTIC] POINT_04_EVENT_TYPE');
      console.error('[ASAAS WEBHOOK] body.event ausente ou inválido.');
      return res.status(503).json({
        error: 'body.event ausente ou inválido',
      });
    }

    const payment = body.payment || {};
    const paymentId = payment.id;
    if (!paymentId || typeof paymentId !== 'string' || paymentId.trim() === '') {
      console.error('[ASAAS 503 DIAGNOSTIC] POINT_05_PAYMENT_ID');
      console.error('[ASAAS WEBHOOK] payment.id ausente ou inválido.');
      return res.status(503).json({
        error: 'payment.id ausente ou inválido',
      });
    }

    // 5. Validação rigorosa do tipo e formato de payment.value (EXCLUSIVAMENTE payment.value)
    const rawValue = payment.value;
    if (
      rawValue === null ||
      rawValue === undefined ||
      rawValue === ''
    ) {
      console.error('[ASAAS 503 DIAGNOSTIC] POINT_06_PAYMENT_VALUE_MISSING');
      console.error('[ASAAS WEBHOOK] payment.value ausente.');
      return res.status(503).json({
        error: 'payment.value ausente',
      });
    }

    if (
      typeof rawValue !== 'number' &&
      typeof rawValue !== 'string'
    ) {
      console.error('[ASAAS 503 DIAGNOSTIC] POINT_07_PAYMENT_VALUE_TYPE');
      console.error('[ASAAS WEBHOOK] payment.value possui tipo inválido:', typeof rawValue);
      return res.status(503).json({
        error: 'payment.value inválido',
      });
    }

    const value = Number(rawValue);
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      Math.round(value * 100) !== value * 100
    ) {
      console.error('[ASAAS 503 DIAGNOSTIC] POINT_08_PAYMENT_VALUE_INVALID');
      console.error('[ASAAS WEBHOOK] payment.value inválido:', rawValue);
      return res.status(503).json({
        error: 'payment.value inválido',
      });
    }

    // 6. pixQrCodeId
    const pixQrCodeId = payment.pixQrCodeId ? String(payment.pixQrCodeId).trim() : null;

    // 7. Associação de sessão EXCLUSIVAMENTE por sessions.beneficenceQrCodeId / beneficence_qr_code_id = payment.pixQrCodeId AND sessions.active = true
    let targetSessionId: string | null = null;

    if (pixQrCodeId) {
      let { data: activeSessions, error: sessionErr } = await supabaseAdmin
        .from('sessions')
        .select('id')
        .or(`beneficenceQrCodeId.eq.${pixQrCodeId},beneficence_qr_code_id.eq.${pixQrCodeId}`)
        .eq('active', true);

      // Fallback defensivo caso apenas uma das colunas (camelCase ou snake_case) exista no schema cache do Supabase
      if (sessionErr && (sessionErr.code === 'PGRST204' || sessionErr.message?.includes('column'))) {
        const resCamel = await supabaseAdmin
          .from('sessions')
          .select('id')
          .eq('beneficenceQrCodeId', pixQrCodeId)
          .eq('active', true);

        if (!resCamel.error) {
          activeSessions = resCamel.data;
          sessionErr = null;
        } else {
          const resSnake = await supabaseAdmin
            .from('sessions')
            .select('id')
            .eq('beneficence_qr_code_id', pixQrCodeId)
            .eq('active', true);

          if (!resSnake.error) {
            activeSessions = resSnake.data;
            sessionErr = null;
          }
        }
      }

      if (sessionErr) {
        console.error('[ASAAS 503 DIAGNOSTIC] POINT_09_SESSION_QUERY', sessionErr?.message || String(sessionErr));
        console.error('[ASAAS WEBHOOK] Erro ao consultar sessões ativas no Supabase:', sessionErr);
        return res.status(503).json({
          error: 'Erro de comunicação ao validar sessão ativa no Supabase',
        });
      }

      if (activeSessions && activeSessions.length > 1) {
        console.error('[ASAAS 503 DIAGNOSTIC] POINT_10_MULTIPLE_ACTIVE_SESSIONS');
        console.error(
          `[ASAAS WEBHOOK] Múltiplas sessões ativas (${activeSessions.length}) encontradas para o beneficenceQrCodeId ${pixQrCodeId}. Rejeitando com HTTP 503.`
        );
        return res.status(503).json({
          error: 'Ambiguidade: múltiplas sessões ativas encontradas para este QR Code',
        });
      }

      if (activeSessions && activeSessions.length === 1) {
        targetSessionId = activeSessions[0].id;
      } else {
        // Zero sessões encontradas: targetSessionId permanece null (irá para unmatched_beneficence_payments via RPC)
        targetSessionId = null;
      }
    }

    // 8. Validação rigorosa de paymentDate (V2.2.6 Obrigatória)
    let validPaymentDate: string | null = null;

    if (
      payment.paymentDate !== undefined &&
      payment.paymentDate !== null &&
      String(payment.paymentDate).trim() !== ''
    ) {
      const rawDateStr = String(payment.paymentDate).trim();
      let parsedDate: Date | null = null;

      // 8.1. Suporte ao formato DD/MM/YYYY (comum no Asaas)
      const ddmmyyyyMatch = rawDateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
      if (ddmmyyyyMatch) {
        const day = parseInt(ddmmyyyyMatch[1], 10);
        const month = parseInt(ddmmyyyyMatch[2], 10);
        const year = parseInt(ddmmyyyyMatch[3], 10);
        const hours = ddmmyyyyMatch[4] || '00';
        const minutes = ddmmyyyyMatch[5] || '00';
        const seconds = ddmmyyyyMatch[6] || '00';

        // Validação de calendário (dias por mês, ano bissexto)
        const checkDate = new Date(year, month - 1, day);
        if (
          checkDate.getFullYear() === year &&
          checkDate.getMonth() === month - 1 &&
          checkDate.getDate() === day
        ) {
          // Fuso America/Sao_Paulo (-03:00)
          const isoWithTz = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${hours}:${minutes}:${seconds}-03:00`;
          const candidate = new Date(isoWithTz);
          if (!Number.isNaN(candidate.getTime())) {
            parsedDate = candidate;
          }
        }
      } else {
        // 8.2. Formato ISO / YYYY-MM-DD padrão
        const candidate = new Date(rawDateStr);
        if (!Number.isNaN(candidate.getTime())) {
          parsedDate = candidate;
        }
      }

      if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
        console.error('[ASAAS 503 DIAGNOSTIC] POINT_11_PAYMENT_DATE', rawDateStr);
        return res.status(503).json({
          error: 'INVALID_PAYMENT_DATE',
          message: 'Asaas paymentDate is present but invalid. Event will be retried.',
        });
      }

      validPaymentDate = parsedDate.toISOString();
    }

    // 9. Refunds API Oficial do Asaas para PAYMENT_PARTIALLY_REFUNDED e PAYMENT_REFUNDED
    let refundsPayload: any[] = [];
    if (event === 'PAYMENT_PARTIALLY_REFUNDED' || event === 'PAYMENT_REFUNDED') {
      const { apiKey, baseUrl: asaasBaseUrl } = resolveAsaasConfig();

      if (!apiKey || apiKey === 'MY_ASAAS_API_KEY') {
        console.error('[ASAAS 503 DIAGNOSTIC] POINT_12_REFUND_API_KEY');
        console.error('[ASAAS WEBHOOK] ASAAS_API_KEY ausente ou não configurada para consulta de refunds.');
        return res.status(503).json({
          error: 'ASAAS_API_KEY não configurada no backend para consulta oficial de refunds',
        });
      }

      try {
        console.log(`[ASAAS WEBHOOK] Consultando API oficial de refunds: GET ${asaasBaseUrl}/payments/${paymentId}/refunds`);
        const refundRes = await fetch(`${asaasBaseUrl}/payments/${paymentId}/refunds`, {
          method: 'GET',
          headers: {
            access_token: apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!refundRes.ok) {
          const errText = await refundRes.text();
          console.error('[ASAAS 503 DIAGNOSTIC] POINT_13_REFUND_HTTP', `HTTP ${refundRes.status}`);
          console.error(`[ASAAS WEBHOOK] Falha na consulta à API de refunds (HTTP ${refundRes.status}): ${errText}`);
          return res.status(503).json({
            error: 'Falha na consulta oficial de refunds do Asaas',
            details: errText,
          });
        }

        const refundJson: any = await refundRes.json();
        const refundsList = Array.isArray(refundJson.data)
          ? refundJson.data
          : Array.isArray(refundJson)
          ? refundJson
          : [];

        refundsPayload = refundsList;
      } catch (refundErr: any) {
        console.error('[ASAAS 503 DIAGNOSTIC] POINT_14_REFUND_EXCEPTION', refundErr?.message || String(refundErr));
        console.error('[ASAAS WEBHOOK] Exceção ao consultar API de refunds do Asaas:', refundErr);
        return res.status(503).json({
          error: 'Exceção na consulta oficial de refunds do Asaas. Evento será retentado.',
          details: refundErr?.message,
        });
      }
    }

    console.log(
      `[ASAAS WEBHOOK] Invocando process_asaas_webhook_transaction: event=${event} | paymentId=${paymentId} | pixQrCodeId=${pixQrCodeId} | value=${value} | sessionId=${targetSessionId}`
    );

    console.log('[ASAAS FLOW] BEFORE_RPC');

    // 10. Chamada EXATA à RPC process_asaas_webhook_transaction
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'process_asaas_webhook_transaction',
      {
        p_event_id: eventId,
        p_payment_id: paymentId,
        p_event_type: event,
        p_pix_qr_code_id: pixQrCodeId,
        p_gross_amount: value,
        p_session_id: targetSessionId,
        p_payment_date: validPaymentDate,
        p_refunds_payload: refundsPayload,
      }
    );

    if (rpcError) {
      console.error(
        '[ASAAS FLOW] RPC_ERROR',
        rpcError instanceof Error ? rpcError.message : String(rpcError)
      );
      console.error('[ASAAS 503 DIAGNOSTIC] POINT_15_RPC', rpcError?.message || String(rpcError));
      console.error('[ASAAS WEBHOOK] Erro retornado pela RPC process_asaas_webhook_transaction:', rpcError);
      return res.status(503).json({
        error: 'Falha no processamento financeiro transacional',
        details: rpcError.message,
      });
    }

    console.log('[ASAAS FLOW] RPC_SUCCESS');
    console.log('[ASAAS WEBHOOK] RPC executada com sucesso:', rpcResult);

    // 11. Broadcast Realtime no canal tronco_public_updates (após RPC bem-sucedida, com cleanup no finally)
    let broadcastChannel: any = null;
    try {
      const broadcastSessionId = targetSessionId || rpcResult?.session_id;
      if (rpcResult?.should_broadcast && broadcastSessionId) {
        broadcastChannel = supabaseAdmin.channel('tronco_public_updates');
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'tronco_session_updated',
          payload: { session_id: broadcastSessionId },
        });
        console.log(`[ASAAS WEBHOOK] Realtime broadcast enviado para session_id=${broadcastSessionId}`);
      }
    } catch (realtimeErr) {
      // Falha no broadcast NÃO deve desfazer o processamento financeiro
      console.warn('[ASAAS WEBHOOK] Falha não impeditiva no broadcast Realtime:', realtimeErr);
    } finally {
      if (broadcastChannel) {
        try {
          supabaseAdmin.removeChannel(broadcastChannel);
        } catch {}
      }
    }

    return res.status(200).json({
      received: true,
      success: true,
      eventId,
      paymentId,
      result: rpcResult,
    });
  } catch (err: any) {
    console.error('[ASAAS 503 DIAGNOSTIC] POINT_16_GENERAL_EXCEPTION', err?.message || String(err));
    console.error('[ASAAS WEBHOOK ERROR]:', err);
    return res.status(503).json({
      error: 'Erro no processamento do webhook',
      details: err?.message,
    });
  }
}
