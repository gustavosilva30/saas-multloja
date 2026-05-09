# NexusERP - Arquitetura de Módulos Premium

Este documento detalha as estruturas de banco de dados (Prisma Schema), além da lógica de backend, para suportar a arquitetura multitenant nos novos módulos premium do NexusERP.

---

## 1. Catálogo Técnico & Matriz de Compatibilidade

**Conceito:** Relacionamento entre produtos (SKUs) e inúmeras aplicações (Ex: peças de veículos compatíveis com múltiplos modelos e anos).

### Schema (Prisma)

```prisma
// Schema Prisma focado no isolamento por "tenant_id"

model Product {
  id          String   @id @default(uuid())
  tenant_id   String
  sku         String
  name        String
  price       Decimal  @db.Decimal(10, 2)
  
  // Relacionamento com as aplicações
  applications ProductApplication[]

  @@unique([tenant_id, sku]) // SKU único por tenant
  @@index([tenant_id])
}

model ApplicationModel {
  id          String   @id @default(uuid())
  tenant_id   String
  brand       String   // Ex: Volkswagen, Honda
  modelName   String   // Ex: Gol, Civic
  yearStart   Int?
  yearEnd     Int?
  
  // Relacionamento com produtos suportados
  products    ProductApplication[]

  @@index([tenant_id])
}

// Tabela pivô (Muitos para Muitos) 
model ProductApplication {
  id              String   @id @default(uuid())
  tenant_id       String
  product_id      String
  application_id  String
  
  // Informações extras do encaixe (ex: "Eixo Traseiro", "Motor 1.0")
  notes           String?  

  product         Product          @relation(fields: [product_id], references: [id], onDelete: Cascade)
  application     ApplicationModel @relation(fields: [application_id], references: [id], onDelete: Cascade)

  @@unique([tenant_id, product_id, application_id])
  @@index([tenant_id])
}
```

---

## 2. Gestão de Eventos e Check-in com QR Code

**Conceito:** Venda/distribuição de ingressos e check-in na porta através de validação de QR Code único.

### Schema (Prisma)

```prisma
model Event {
  id          String   @id @default(uuid())
  tenant_id   String
  name        String
  date        DateTime
  location    String?
  
  tickets     EventTicket[]

  @@index([tenant_id])
}

model EventTicket {
  id          String   @id @default(uuid())
  tenant_id   String
  event_id    String
  customer_id String?  // Opcional, caso esteja logado
  
  customerName  String
  customerEmail String
  
  // Hash único para gerar o QR Code (segurança)
  qr_hash     String   @unique @default(uuid())
  
  checkInAt   DateTime? // Se nulo, não entrou; se preenchido, check-in realizado.

  event       Event    @relation(fields: [event_id], references: [id], onDelete: Cascade)

  @@index([tenant_id])
}
```

### Lógica de Validação API (Exemplo Next.js Route Handler)

```ts
// app/api/events/checkin/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTenantId } from '@/lib/auth';

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const { qrHash, eventId } = await req.json();

  const ticket = await prisma.eventTicket.findUnique({
    where: { qr_hash: qrHash, tenant_id: tenantId, event_id: eventId },
  });

  if (!ticket) {
    return NextResponse.json({ error: 'Ingresso não encontrado ou inválido para este evento.' }, { status: 404 });
  }

  if (ticket.checkInAt) {
    return NextResponse.json({ error: 'Check-in já realizado anteriormente!', time: ticket.checkInAt }, { status: 400 });
  }

  // Efetua o check-in
  const updatedTicket = await prisma.eventTicket.update({
    where: { id: ticket.id },
    data: { checkInAt: new Date() }
  });

  return NextResponse.json({ success: true, message: 'Check-in realizado!', ticket: updatedTicket });
}
```

---

## 3. Automações Inteligentes (WhatsApp & Notificações via Webhooks)

**Conceito:** Disparar webhooks dinâmicos com base em configurações do usuário (ex: para usar com n8n ou Make).

### Schema (Prisma)

```prisma
model WebhookConfig {
  id          String   @id @default(uuid())
  tenant_id   String
  
  // Gatilho: ex: 'SALE_COMPLETED', 'BILL_OVERDUE', 'CUSTOMER_CREATED'
  event_type  String   
  
  target_url  String
  is_active   Boolean  @default(true)
  headers     Json?    // Ex: {"Authorization": "Bearer token"}

  @@index([tenant_id, event_type])
}
```

### Server Action de Disparo

```ts
// lib/automations.ts
import prisma from '@/lib/prisma';

export async function triggerWebhook(tenantId: string, eventType: string, payload: any) {
  // 1. Busca webhooks ativos para este evento e tenant
  const webhooks = await prisma.webhookConfig.findMany({
    where: { tenant_id: tenantId, event_type: eventType, is_active: true }
  });

  if (!webhooks.length) return;

  // 2. Dispara requisições em paralelo (não-bloqueante idealmente nas filas do backend ou serverless functions bg)
  Promise.all(webhooks.map(async (webhook) => {
    try {
      await fetch(webhook.target_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.headers ? JSON.parse(webhook.headers as string) : {})
        },
        body: JSON.stringify({
          event: eventType,
          timestamp: new Date().toISOString(),
          data: payload,
          tenant_id: tenantId
        })
      });
    } catch (err) {
      console.error(`Falha ao disparar webhook ${webhook.id}`, err);
    }
  }));
}
```

---

## 4. Assistente Financeiro por Voz (Integração IA)

**Conceito:** Endpoint que recebe entrada natural (texto originado de Speech-to-Text do frontend) e extrai dados (LLM) para salvar no financeiro.

### API de Extração (Exemplo com Gemini ou OpenAI)

```ts
// app/api/finance/ai-assistant/route.ts
import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateObject } from 'ai'; // Vercel AI SDK ou chamada similar à LLM

// Exemplo usando schema de extração:
const z = require('zod');

export async function POST(req: Request) {
  const tenantId = await getTenantId();
  const { prompt } = await req.json(); // Ex: "Gastei 150 reais de etanol no posto da esquina"

  // Prompt do sistema
  const systemPrompt = `
    Você é um assistente de extração de dados financeiros. 
    Transforme a entrada do usuário em JSON.
    Se for gasto (despesa), defina type="EXPENSE". Se for ganho (receita), type="INCOME".
    Tente deduzir a categoria.
  `;

  try {
    // 1. Comunicação com LLM para extrair JSON usando Vercel AI (ou model similar)
    // Abaixo apenas conceito sintático de extração estruturada z.object(...)
    /*
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'), 
        schema: z.object({
          amount: z.number().describe('O valor fiduciário numérico'),
          type: z.enum(['INCOME', 'EXPENSE']),
          description: z.string(),
          category: z.string()
        }),
        system: systemPrompt,
        prompt: prompt,
      });
    */

    // Mock do parse assumindo extração bem sucedida:
    const object = { amount: 150.00, type: 'EXPENSE', description: 'Posto da esquina (etanol)', category: 'Combustível' };

    // 2. Salva no banco de dados isolado por tenant
    const transaction = await prisma.financialTransaction.create({
      data: {
        tenant_id: tenantId,
        amount: object.amount,
        type: object.type,
        description: object.description,
        category: object.category,
        date: new Date(),
        status: 'PENDING' // Exige revisão no painel
      }
    });

    return NextResponse.json({ success: true, parsed: object, transaction });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao interpretar a requisição financeira.' }, { status: 500 });
  }
}
```
