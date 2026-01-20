
import { Project } from '../types';

// 生产环境使用 Cloud Run 后端 URL，开发环境使用 Vite proxy (空字符串)
const isProduction = import.meta.env.PROD;
const API_BASE_URL = isProduction
    ? 'https://genesis-atelier-api-339795034470.us-west1.run.app'
    : '';

/**
 * Service to interact with the backend WeKnora proxy endpoints.
 */
export const WeKnoraService = {

    /**
     * Create a Knowledge Base for a specific project.
     * This should be called when creating a new project or entering the project for the first time.
     */
    async createKnowledgeBase(projectId: string, name?: string): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/project/${projectId}/kb/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name || `Project ${projectId}`,
                    description: `Knowledge base for project ${projectId}`
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to create KB: ${response.statusText}`);
            }

            return await response.json();
        } catch (error: any) {
            console.error('WeKnoraService createKnowledgeBase error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Upload an asset file (PDF, TXT, MD, etc.) to the project's Knowledge Base.
     */
    async uploadAsset(projectId: string, kbId: string, file: File): Promise<any> {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('kbId', kbId);

            const response = await fetch(`${API_BASE_URL}/api/project/${projectId}/assets/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error: any) {
            console.error('WeKnoraService uploadAsset error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * List all knowledge assets associated with the project.
     */
    async listAssets(projectId: string, kbId: string): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/project/${projectId}/assets?kbId=${kbId}`);

            if (!response.ok) {
                throw new Error(`List assets failed: ${response.statusText}`);
            }

            const result = await response.json();
            // API returns { data: [...], success: true } usually, or result could be array directly
            const items = Array.isArray(result) ? result : (result.data || result.assets || []);
            return { assets: items };
        } catch (error: any) {
            console.error('WeKnoraService listAssets error:', error);
            return { assets: [], error: error.message };
        }
    }
};
