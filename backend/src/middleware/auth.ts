import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query, tenantContext } from '../config/database';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        tenant_id: string;
      };
    }
  }
}

// JWT Auth Middleware
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Se não houver header, tenta pegar da query (usado em redirecionamentos)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
      tenantId: string;
    };

    // Check if user still exists and is active
    const userResult = await query(
      'SELECT * FROM find_user_by_id($1)',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      res.status(403).json({ error: 'User account is disabled' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    };

    // Run the rest of the request chain inside the tenant context for RLS
    tenantContext.run({ tenantId: user.tenant_id }, () => next());
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(403).json({ error: 'Token expired' });
      return;
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Role-based authorization middleware
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Tenant isolation middleware - ensures users only access their tenant's data
export const tenantIsolation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Add tenant_id to query params or body for downstream use
  req.headers['x-tenant-id'] = req.user.tenant_id;
  next();
};

// Middleware to wrap request in AsyncLocalStorage for RLS
export const rlsContext = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.tenant_id) {
    tenantContext.run({ tenantId: req.user.tenant_id }, () => next());
  } else {
    next();
  }
};

export default { authenticateToken, authorize, tenantIsolation };
