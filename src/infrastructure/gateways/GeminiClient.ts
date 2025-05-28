import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

export interface GeminiHistory {
  role: string
  content: string
}

export class GeminiClient {
  private readonly genAI: GoogleGenerativeAI

  constructor(private readonly geminiToken: string) {
    this.genAI = new GoogleGenerativeAI(geminiToken)
  }

  async startChat(history: GeminiHistory[], prompt: string, comandos: string): Promise<{ text: string; truncated: boolean }> {
    const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      safetySettings,
      generationConfig: { maxOutputTokens: 1000, temperature: 1.5 },
    })

    const formatHistory = (history: GeminiHistory[], prompt: string) => {
  const formatted = history
    .filter(msg => msg.role === 'user' || msg.role === 'model')
    .map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }))

  if (formatted.length === 0 || formatted[0].role !== 'user') {
    formatted.unshift({
      role: 'user',
      parts: [{ text: prompt }],
    })
  }

  return formatted
}

    const chat = model.startChat({
      history: [
        ...formatHistory(history, prompt),
        {
          role: 'user',
          parts: [{ text: comandos }],
        },
      ],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.5 },
    })

    const result = await chat.sendMessage(prompt)
    const response = await result.response
    let text = await response.text()

    const truncated = text.length > 2000
    if (truncated) {
      text = text.substring(0, 1928 - "... \n\n".length) + "... \n\n*A resposta foi interrompida devido ao limite de caracteres do Discord de 2.000*"
    }

    return { text, truncated }
  }
}
