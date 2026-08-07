import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';

/**
 * 'system' segue a preferência do sistema operacional e continua seguindo se
 * ela mudar; 'light' e 'dark' são escolhas explícitas que vencem o sistema.
 * Guardar as três (em vez de só um booleano) é o que permite alguém voltar
 * para "acompanhar o sistema" depois de ter escolhido à mão.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

/** Tema realmente aplicado, depois de resolver 'system'. */
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'fassaja_theme';

interface ThemeContextValue {
  preference: ThemePreference;
  /**
   * Tema em vigor AGORA. Numa tela de tema fixo (ver `useLightOnlyScreen`) é o
   * tema forçado, não o preferido — quem lê isto quer saber o que está na tela.
   */
  resolved: ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
  /** Uso interno do `useLightOnlyScreen`. Devolve a função de baixa. */
  registerLightOnly: () => () => void;
}

const ThemeContext = createContext<ThemeContextValue>({} as ThemeContextValue);

export const useTheme = () => useContext(ThemeContext);

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches;

function readStored(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    /* localStorage indisponível (modo privado, cookies bloqueados) */
  }
  return 'system';
}

/**
 * Aplica o tema no <html>. Exportado para o snippet anti-flash do index.html
 * usar exatamente a mesma regra — se as duas implementações divergirem, a
 * página pisca no primeiro paint.
 */
export function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [systemDark, setSystemDark] = useState(prefersDark);
  // Contador, não booleano: durante a troca de rota a tela que sai e a que
  // entra ficam montadas ao mesmo tempo por um instante. Com um booleano, a
  // baixa da tela antiga apagaria o pedido da nova e o tema piscaria.
  const [telasClaras, setTelasClaras] = useState(0);

  // Só quando a preferência é 'system': se a pessoa escolheu à mão, mudar o
  // tema do SO no meio do uso não pode trocar o app embaixo dela.
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const preferido: ResolvedTheme =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  // A tela de tema fixo vence a preferência — mas só enquanto está montada: a
  // escolha da pessoa continua guardada e volta a valer ao sair dela.
  const resolved: ResolvedTheme = telasClaras > 0 ? 'light' : preferido;

  // useLayoutEffect, não useEffect: o efeito comum roda DEPOIS do paint, então
  // ao navegar do app (escuro) para o login apareceria um quadro escuro antes
  // da troca. Aqui a classe muda antes de o navegador pintar.
  useLayoutEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const registerLightOnly = useCallback(() => {
    setTelasClaras(n => n + 1);
    return () => setTelasClaras(n => n - 1);
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* sem persistência: o tema vale só para esta aba */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference, registerLightOnly }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Marca a tela atual como "sempre clara" enquanto ela estiver montada.
 *
 * Chamado pelas telas de autenticação. É a própria tela que declara a
 * necessidade, em vez de o ThemeProvider inspecionar a rota: o provider fica
 * FORA do BrowserRouter (o tema não depende de sessão nem de navegação), então
 * ele não tem como ler o caminho atual.
 *
 * useLayoutEffect pelo mesmo motivo do provider: registrar depois do paint
 * deixaria passar um quadro no tema errado.
 */
export function useLightOnlyScreen(): void {
  const { registerLightOnly } = useTheme();
  useLayoutEffect(() => registerLightOnly(), [registerLightOnly]);
}
