
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AIMode, AIStyle } from "../types";

const API_KEY = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

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
      model: 'gemini-3-pro-preview',
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
      model: 'gemini-3-pro-preview',
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
}
