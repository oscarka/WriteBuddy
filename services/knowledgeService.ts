import { ResearchSource } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://genesis-atelier-api-339795034470.us-west1.run.app';

// 获取或创建用户 ID
function getUserId(): string {
  let userId = localStorage.getItem('genesis_user_id');
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('genesis_user_id', userId);
  }
  return userId;
}

// 保存素材到知识库
export async function saveToKnowledgeBase(
  source: ResearchSource,
  projectId?: string
): Promise<boolean> {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/knowledge/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        projectId,
        source: {
          title: source.title,
          url: source.url || '',
          summary: source.summary,
          content: source.content,
          relevance: source.relevance
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error saving to knowledge base:', error);
    return false;
  }
}

// 从知识库搜索素材
export async function searchKnowledgeBase(
  query: string,
  projectId?: string,
  topK: number = 5
): Promise<ResearchSource[]> {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/knowledge/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        query,
        projectId,
        topK
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to search: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return [];
  }
}

// 批量保存素材到知识库
export async function saveMultipleToKnowledgeBase(
  sources: ResearchSource[],
  projectId?: string
): Promise<number> {
  let successCount = 0;
  for (const source of sources) {
    const success = await saveToKnowledgeBase(source, projectId);
    if (success) successCount++;
  }
  return successCount;
}
