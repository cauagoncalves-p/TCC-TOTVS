import React from 'react';
import { User, Briefcase, Building, Calendar, ShieldCheck, Mail, Clock } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { DisclaimerBanner } from '../../components/ui/DisclaimerBanner';
import { useMe } from '../../features/me/hooks';
import { formatDate } from '../../lib/formatters';
import { authService } from '../../services/authService';

export const ProfilePage: React.FC = () => {
  const { data: profile, isLoading, isError, error, refetch } = useMe();
  const user = authService.getUser();

  // Calcula tempo de casa aproximado
  const calculateTenure = (hireDateStr?: string) => {
    if (!hireDateStr) return null;
    const hire = new Date(hireDateStr);
    const now = new Date();
    const diffMonths = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
    if (diffMonths < 1) return 'Menos de 1 mês';
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`;
    const years = Math.floor(diffMonths / 12);
    const remainingMonths = diffMonths % 12;
    return `${years} ${years === 1 ? 'ano' : 'anos'}${remainingMonths > 0 ? ` e ${remainingMonths} m` : ''}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader title="Meu Perfil" subtitle="Informações cadastrais e funcionais" />
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="w-48 h-6" />
                <Skeleton className="w-32 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader title="Meu Perfil" subtitle="Informações cadastrais e funcionais" />
        <ErrorState
          title="Não foi possível carregar seu perfil"
          message={error?.message || 'Verifique sua conexão com o servidor ou tente novamente mais tarde.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const tenure = calculateTenure(profile.HireDate);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Meu Perfil"
        subtitle="Consulte suas informações contratuais e dados funcionais registrados no TOTVS RH"
      />

      <DisclaimerBanner
        type="custom"
        message="Estes dados refletem o registro oficial no sistema de folha de pagamento. Caso identifique qualquer divergência em seus dados, entre em contato com o Departamento Pessoal."
      />

      {/* Cartão de Identificação Principal */}
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-md border-2 border-background">
                {profile.FullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{profile.FullName}</h2>
                  <Badge variant="success" className="text-xs">Ativo</Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {profile.JobTitle}
                </p>
              </div>
            </div>

            <div className="text-xs px-3 py-1.5 rounded-lg bg-card/80 border border-border text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Colaborador Autenticado</span>
            </div>
          </div>
        </div>

        {/* Grade de Detalhes Funcionais */}
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Dados Contratuais e Lotação
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Departamento */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-start space-x-3.5">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-medium block">Departamento</span>
                <span className="text-sm font-semibold text-foreground mt-0.5 block">{profile.Department}</span>
              </div>
            </div>

            {/* Cargo Oficial */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-start space-x-3.5">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-medium block">Função / Cargo</span>
                <span className="text-sm font-semibold text-foreground mt-0.5 block">{profile.JobTitle}</span>
              </div>
            </div>

            {/* Data de Admissão */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-start space-x-3.5">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-medium block">Data de Admissão</span>
                <span className="text-sm font-semibold text-foreground mt-0.5 block">{formatDate(profile.HireDate)}</span>
              </div>
            </div>

            {/* Tempo de Empresa */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-start space-x-3.5">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-medium block">Tempo de Vínculo</span>
                <span className="text-sm font-semibold text-foreground mt-0.5 block">{tenure || '-'}</span>
              </div>
            </div>

            {/* E-mail Institucional */}
            {user?.email && (
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-start space-x-3.5 md:col-span-2">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-medium block">E-mail Corporativo</span>
                  <span className="text-sm font-semibold text-foreground mt-0.5 block">{user.email}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
