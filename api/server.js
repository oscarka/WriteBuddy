import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY || '';
if (!API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not set!');
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// 统一的 Gemini API 代理端点
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;

    if (!API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents: contents,
      config: config || {}
    });

    res.json({
      text: response.text,
      response: response
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', hasApiKey: !!API_KEY });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`API Key configured: ${API_KEY ? 'Yes' : 'No'}`);
});
