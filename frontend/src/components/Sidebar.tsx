import { NavLink, useNavigate } from 'react-router-dom';
import {
  Building2,
  FileBarChart2,
  FileText,
  LayoutDashboard,
  LogOut,
  Wallet,
} from 'lucide-react';
import { encerrarSessao } from '../api/axios';

const itens = [
  { to: '/', rotulo: 'Dashboard', icone: LayoutDashboard, fim: true },
  { to: '/financeiro', rotulo: 'Financeiro', icone: Wallet, fim: false },
  { to: '/imoveis', rotulo: 'Imoveis e Clientes', icone: Building2, fim: false },
  { to: '/contratos', rotulo: 'Contratos', icone: FileText, fim: false },
  { to: '/relatorios', rotulo: 'Relatorios MP-SE', icone: FileBarChart2, fim: false },
];

/**
 * Navegacao lateral escura (degradê #101828 -> #1E293B), alinhada ao layout do Figma.
 */
export default function Sidebar() {
  const navigate = useNavigate();

  function sair() {
    encerrarSessao();
    navigate('/login');
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-[#101828] to-[#1E293B] text-slate-200">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
          <Building2 size={22} className="text-white" />
        </div>
        <div>
          <p className="text-lg font-bold leading-tight text-white">FORMACE</p>
          <p className="text-[11px] leading-tight text-slate-400">Fundacao Manuel Cruz</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Gestao
        </p>
        {renderizarItens()}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={sair}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} />
          Sair do sistema
        </button>
      </div>
    </aside>
  );
}

function renderizarItens() {
  return itens.map(({ to, rotulo, icone: Icone, fim }) => (
    <NavLink
      key={to}
      to={to}
      end={fim}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
          isActive
            ? 'bg-white/10 text-white shadow-inner'
            : 'text-slate-300 hover:bg-white/5 hover:text-white',
        ].join(' ')
      }
    >
      <Icone size={18} />
      {rotulo}
    </NavLink>
  ));
}
