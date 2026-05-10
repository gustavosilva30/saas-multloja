import { Router, Request, Response } from 'express';
import { body, param, query as qv, validationResult } from 'express-validator';
import { authenticateToken, authorize, tenantIsolation } from '../middleware/auth';
import { query } from '../config/database';
import {
  addGuest, resendTicket, scanQr, getEventStats, generateQrImage,
} from '../services/EventService';

const router = Router();
router.use(authenticateToken);
router.use(tenantIsolation);

// ── GET / — listar eventos ────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenant_id } = req.user!;
    const result = await query(
      `SELECT e.*,
              COUNT(DISTINCT g.id)::int                                   AS total_guests,
              COUNT(DISTINCT g.id) FILTER (WHERE g.check_in_status)::int  AS checked_in,
              COUNT(DISTINCT tt.id)::int                                  AS ticket_type_count
         FROM events e
         LEFT JOIN event_guests       g  ON g.event_id = e.id
         LEFT JOIN event_ticket_types tt ON tt.event_id = e.id
        WHERE e.tenant_id = $1
        GROUP BY e.id
        ORDER BY e.date DESC`,
      [tenant_id]
    );
    res.json({ events: result.rows });
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ error: 'Failed to list events' });
  }
});

// ── GET /:id — detalhe do evento ──────────────────────────────────────────────
router.get('/:id', param('id').isUUID(), async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  try {
    const [eventRes, typesRes, statsRes] = await Promise.all([
      query(`SELECT * FROM events WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.user!.tenant_id]),
      query(`SELECT * FROM event_ticket_types WHERE event_id = $1 ORDER BY sort_order`, [req.params.id]),
      getEventStats(req.params.id, req.user!.tenant_id),
    ]);

    if (eventRes.rows.length === 0) { res.status(404).json({ error: 'Event not found' }); return; }
    res.json({ event: eventRes.rows[0], ticket_types: typesRes.rows, stats: statsRes });
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ error: 'Failed to get event' });
  }
});

// ── POST / — criar evento ─────────────────────────────────────────────────────
router.post('/',
  authorize('owner', 'admin', 'operator'),
  [
    body('name').trim().notEmpty(),
    body('date').isISO8601(),
    body('end_date').optional({ nullable: true }).isISO8601(),
    body('location').optional().isString(),
    body('description').optional().isString(),
    body('banner_url').optional({ nullable: true }).isURL(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const { name, date, end_date, location, description, banner_url } = req.body;
      const result = await query(
        `INSERT INTO events (tenant_id, name, date, end_date, location, description, banner_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.user!.tenant_id, name, date, end_date ?? null, location ?? null, description ?? null, banner_url ?? null]
      );
      res.status(201).json({ event: result.rows[0] });
    } catch (err) {
      console.error('Create event error:', err);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

// ── PUT /:id — editar evento ──────────────────────────────────────────────────
router.put('/:id',
  authorize('owner', 'admin', 'operator'),
  param('id').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const allowed = ['name', 'date', 'end_date', 'location', 'description', 'banner_url', 'status'];
      const fields: string[] = [];
      const vals: unknown[] = [];
      let i = 1;
      for (const f of allowed) {
        if (req.body[f] !== undefined) { fields.push(`${f} = $${i++}`); vals.push(req.body[f]); }
      }
      if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }
      vals.push(req.params.id, req.user!.tenant_id);
      const result = await query(
        `UPDATE events SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${i} AND tenant_id = $${i + 1} RETURNING *`,
        vals
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Event not found' }); return; }
      res.json({ event: result.rows[0] });
    } catch (err) {
      console.error('Update event error:', err);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

// ── Ticket Types ──────────────────────────────────────────────────────────────
router.post('/:eventId/ticket-types',
  authorize('owner', 'admin', 'operator'),
  [
    param('eventId').isUUID(),
    body('name').trim().notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('capacity').isInt({ min: 1 }),
    body('color').optional().matches(/^#[0-9a-fA-F]{6}$/),
    body('description').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      // Confirma que o evento é do tenant
      const ev = await query(
        `SELECT id FROM events WHERE id = $1 AND tenant_id = $2`,
        [req.params.eventId, req.user!.tenant_id]
      );
      if (ev.rows.length === 0) { res.status(404).json({ error: 'Event not found' }); return; }

      const { name, price, capacity, color, description, sort_order } = req.body;
      const result = await query(
        `INSERT INTO event_ticket_types (event_id, name, price, capacity, color, description, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.params.eventId, name, price, capacity, color ?? '#10b981', description ?? null, sort_order ?? 0]
      );
      res.status(201).json({ ticket_type: result.rows[0] });
    } catch (err) {
      console.error('Create ticket type error:', err);
      res.status(500).json({ error: 'Failed to create ticket type' });
    }
  }
);

// ── GET /:eventId/guests — lista de convidados ────────────────────────────────
router.get('/:eventId/guests',
  param('eventId').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      // Verifica ownership
      const ev = await query(
        `SELECT id FROM events WHERE id = $1 AND tenant_id = $2`,
        [req.params.eventId, req.user!.tenant_id]
      );
      if (ev.rows.length === 0) { res.status(404).json({ error: 'Event not found' }); return; }

      const page  = parseInt(req.query.page  as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;

      const conditions = ['g.event_id = $1'];
      const params: unknown[] = [req.params.eventId];

      if (req.query.checked_in !== undefined) {
        params.push(req.query.checked_in === 'true');
        conditions.push(`g.check_in_status = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(g.name ILIKE $${params.length} OR g.phone ILIKE $${params.length} OR g.email ILIKE $${params.length})`);
      }

      const where = 'WHERE ' + conditions.join(' AND ');
      const [countRes, rows] = await Promise.all([
        query(`SELECT COUNT(*) FROM event_guests g ${where}`, params),
        query(
          `SELECT g.*, tt.name AS ticket_type_name, tt.color AS ticket_type_color
             FROM event_guests g
             LEFT JOIN event_ticket_types tt ON tt.id = g.ticket_type_id
           ${where}
           ORDER BY g.created_at DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, (page - 1) * limit]
        ),
      ]);

      const total = parseInt(countRes.rows[0].count);
      res.json({
        guests: rows.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('List guests error:', err);
      res.status(500).json({ error: 'Failed to list guests' });
    }
  }
);

// ── POST /:eventId/guests — adicionar convidado ───────────────────────────────
router.post('/:eventId/guests',
  authorize('owner', 'admin', 'operator'),
  [
    param('eventId').isUUID(),
    body('name').trim().notEmpty(),
    body('email').optional({ nullable: true }).isEmail(),
    body('phone').optional({ nullable: true }).isString(),
    body('document').optional({ nullable: true }).isString(),
    body('ticket_type_id').optional({ nullable: true }).isUUID(),
    body('send_ticket').optional().isBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const guest = await addGuest(req.user!.tenant_id, req.params.eventId, req.body);
      res.status(201).json({ guest });
    } catch (err: any) {
      console.error('Add guest error:', err);
      res.status(err.statusCode ?? 500).json({ error: err.message || 'Failed to add guest' });
    }
  }
);

// ── GET /:eventId/guests/:guestId/qr — gerar QR para exibição ────────────────
router.get('/:eventId/guests/:guestId/qr',
  [param('eventId').isUUID(), param('guestId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const res2 = await query(
        `SELECT g.qr_code_token FROM event_guests g
           JOIN events e ON e.id = g.event_id
          WHERE g.id = $1 AND g.event_id = $2 AND e.tenant_id = $3`,
        [req.params.guestId, req.params.eventId, req.user!.tenant_id]
      );
      if (res2.rows.length === 0) { res.status(404).json({ error: 'Guest not found' }); return; }
      const qr = await generateQrImage(res2.rows[0].qr_code_token);
      res.json({ qr_data_url: qr });
    } catch (err) {
      console.error('QR generation error:', err);
      res.status(500).json({ error: 'Failed to generate QR' });
    }
  }
);

// ── POST /:eventId/guests/:guestId/resend — reenviar WA ──────────────────────
router.post('/:eventId/guests/:guestId/resend',
  authorize('owner', 'admin', 'operator'),
  [param('eventId').isUUID(), param('guestId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await resendTicket(req.user!.tenant_id, req.params.guestId);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode ?? 500).json({ error: err.message });
    }
  }
);

// ── DELETE /:eventId/guests/:guestId ─────────────────────────────────────────
router.delete('/:eventId/guests/:guestId',
  authorize('owner', 'admin'),
  [param('eventId').isUUID(), param('guestId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await query(
        `DELETE FROM event_guests g USING events e
          WHERE g.id = $1 AND g.event_id = e.id AND e.tenant_id = $2
          RETURNING g.id`,
        [req.params.guestId, req.user!.tenant_id]
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Guest not found' }); return; }
      res.json({ ok: true });
    } catch (err) {
      console.error('Delete guest error:', err);
      res.status(500).json({ error: 'Failed to delete guest' });
    }
  }
);

// ── POST /scan-qr — MOTOR ANTI-FRAUDE (portaria) ─────────────────────────────
// Este endpoint é chamado pelo app do segurança. Requer autenticação JWT.
router.post('/scan-qr',
  [
    body('token').isUUID().withMessage('Token QR inválido'),
    body('event_id').isUUID(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    try {
      const { token, event_id } = req.body;

      // Verifica que o evento pertence ao tenant do operador
      const evCheck = await query(
        `SELECT id FROM events WHERE id = $1 AND tenant_id = $2`,
        [event_id, req.user!.tenant_id]
      );
      if (evCheck.rows.length === 0) {
        res.status(404).json({ status: 'NOT_FOUND', message: 'Evento não encontrado' }); return;
      }

      const result = await scanQr(token, event_id, req.user!.id);

      switch (result.status) {
        case 'OK':
          res.status(200).json({
            status: 'OK',
            color:  'GREEN',
            message: 'Acesso Liberado ✅',
            guest: {
              name:        result.guest!.name,
              ticket_type: result.ticket_type ?? 'Padrão',
              check_in_time: result.guest!.check_in_time,
            },
          });
          break;

        case 'ALREADY_USED':
          // 403 = ALERTA VERMELHO — ingresso já utilizado
          res.status(403).json({
            status: 'ALREADY_USED',
            color:  'RED',
            message: '⛔ FRAUDE — Ingresso já utilizado!',
            guest: {
              name:          result.guest!.name,
              ticket_type:   result.ticket_type ?? 'Padrão',
              check_in_time: result.guest!.check_in_time,  // quando foi usado pela 1ª vez
            },
          });
          break;

        case 'WRONG_EVENT':
          res.status(422).json({
            status: 'WRONG_EVENT',
            color:  'RED',
            message: '⛔ Ingresso de outro evento',
          });
          break;

        case 'NOT_FOUND':
          res.status(404).json({
            status: 'NOT_FOUND',
            color:  'RED',
            message: '⛔ QR Code inválido ou não encontrado',
          });
          break;
      }
    } catch (err) {
      console.error('Scan QR error:', err);
      res.status(500).json({ error: 'Falha ao validar ingresso' });
    }
  }
);

// ── GET /:eventId/stats — painel em tempo real ────────────────────────────────
router.get('/:eventId/stats',
  param('eventId').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await getEventStats(req.params.eventId, req.user!.tenant_id);
      res.json(stats);
    } catch (err) {
      console.error('Event stats error:', err);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }
);

export default router;
