export type VoiceIntent = 'NAVIGATE' | 'CREATE_TRANSACTION' | 'CREATE_CUSTOMER' | 'UNKNOWN';

export interface VoiceCommand {
  intent: VoiceIntent;
  params: Record<string, any>;
  originalText: string;
}

export function parseVoiceCommand(text: string): VoiceCommand | null {
  const cleanText = text.toLowerCase().trim();

  const navRegex = /(?:ir para|abrir|mostrar|ver)\s+(estoque|vendas|financeiro|clientes|pdv|caixa|e-commerce|ajustes)/i;
  const navMatch = cleanText.match(navRegex);
  if (navMatch) {
    return {
      intent: 'NAVIGATE',
      params: { target: navMatch[1].toLowerCase() },
      originalText: cleanText
    };
  }

  const financeRegex = /(pagar|receber|despesa|receita)\s+(\d+(?:[.,]\d+)?)\s*(?:reais|de|do|da)?\s*(.*)/i;
  const financeMatch = cleanText.match(financeRegex);
  if (financeMatch) {
    const type = ['pagar', 'despesa'].includes(financeMatch[1].toLowerCase()) ? 'expense' : 'income';
    return {
      intent: 'CREATE_TRANSACTION',
      params: {
        type,
        amount: parseFloat(financeMatch[2].replace(',', '.')),
        description: financeMatch[3].trim() || 'Lançamento por voz'
      },
      originalText: cleanText
    };
  }

  const customerRegex = /(?:cadastrar cliente|novo cliente|adicionar cliente)\s+(.*)/i;
  const customerMatch = cleanText.match(customerRegex);
  if (customerMatch) {
    return {
      intent: 'CREATE_CUSTOMER',
      params: { name: customerMatch[1].trim() },
      originalText: cleanText
    };
  }

  return { intent: 'UNKNOWN', params: {}, originalText: cleanText };
}
