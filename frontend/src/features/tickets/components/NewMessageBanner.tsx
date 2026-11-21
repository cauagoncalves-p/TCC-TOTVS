import React from 'react';
import { Bell } from 'lucide-react';

interface NewMessageBannerProps {
  authorName: string;
  onScrollToBottom: () => void;
}

export const NewMessageBanner: React.FC<NewMessageBannerProps> = ({ authorName, onScrollToBottom }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 shadow-sm"
    >
      <span className="flex items-center gap-1.5">
        <Bell className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
        <span>Nova mensagem de <strong>{authorName}</strong>.</span>
      </span>
      <button
        type="button"
        onClick={onScrollToBottom}
        className="font-semibold underline underline-offset-2 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
      >
        Ver
      </button>
    </div>
  );
};
