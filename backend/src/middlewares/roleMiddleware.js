// backend/src/middlewares/roleMiddleware.js

/**
 * Middleware para autorização baseada no papel (role) do usuário
 * @param {string|string[]} allowedRoles - Papel ou lista de papéis permitidos (ex: 'rh' ou ['rh', 'gestor'])
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acesso negado: perfil '${req.user.role}' não tem permissão para esta operação.`
      });
    }

    next();
  };
}

module.exports = requireRole;
