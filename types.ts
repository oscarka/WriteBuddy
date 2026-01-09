
export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface Project {
  id: string;
  title: string;
  type: string;
  description: string;
  wordCount: number;
  lastEdited: number;
  chapters: Chapter[];
  currentChapterId: string;
  aiMode: string;
  style: string;
}

export interface InspirationDirection {
  title: string;
  description: string;
}

export interface ResearchData {
  background: string;
  characters: string[];
  cases: string[];
  terms: string[];
}

export interface Suggestion {
  id: string;
  type: 'plot' | 'character' | 'style' | 'logic';
  text: string;
  timestamp: number;
}

export type ViewState = 'dashboard' | 'inspiration-wizard' | 'editor';

export enum AIStyle {
  LITERARY = '官方文学',
  CREATIVE = '创意小说',
  ACADEMIC = '学术严谨',
  JOURNALISTIC = '新闻纪实'
}

export enum AIMode {
  DEFAULT = '默认助手',
  CTHULHU = '克苏鲁神话',
  CYBERPUNK = '赛博朋克',
  CLASSIC = '经典写实'
}
