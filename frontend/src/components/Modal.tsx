import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: 'media' | 'ampla';
}

const larguras = {
  media: 'max-w-xl',
  ampla: 'max-w-3xl',
};

/**
 * Modal generico (overlay escuro, botao X e ESC para fechar).
 */
export default function Modal({ aberto, titulo, aoFechar, children, rodape, largura = 'media' }: ModalProps) {
  useEffect(() => {
    if (!aberto) return undefined;

    function aoPressionar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        aoFechar();
      }
    }
    window.addEventListener('keydown', aoPressionar);
    return () => window.removeEventListener('keydown', aoPressionar);
  }, [aberto, aoFechar]);

  if (!aberto) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          aoFechar();
        }
      }}
    >
      <div className={`w-full ${larguras[largura]} rounded-xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>

        {rodape && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}
