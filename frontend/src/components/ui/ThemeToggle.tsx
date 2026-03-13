import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1"
      style={{ background: theme === 'dark' ? 'var(--surface-3)' : 'var(--border-2)' }}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <div className={`absolute w-5 h-5 rounded-full bg-[var(--surface)] shadow-lg transition-transform duration-300 flex items-center justify-center ${theme === 'light' ? 'translate-x-0' : 'translate-x-7'}`}>
        {theme === 'light' ? <Sun size={11} className="text-[var(--gold-500)]" /> : <Moon size={11} className="text-[var(--brand-400)]" />}
      </div>
    </button>
  );
}
