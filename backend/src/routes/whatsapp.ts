import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { whatsappService } from '../services/whatsapp.service';

const router = Router();

// Middleware para verificar se o tenant tem o módulo de WhatsApp ativo
async function checkWhatsAppModule(req: Request, res: Response, next: any) {
  const tenantId = (req as any).user.tenantId;
  const result = await query(
    'SELECT is_active FROM tenant_modules WHERE tenant_id = $1 AND module_id = $2',
    [tenantId, 'whatsapp_integration']
  );

  if (result.rows.length === 0 || !result.rows[0].is_active) {
    res.status(403).json({ error: 'Módulo de WhatsApp não está ativo. Adquira-o na App Store.' });
    return;
  }
  next();
}

// ── GET /api/whatsapp/status ──────────────────────────────────────────────────
router.get('/status', authenticateToken, checkWhatsAppModule, async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).user.tenantId;
    const instanceName = `tenant_${tenantId.split('-')[0]}`;

    const status = await whatsappService.getConnectionStatus(instanceName);
    
    // Atualiza no banco
    await query(
      `INSERT INTO whatsapp_instances (tenant_id, instance_name, status, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (tenant_id, instance_name) 
       DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()`,
      [tenantId, instanceName, status.instance?.state || 'disconnected']
    );

    res.json({ status: status.instance?.state || 'disconnected' });
  } catch (err) {
    console.error('WhatsApp status error:', err);
    res.status(500).json({ error: 'Falha ao obter status do WhatsApp' });
  }
});

// ── POST /api/whatsapp/connect ────────────────────────────────────────────────
router.post('/connect', authenticateToken, checkWhatsAppModule, async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).user.tenantId;
    const instanceName = `tenant_${tenantId.split('-')[0]}`;

    // Tenta criar/obter qrcode
    let data;
    try {
      data = await whatsappService.createInstance(instanceName);
    } catch {
      data = await whatsappService.getQRCode(instanceName);
    }

    res.json(data);
  } catch (err) {
    console.error('WhatsApp connect error:', err);
    res.status(500).json({ error: 'Falha ao conectar WhatsApp' });
  }
});

// ── POST /api/whatsapp/logout ─────────────────────────────────────────────────
router.post('/logout', authenticateToken, checkWhatsAppModule, async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).user.tenantId;
    const instanceName = `tenant_${tenantId.split('-')[0]}`;

    await whatsappService.logoutInstance(instanceName);
    
    await query(
      'UPDATE whatsapp_instances SET status = $1, updated_at = NOW() WHERE tenant_id = $2',
      ['disconnected', tenantId]
    );

    res.json({ message: 'WhatsApp desconectado' });
  } catch (err) {
    console.error('WhatsApp logout error:', err);
    res.status(500).json({ error: 'Falha ao desconectar WhatsApp' });
  }
});

export default router;
