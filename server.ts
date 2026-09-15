import 'dotenv/config';
import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { handleAsaasWebhook } from './server/asaasWebhookHandler';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // -------------------------------------------------------------
  // SUPABASE ADMIN CLIENT (V2.2.6 FAIL-CLOSED)
  // -------------------------------------------------------------
  const rawSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const cleanSupabaseUrl = rawSupabaseUrl ? rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '') : null;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseAdmin = (cleanSupabaseUrl && supabaseServiceKey)
    ? createClient(cleanSupabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

  function isSystemAdmin(member: any): boolean {
    if (!member) return false;

    const cleanCim = String(member.cim || '').trim().toLowerCase();
    const rawId = String(member.id || '').trim().toLowerCase();

    return (
      rawId === 'sys-admin-master' ||
      rawId === 'sys-admin-193245' ||
      rawId === 'admin' ||
      rawId === '193245' ||
      cleanCim === 'admin' ||
      cleanCim === '193245' ||
      member.fullName === 'Administração do Sistema'
    );
  }

  function isAuthorizedForReconciliation(member: any): boolean {
    if (!member) return false;
    if (isSystemAdmin(member)) return true;
    const role = member.currentOfficerRole;
    if (!role) return false;
    const cleanRole = String(role).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return (
      cleanRole === 'veneravel mestre' ||
      cleanRole === 'tesoureiro' ||
      cleanRole === 'hospitaleiro' ||
      cleanRole === 'secretario'
    );
  }

  // -------------------------------------------------------------
  // TRONCO DE BENEFICÊNCIA & ASAAS API INTEGRATION
  // Modelo Oficial: QR CODE PIX ESTÁTICO ASAAS + WEBHOOK IDEMPOTENTE (V2.2.6 FINAL)
  // -------------------------------------------------------------

  function resolveAsaasConfig() {
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

  // POST /api/tronco/session-qr - Cria ou obtém o QR Code PIX estático oficial do Asaas para a sessão
  const handleCreateSessionQr = async (req: express.Request, res: express.Response) => {
    try {
      const { sessionId, sessionTitle } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId é obrigatório' });
      }

      const { apiKey, pixAddressKey, env: asaasEnv, baseUrl: asaasBaseUrl } = resolveAsaasConfig();

      if (!apiKey || apiKey === 'MY_ASAAS_API_KEY' || !pixAddressKey) {
        console.warn('[ASAAS] ASAAS_API_KEY ou ASAAS_PIX_ADDRESS_KEY ausente ou não configurada no backend');
        return res.status(503).json({
          error: 'Não foi possível gerar o QR Code Pix do Asaas. Verifique a comunicação com o serviço de pagamentos.',
        });
      }

      // Regra estrita do Asaas: a descrição do QR Code estático deve ter no máximo 37 caracteres
      const cleanTitle = (sessionTitle || `Sessão ${sessionId}`).replace(/[^\w\sÀ-ÿºª.-]/gi, '').trim();
      const desc = `Tronco - ${cleanTitle}`.slice(0, 37);
      console.log(`[ASAAS] Chamando POST ${asaasBaseUrl}/pix/qrCodes/static para sessão ${sessionId} (desc: "${desc}")`);

      const asaasRes = await fetch(`${asaasBaseUrl}/pix/qrCodes/static`, {
        method: 'POST',
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addressKey: pixAddressKey,
          description: desc,
          value: null, // Valor livre para o irmão definir no aplicativo bancário
          format: 'ALL',
          allowsMultiplePayments: true,
        }),
      });

      if (!asaasRes.ok) {
        const errText = await asaasRes.text();
        console.warn(`[ASAAS API Warning] Falha ao criar QR Code estático: ${errText}`);
        return res.status(502).json({
          error: 'Não foi possível gerar o QR Code Pix do Asaas. Verifique a comunicação com o serviço de pagamentos.',
          details: asaasEnv === 'sandbox' ? errText : undefined,
        });
      }

      const asaasData: any = await asaasRes.json();
      const qrCodeId = asaasData.id;
      const payload = asaasData.payload;
      const encodedImage = asaasData.encodedImage;

      if (!qrCodeId || !payload) {
        console.warn('[ASAAS API Warning] Resposta incompleta do Asaas para static QR:', asaasData);
        return res.status(502).json({
          error: 'Não foi possível gerar o QR Code Pix do Asaas. Verifique a comunicação com o serviço de pagamentos.',
        });
      }

      console.log(`[ASAAS] QR Code estático oficial gerado com sucesso! ID: ${qrCodeId}`);

      return res.json({
        success: true,
        sessionId,
        qrCodeId,
        payload,
        encodedImage,
        status: 'ACTIVE',
      });
    } catch (err: any) {
      console.error('[ASAAS] Exceção ao gerar QR Code estático:', err);
      return res.status(500).json({
        error: 'Não foi possível gerar o QR Code Pix do Asaas. Verifique a comunicação com o serviço de pagamentos.',
      });
    }
  };

  app.post('/api/tronco/session-qr', handleCreateSessionQr);
  app.post('/api/asaas/create-session-qr', handleCreateSessionQr);

  // POST /api/webhooks/asaas - Endpoint de webhook para pagamentos Asaas (V2.2.6 FINAL)
  app.post('/api/webhooks/asaas', handleAsaasWebhook);

  // POST /api/tronco/reconcile - Endpoint de reconciliação de pagamento com autenticação Supabase e autorização canônica (V2.2.6 FINAL)
  const handleReconcile = async (req: express.Request, res: express.Response) => {
    try {
      if (!supabaseAdmin) {
        return res.status(503).json({
          error: 'Supabase Admin não configurado no servidor.',
        });
      }

      // 1. Autenticação pelo Supabase Auth (Bearer token no header Authorization)
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação ausente ou inválido.' });
      }

      const token = authHeader.replace('Bearer ', '').trim();
      const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);

      if (authErr || !authData?.user) {
        return res.status(401).json({ error: 'Sessão de usuário inválida ou expirada.' });
      }

      const authUser = authData.user;

      // 2. Obter membro real na tabela members (por email ou id auth)
      let memberRecord: any = null;
      if (authUser.email) {
        const { data: memberByEmail } = await supabaseAdmin
          .from('members')
          .select('*')
          .eq('email', authUser.email)
          .maybeSingle();
        memberRecord = memberByEmail;
      }

      if (!memberRecord) {
        const { data: memberById } = await supabaseAdmin
          .from('members')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        memberRecord = memberById;
      }

      if (!memberRecord) {
        return res.status(403).json({
          error: 'Membro não encontrado no quadro da Loja para este usuário autenticado.',
        });
      }

      // 3. Autorização estrita baseada em members.currentOfficerRole (e System Admin)
      if (!isAuthorizedForReconciliation(memberRecord)) {
        return res.status(403).json({
          error: 'Acesso negado. A conciliação de pagamentos do Tronco é restrita aos Oficiais autorizados.',
        });
      }

      const { paymentId, sessionId } = req.body;
      if (!paymentId || typeof paymentId !== 'string' || paymentId.trim() === '') {
        return res.status(400).json({ error: 'paymentId é obrigatório' });
      }

      if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
        return res.status(400).json({ error: 'sessionId é obrigatório' });
      }

      const reconciledBy = memberRecord.id;

      console.log(
        `[TRONCO RECONCILE] Membro ${memberRecord.fullName} (${memberRecord.currentOfficerRole}) conciliando payment=${paymentId} na session=${sessionId}`
      );

      // 4. Chamar RPC reconcile_tronco_payment
      const { data: reconcileResult, error: reconcileError } = await supabaseAdmin.rpc(
        'reconcile_tronco_payment',
        {
          p_payment_id: paymentId,
          p_session_id: sessionId,
          p_reconciled_by: reconciledBy,
        }
      );

      if (reconcileError) {
        console.error('[TRONCO RECONCILE] Erro na RPC reconcile_tronco_payment:', reconcileError);
        return res.status(500).json({
          error: 'Falha ao conciliar pagamento',
          details: reconcileError.message,
        });
      }

      // 5. Broadcast Realtime somente após o sucesso da RPC e se uma reconciliação nova ocorreu (não em ALREADY_RECONCILED)
      let broadcastChannel: any = null;
      try {
        if (reconcileResult?.action === 'RECONCILED') {
          broadcastChannel = supabaseAdmin.channel('tronco_public_updates');
          await broadcastChannel.send({
            type: 'broadcast',
            event: 'tronco_session_updated',
            payload: { session_id: sessionId },
          });
          console.log(`[TRONCO RECONCILE] Realtime broadcast enviado para session_id=${sessionId}`);
        } else {
          console.log(`[TRONCO RECONCILE] Broadcast Realtime omitido para action=${reconcileResult?.action}`);
        }
      } catch (broadcastErr) {
        console.warn('[TRONCO RECONCILE] Falha no broadcast Realtime:', broadcastErr);
      } finally {
        if (broadcastChannel) {
          try {
            supabaseAdmin.removeChannel(broadcastChannel);
          } catch {}
        }
      }

      return res.json({
        success: true,
        reconciledBy,
        result: reconcileResult,
      });
    } catch (err: any) {
      console.error('[TRONCO RECONCILE] Exceção:', err);
      return res.status(500).json({ error: err?.message || 'Erro interno na conciliação' });
    }
  };

  app.post('/api/tronco/reconcile', handleReconcile);
  app.post('/api/asaas/reconcile', handleReconcile);

  // POST /api/tronco/simulate-pay-qr - Simula pagamento APENAS em Sandbox quando explicitamente ativado
  app.post('/api/tronco/simulate-pay-qr', async (req, res) => {
    try {
      const { env: asaasEnv } = resolveAsaasConfig();
      const isProduction =
        process.env.NODE_ENV === 'production' || asaasEnv === 'production';
      const isSimulatorEnabled = process.env.ASAAS_ENABLE_SIMULATOR === 'true';

      // REGRA OBRIGATÓRIA: Bloqueio absoluto em produção e requer ASAAS_ENABLE_SIMULATOR=true
      if (isProduction || !isSimulatorEnabled) {
        return res.status(403).json({
          error:
            'Simulador desativado. Simulação de pagamentos é estritamente proibida em produção e requer ASAAS_ENABLE_SIMULATOR=true em ambiente Sandbox.',
        });
      }

      const { sessionId, qrCodeId, amount, payload } = req.body;
      const numAmount = Number(amount) || 50;
      const paymentId = `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const apiKey = process.env.ASAAS_API_KEY;
      const asaasBaseUrl = 'https://api-sandbox.asaas.com/v3';

      if (apiKey && apiKey !== 'MY_ASAAS_API_KEY' && payload) {
        try {
          const simRes = await fetch(`${asaasBaseUrl}/pix/qrCodes/pay`, {
            method: 'POST',
            headers: {
              access_token: apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              qrCode: { payload },
              value: numAmount,
            }),
          });
          const simData = await simRes.json();
          console.log('[ASAAS SANDBOX] Simulação oficial via /pix/qrCodes/pay executada:', simData);
        } catch (e) {
          console.warn('[ASAAS SANDBOX] Falha na chamada de simulação Asaas:', e);
        }
      }

      return res.json({
        success: true,
        payment: {
          id: paymentId,
          value: numAmount,
          pixQrCodeId: qrCodeId,
          sessionId: sessionId || 'sess-atual',
          status: 'CONFIRMED',
          paymentDate: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // AI refinement endpoint
  app.post('/api/ai/refine-balaustre', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'O texto do balaústre é obrigatório.' });
      }

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.json({
          text: `${prompt}\n\n[RESUMO SINTÉTICO GERADO PELA SECRETARIA]: Trabalhos encerrados com o Tronco de Beneficência coberto e saudações fraternais.`,
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const fullPrompt = `Atue como um Secretário Maçônico experiente da A∴R∴L∴S∴ Fraternidade da Franca Nº3571. Refine a minuta de ata/balaústre maçônico abaixo tornando o estilo solene, formal e impecável regimentalmente:\n\n${prompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });

      return res.json({ text: response.text || '' });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      return res.status(500).json({ error: err?.message || 'Erro ao processar com a IA.' });
    }
  });

  // Vite middleware for development vs static file serving for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
