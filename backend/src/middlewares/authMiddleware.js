// backend/src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();
const userRepository = require('../repositories/userRepository');

// Cache em memória de usuários ativos: userId -> { user, expiresAt }
const userCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

/**
 * Invalida o cache em memória de um usuário ou de todos
 * @param {number|string|null} userId
 */
function invalidateUserCache(userId) {
  if (userId !== undefined && userId !== null) {
    userCache.delete(Number(userId));
  } else {
    userCache.clear();
  }
}

/**
 * Obtém usuário do cache ou consulta o banco com TTL de até 60s
 * @param {number} userId
 * @returns {Promise<Object|undefined>}
 */
async function getUserCached(userId) {
  const numId = Number(userId);
  const now = Date.now();
  const cached = userCache.get(numId);

  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const user = await userRepository.findById(numId);
  if (user) {
    userCache.set(numId, {
      user,
      expiresAt: now + CACHE_TTL_MS
    });
  } else {
    userCache.delete(numId);
  }
  return user;
}

/**
 * Middleware de autenticação JWT com validação de status ativo e troca de senha obrigatória
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid Authorization format' });
  }

  const token = parts[1];
  let payload;
  try {
    const secret = process.env.JWT_SECRET || 'TotvsRhInteligenteSuperSecretKey2026!';
    payload = jwt.verify(token, secret);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const user = await getUserCached(payload.id);

    // 1. Se usuário não existe ou está inativo (IsActive = 0), responder 401 com a mesma mensagem genérica do login
    if (!user || !user.IsActive) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    req.user = {
      id: user.Id,
      email: user.Email,
      role: user.Role,
      isActive: Boolean(user.IsActive),
      mustChangePassword: Boolean(user.MustChangePassword)
    };

    // 3. Se MustChangePassword = 1, bloquear todas as rotas com 403 e código PASSWORD_CHANGE_REQUIRED,
    // exceto POST /api/auth/change-password e GET /api/me
    if (req.user.mustChangePassword) {
      const normalizedPath = (req.baseUrl || '') + (req.path || '');
      const rawUrl = (req.originalUrl || '').split('?')[0];

      const isChangePassword = req.method === 'POST' && (
        normalizedPath === '/api/auth/change-password' ||
        rawUrl === '/api/auth/change-password' ||
        normalizedPath.endsWith('/auth/change-password')
      );

      const isGetMe = req.method === 'GET' && (
        normalizedPath === '/api/me' ||
        rawUrl === '/api/me' ||
        normalizedPath.endsWith('/me')
      );

      if (!isChangePassword && !isGetMe) {
        return res.status(403).json({
          error: 'Troca de senha obrigatória',
          code: 'PASSWORD_CHANGE_REQUIRED'
        });
      }
    }

    next();
  } catch (err) {
    console.error('Erro no authMiddleware ao consultar usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao validar credenciais' });
  }
}

authMiddleware.invalidateUserCache = invalidateUserCache;
module.exports = authMiddleware;
