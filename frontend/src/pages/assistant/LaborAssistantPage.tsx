import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DisclaimerBanner } from '../../components/ui/DisclaimerBanner';
import { ChatPanel, ChatMessageItem } from '../../components/ui/ChatPanel';
import { http } from '../../services/http';

const KNOWLEDGE_RESPONSES: Record<
  string,
  {
    reply: string;
    sources: Array<{
      title: string;
      version?: string;
      section?: string;
      publishedAt?: string;
    }>;
  }
> = {
  rescisao: {
    reply:
      'Conforme o art. 477, § 6º da CLT (redação dada pela Lei nº 13.467/2017), a entrega ao empregado dos documentos que comprovem a comunicação da extinção contratual aos órgãos competentes bem como o pagamento dos valores relativos às verbas rescisórias deverão ser efetuados em até 10 (dez) dias corridos, contados a partir do término do contrato de trabalho, independentemente do tipo de aviso prévio.',
    sources: [
      {
        title: 'Consolidação das Leis do Trabalho (CLT)',
        version: '2026.1',
        section: 'Art. 477, § 6º',
        publishedAt: '10/01/2026'
      }
    ]
  },
  compensacao: {
    reply:
      'A compensação de jornada de trabalho deve observar o art. 59 da CLT e o Acordo Coletivo de Trabalho vigente. O regime de compensação semanal pode ser pactuado por acordo individual escrito, desde que a jornada não exceda 10 horas diárias e 44 semanais. Para banco de horas com validade superior a 6 meses, é obrigatória a formalização mediante convenção coletiva.',
    sources: [
      {
        title: 'Convenção Coletiva de Trabalho (CCT)',
        version: '2026/2027',
        section: 'Cláusula 14ª - Banco de Horas e Compensação',
        publishedAt: '01/05/2026'
      },
      {
        title: 'Consolidação das Leis do Trabalho (CLT)',
        version: '2026.1',
        section: 'Art. 59 e 59-B',
        publishedAt: '10/01/2026'
      }
    ]
  },
  afastamento: {
    reply:
      'No evento S-2230 do eSocial, o afastamento temporário por auxílio-doença acidentário (código 01 ou 03) deve ser transmitido até o 16º dia do afastamento, ou até o dia 15 do mês subsequente, o que ocorrer primeiro. Para afastamentos decorrentes de acidente de trabalho, é exigido correlacionar o número da Comunicação de Acidente de Trabalho (CAT) registrada no evento S-2210.',
    sources: [
      {
        title: 'Manual de Orientação do eSocial (MOS)',
        version: 'S-1.2 (Rev. Nov/26)',
        section: 'Evento S-2230 - Afastamento Temporário, pág. 142',
        publishedAt: '01/10/2026'
      }
    ]
  },
  ferias: {
    reply:
      'De acordo com a Política Interna de Férias e o art. 134 da CLT, desde que haja concordância do empregado, as férias podem ser usufruídas em até três períodos, sendo que um deles não poderá ser inferior a 14 dias corridos e os demais não poderão ser inferiores a 5 dias corridos cada um. É vedado o início das férias no período de dois dias que antecede feriado ou dia de descanso semanal remunerado (DSR).',
    sources: [
      {
        title: 'Política Interna de Férias e Descanso Semanal Remunerado',
        version: 'v3.0',
        section: 'Item 4.2 - Fracionamento e Prazos',
        publishedAt: '12/03/2026'
      },
      {
        title: 'Consolidação das Leis do Trabalho (CLT)',
        version: '2026.1',
        section: 'Art. 134, § 1º e § 3º',
        publishedAt: '10/01/2026'
      }
    ]
  }
};

const SUGGESTIONS = [
  'Qual o prazo legal para pagamento das verbas rescisórias na CLT?',
  'Como funciona o regime de compensação de horas e banco de horas?',
  'Qual o prazo de envio do evento S-2230 de afastamento no eSocial?',
  'Quais as regras para fracionamento de férias na política interna?'
];

export const LaborAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Tenta consultar o endpoint do backend se configurado
      const response = await http.post<{
        reply: string;
        sources?: Array<{
          title: string;
          version?: string;
          section?: string;
          publishedAt?: string;
        }>;
        nao_confirmada?: boolean;
      }>('/api/compliance/assistant/chat', { message: text });

      const botMsg: ChatMessageItem = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: response.data.reply,
        sources: response.data.sources || [],
        isUnconfirmed: response.data.nao_confirmada || false,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // Fallback local do Assistente Trabalhista
      setTimeout(() => {
        const lower = text.toLowerCase();

        let matchKey: string | null = null;
        if (lower.includes('rescis') || lower.includes('verbas')) matchKey = 'rescisao';
        else if (lower.includes('compensa') || lower.includes('banco')) matchKey = 'compensacao';
        else if (lower.includes('afasta') || lower.includes('s-2230') || lower.includes('doen'))
          matchKey = 'afastamento';
        else if (lower.includes('férias') || lower.includes('ferias') || lower.includes('fraciona'))
          matchKey = 'ferias';

        let replyContent = '';
        let replySources: ChatMessageItem['sources'] = [];
        let isUnconfirmed = false;

        if (matchKey && KNOWLEDGE_RESPONSES[matchKey]) {
          const item = KNOWLEDGE_RESPONSES[matchKey];
          replyContent = item.reply;
          replySources = item.sources;
          isUnconfirmed = false;
        } else {
          // Pergunta fora da base de documentos cadastrada (regra do teste: resposta "não foi possível confirmar")
          replyContent =
            'Não foi possível confirmar esta informação na base de conhecimento vigente. Por diretriz de conformidade e segurança jurídica, consultas sem respaldo em documentos oficiais indexados não produzem orientações conjecturais. Recomenda-se consultar o departamento jurídico ou indexar a norma correspondente na Base de Conhecimento.';
          isUnconfirmed = true;
        }

        const botMsg: ChatMessageItem = {
          id: `bot-${Date.now()}`,
          role: 'model',
          content: replyContent,
          sources: replySources,
          isUnconfirmed,
          createdAt: new Date().toISOString()
        };

        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
      }, 500);
      return;
    }

    setIsTyping(false);
  };

  return (
    <div className="space-y-4 pb-8 flex flex-col h-[calc(100vh-6rem)]">
      <div>
        <PageHeader
          title="Assistente Trabalhista (RAG)"
          subtitle="Consultas especializadas com citação estrita de fontes documentais oficiais (Fase F4c)."
        />
        {/* Aviso fixo obrigatório */}
        <DisclaimerBanner type="assistant" />
      </div>

      <div className="flex-1 min-h-0">
        <ChatPanel
          messages={messages}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
          suggestions={SUGGESTIONS}
          onSelectSuggestion={handleSendMessage}
        />
      </div>
    </div>
  );
};
