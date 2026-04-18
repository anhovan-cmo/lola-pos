import { Quote } from '../types';

export const apiService = {
  async createPaymentIntent(amount: number, quoteId: string, customerName: string) {
    const response = await fetch('/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, quoteId, customerName }),
    });
    if (!response.ok) throw new Error('Failed to create payment intent');
    return response.json();
  },

  async sendEmailNotification(subject: string, html: string, to?: string) {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, html, to }),
    });
    if (!response.ok) throw new Error('Failed to send email');
    return response.json();
  }
};
