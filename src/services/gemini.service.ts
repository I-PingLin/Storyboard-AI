
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Type, Chat, GenerateContentResponse } from '@google/genai';
import { Scene, ChatMessage } from '../models/storyboard.model';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;

  constructor() {
    // IMPORTANT: The API key is sourced from environment variables.
    // Do not modify this line to hardcode keys.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API_KEY environment variable not set.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async parseScript(script: string): Promise<Scene[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Parse the following script and break it down into distinct scenes. For each scene, provide a scene number, a brief description, and a detailed visual prompt suitable for an image generation AI. The visual prompt should be a comma-separated list of descriptive keywords and phrases.

        Script:
        ---
        ${script}
        ---`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scene_number: {
                  type: Type.INTEGER,
                  description: 'The sequential number of the scene.',
                },
                description: {
                  type: Type.STRING,
                  description: 'A short description of what happens in the scene.',
                },
                visual_prompt: {
                  type: Type.STRING,
                  description: 'A detailed prompt for an image generator, focusing on visual elements like characters, setting, lighting, and mood. For example: "A lone astronaut standing on a desolate red planet, two moons in the purple sky, cinematic lighting, wide angle shot, hyperrealistic."'
                },
              },
              required: ['scene_number', 'description', 'visual_prompt'],
            },
          },
        },
      });

      const jsonString = response.text;
      const parsedResult = JSON.parse(jsonString);
      return parsedResult as Scene[];
    } catch (error) {
      console.error('Error parsing script:', error);
      throw new Error('Failed to parse the script. The AI could not understand the format.');
    }
  }

  async generateImage(prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'): Promise<string> {
    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `${prompt}, cinematic, high detail, professional storyboard art`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
      } else {
        throw new Error('No image was generated.');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('Failed to generate an image for the prompt.');
    }
  }

  startChat() {
    this.chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: 'You are a helpful assistant for a storyboard artist. You can answer questions about scriptwriting, cinematography, and visual storytelling.',
      },
    });
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.chat) {
      this.startChat();
    }
    
    try {
      const response: GenerateContentResponse = await this.chat!.sendMessage({ message });
      return response.text;
    } catch (error) {
      console.error('Error sending chat message:', error);
      return 'Sorry, I encountered an error. Please try again.';
    }
  }
}
