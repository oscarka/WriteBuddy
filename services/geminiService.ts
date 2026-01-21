
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AIMode, AIStyle } from "../types";

// 使用后端 API 代理
// 生产环境使用 Cloud Run 后端 URL，开发环境使用 Vite proxy (空字符串)
const isProduction = import.meta.env.PROD;
const API_BASE_URL = isProduction
  ? 'https://genesis-atelier-api-339795034470.us-west1.run.app'
  : (import.meta.env.VITE_API_URL || '');
const USE_BACKEND_API = true; // 使用后端 API 代理

// 直接调用后端 API 的辅助函数
async function callBackendAPI(model: string, contents: string, config?: any) {
  const response = await fetch(`${API_BASE_URL}/api/gemini/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, contents, config })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  // 返回兼容 SDK 格式的对象
  return {
    text: data.text || '',
    response: data.response || data
  };
}

// 如果使用后端 API，创建一个包装对象来模拟 SDK
const ai = USE_BACKEND_API ? {
  models: {
    generateContent: async (options: any) => {
      return await callBackendAPI(
        options.model,
        options.contents,
        options.config
      );
    }
  }
} : new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export class AIService {
  static async analyzeInspiration(text: string) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `用户有一个灵感：“${text}”。请以此生成4个截然不同的创作方向。请使用中文回答。格式为 JSON 数组，包含 {title, description}。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "description"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  }

  static async researchDirection(direction: string) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `针对创作方向："${direction}"进行研究并提供结构化数据。重点关注背景知识、角色原型、现实案例和专业术语。请使用中文回答。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            background: { type: Type.STRING },
            characters: { type: Type.ARRAY, items: { type: Type.STRING } },
            cases: { type: Type.ARRAY, items: { type: Type.STRING } },
            terms: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["background", "characters", "cases", "terms"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  }

  static async searchResearchMaterials(query: string, direction: string) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `作为一位专业的研究助手，请为创作方向"${direction}"搜索和整理相关的研究素材、参考资料、案例和背景知识。

搜索关键词："${query}"

请基于你的知识库，整理出3-5个高质量的研究素材。每个素材应该：
1. 有明确的标题（可以是论文标题、书籍章节、新闻报道、历史事件等）
2. 提供可能的来源URL（如果知道的话，否则可以为空）
3. 50-100字的简短摘要
4. 200-500字的详细内容说明
5. 相关度评分（0-100，基于与创作方向的关联度）

请使用中文回答，格式为 JSON 数组。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              summary: { type: Type.STRING, description: "简短摘要，50-100字" },
              content: { type: Type.STRING, description: "详细内容，200-500字" },
              relevance: { type: Type.NUMBER, description: "相关度评分，0-100" }
            },
            required: ["title", "summary", "content", "relevance"]
          }
        }
      }
    });
    const results = JSON.parse(response.text || "[]");
    return results.map((r: any, i: number) => ({
      id: `source-${Date.now()}-${i}`,
      url: r.url || '',
      ...r,
      timestamp: Date.now()
    }));
  }

  static async generateOutline(direction: string, research: any) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `根据方向“${direction}”和研究资料：${JSON.stringify(research)}，生成一个包含5个初始章节的故事大纲。请使用中文回答。格式为 JSON 数组，包含 {title, description}。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  }

  static async getProactiveAdvice(content: string, aiMode: string) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位擅长 ${aiMode} 风格的资深编辑。请审阅这段文字：“${content}”。提供2条简短的、主动的改进建议或情节扩张。请使用中文回答。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: "plot, character, style, 或 logic" },
              text: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  }

  static async continueWriting(context: string, mode: AIMode, style: AIStyle) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `请在 ${mode} 模式和 ${style} 风格下继续创作： “${context}”`,
      config: {
        systemInstruction: `你是一位得力的创意写作助手。保持用户的语气，同时增加深度。请使用中文回答。`
      }
    });
    return response.text;
  }

  static async polishText(text: string) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `在保持原意的基础上，润色并提高这段文字的文学质量：“${text}”`
    });
    return response.text;
  }

  // Phase 3: WeKnora Knowledge Base Chat
  static async chatWithProject(projectId: string, kbId: string | undefined, messages: any[], context?: any) {
    if (!USE_BACKEND_API) {
      throw new Error("Backend API must be enabled for RAG features.");
    }

    try {
      const payload = {
        messages: messages,
        kbId: kbId,
        stream: false, // For now, simple response
        context: context // Optional extra context passed to backend if needed (e.g. L2 outline)
      };

      const response = await fetch(`${API_BASE_URL}/api/project/${projectId}/agent-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Chat API failed: ${response.status}`);
      }

      const data = await response.json();
      // Adapt WeKnora/OpenAI response format to simple text
      // Assuming data.choices[0].message.content
      return data.choices?.[0]?.message?.content || data.response || "No response generated.";
    } catch (error: any) {
      console.error("AI Service Error:", error);
      return `Error: ${error.message}`;
    }
  }
}
