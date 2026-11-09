import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getUser();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-xl font-bold text-slate-900 mb-2">Acesso não autorizado</h1>
      <p className="text-sm text-slate-500 max-w-md mb-2">
        Seu perfil atual ({user?.role ? <span className="font-semibold text-slate-700">{user.role}</span> : 'não autenticado'}) não possui permissão para acessar esta área ou funcionalidade.
      </p>
      <p className="text-xs text-slate-400 max-w-md mb-6">
        As políticas de controle de acesso (RBAC) do TOTVS RH Inteligente garantem a conformidade e a segurança dos dados corporativos.
      </p>

      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </Button>
        <Button variant="primary" size="sm" onClick={() => navigate('/')}>
          Ir para Página Inicial
        </Button>
      </div>
    </div>
  );
};
