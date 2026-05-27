import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component } from '@angular/core';

type Sender = 'user' | 'bot';

interface ChatMessage {
  sender: Sender;
  text: string;
  time: Date;
}

interface QuickPrompt {
  icon: string;
  text: string;
}

@Component({
  standalone: false,
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent {
  readonly apiUrl = 'http://localhost:8000/chat';

  draftMessage = '';
  isSending = false;
  messages: ChatMessage[] = [];

  quickPrompts: QuickPrompt[] = [
    {
      icon: '⏱',
      text: 'Estimate a mobile app for delivery tracking with payment integration',
    },
    {
      icon: '🎨',
      text: 'Estimate a brand identity design project with logo and style guide',
    },
    {
      icon: '🔍',
      text: 'Match freelancers for project ID 12',
    },
    {
      icon: '🛒',
      text: 'Estimate an ecommerce platform for handmade goods, budget 5000',
    },
  ];

  constructor(private readonly http: HttpClient) {}

  sendMessage(): void {
    const trimmedMessage = this.draftMessage.trim();

    if (!trimmedMessage || this.isSending) {
      return;
    }

    this.messages.push({
      sender: 'user',
      text: trimmedMessage,
      time: new Date(),
    });

    this.draftMessage = '';
    this.isSending = true;

    const params = new HttpParams().set('prompt', trimmedMessage);

    this.http.post<{ response?: string }>(this.apiUrl, null, { params }).subscribe({
      next: (result) => {
        this.messages.push({
          sender: 'bot',
          text: this.normalizeBotText(
            result.response?.trim() || 'I received your request, but no response text was returned.'
          ),
          time: new Date(),
        });
        this.isSending = false;
      },
      error: (error: HttpErrorResponse) => {
        const fallbackMessage =
          error.error?.detail ||
          error.message ||
          'The chatbot service is currently unreachable. Please try again in a moment.';

        this.messages.push({
          sender: 'bot',
          text: this.normalizeBotText(`⚠️ ${fallbackMessage}`),
          time: new Date(),
        });
        this.isSending = false;
      },
    });
  }

  useQuickPrompt(prompt: QuickPrompt): void {
    this.draftMessage = prompt.text;
    this.sendMessage();
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  get hasMessages(): boolean {
    return this.messages.length > 0;
  }

  trackByIndex(index: number): number {
    return index;
  }

  private normalizeBotText(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, '• ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

}
