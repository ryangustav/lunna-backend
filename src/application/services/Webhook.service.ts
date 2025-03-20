import axios from 'axios';

interface DiscordWebhookPayload {
  content: string;
  embeds?: any[];
}

export class WebhookService {
  private discordWebhookUrl: string;

  constructor(discordWebhookUrl: string) {
    this.discordWebhookUrl = discordWebhookUrl;
  }

  async sendDiscordNotification(payload: DiscordWebhookPayload): Promise<void> {
    const headers = { 'Content-Type': 'application/json' };
    
    try {
      await axios.post(this.discordWebhookUrl, payload, { headers });
    } catch (error) {
      console.error('Failed to send Discord webhook notification:', error);
      throw error;
    }
  }
}