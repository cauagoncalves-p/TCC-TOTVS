// backend/src/index.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Rota de verificação de status
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rotas da aplicação
const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');
const chatRoutes = require('./routes/chat');
const onboardingRoutes = require('./routes/onboarding');
const analyticsRoutes = require('./routes/analytics');
const alertRoutes = require('./routes/alerts');
const complianceRoutes = require('./routes/compliance');

app.use('/api/auth', authRoutes);
app.use('/api', meRoutes);
app.use('/api', chatRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/compliance', complianceRoutes);

// Tratamento de rotas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server rodando na porta ${PORT}`);
    console.log(`Rotas ativas:`);
    console.log(`- POST http://localhost:${PORT}/api/auth/login`);
    console.log(`- GET  http://localhost:${PORT}/api/me`);
    console.log(`- POST http://localhost:${PORT}/api/chat`);
    console.log(`- GET  http://localhost:${PORT}/api/chat/sessions/:id/messages`);
    console.log(`- POST http://localhost:${PORT}/api/onboarding/upload`);
    console.log(`- GET  http://localhost:${PORT}/api/onboarding`);
    console.log(`- POST http://localhost:${PORT}/api/onboarding`);
    console.log(`- POST http://localhost:${PORT}/api/onboarding/validate`);
    console.log(`- GET  http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
