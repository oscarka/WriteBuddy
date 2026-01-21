import { ResearchData } from '../types';

/**
 * Generates a structured Markdown document (World Bible) from inspiration data.
 * This document serves as a persistent reference for story settings and is synced to KB.
 */
export function generateBibleContent(data: {
    title: string;
    description: string;
    research: ResearchData;
    outline: Array<{ title: string; description: string }>;
}): string {
    const { title, description, research, outline } = data;

    const sections: string[] = [];

    // Header
    sections.push(`# ${title} - 设定集`);
    sections.push('');
    sections.push(`> 本文档由灵感向导自动生成，记录了故事的核心设定。您可以随时编辑此文档，AI 将自动读取最新内容。`);
    sections.push('');

    // Logline
    sections.push('## 核心概念 (Logline)');
    sections.push('');
    sections.push(description || '（待补充）');
    sections.push('');

    // World Building
    sections.push('## 世界观 (World Building)');
    sections.push('');
    sections.push(research.background || '（待补充）');
    sections.push('');

    // Characters
    sections.push('## 角色设定 (Characters)');
    sections.push('');
    if (research.characters && research.characters.length > 0) {
        research.characters.forEach((char, i) => {
            sections.push(`### ${i + 1}. ${char}`);
            sections.push('');
            sections.push('- **性格特征**：（待补充）');
            sections.push('- **核心欲望**：（待补充）');
            sections.push('- **内心恐惧**：（待补充）');
            sections.push('- **人物关系**：（待补充）');
            sections.push('');
        });
    } else {
        sections.push('（待补充）');
        sections.push('');
    }

    // Key Terms
    sections.push('## 关键术语 (Key Terms)');
    sections.push('');
    if (research.terms && research.terms.length > 0) {
        sections.push(research.terms.map(t => `\`${t}\``).join(' · '));
    } else {
        sections.push('（待补充）');
    }
    sections.push('');

    // Story Beats
    sections.push('## 故事节拍 (Story Beats)');
    sections.push('');
    if (outline && outline.length > 0) {
        outline.forEach((ch, i) => {
            sections.push(`### 第${i + 1}章：${ch.title}`);
            sections.push('');
            sections.push(ch.description || '（待补充）');
            sections.push('');
        });
    } else {
        sections.push('（待补充）');
        sections.push('');
    }

    // Footer
    sections.push('---');
    sections.push(`*生成时间：${new Date().toLocaleString('zh-CN')}*`);

    return sections.join('\n');
}

/**
 * Creates a File object from bible content for upload.
 */
export function createBibleFile(content: string): File {
    const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' });
    return new File([blob], 'world_bible.md', { type: 'text/markdown' });
}
