
export interface Scene {
  scene_number: number;
  description: string;
  visual_prompt: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
