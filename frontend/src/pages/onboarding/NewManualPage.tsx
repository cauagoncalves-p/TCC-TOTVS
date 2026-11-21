// frontend/src/pages/onboarding/NewManualPage.tsx
import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { CaseForm } from '../../features/onboarding/components/CaseForm';

export const NewManualPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Cadastro Manual"
        subtitle="Preencha os dados do candidato diretamente. As regras são validadas em tempo real pelo backend sem persistência até o salvamento do rascunho."
      />

      <CaseForm isNewManual={true} />
    </div>
  );
};

export default NewManualPage;
