import { Injectable } from '@angular/core';

export interface ChatTheme {
  id: string;
  name: string;
  emoji: string;
  primary: string;
  bubbleBg: string;
  bubbleText: string;
  gradient: string;
  shadow: string;
}

@Injectable({ providedIn: 'root' })
export class ChatThemeService {

  readonly themes: ChatTheme[] = [
    {
      id: 'default',
      name: 'Default',
      emoji: '💜',
      primary: '#6366f1',
      bubbleBg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      bubbleText: '#ffffff',
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      shadow: 'rgba(99,102,241,0.30)',
    },
    {
      id: 'ocean',
      name: 'Ocean',
      emoji: '🌊',
      primary: '#0ea5e9',
      bubbleBg: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
      bubbleText: '#ffffff',
      gradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
      shadow: 'rgba(14,165,233,0.28)',
    },
    {
      id: 'sunset',
      name: 'Sunset',
      emoji: '🌅',
      primary: '#f97316',
      bubbleBg: 'linear-gradient(135deg, #f97316, #ef4444)',
      bubbleText: '#ffffff',
      gradient: 'linear-gradient(135deg, #f97316, #ef4444)',
      shadow: 'rgba(249,115,22,0.28)',
    },
    {
      id: 'forest',
      name: 'Forest',
      emoji: '🌿',
      primary: '#10b981',
      bubbleBg: 'linear-gradient(135deg, #10b981, #059669)',
      bubbleText: '#ffffff',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      shadow: 'rgba(16,185,129,0.28)',
    },
    {
      id: 'rose',
      name: 'Rose',
      emoji: '🌸',
      primary: '#f43f5e',
      bubbleBg: 'linear-gradient(135deg, #f43f5e, #ec4899)',
      bubbleText: '#ffffff',
      gradient: 'linear-gradient(135deg, #f43f5e, #ec4899)',
      shadow: 'rgba(244,63,94,0.28)',
    },
    {
      id: 'midnight',
      name: 'Midnight',
      emoji: '🌙',
      primary: '#4338ca',
      bubbleBg: 'linear-gradient(135deg, #4338ca, #1e1b4b)',
      bubbleText: '#ffffff',
      gradient: 'linear-gradient(135deg, #4338ca, #1e1b4b)',
      shadow: 'rgba(67,56,202,0.35)',
    },
    {
      id: 'candy',
      name: 'Candy',
      emoji: '🍬',
      primary: '#ec4899',
      bubbleBg: 'linear-gradient(135deg, #ec4899, #a855f7)',
      bubbleText: '#ffffff',
      gradient: 'linear-gradient(135deg, #ec4899, #a855f7)',
      shadow: 'rgba(236,72,153,0.28)',
    },
    {
      id: 'lemon',
      name: 'Lemon',
      emoji: '🍋',
      primary: '#ca8a04',
      bubbleBg: 'linear-gradient(135deg, #eab308, #f59e0b)',
      bubbleText: '#1c1917',
      gradient: 'linear-gradient(135deg, #eab308, #f59e0b)',
      shadow: 'rgba(234,179,8,0.30)',
    },
  ];

  getTheme(convId: number): ChatTheme {
    const id = localStorage.getItem(`chat-theme-${convId}`) ?? 'default';
    return this.themes.find(t => t.id === id) ?? this.themes[0];
  }

  setTheme(convId: number, themeId: string): void {
    localStorage.setItem(`chat-theme-${convId}`, themeId);
  }
}
