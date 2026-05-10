import axios from 'axios';
import { config } from '../config';

const api = axios.create({
  baseURL: config.EVOLUTION_API_URL,
  headers: {
    apikey: config.EVOLUTION_API_KEY,
    'Content-Type': 'application/json',
  },
});

export const whatsappService = {
  /**
   * Cria ou recupera uma instância para o tenant
   */
  async createInstance(instanceName: string) {
    try {
      const { data } = await api.post('/instance/create', {
        instanceName,
        token: '', // Gera automático
        qrcode: true,
      });
      return data;
    } catch (error: any) {
      console.error('Error creating WhatsApp instance:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Obtém o QR Code da instância
   */
  async getQRCode(instanceName: string) {
    try {
      const { data } = await api.get(`/instance/connect/${instanceName}`);
      return data;
    } catch (error: any) {
      console.error('Error getting WhatsApp QR Code:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Envia uma mensagem de texto
   */
  async sendMessage(instanceName: string, number: string, text: string) {
    try {
      // Formata o número (remove caracteres não numéricos e garante o DDI)
      const cleanNumber = number.replace(/\D/g, '');
      const formattedNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;

      const { data } = await api.post(`/message/sendText/${instanceName}`, {
        number: formattedNumber,
        options: {
          delay: 1200,
          presence: 'composing',
        },
        textMessage: {
          text,
        },
      });
      return data;
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Verifica o status da conexão
   */
  async getConnectionStatus(instanceName: string) {
    try {
      const { data } = await api.get(`/instance/connectionState/${instanceName}`);
      return data;
    } catch (error: any) {
      return { instance: { state: 'disconnected' } };
    }
  },

  /**
   * Desconecta a instância
   */
  async logoutInstance(instanceName: string) {
    try {
      await api.delete(`/instance/logout/${instanceName}`);
    } catch (error: any) {
      console.error('Error logging out WhatsApp instance:', error.response?.data || error.message);
    }
  },
};
