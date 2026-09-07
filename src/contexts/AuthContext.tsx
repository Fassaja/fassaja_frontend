import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Lock } from 'lucide-react';
import { useUser } from './UserContext';
import { useToast } from './ToastContext';
import { api, setAuthenticated, SESSION_EXPIRED_EVENT } from '@/services/api';
import { getProductiveDays } from '@/services/authService';
import { guestTasksStore } from '@/services/guestTasksStore';
import { clearAccountStorage } from '@/utils/accountStorage';
import { identidadeDe, type Identidade } from '@/utils/identidadeDeSessao';
import { aguardarRevogacaoPendente, revogarSessao } from '@/utils/revogacaoDeSessao';
import { pushService } from '@/services/pushService';
import { deveSugerirVoltarAoApp } from '@/utils/modoApp';
import {
  consumirDestinoPosLogin,
  idaAoGoogleEmAndamento,
  limparIdaAoGoogle,
} from '@/utils/postLoginRedirect';

export interface Account {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  // Dias da sequência (0=domingo … 6=sábado). Fonte de verdade é o servidor;
  // hidratado no login e no /auth/me, espelhado no UserContext.
  streakDays?: number[];
  // Metas de tarefas por dia e por semana. Opcionais pelo mesmo motivo dos
  // outros campos novos: uma sessão gravada no localStorage antes desta versão
  // não as tem, e quem lê precisa tolerar a ausência em vez de assumir zero.
  dailyGoal?: number;
  weeklyGoal?: number;
  /** Lembrete de prazo (preferência única). Opcionais como os demais campos
   *  novos: uma sessão gravada antes desta versão não os tem. */
  taskReminder?: boolean;
  taskReminderTime?: string;
  taskReminderDaysBefore?: number;
  timeZone?: string | null;
  nameChangedAt?: string | null;
  passwordChangedAt?: string | null;
  /**
   * A conta tem senha? Quem entrou pelo Google começa sem nenhuma, e para essa
   * pessoa não faz sentido pedir a "senha atual".
   *
   * Opcional porque sessões salvas ANTES deste campo existir não o têm. Quem
   * lê deve tratar `undefined` como "tem senha" — é o caso da maioria, e
   * assumir o contrário esconderia o formulário de quem pode usá-lo.
   */
  hasPassword?: boolean;
  /**
   * Placar vitalício de XP, vindo do servidor. Opcional porque sessões salvas
   * ANTES deste campo existir não o têm — quem lê deve cair no cálculo local
   * nesse caso (ver hooks/useXp).
   */
  xp?: number;
  /**
   * Tarefas concluídas em toda a vida da conta.
   *
   * Vem do servidor pelo mesmo motivo do `xp`: a faxina apaga concluídas
   * depois de 4 dias, então somar o que está na tela dá um total que encolhe.
   * Opcional como os demais campos novos — uma sessão salva antes desta versão
   * não o tem, e quem lê deve tolerar a ausência.
   */
  completedTasks?: number;
}

type AuthStatus = 'guest' | 'authed';

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface RegisterResult extends AuthResult {
  needsVerification?: boolean;
  message?: string;
}

interface AuthResponse {
  token: string;
  user: Account;
}

interface AuthContextValue {
  status: AuthStatus;
  isGuest: boolean;
  account: Account | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<RegisterResult>;
  resendVerification: (email: string) => Promise<AuthResult>;
  changePassword: (current: string, next: string) => Promise<AuthResult>;
  updateName: (name: string) => Promise<AuthResult>;
  updateAvatar: (avatar: string | null) => Promise<AuthResult>;
  /**
   * Encerra a sessão e apaga a PII espelhada neste navegador.
   *
   * `redirect: false` faz a limpeza SEM navegar. Existe para a tela que conclui
   * a exclusão de conta: ela precisa continuar visível para dizer o que
   * aconteceu, e um `navigate('/login')` a arrancaria no meio da frase.
   */
  logout: (opts?: { redirect?: boolean }) => void;
  guestTaskLimit: number;
  guestTaskCount: number;
  noteGuestTask: () => void;
  requireAuth: (reason?: string) => void;
  /**
   * Mescla campos no `account` já em memória (e no que fica gravado).
   *
   * Existe para preferências que têm rota própria fora do /auth — hoje o
   * lembrete de prazo, que mora no módulo de tarefas. Sem isto a tela salvaria
   * no servidor e continuaria mostrando o valor antigo ao ser reaberta, até o
   * próximo /auth/me.
   */
  patchAccount: (campos: Partial<Account>) => void;
  /**
   * Identidade da sessão: conta + geração.
   *
   * Muda em TODA transição — login, logout, expiração, troca de conta, troca
   * feita em outra aba — e é a chave que os provedores de dados usam para
   * descartar a resposta de uma sessão que já não está na tela (FE-01).
   * Ver utils/identidadeDeSessao.
   */
  identidade: Identidade;
  /**
   * A identidade vigente AGORA.
   *
   * Existe porque `identidade` capturada num callback congela no valor do
   * render em que ele foi criado — e é justamente a resposta atrasada que
   * precisa perguntar "isto ainda é da sessão que está na tela?".
   */
  identidadeAtual: () => Identidade;
}

