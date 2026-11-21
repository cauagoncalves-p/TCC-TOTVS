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
import { PolicyEditorPage } from '../pages/knowledge/PolicyEditorPage';
import { LaborAssistantPage } from '../pages/assistant/LaborAssistantPage';
import { UsersPage } from '../pages/admin/UsersPage';
import { ForceChangePasswordPage } from '../pages/auth/ForceChangePasswordPage';
import { MyTicketsPage } from '../pages/tickets/MyTicketsPage';
import { NewTicketPage } from '../pages/tickets/NewTicketPage';
import { MyTicketDetailPage } from '../pages/tickets/MyTicketDetailPage';
import { RhTicketsPage } from '../pages/tickets/RhTicketsPage';
import { RhTicketDetailPage } from '../pages/tickets/RhTicketDetailPage';
import { MethodologyPage } from '../features/retention/pages/MethodologyPage';

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
        path: 'chamados',
        element: (
          <RequireRole allowedRoles={['colaborador']}>
            <MyTicketsPage />
          </RequireRole>
        )
      },
      {
        path: 'chamados/novo',
        element: (
          <RequireRole allowedRoles={['colaborador']}>
            <NewTicketPage />
          </RequireRole>
        )
      },
      {
        path: 'chamados/:id',
        element: (
          <RequireRole allowedRoles={['colaborador']}>
            <MyTicketDetailPage />
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

      // Rotas de Chamados (RH)
      {
        path: 'rh/chamados',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <RhTicketsPage />
          </RequireRole>
        )
      },
      {
        path: 'rh/chamados/:id',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <RhTicketDetailPage />
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
      {
        path: 'inteligencia/colaboradores',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <AnalyticsPage initialTab="colaboradores" />
          </RequireRole>
        )
      },
      {
        path: 'inteligencia/colaboradores/como-calculamos',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <MethodologyPage />
          </RequireRole>
        )
      },
      {
        path: 'inteligencia',
        element: <Navigate to="/analytics" replace />
      },
      {
        path: 'analytics/colaboradores',
        element: <Navigate to="/inteligencia/colaboradores" replace />
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
        path: 'knowledge/policies/new',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <PolicyEditorPage />
          </RequireRole>
        )
      },
      {
        path: 'knowledge/policies/:id/edit',
        element: (
          <RequireRole allowedRoles={['rh']}>
            <PolicyEditorPage />
          </RequireRole>
        )
      },
      {
        path: 'conhecimento',
        element: <Navigate to="/knowledge" replace />
      },
      {
        path: 'conhecimento/politicas/nova',
        element: <Navigate to="/knowledge/policies/new" replace />
      },
      {
        path: 'conhecimento/politicas/:id/editar',
        element: <Navigate to="/knowledge/policies/:id/edit" replace />
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
