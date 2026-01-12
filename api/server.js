import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { Storage } from '@google-cloud/storage';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY || '';
if (!API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not set!');
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// 初始化 Cloud Storage
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'genesis-atelier-data';
const DATA_FILE_NAME = 'projects-data.json';

// 确保存储桶存在
async function ensureBucketExists() {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const [exists] = await bucket.exists();
    if (!exists) {
      await bucket.create({
        location: 'us-west1',
        storageClass: 'STANDARD'
      });
      console.log(`Created bucket: ${BUCKET_NAME}`);
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
  }
}

ensureBucketExists();

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

// 保存项目数据到 Cloud Storage
app.post('/api/storage/save', async (req, res) => {
  try {
    const { userId, projects } = req.body;
    
    if (!userId || !projects) {
      return res.status(400).json({ error: 'userId and projects are required' });
    }

    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(`${userId}/${DATA_FILE_NAME}`);
    
    const data = {
      userId,
      projects,
      lastSaved: new Date().toISOString()
    };
    
    await file.save(JSON.stringify(data, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'no-cache'
      }
    });
    
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving to Cloud Storage:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to save data',
      details: error.toString()
    });
  }
});

// 从 Cloud Storage 加载项目数据
app.get('/api/storage/load', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(`${userId}/${DATA_FILE_NAME}`);
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.json({ projects: [], exists: false });
    }
    
    const [contents] = await file.download();
    const data = JSON.parse(contents.toString());
    
    res.json({ 
      projects: data.projects || [],
      lastSaved: data.lastSaved,
      exists: true
    });
  } catch (error) {
    console.error('Error loading from Cloud Storage:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to load data',
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
