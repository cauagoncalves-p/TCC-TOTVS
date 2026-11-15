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
import { NewManualPage } from '../pages/onboarding/NewManualPage';
import { NewDocumentPage } from '../pages/onboarding/NewDocumentPage';
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage';
import { CompliancePage } from '../pages/compliance/CompliancePage';
import { KnowledgePage } from '../pages/knowledge/KnowledgePage';
import { LaborAssistantPage } from '../pages/assistant/LaborAssistantPage';
import { UsersPage } from '../pages/admin/UsersPage';
import { ForceChangePasswordPage } from '../pages/auth/ForceChangePasswordPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/force-change-password',
    element: (
      <RequireAuth>
        <ForceChangePasswordPage />
      </RequireAuth>
    )
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
        path: 'onboarding/novo/manual',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <NewManualPage />
          </RequireRole>
        )
      },
      {
        path: 'onboarding/novo/documento',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <NewDocumentPage />
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
            <AnalyticsPage />
          </RequireRole>
        )
      },

      // Rotas de Compliance (RH e Gestor)
      {
        path: 'compliance',
        element: (
          <RequireRole allowedRoles={['rh', 'gestor']}>
            <CompliancePage />
          </RequireRole>
        )
      },

      // Rotas de Conhecimento e Assistente Trabalhista (RH e Gestor) - Fase F4c / 5D
      {
        path: 'knowledge',
        element: (
          <RequireRole allowedRoles={['rh', 'gestor']}>
            <KnowledgePage />
          </RequireRole>
        )
      },
      {
        path: 'conhecimento',
        element: <Navigate to="/knowledge" replace />
      },
      {
        path: 'assistant',
        element: (
          <RequireRole allowedRoles={['rh', 'gestor']}>
            <LaborAssistantPage />
          </RequireRole>
        )
      },

      // Rotas de Administração de Usuários e Perfis (RH) - Fase F11
      {
        path: 'admin/users',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <UsersPage />
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
