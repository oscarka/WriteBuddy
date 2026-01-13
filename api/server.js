import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { Storage } from '@google-cloud/storage';
import cors from 'cors';
import fetch from 'node-fetch';
import FormData from 'form-data';

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

// WeKnora API 代理配置
const WEKNORA_BASE_URL = process.env.WEKNORA_BASE_URL || '';
const WEKNORA_API_KEY = process.env.WEKNORA_API_KEY || '';

// 知识库相关接口 - 代理到 WeKnora
if (WEKNORA_BASE_URL) {
  // 创建知识库
  app.post('/api/knowledge/create', async (req, res) => {
    try {
      const { name, description, type } = req.body;
      
      const response = await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledgebases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': WEKNORA_API_KEY
        },
        body: JSON.stringify({ name, description, type: type || 'document' })
      });
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('WeKnora API error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 上传文档到知识库
  app.post('/api/knowledge/upload', async (req, res) => {
    try {
      const { knowledgeBaseId, content, title, url } = req.body;
      
      // WeKnora API 可能需要不同的格式，这里先实现文本上传
      const response = await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledgebases/${knowledgeBaseId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': WEKNORA_API_KEY
        },
        body: JSON.stringify({
          title: title || 'Untitled',
          content: content || '',
          url: url || ''
        })
      });
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('WeKnora upload error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 搜索知识库
  app.post('/api/knowledge/search', async (req, res) => {
    try {
      const { knowledgeBaseId, query, topK = 5 } = req.body;
      
      const response = await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledgebases/${knowledgeBaseId}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': WEKNORA_API_KEY
        },
        body: JSON.stringify({ query, top_k: topK })
      });
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('WeKnora search error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 获取知识库列表
  app.get('/api/knowledge/list', async (req, res) => {
    try {
      const response = await fetch(`${WEKNORA_BASE_URL}/api/v1/knowledgebases`, {
        headers: {
          'x-api-key': WEKNORA_API_KEY
        }
      });
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('WeKnora list error:', error);
      res.status(500).json({ error: error.message });
    }
  });
} else {
  // 如果 WeKnora 未配置，提供简单的知识库接口（使用 Firestore + Gemini Embeddings）
  console.log('WeKnora not configured, using simple knowledge base implementation');
  
  // 简单的知识库实现（使用 Firestore）
  app.post('/api/knowledge/save', async (req, res) => {
    try {
      const { userId, projectId, source } = req.body;
      
      if (!userId || !source) {
        return res.status(400).json({ error: 'userId and source are required' });
      }

      // 生成向量（使用 Gemini Embeddings）
      const embeddingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: `${source.title}\n${source.summary}\n${source.content}` }] }
        })
      });
      
      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.embedding?.values || [];

      // 存储到 Cloud Storage（知识库数据）
      const knowledgeData = {
        id: `kb-${Date.now()}`,
        userId,
        projectId: projectId || null,
        source,
        embedding,
        createdAt: new Date().toISOString()
      };

      const bucket = storage.bucket(BUCKET_NAME);
      const file = bucket.file(`knowledge/${userId}/${knowledgeData.id}.json`);
      await file.save(JSON.stringify(knowledgeData, null, 2), {
        contentType: 'application/json'
      });
      
      res.json({ success: true, id: knowledgeData.id });
    } catch (error) {
      console.error('Error saving knowledge:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/knowledge/search', async (req, res) => {
    try {
      const { userId, query, projectId, topK = 5 } = req.body;
      
      if (!userId || !query) {
        return res.status(400).json({ error: 'userId and query are required' });
      }

      // 生成查询向量
      const embeddingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: query }] }
        })
      });
      
      const embeddingData = await embeddingResponse.json();
      const queryEmbedding = embeddingData.embedding?.values || [];

      // 从 Cloud Storage 加载所有知识库条目
      const bucket = storage.bucket(BUCKET_NAME);
      const [files] = await bucket.getFiles({ prefix: `knowledge/${userId}/` });
      
      const results = [];
      for (const file of files) {
        const [contents] = await file.download();
        const knowledgeData = JSON.parse(contents.toString());
        
        // 如果指定了 projectId，只返回关联到该项目的
        if (projectId && knowledgeData.projectId !== projectId) {
          continue;
        }
        
        // 计算余弦相似度
        const similarity = cosineSimilarity(queryEmbedding, knowledgeData.embedding);
        results.push({
          ...knowledgeData.source,
          similarity,
          id: knowledgeData.id
        });
      }
      
      // 按相似度排序并返回 topK
      results.sort((a, b) => b.similarity - a.similarity);
      res.json({ results: results.slice(0, topK) });
    } catch (error) {
      console.error('Error searching knowledge:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

// 余弦相似度计算函数
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    hasApiKey: !!API_KEY,
    hasWeKnora: !!WEKNORA_BASE_URL
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`API Key configured: ${API_KEY ? 'Yes' : 'No'}`);
});
