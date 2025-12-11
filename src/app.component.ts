
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './services/gemini.service';
import { ChatbotComponent } from './components/chatbot/chatbot.component';

interface StoryboardItem {
  prompt: string;
  image: string;
}

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ChatbotComponent]
})
export class AppComponent {
  private geminiService = inject(GeminiService);

  script = signal<string>(`SCENE START
INT. COFFEE SHOP - DAY
A young woman, CHLOE (20s), sits alone, nervously stirring her coffee. Across from her, an empty chair. She checks her phone.
SCENE END

SCENE START
EXT. PARK - DAY
Later, Chloe walks through a sun-dappled park. She's smiling now, looking relieved and happy.
SCENE END
`);
  aspectRatio = signal<AspectRatio>('16:9');
  storyboard = signal<StoryboardItem[]>([]);
  isLoading = signal(false);
  loadingProgress = signal('');
  error = signal<string | null>(null);
  
  aspectRatios: { value: AspectRatio; label: string }[] = [
    { value: '16:9', label: 'Widescreen (16:9)' },
    { value: '9:16', label: 'Vertical (9:16)' },
    { value: '4:3', label: 'Standard (4:3)' },
    { value: '3:4', label: 'Portrait (3:4)' },
    { value: '1:1', label: 'Square (1:1)' }
  ];

  async generateStoryboard(): Promise<void> {
    if (!this.script().trim() || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.storyboard.set([]);

    try {
      this.loadingProgress.set('Analyzing and parsing script...');
      const scenes = await this.geminiService.parseScript(this.script());
      
      if (!scenes || scenes.length === 0) {
        throw new Error('Could not parse any scenes from the script. Please check the script format.');
      }

      const generatedItems: StoryboardItem[] = [];
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        this.loadingProgress.set(`Generating image ${i + 1} of ${scenes.length}: ${scene.description}`);
        const imageUrl = await this.geminiService.generateImage(scene.visual_prompt, this.aspectRatio());
        generatedItems.push({ prompt: scene.visual_prompt, image: imageUrl });
        this.storyboard.set([...generatedItems]);
      }
    } catch (err: any) {
      this.error.set(err.message || 'An unknown error occurred.');
    } finally {
      this.isLoading.set(false);
      this.loadingProgress.set('');
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        this.script.set(text);
      };
      reader.readAsText(file);
    }
  }

  triggerFileUpload(): void {
    document.getElementById('fileInput')?.click();
  }
}