const SESSION_KEY = 'fassaja_session';
const GUEST_KEY = 'fassaja_guest_tasks';
const GUEST_TASK_LIMIT = 3;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { updateUser, setScope, hydrateGoals } = useUser();
  const toast = useToast();

  const [account, setAccount] = useState<Account | null>(() =>
    readJSON<Account | null>(SESSION_KEY, null),
  );

  // Espelho de `account` para os ouvintes de evento, que são registrados uma
  // vez só e congelariam o valor do primeiro render se lessem o state direto.
  const accountRef = useRef(account);
  accountRef.current = account;

  /**
   * Geração da sessão. Cresce a cada transição, inclusive quando a conta é a
   * MESMA: sair e entrar de novo não prova o mesmo cookie, e o que ficou em voo
   * pertence à sessão anterior.
   */
  const geracaoRef = useRef(0);
  const identidadeRef = useRef<Identidade>(identidadeDe(account?.id ?? null, 0));
  const [identidade, setIdentidade] = useState<Identidade>(identidadeRef.current);

  /**
   * Troca a identidade AGORA (ref) e avisa a árvore (state).
   *
   * A ref é atualizada de forma síncrona de propósito: entre o `setAccount` e o
   * render seguinte existe uma janela em que uma promessa pode resolver, e nessa
   * janela a resposta antiga ainda passaria por válida.
   */
  const trocarIdentidade = (contaId: string | null) => {
    geracaoRef.current += 1;
    identidadeRef.current = identidadeDe(contaId, geracaoRef.current);
    setIdentidade(identidadeRef.current);
  };

  /**
   * Carimbo para uma ida ao servidor que começa agora.
   *
   * Guardado numa ref para ser ESTÁVEL entre renders: os provedores de dados o
   * usam em listas de dependência, e uma função nova a cada render faria os
   * efeitos deles recarregarem sem parar.
   */
  const carimbo = useRef((): Identidade => identidadeRef.current).current;
  /** O que voltou ainda pertence à sessão que está na tela? */
  const aindaEhAMinha = (marca: Identidade) => identidadeRef.current === marca;

  const [guest, setGuest] = useState<{ date: string; count: number }>(() => {
    const g = readJSON<{ date: string; count: number }>(GUEST_KEY, { date: todayISO(), count: 0 });
    return g.date === todayISO() ? g : { date: todayISO(), count: 0 };
  });

  const [prompt, setPrompt] = useState<string | null>(null);

  const status: AuthStatus = account ? 'authed' : 'guest';

  // Sem sessão = visitante: garante a identidade "Visitante" mesmo que tenha
  // sobrado um nome de uma sessão anterior no navegador.
  useEffect(() => {
    if (!account) {
      setScope(null);
      updateUser({ name: 'Visitante', email: '', role: 'Conta visitante', avatar: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salva a sessão. A limpeza (logout/expiração) é feita por clearAccountStorage,
  // que também apaga o perfil/notificações espelhados desta conta.
  const persistSession = (acc: Account) =>
    localStorage.setItem(SESSION_KEY, JSON.stringify(acc));

  // Persiste a conta e espelha nome/email/avatar/streakDays para o UserContext.
  // streakDays vem do servidor (fonte de verdade) e só é aplicado quando presente,
  // para não sobrescrever o valor local com um response que o omita.
  const syncAccount = (acc: Account) => {
    persistSession(acc);
    setAccount(acc);
    updateUser({
      name: acc.name,
      email: acc.email,
      role: 'Membro',
      avatar: acc.avatar ?? undefined,
      ...(Array.isArray(acc.streakDays) && acc.streakDays.length > 0
        ? { streakDays: acc.streakDays }
        : {}),
    });
  };

  // Busca os dias produtivos no servidor (fonte de verdade, sobrevive à faxina
  // de tarefas) e injeta no UserContext. Best-effort: em falha, o cache local
  // do localStorage segue valendo até a próxima hidratação.
  const hydrateProductiveDays = () => {
    getProductiveDays()
      .then(days => updateUser({ productiveDays: days }))
      .catch(() => undefined);
  };

  const adopt = (acc: Account) => {
    // Primeiro a identidade: tudo que estava em voo pela sessão anterior morre
    // aqui, antes de qualquer estado desta conta ser escrito.
    trocarIdentidade(acc.id);
    setAuthenticated(true);
    // Descarta a sandbox local do visitante ao assumir uma conta real.
    guestTasksStore.clear();
    setScope(acc.id); // carrega metas/preferências/sequência desta conta
    syncAccount(acc);
    // Depois do setScope, e com o id explícito: a reconciliação lê o
    // localStorage daquela conta direto, sem depender do estado recém-trocado.
    hydrateGoals(acc.id, { daily: acc.dailyGoal, weekly: acc.weeklyGoal });
    hydrateProductiveDays();
  };

  // Ao montar logado, atualiza os dados a partir do banco (avatar, cooldowns).
  // Se o servidor disser que a sessão é inválida (401), encerra o estado local.
  // Logo após confirmar o e-mail (?verified=1) ou voltar do login com Google
  // (?google=1), assume a sessão do cookie e entra no app.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Os dois casos são o mesmo problema: a API já criou a sessão e mandou o
    // cookie, mas este código ainda acha que é visitante. A diferença é só para
    // onde levar depois e para onde voltar se o cookie não tiver chegado.
    const justVerified = params.get('verified') === '1';
    const fromGoogle = params.get('google') === '1';

    if (!account && fromGoogle) {
      const marca = carimbo();
      api
        .get<Account>('/auth/me')
        .then(acc => {
          // A pessoa pode ter saído (ou entrado em outra conta) enquanto o
          // /auth/me viajava: a resposta antiga não regrava perfil nem sessão.
          if (!aindaEhAMinha(marca)) return;
          adopt(acc);
          // Destino guardado antes de sair para o Google (ex.: veio de um link
          // protegido). Sem nada guardado, cai no Dashboard.
          navigate(consumirDestinoPosLogin(), { replace: true });
          // Quem usa o app instalado terminou o login AQUI, no navegador, e o
          // app ficou para trás. Sem este aviso, a pessoa vê o Dashboard na
          // aba e não tem como saber que basta voltar para o app.
          if (deveSugerirVoltarAoApp()) {
            toast.success('Pronto! Já pode voltar para o app Fassaja.');
          }
        })
        .catch(() => {
          if (!aindaEhAMinha(marca)) return;
          // O cookie não chegou. Não dá para ficar no app como visitante depois
          // de a pessoa ter autorizado no Google — isso pareceria que o login
          // simplesmente não fez nada.
          //
          // Encerra a ida: aqui a resposta é definitiva (a API respondeu que
          // não há sessão), então deixar a marca de pé faria o app tentar de
          // novo a cada foco, sem chance de dar certo.
          limparIdaAoGoogle();
          navigate('/login?google=erro', { replace: true });
        });
      return;
    }

    if (account) {
      setScope(account.id); // recarga já logado: carrega os dados desta conta
      const marca = carimbo();
      api
        .get<Account>('/auth/me')
        .then(acc => {
          if (!aindaEhAMinha(marca)) return;
          syncAccount(acc);
          // Também no F5 estando logado — é o caminho mais percorrido, e é por
          // ele que a meta salva em outro aparelho chega até aqui.
          hydrateGoals(acc.id, { daily: acc.dailyGoal, weekly: acc.weeklyGoal });
          hydrateProductiveDays();
        })
        .catch((err: Error & { status?: number }) => {
          if (!aindaEhAMinha(marca)) return;
          if (err.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        });
    } else if (justVerified) {
      const marca = carimbo();
      api
        .get<Account>('/auth/me')
        .then(acc => {
          if (!aindaEhAMinha(marca)) return;
          adopt(acc);
          navigate('/', { replace: true }); // logado: entra no app e limpa o ?verified=1
        })
        .catch(() => {
          if (!aindaEhAMinha(marca)) return;
          // O cookie de sessão não chegou (ex.: deploy cross-domain em que o link
          // de verificação não passou pelo proxy do front). Em vez de deixar a
          // pessoa presa como visitante, leva à tela de login já confirmado.
          navigate('/login?verified=1', { replace: true });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Assume a sessão quando o app volta ao primeiro plano.
   *
   * O caso é o app INSTALADO na tela de início. O login com Google sai do
   * escopo do app (accounts.google.com), então o sistema abre o navegador — e
   * é lá que a volta acontece, porque nenhuma API permite a uma página trazer
   * o navegador de volta para o app instalado. No iOS isso é limitação do
   * WebKit; não há contorno.
   *
   * O que dá para consertar é o que de fato incomodava: a janela do app ficava
   * para trás achando que ainda era visitante, e só descobria a sessão se fosse
   * FECHADA E REABERTA. O cookie já estava lá o tempo todo — faltava alguém
   * perguntar. Agora, ao voltar para o app pelo alternador, ele confere e entra.
   *
   * Só age quando há uma ida ao Google marcada. Sem essa condição, todo retorno
   * de foco viraria uma chamada de rede para quem está só navegando como
   * visitante.
   */
  useEffect(() => {
    const retomar = () => {
      if (document.visibilityState !== 'visible') return;
      // A ref, e não `account`: este efeito roda uma vez só, e a variável
      // capturada aqui congelaria no valor do primeiro render.
      if (accountRef.current) return;
      if (!idaAoGoogleEmAndamento()) return;

      const marca = identidadeRef.current;
      api
        .get<Account>('/auth/me')
        .then(acc => {
          if (identidadeRef.current !== marca) return;
          adopt(acc);
          navigate(consumirDestinoPosLogin(), { replace: true });
        })
        .catch((err: Error & { status?: number }) => {
          if (identidadeRef.current !== marca) return;
          // 401 é resposta, não falha: o servidor afirmou que não há sessão.
          // Encerrar a espera aqui evita repetir a consulta a cada foco pelos
          // 10 minutos seguintes, sempre para ouvir a mesma coisa.
          //
          // Erro de rede é diferente — não sabemos nada. Aí a marca fica de pé
          // e a próxima volta ao app tenta de novo; o prazo de validade encerra
          // a espera sozinho.
          if (err.status === 401) limparIdaAoGoogle();
        });
    };

    // Três eventos porque nenhum cobre todos os casos: visibilitychange é o
    // alternador de apps, focus é a troca de janela no desktop, e pageshow é o
    // retorno pelo cache de retrocesso (bfcache), em que a página é restaurada
    // sem recarregar e nenhum dos outros dois dispara.
    document.addEventListener('visibilitychange', retomar);
    window.addEventListener('focus', retomar);
    window.addEventListener('pageshow', retomar);
    return () => {
      document.removeEventListener('visibilitychange', retomar);
      window.removeEventListener('focus', retomar);
      window.removeEventListener('pageshow', retomar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      // Ordem no servidor: se há um logout ainda sem resposta, espera-se por
      // ele. Sem isso, a revogação podia chegar DEPOIS deste login e apagar o
      // cookie recém-criado (FE-07). Com prazo — rede pendurada não pode
      // impedir alguém de entrar.
      await aguardarRevogacaoPendente();
      const res = await api.post<AuthResponse>('/auth/login', { email: email.trim(), password });
      adopt(res.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };


  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<RegisterResult> => {
    try {
      // Não loga: o usuário precisa confirmar o e-mail antes.
      const res = await api.post<{ message: string }>('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      // Marca como usuário novo para abrir o tour de boas-vindas no 1º acesso.
      try {
        localStorage.setItem('fassaja_new_user', '1');
      } catch {
        /* ignora */
      }
      return { ok: true, needsVerification: true, message: res.message };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const resendVerification = async (email: string): Promise<AuthResult> => {
    try {
      await api.post('/auth/resend-verification', { email: email.trim() });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const changePassword = async (current: string, next: string): Promise<AuthResult> => {
    if (!account) return { ok: false, error: 'Faça login primeiro.' };
    try {
      const marca = carimbo();
      const updated = await api.patch<Account>('/auth/password', { current, next });
      // A resposta de uma mutação também é dado de conta: chegando depois da
      // saída, regravaria o perfil de A por cima da sessão de B (FE-01).
      if (!aindaEhAMinha(marca)) return { ok: false, error: 'Sessão encerrada.' };
      syncAccount(updated);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const patchAccount = (campos: Partial<Account>) => {
    if (!account) return;
    syncAccount({ ...account, ...campos });
  };

  const updateName = async (name: string): Promise<AuthResult> => {
    if (!account) return { ok: false, error: 'Faça login primeiro.' };
    try {
      const marca = carimbo();
      const updated = await api.patch<Account>('/auth/profile', { name: name.trim() });
      // A resposta de uma mutação também é dado de conta: chegando depois da
      // saída, regravaria o perfil de A por cima da sessão de B (FE-01).
      if (!aindaEhAMinha(marca)) return { ok: false, error: 'Sessão encerrada.' };
      syncAccount(updated);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const updateAvatar = async (avatar: string | null): Promise<AuthResult> => {
    if (!account) return { ok: false, error: 'Faça login primeiro.' };
    try {
      const marca = carimbo();
      const updated = avatar
        ? await api.patch<Account>('/auth/avatar', { avatar })
        : await api.delete<Account>('/auth/avatar');
      if (!aindaEhAMinha(marca)) return { ok: false, error: 'Sessão encerrada.' };
      syncAccount(updated);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  /**
   * Apaga o que é desta conta NESTE navegador. Não fala com o servidor.
   *
   * Separado do `logout` porque a saída local é incondicional e imediata — ela
   * não pode ficar esperando (nem depender de) uma resposta de rede.
   */
  const encerrarLocalmente = (contaId?: string | null) => {
    // A identidade primeiro: a partir daqui toda resposta em voo é descartada.
    trocarIdentidade(null);
    // Apaga toda a PII espelhada desta conta (sessão + perfil + notificações),
    // não só o sinalizador de sessão — evita resíduo em dispositivo compartilhado.
    clearAccountStorage(contaId ?? accountRef.current?.id ?? null);
    setAuthenticated(false);
    setScope(null);
    setAccount(null);
    updateUser({ name: 'Visitante', email: '', avatar: undefined, role: 'Conta visitante' });
  };

  const logout = (opts?: { redirect?: boolean }) => {
    const conta = accountRef.current?.id ?? null;

    /*
     * A remoção do push começa ANTES da revogação: tirar a inscrição no
     * servidor exige a credencial que o logout vai justamente derrubar. O
     * desligamento local acontece de qualquer forma — inclusive se a rede
     * falhar —, porque deixar um aparelho inscrito na conta de quem acabou de
     * sair é o risco que se quer eliminar (FE-03).
     */
    const push = pushService.desligarNoLogout();

    encerrarLocalmente(conta);

    // A navegação é o padrão: sair de dentro do app tem de sair da tela também.
    // Só quem já está numa tela terminal (a conclusão da exclusão) pede para
    // ficar onde está.
    if (opts?.redirect !== false) navigate('/login');

    /*
     * A revogação remota é uma tentativa só, em segundo plano, e o resultado
     * não é fingido: quando ninguém confirma, a pessoa é avisada em vez de
     * ouvir que "saiu de todos os lugares". O cookie é httpOnly — JavaScript
     * não tem como apagá-lo daqui (FE-07).
     */
    void push
      .catch(() => undefined)
      .then(() => revogarSessao(() => api.post('/auth/logout', {})))
      .then(resultado => {
        if (resultado === 'sem-resposta') {
          toast.info(
            'Você saiu deste aparelho, mas não deu para confirmar com o servidor. ' +
              'Se este computador for compartilhado, entre de novo mais tarde para encerrar a sessão.',
          );
        }
      });
  };

  // Sessão expirada (401 num request autenticado): encerra e leva ao login.
  useEffect(() => {
    const handler = () => {
      // Sem id no closure (efeito montado com []): encerrarLocalmente deriva da
      // ref/sessão salva para apagar também o perfil/notificações espelhados.
      encerrarLocalmente();
      // A sessão já morreu no servidor: não há credencial para remover a
      // inscrição lá, mas o aparelho não pode continuar inscrito nem exibindo
      // notificação da conta anterior.
      void pushService.desligarNoLogout();
      navigate('/login?expired=1');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * A conta mudou em OUTRA aba.
   *
   * O cookie de sessão é compartilhado por todas as abas, mas o estado do React
   * não: entrar como B numa aba deixava a outra mostrando os dados de A até
   * alguém recarregar. O evento `storage` (que só dispara nas OUTRAS abas) é o
   * SINAL — nenhuma credencial trafega por ele. Quem responde "quem está logado
   * agora" continua sendo o servidor.
   */
  useEffect(() => {
    /**
     * A sessão desta aba ainda é a que vale neste navegador?
     *
     * Compara com o que está gravado — e, quando diverge, pergunta ao SERVIDOR.
     * O localStorage é dado escrito por outra aba, não prova de identidade.
     */
    const conferirSessao = () => {
      const salva = readJSON<Account | null>(SESSION_KEY, null);
      const nestaAba = accountRef.current?.id ?? null;
      const noArmazenamento = salva?.id ?? null;
      if (nestaAba === noArmazenamento) return;

      if (noArmazenamento === null) {
        // A outra aba saiu. Some com os dados daqui também.
        encerrarLocalmente(nestaAba);
        void pushService.desligarNoLogout();
        navigate('/login');
        return;
      }

      const marca = carimbo();
      api
        .get<Account>('/auth/me')
        .then(acc => {
          if (aindaEhAMinha(marca)) adopt(acc);
        })
        .catch(() => {
          if (aindaEhAMinha(marca)) encerrarLocalmente(nestaAba);
        });
    };

    const aoMudarArmazenamento = (e: StorageEvent) => {
      // key === null é um localStorage.clear() de outra aba.
      if (e.key !== null && e.key !== SESSION_KEY) return;
      conferirSessao();
    };

    /**
     * Volta pelo cache de retrocesso (bfcache) ou do segundo plano no app
     * instalado.
     *
     * A página é restaurada com o estado do React exatamente como estava — e é
     * o caso em que o `storage` NÃO ajuda: ele dispara enquanto a aba está
     * congelada e ninguém o ouve. Sem esta conferência, voltar para trás depois
     * de sair (ou depois de entrar em outra conta noutra aba) traz a tela antiga,
     * povoada, de volta.
     */
    const aoRestaurar = (e: Event) => {
      if (e.type === 'pageshow' && !(e as PageTransitionEvent).persisted) return;
      if (e.type === 'visibilitychange' && document.visibilityState !== 'visible') return;
      conferirSessao();
    };

    window.addEventListener('storage', aoMudarArmazenamento);
    window.addEventListener('pageshow', aoRestaurar);
    document.addEventListener('visibilitychange', aoRestaurar);
    return () => {
      window.removeEventListener('storage', aoMudarArmazenamento);
      window.removeEventListener('pageshow', aoRestaurar);
      document.removeEventListener('visibilitychange', aoRestaurar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noteGuestTask = () =>
    setGuest(prev => {
      const base = prev.date === todayISO() ? prev : { date: todayISO(), count: 0 };
      const next = { date: todayISO(), count: base.count + 1 };
      localStorage.setItem(GUEST_KEY, JSON.stringify(next));
      return next;
    });

  const requireAuth = (reason?: string) =>
    setPrompt(
      reason ??
        'Este recurso é exclusivo para quem tem conta. Faça login (ou crie uma conta gratuita) para liberar tudo — ou continue explorando como visitante.',
    );

  const guestTaskCount = guest.date === todayISO() ? guest.count : 0;

  return (
    <AuthContext.Provider
      value={{
        status,
        isGuest: status === 'guest',
        account,
        login,
        register,
        resendVerification,
        changePassword,
        updateName,
        updateAvatar,
        logout,
        guestTaskLimit: GUEST_TASK_LIMIT,
        guestTaskCount,
        noteGuestTask,
        requireAuth,
        patchAccount,
        identidade,
        identidadeAtual: carimbo,
      }}
    >
      {children}

      <ConfirmDialog
        isOpen={prompt !== null}
        title="Quer fazer login?"
        message={prompt ?? ''}
        confirmLabel="Fazer login"
        cancelLabel="Continuar como visitante"
        tone="primary"
        icon={<Lock size={24} />}
        onConfirm={() => navigate('/login')}
        onClose={() => setPrompt(null)}
      />
    </AuthContext.Provider>
  );
};
