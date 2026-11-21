import React, { useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

interface ResolveButtonProps {
  onResolve: () => Promise<boolean>;
  isResolving?: boolean;
}

export const ResolveButton: React.FC<ResolveButtonProps> = ({
  onResolve,
  isResolving = false
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleConfirm = async () => {
    const success = await onResolve();
    if (success) {
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        disabled={isResolving}
        className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 text-xs gap-1.5"
      >
        <CheckCheck className="w-4 h-4 text-emerald-600" />
        <span>Marcar como resolvido</span>
      </Button>

      <ConfirmDialog
        isOpen={isDialogOpen}
        title="Resolver chamado?"
        description="Ao marcar como resolvido, o chamado será encerrado. Você ainda poderá reabri-lo respondendo dentro de até 7 dias."
        confirmLabel="Sim, resolver chamado"
        cancelLabel="Cancelar"
        variant="primary"
        isLoading={isResolving}
        onConfirm={handleConfirm}
        onCancel={() => setIsDialogOpen(false)}
      />
    </>
  );
};
