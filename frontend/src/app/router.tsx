import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { RequireAuth } from './guards/RequireAuth';
import { RequireRole } from './guards/RequireRole';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/home/DashboardPage';
import { UnauthorizedPage } from '../pages/common/UnauthorizedPage';
import { NotFoundPage } from '../pages/common/NotFoundPage';
import { ModulePlaceholder } from '../pages/common/ModulePlaceholder';
import { ChatPage } from '../pages/chat/ChatPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { OnboardingPage } from '../pages/onboarding/OnboardingPage';
import { OnboardingReviewPage } from '../pages/onboarding/OnboardingReviewPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />
      },
      // Rotas do Colaborador
      {
        path: 'chat',
        element: (
          <RequireRole allowedRoles={['colaborador']}>
            <ChatPage />
          </RequireRole>
        )
      },
      {
        path: 'me',
        element: (
          <RequireRole allowedRoles={['colaborador']}>
            <ProfilePage />
          </RequireRole>
        )
      },

      // Rotas de Onboarding (RH)
      {
        path: 'onboarding',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <OnboardingPage />
          </RequireRole>
        )
      },
      {
        path: 'onboarding/:id',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <OnboardingReviewPage />
          </RequireRole>
        )
      },

      // Rotas de Analytics (RH e Gestor)
      {
        path: 'analytics',
        element: (
          <RequireRole allowedRoles={['rh', 'gestor']}>
            <ModulePlaceholder
              title="Inteligência Preditiva"
              phase="Fase F3"
              description="Painel gerencial de absenteísmo, horas extras, turnover e alertas"
            />
          </RequireRole>
        )
      },

      // Rotas de Compliance (RH e Gestor)
      {
        path: 'compliance',
        element: (
          <RequireRole allowedRoles={['rh', 'gestor']}>
            <ModulePlaceholder
              title="TOTVS Compliance Inteligente"
              phase="Fase F4"
              description="Auditoria preventiva, regras trabalhistas e validação pré-envio eSocial"
            />
          </RequireRole>
        )
      },

      // Rotas de Conhecimento e Assistente Trabalhista (RH)
      {
        path: 'knowledge',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <ModulePlaceholder
              title="Base de Conhecimento"
              phase="Fase F4c"
              description="Gerenciamento e indexação de documentos trabalhistas e manuais oficiais"
            />
          </RequireRole>
        )
      },
      {
        path: 'assistant',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <ModulePlaceholder
              title="Assistente Trabalhista (RAG)"
              phase="Fase F4c"
              description="Consultas especializadas com citação estrita de fontes documentais oficiais"
            />
          </RequireRole>
        )
      }
    ]
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
]);
