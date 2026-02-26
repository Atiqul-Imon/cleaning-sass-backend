import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

@Injectable()
export class TwilioWhatsAppService {
  private client: Twilio.Twilio | null = null;
  private fromNumber: string | null = null;

  constructor(private config: ConfigService) {
    const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    const from = this.config.get('TWILIO_WHATSAPP_FROM'); // e.g. whatsapp:+14155238886
    if (accountSid && authToken && from) {
      this.client = Twilio(accountSid, authToken);
      this.fromNumber = from;
    }
  }

  isConfigured(): boolean {
    return this.client !== null && this.fromNumber !== null;
  }

  /**
   * Send a WhatsApp message via Twilio.
   * Phone must be E.164 (e.g. +447700900123).
   */
  async sendWhatsApp(toE164: string, body: string): Promise<void> {
    if (!this.client || !this.fromNumber) {
      throw new Error(
        'WhatsApp (Twilio) is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.',
      );
    }
    const to = toE164.startsWith('+') ? `whatsapp:${toE164}` : `whatsapp:+${toE164}`;
    await this.client.messages.create({
      from: this.fromNumber,
      to,
      body,
    });
  }
}
