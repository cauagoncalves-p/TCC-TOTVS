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
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage';
import { CompliancePage } from '../pages/compliance/CompliancePage';
import { KnowledgePage } from '../pages/knowledge/KnowledgePage';
import { LaborAssistantPage } from '../pages/assistant/LaborAssistantPage';

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

      // Rotas de Conhecimento e Assistente Trabalhista (RH) - Fase F4c
      {
        path: 'knowledge',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <KnowledgePage />
          </RequireRole>
        )
      },
      {
        path: 'assistant',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <LaborAssistantPage />
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
