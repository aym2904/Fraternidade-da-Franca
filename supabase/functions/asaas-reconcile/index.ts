import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Validação de Autenticação e Autorização Administrativa
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Sessão inválida ou expirada" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Localizar sessão e respectivo QR Code
    const { data: session } = await supabase
      .from("sessions")
      .select('id, title, date, "beneficenceQrCodeId", beneficence_qr_code_id')
      .eq("id", sessionId)
      .maybeSingle();

    const qrCodeId = session?.beneficenceQrCodeId || session?.beneficence_qr_code_id;
    if (!qrCodeId) {
      return new Response(
        JSON.stringify({ error: "A sessão não possui QR Code estático do Asaas vinculado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasEnv = (Deno.env.get("ASAAS_ENVIRONMENT") || "sandbox").toLowerCase();
    const asaasBaseUrl =
      asaasEnv === "production"
        ? "https://api.asaas.com/v3"
        : "https://api-sandbox.asaas.com/v3";

    if (!asaasApiKey) {
      return new Response(
        JSON.stringify({ error: "ASAAS_API_KEY não configurada no servidor" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Consulta Paginada ao Asaas
    let offset = 0;
    const limit = 50;
    let hasMore = true;
    const allPayments: any[] = [];

    while (hasMore) {
      const asaasRes = await fetch(
        `${asaasBaseUrl}/payments?pixQrCodeId=${qrCodeId}&offset=${offset}&limit=${limit}`,
        {
          headers: {
            access_token: asaasApiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (!asaasRes.ok) {
        const errorText = await asaasRes.text();
        throw new Error(`Falha na API do Asaas durante conciliação: ${errorText}`);
      }

      const asaasData = await asaasRes.json();
      const payments = asaasData.data || [];
      allPayments.push(...payments);

      if (payments.length < limit || (asaasData.totalCount && allPayments.length >= asaasData.totalCount)) {
        hasMore = false;
      } else {
        offset += limit;
      }

      // Trava de segurança para evitar loops infinitos (máximo 500 pagamentos por lote de conciliação)
      if (offset >= 500) break;
    }

    let syncedCount = 0;
    let totalSyncedAmount = 0;

    for (const payment of allPayments) {
      if (payment.status !== "RECEIVED" && payment.status !== "CONFIRMED") continue;

      // Verificar se já existe pelo payment.id
      const { data: existing } = await supabase
        .from("beneficence_contributions")
        .select("id")
        .eq("asaas_payment_id", payment.id)
        .maybeSingle();

      if (!existing) {
        const contributionId = `tronco-pix-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const amount = Number(payment.value || payment.netValue || 0);
        const paidAt = payment.paymentDate || payment.confirmedDate || new Date().toISOString();

        await supabase.from("beneficence_contributions").insert({
          id: contributionId,
          session_id: session.id,
          amount,
          currency: "BRL",
          status: "CONFIRMED",
          payment_method: "PIX",
          asaas_payment_id: payment.id,
          asaas_qr_code_id: qrCodeId,
          anonymous: true,
          notes: "Conciliado via API Asaas",
          paid_at: paidAt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        syncedCount++;
        totalSyncedAmount += amount;
      }
    }

    return new Response(
      JSON.stringify({
        status: "success",
        totalPaymentsFound: allPayments.length,
        syncedCount,
        totalSyncedAmount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[asaas-reconcile] Erro na conciliação:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
