import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
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
        // Fallback response if GEMINI_API_KEY is not set
        return res.json({
          text: `${prompt}\n\n[RESUMO SINTÉTICO GERADO PELA SECRETARIA]: Trabalhos encerrados com a Tronco de Beneficência coberta e saudações maçônicas ao Grão-Mestrado.`
        });
      }

      const ai = new GoogleGenAI({ apiKey });
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

startServer();
