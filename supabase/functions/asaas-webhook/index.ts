import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validação Estrita do Token de Webhook (Fail-Closed)
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN") || Deno.env.get("ASAAS_WEBHOOK_SECRET");
    const receivedToken =
      req.headers.get("asaas-access-token") ||
      req.headers.get("x-webhook-token") ||
      new URL(req.url).searchParams.get("token");

    if (!webhookToken || receivedToken !== webhookToken) {
      console.warn("[asaas-webhook] Acesso não autorizado: token de webhook ausente ou inválido");
      return new Response(JSON.stringify({ error: "Unauthorized: Token inválido ou não configurado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const event = body.event;
    const payment = body.payment;

    if (!payment?.id) {
      return new Response(JSON.stringify({ error: "Objeto payment não fornecido no corpo do webhook" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[asaas-webhook] Evento: ${event}, Pagamento: ${payment.id}, pixQrCodeId: ${payment.pixQrCodeId}`);

    // 2. Tratamento de Estornos (PAYMENT_REFUNDED, etc.)
    if (
      event === "PAYMENT_REFUNDED" ||
      event === "PAYMENT_RECEIVED_IN_CASH_UNDONE" ||
      event === "PAYMENT_CHARGEBACK_REQUESTED"
    ) {
      const { data: existingRefund } = await supabase
        .from("beneficence_contributions")
        .select("id, status, session_id")
        .eq("asaas_payment_id", payment.id)
        .maybeSingle();

      if (existingRefund) {
        await supabase
          .from("beneficence_contributions")
          .update({
            status: "REFUNDED",
            notes: `Estornado via Asaas em ${new Date().toISOString()}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRefund.id);

        // Notificar via Realtime para atualizar os totais
        const channel = supabase.channel("tronco_realtime_channel_v2");
        await channel.send({
          type: "broadcast",
          event: "tronco_contribution_refunded",
          payload: { id: existingRefund.id, sessionId: existingRefund.session_id, status: "REFUNDED" },
        });

        return new Response(JSON.stringify({ status: "refunded_processed", id: existingRefund.id }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ status: "refund_ignored_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Apenas processar eventos de recebimento/confirmação
    if (event !== "PAYMENT_RECEIVED" && event !== "PAYMENT_CONFIRMED") {
      return new Response(JSON.stringify({ status: "ignored_event", event }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Idempotência por payment.id (Máquina de Estados)
    const { data: existingContrib } = await supabase
      .from("beneficence_contributions")
      .select("id, status, session_id")
      .eq("asaas_payment_id", payment.id)
      .maybeSingle();

    if (existingContrib) {
      // Se PAYMENT_CONFIRMED chegar após PAYMENT_RECEIVED, apenas atualizar status
      if (existingContrib.status !== "CONFIRMED") {
        await supabase
          .from("beneficence_contributions")
          .update({
            status: "CONFIRMED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingContrib.id);
      }

      console.log(`[asaas-webhook] Idempotência ativada: Pagamento ${payment.id} já registrado. 200 OK.`);
      return new Response(JSON.stringify({ status: "already_processed", id: existingContrib.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Mapeamento Estrito: payment.pixQrCodeId -> sessions.beneficence_qr_code_id
    const pixQrCodeId = payment.pixQrCodeId;
    let targetSession: any = null;

    if (pixQrCodeId) {
      const { data: sessionData } = await supabase
        .from("sessions")
        .select('id, title, date, active, "beneficenceQrStatus"')
        .or(`beneficenceQrCodeId.eq.${pixQrCodeId},beneficence_qr_code_id.eq.${pixQrCodeId}`)
        .maybeSingle();
      targetSession = sessionData;
    }

    const amount = Number(payment.value || payment.netValue || 0);
    const paidAt = payment.paymentDate || payment.confirmedDate || new Date().toISOString();

    // REGRA MANDATÓRIA: Se pixQrCodeId estiver ausente, ou não existir sessão correspondente,
    // NUNCA associar à sessão ativa. Colocar em UNMATCHED_RECONCILIATION para auditoria.
    if (!targetSession) {
      console.warn(`[asaas-webhook] QR Code desconhecido (${pixQrCodeId}). Movendo para conciliação pendente.`);
      await supabase.from("unmatched_beneficence_payments").insert({
        id: `unmatched-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        asaas_payment_id: payment.id,
        asaas_qr_code_id: pixQrCodeId || null,
        asaas_event_id: body.id || null,
        amount,
        currency: "BRL",
        status: "UNMATCHED_RECONCILIATION",
        reason: "QR_CODE_NOT_FOUND",
        raw_payload: body,
        created_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ status: "unmatched_held_for_reconciliation", paymentId: payment.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // REGRA MANDATÓRIA: Se a sessão encontrada estiver ENCERRADA (active = false ou beneficenceQrStatus = 'CLOSED')
    // Não incluir como contribuição normal da sessão encerrada sem análise do Tesoureiro
    if (targetSession.active === false || targetSession.beneficenceQrStatus === "CLOSED") {
      console.warn(`[asaas-webhook] Pagamento recebido para sessão já encerrada (${targetSession.id}).`);
      await supabase.from("unmatched_beneficence_payments").insert({
        id: `out-of-session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        asaas_payment_id: payment.id,
        asaas_qr_code_id: pixQrCodeId,
        asaas_event_id: body.id || null,
        amount,
        currency: "BRL",
        status: "OUT_OF_SESSION",
        reason: "SESSION_ALREADY_CLOSED",
        reconciled_session_id: targetSession.id,
        raw_payload: body,
        created_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ status: "out_of_session_held", sessionId: targetSession.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Inserir Contribuição Válida para Sessão Ativa
    const contributionId = `tronco-pix-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newRecord = {
      id: contributionId,
      session_id: targetSession.id,
      amount,
      currency: "BRL",
      status: "CONFIRMED",
      payment_method: "PIX",
      asaas_payment_id: payment.id,
      asaas_qr_code_id: pixQrCodeId || null,
      asaas_event_id: body.id || null,
      anonymous: true,
      notes: "Contribuição fraterna via PIX Asaas (QR Code da Sessão)",
      paid_at: paidAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from("beneficence_contributions")
      .insert(newRecord);

    if (insertError) {
      // Tratar código 23505 (violação de chave única PostgreSQL em caso de corrida)
      if (insertError.code === "23505" || insertError.message?.includes("duplicate key")) {
        console.log(`[asaas-webhook] Conflito de chave única (23505) interceptado com sucesso para ${payment.id}.`);
        return new Response(JSON.stringify({ status: "already_processed", paymentId: payment.id }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[asaas-webhook] Erro ao inserir contribuição:", insertError);
      throw insertError;
    }

    // 7. Notificar via Supabase Realtime (Broadcasting)
    try {
      const channel = supabase.channel("tronco_realtime_channel_v2");
      await channel.send({
        type: "broadcast",
        event: "tronco_contribution_confirmed",
        payload: {
          id: contributionId,
          sessionId: targetSession.id,
          sessionTitle: targetSession.title,
          amount,
          status: "CONFIRMED",
          paidAt,
        },
      });
    } catch (realtimeErr) {
      console.warn("[asaas-webhook] Aviso no broadcast realtime:", realtimeErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        contributionId,
        paymentId: payment.id,
        sessionId: targetSession.id,
        amount,
        status: "CONFIRMED",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[asaas-webhook] Erro crítico no webhook:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro no processamento" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
