import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

// ── Cliente HTTP configurado para o Asaas ────────────────────────────────────

function createAsaasClient(): AxiosInstance {
  if (!config.ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não configurada');
  }
  return axios.create({
    baseURL: config.ASAAS_API_URL,
    headers: {
      access_token: config.ASAAS_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
}

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  cpfCnpj?: string;
  mobilePhone?: string;
}

export interface AsaasCustomerInput {
  name: string;
  cpfCnpj?: string;
  email?: string;
  mobilePhone?: string;
  externalReference?: string; // tenant_id do nosso sistema
}

export interface AsaasPaymentInput {
  customer: string;         // asaas_customer_id
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  value: number;
  dueDate: string;          // YYYY-MM-DD
  description?: string;
  externalReference?: string; // nosso order/subscription id
}

export interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  netValue: number;
  billingType: string;
  pixQrCodeImage?: string;
  pixCopiaECola?: string;
  invoiceUrl?: string;
  dueDate: string;
}

export interface AsaasPixQrCode {
  encodedImage: string;  // base64 do QR Code
  payload: string;       // copia-e-cola
  expirationDate: string;
}

// ── Funções do serviço ───────────────────────────────────────────────────────

/**
 * Cria um cliente no Asaas vinculado ao tenant do nosso sistema.
 * Retorna o objeto completo do cliente criado.
 */
export async function createAsaasCustomer(data: AsaasCustomerInput): Promise<AsaasCustomer> {
  const client = createAsaasClient();
  const response = await client.post<AsaasCustomer>('/api/v3/customers', data);
  return response.data;
}

/**
 * Busca um cliente no Asaas pelo ID.
 */
export async function getAsaasCustomer(asaasCustomerId: string): Promise<AsaasCustomer> {
  const client = createAsaasClient();
  const response = await client.get<AsaasCustomer>(`/api/v3/customers/${asaasCustomerId}`);
  return response.data;
}

/**
 * Gera uma cobrança no Asaas (Pix por padrão).
 * Retorna o objeto da cobrança com link de pagamento.
 */
export async function createAsaasPayment(data: AsaasPaymentInput): Promise<AsaasPayment> {
  const client = createAsaasClient();
  const response = await client.post<AsaasPayment>('/api/v3/payments', data);
  return response.data;
}

/**
 * Busca o QR Code Pix de um pagamento já criado.
 * Útil para exibir o QR Code na tela após criar o pagamento.
 */
export async function getAsaasPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  const client = createAsaasClient();
  const response = await client.get<AsaasPixQrCode>(`/api/v3/payments/${paymentId}/pixQrCode`);
  return response.data;
}

/**
 * Cria um cliente no Asaas e imediatamente gera uma cobrança Pix.
 * Retorna o customer_id e o objeto completo do pagamento com QR Code.
 * Fluxo combinado para ativar um módulo premium.
 */
export async function chargeNewCustomerPix(params: {
  tenantId: string;
  tenantName: string;
  cpfCnpj?: string;
  email?: string;
  mobilePhone?: string;
  value: number;
  description: string;
  dueDate: string;
}): Promise<{ asaasCustomerId: string; payment: AsaasPayment; pixQrCode: AsaasPixQrCode }> {
  const customer = await createAsaasCustomer({
    name: params.tenantName,
    cpfCnpj: params.cpfCnpj,
    email: params.email,
    mobilePhone: params.mobilePhone,
    externalReference: params.tenantId,
  });

  const payment = await createAsaasPayment({
    customer: customer.id,
    billingType: 'PIX',
    value: params.value,
    dueDate: params.dueDate,
    description: params.description,
    externalReference: params.tenantId,
  });

  const pixQrCode = await getAsaasPixQrCode(payment.id);

  return {
    asaasCustomerId: customer.id,
    payment,
    pixQrCode,
  };
}
