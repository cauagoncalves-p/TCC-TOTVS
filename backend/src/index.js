// backend/src/index.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
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

app.use('/api/auth', authRoutes);
app.use('/api', meRoutes);
app.use('/api', chatRoutes);
app.use('/api/onboarding', onboardingRoutes);

// Tratamento de rotas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server rodando na porta ${PORT}`);
  console.log(`Rotas ativas:`);
  console.log(`- POST http://localhost:${PORT}/api/auth/login`);
  console.log(`- GET  http://localhost:${PORT}/api/me`);
  console.log(`- POST http://localhost:${PORT}/api/chat`);
  console.log(`- GET  http://localhost:${PORT}/api/chat/sessions/:id/messages`);
  console.log(`- POST http://localhost:${PORT}/api/onboarding/upload`);
  console.log(`- GET  http://localhost:${PORT}/api/onboarding`);
  console.log(`- GET  http://localhost:${PORT}/api/health`);
});
