import { Project } from '../types';

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

// 保存项目数据到 Cloud Storage
export async function saveProjectsToCloud(projects: Project[]): Promise<boolean> {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/storage/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        projects
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error saving to cloud:', error);
    return false;
  }
}

// 从 Cloud Storage 加载项目数据
export async function loadProjectsFromCloud(): Promise<Project[] | null> {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/api/storage/load?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
      throw new Error(`Failed to load: ${response.statusText}`);
    }

    const data = await response.json();
    return data.projects || null;
  } catch (error) {
    console.error('Error loading from cloud:', error);
    return null;
  }
}

// 获取用户 ID（用于显示）
export function getUserIdForDisplay(): string {
  return getUserId();
}
