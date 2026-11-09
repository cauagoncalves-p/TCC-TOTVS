import React from 'react';
import { authService } from '../../services/authService';
import { UserRole } from '../../types/auth';
import { UnauthorizedPage } from '../../pages/common/UnauthorizedPage';

export interface RequireRoleProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const user = authService.getUser();

  if (!user || !allowedRoles.includes(user.role)) {
    return <UnauthorizedPage />;
  }

  return <>{children}</>;
};
