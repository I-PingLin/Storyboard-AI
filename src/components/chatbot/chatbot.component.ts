
import { Component, ChangeDetectionStrategy, signal, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { ChatMessage } from '../../models/storyboard.model';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule]
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  private geminiService = inject(GeminiService);
  
  isOpen = signal(false);
  userInput = signal('');
  isLoading = signal(false);
  messages = signal<ChatMessage[]>([
    { role: 'model', text: 'Hello! How can I help you with your storyboard today?' }
  ]);

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat(): void {
    this.isOpen.update(open => !open);
  }

  async sendMessage(): Promise<void> {
    const userMessage = this.userInput().trim();
    if (!userMessage || this.isLoading()) {
      return;
    }

    this.messages.update(msgs => [...msgs, { role: 'user', text: userMessage }]);
    this.userInput.set('');
    this.isLoading.set(true);
    this.scrollToBottom();

    try {
      const responseText = await this.geminiService.sendMessage(userMessage);
      this.messages.update(msgs => [...msgs, { role: 'model', text: responseText }]);
    } catch (error) {
      this.messages.update(msgs => [...msgs, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      this.isLoading.set(false);
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }
}
