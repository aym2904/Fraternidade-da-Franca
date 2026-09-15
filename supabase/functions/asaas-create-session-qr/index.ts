import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ADMIN_ROLES = [
  "tesoureiro",
  "veneravel mestre",
  "secretario",
  "chanceler",
  "administrador",
  "administracao do sistema",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validação de autenticação opcional quando há auth header
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        // Se forneceu token inválido, rejeita
        return new Response(JSON.stringify({ error: "Sessão inválida ou expirada" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { sessionId, sessionTitle, sessionDate } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Verificar se a sessão já possui QR Code estático ativo gerado pelo Asaas
    const { data: existingSession } = await supabase
      .from("sessions")
      .select('id, title, active, "beneficenceQrCodeId", "beneficenceQrPayload", "beneficenceQrImage", "beneficenceQrStatus"')
      .eq("id", sessionId)
      .maybeSingle();

    if (
      existingSession?.beneficenceQrCodeId &&
      existingSession?.beneficenceQrPayload &&
      existingSession?.beneficenceQrStatus === "ACTIVE"
    ) {
      return new Response(
        JSON.stringify({
          qrCodeId: existingSession.beneficenceQrCodeId,
          payload: existingSession.beneficenceQrPayload,
          encodedImage: existingSession.beneficenceQrImage,
          status: "ACTIVE",
          reused: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Chamar a API oficial do Asaas para criar o QR Code estático
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasPixAddressKey = Deno.env.get("ASAAS_PIX_ADDRESS_KEY");
    let asaasEnv = (Deno.env.get("ASAAS_ENVIRONMENT") || "sandbox").toLowerCase();
    if (asaasApiKey?.startsWith("$aact_hmlg_")) {
      asaasEnv = "sandbox";
    } else if (asaasApiKey?.startsWith("$aact_prod_")) {
      asaasEnv = "production";
    }
    const asaasBaseUrl =
      asaasEnv === "production"
        ? "https://api.asaas.com/v3"
        : "https://api-sandbox.asaas.com/v3";

    if (!asaasApiKey || !asaasPixAddressKey) {
      console.error("[asaas-create-session-qr] Credenciais do Asaas não configuradas (ASAAS_API_KEY ou ASAAS_PIX_ADDRESS_KEY ausente)");
      return new Response(
        JSON.stringify({
          error: "Não foi possível gerar o QR Code Pix do Asaas. Verifique a comunicação com o serviço de pagamentos e configure a chave Pix da conta Asaas.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const title = sessionTitle || existingSession?.title || `Sessão ${sessionId}`;
    // Regra estrita do Asaas: a descrição do QR Code estático deve ter no máximo 37 caracteres
    const cleanTitle = (title || `Sessão ${sessionId}`).replace(/[^\w\sÀ-ÿºª.-]/gi, '').trim();
    const description = `Tronco - ${cleanTitle}`.slice(0, 37);

    const asaasPayload = {
      addressKey: asaasPixAddressKey,
      description,
      value: null, // Valor livre para o irmão digitar no aplicativo bancário
      format: "ALL",
      allowsMultiplePayments: true,
    };

    const asaasRes = await fetch(`${asaasBaseUrl}/pix/qrCodes/static`, {
      method: "POST",
      headers: {
        access_token: asaasApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(asaasPayload),
    });

    if (!asaasRes.ok) {
      const errorText = await asaasRes.text();
      console.error("[asaas-create-session-qr] Erro na API do Asaas:", errorText);
      return new Response(
        JSON.stringify({
          error: "Não foi possível gerar o QR Code Pix do Asaas. Verifique a comunicação com o serviço de pagamentos.",
          details: asaasEnv === "sandbox" ? errorText : undefined,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const asaasData = await asaasRes.json();
    const qrCodeId = asaasData.id;
    const payload = asaasData.payload;
    const encodedImage = asaasData.encodedImage;

    if (!qrCodeId || !payload) {
      return new Response(
        JSON.stringify({
          error: "Resposta inválida da API do Asaas ao gerar o QR Code Pix.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Persistir exclusivamente o identificador e payload oficiais do Asaas na sessão
    await supabase
      .from("sessions")
      .update({
        beneficenceQrCodeId: qrCodeId,
        beneficenceQrPayload: payload,
        beneficenceQrImage: encodedImage,
        beneficenceQrStatus: "ACTIVE",
        beneficence_qr_code_id: qrCodeId,
        beneficence_qr_payload: payload,
        beneficence_qr_image: encodedImage,
        beneficence_qr_status: "ACTIVE",
      })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({
        qrCodeId,
        payload,
        encodedImage,
        status: "ACTIVE",
        reused: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[asaas-create-session-qr] Erro interno:", error);
    return new Response(
      JSON.stringify({
        error: "Não foi possível gerar o QR Code Pix do Asaas. Verifique a comunicação com o serviço de pagamentos.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
