import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>

      <h1 className="text-xl font-bold text-slate-900 mb-2">Página não encontrada (404)</h1>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        A rota solicitada não existe ou foi movida.
      </p>

      <Button variant="primary" size="sm" onClick={() => navigate('/')}>
        Voltar ao início
      </Button>
    </div>
  );
};
