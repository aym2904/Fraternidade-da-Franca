import { handleAsaasWebhook } from '../asaasWebhookHandler.js';

export default async function handler(req: any, res: any) {
  // 1. Garante que o endpoint Serverless aceite exclusivamente requisições POST
  if (req.method !== 'POST') {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Allow', 'POST');
    }
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Este endpoint aceita exclusivamente requisições POST enviadas pelo webhook do Asaas.',
    });
  }

  // 2. Normalização defensiva de body caso o runtime da Vercel entregue como string
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return res.status(503).json({ error: 'Payload JSON inválido' });
    }
  }

  // 3. Execução da lógica canônica compartilhada (V2.2.6 FINAL)
  return handleAsaasWebhook(req, res);
}
