/**
 * Interpreta o que a pessoa digita numa linha só.
 *
 *   "amanhã ligar pro cliente !alta #trabalho"
 *   → { title: 'ligar pro cliente', dueDate: '2026-08-21', priority: 'high',
 *       tags: ['trabalho'] }
 *
 * Sem IA e sem custo por uso: são expressões fixas do português. O objetivo é
 * criar tarefa sem tirar a mão do teclado, não entender linguagem livre.
 *
 * Regra que atravessa tudo: **só consome o que sabe guardar**. `dueDate` é um
 * DIA, sem hora — então "amanhã 15h" vira prazo amanhã e o "15h" FICA no
 * título. Engolir a hora e descartá-la seria perder informação em silêncio,
 * que é pior do que não oferecer o recurso.
 */

export interface Interpretado {
  title: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags: string[];
}

/** Formata um Date como 'YYYY-MM-DD' pelos componentes LOCAIS. */
function paraISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

function somarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

const PRIORIDADES: Record<string, 'low' | 'medium' | 'high'> = {
  alta: 'high', alto: 'high', urgente: 'high', importante: 'high',
  media: 'medium', média: 'medium', normal: 'medium', medio: 'medium', médio: 'medium',
  baixa: 'low', baixo: 'low',
};

/** 0 = domingo, como em `Date.getDay()`. */
const DIAS_DA_SEMANA: Record<string, number> = {
  domingo: 0,
  segunda: 1, seg: 1,
  terca: 2, terça: 2, ter: 2,
  quarta: 3, qua: 3,
  quinta: 4, qui: 4,
  sexta: 5, sex: 5,
  sabado: 6, sábado: 6, sab: 6, sáb: 6,
};

/** Sem acento e em minúsculas, para casar "terça" e "terca" do mesmo jeito. */
function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Acha uma expressão de data no texto e devolve o dia + o trecho a remover.
 *
 * A ordem das regras importa: "depois de amanhã" precisa ser testada antes de
 * "amanhã", senão a segunda casaria primeiro e sobraria um "depois de" solto
 * no título.
 */
function acharData(texto: string, hoje: Date): { dueDate: string; trecho: string } | null {
  const t = normalizar(texto);

  const regras: { re: RegExp; resolve: (m: RegExpMatchArray) => Date | null }[] = [
    { re: /\bdepois de amanha\b/, resolve: () => somarDias(hoje, 2) },
    { re: /\banteontem\b/, resolve: () => somarDias(hoje, -2) },
    { re: /\bamanha\b/, resolve: () => somarDias(hoje, 1) },
    { re: /\bhoje\b/, resolve: () => hoje },
    { re: /\bontem\b/, resolve: () => somarDias(hoje, -1) },
    // "em 3 dias", "daqui a 2 semanas"
    {
      re: /\b(?:em|daqui a)\s+(\d{1,3})\s+(dias?|semanas?|meses|mes)\b/,
      resolve: m => {
        const n = Number(m[1]);
        if (m[2].startsWith('semana')) return somarDias(hoje, n * 7);
        if (m[2].startsWith('mes')) {
          const d = new Date(hoje);
          d.setMonth(d.getMonth() + n);
          return d;
        }
        return somarDias(hoje, n);
      },
    },
    { re: /\b(?:semana que vem|proxima semana)\b/, resolve: () => somarDias(hoje, 7) },
    // "15/03" e "15/03/2027" — dia/mês, como se escreve em português.
    {
      re: /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/,
      resolve: m => {
        const dia = Number(m[1]);
        const mes = Number(m[2]);
        if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
        let ano = m[3] ? Number(m[3]) : hoje.getFullYear();
        if (ano < 100) ano += 2000;
        const d = new Date(ano, mes - 1, dia);
        // Rejeita 31/02 e afins: o Date "corrigiria" para 03/03 em silêncio.
        if (d.getDate() !== dia || d.getMonth() !== mes - 1) return null;
        // Sem ano explícito e já passou: a pessoa quer o ano que vem.
        if (!m[3] && d < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
          d.setFullYear(ano + 1);
        }
        return d;
      },
    },
    // "dia 15" — o próximo dia 15 que vier.
    {
      re: /\bdia\s+(\d{1,2})\b/,
      resolve: m => {
        const dia = Number(m[1]);
        if (dia < 1 || dia > 31) return null;
        const d = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
        if (d.getDate() !== dia) return null;
        if (d < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
          d.setMonth(d.getMonth() + 1);
        }
        return d;
      },
    },
    // "segunda", "na sexta", "proxima terca" — sempre o PRÓXIMO daquele dia.
    {
      re: new RegExp(`\\b(?:na|proxima|proximo)?\\s*(${Object.keys(DIAS_DA_SEMANA).join('|')})(?:-feira)?\\b`),
      resolve: m => {
        const alvo = DIAS_DA_SEMANA[m[1]];
        if (alvo === undefined) return null;
        // Sempre à frente: dizer "sexta" numa sexta significa a próxima.
        const delta = ((alvo - hoje.getDay() + 7) % 7) || 7;
        return somarDias(hoje, delta);
      },
    },
  ];

  for (const { re, resolve } of regras) {
    const m = t.match(re);
    if (!m || m.index === undefined) continue;
    const d = resolve(m);
    if (!d) continue;
    // O trecho vem do texto ORIGINAL (com acentos), pela posição no
    // normalizado — as duas strings têm o mesmo comprimento porque a
    // normalização só troca caracteres, nunca insere ou remove.
    return { dueDate: paraISO(d), trecho: texto.slice(m.index, m.index + m[0].length) };
  }
  return null;
}

/**
 * Interpreta a linha. `hoje` é injetável para o teste não depender do relógio.
 *
 * Nada é obrigatório: uma linha sem marcador nenhum vira só um título, que é
 * exatamente o comportamento de antes deste recurso.
 */
export interface Opcoes {
  /**
   * Nomes das tags que já existem. Quando informado, só essas são reconhecidas
   * e as demais ficam no título — e `tags` sai com o nome EXATO da lista, não
   * com o que foi digitado, para quem chamou conseguir achar a tag de volta.
   *
   * É de propósito: criar tag a partir de um `#` digitado errado encheria a
   * lista de lixo que a pessoa nunca pediu, e ela só descobriria depois.
   * Deixar `#urgent3` visível no título mostra na hora que não pegou.
   */
  tagsConhecidas?: string[];
}

export function interpretar(
  entrada: string,
  hoje: Date = new Date(),
  opcoes: Opcoes = {},
): Interpretado {
  let texto = entrada;
  const tags: string[] = [];
  let priority: Interpretado['priority'];

  // Do nome normalizado para o nome como a tag existe de verdade: "#Reuniao"
  // precisa devolver "reunião", senão quem chamou procura por um nome que não
  // existe e a tag some sem ninguém perceber.
  const conhecidas = opcoes.tagsConhecidas
    ? new Map(opcoes.tagsConhecidas.map(n => [normalizar(n), n]))
    : null;

  // Tags: #palavra. Aceita acento e hífen, não aceita espaço.
  texto = texto.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, (todo, antes, tag) => {
    let nome = tag.toLowerCase();
    if (conhecidas) {
      const real = conhecidas.get(normalizar(tag));
      if (real === undefined) return todo;
      nome = real;
    }
    if (!tags.includes(nome)) tags.push(nome);
    return antes;
  });

  // Prioridade: !alta. Só a PRIMEIRA vale — duas prioridades é contradição, e
  // adivinhar qual delas a pessoa quis seria chute.
  texto = texto.replace(/(^|\s)!([\p{L}]+)/gu, (todo, antes, palavra) => {
    const chave = normalizar(palavra);
    const achada = PRIORIDADES[chave] ?? PRIORIDADES[palavra.toLowerCase()];
    if (achada && !priority) {
      priority = achada;
      return antes;
    }
    // Palavra desconhecida depois do "!" fica no título: pode ser ênfase de
    // verdade ("!importante" é prioridade, "!urgentíssimo" não é palavra nossa).
    return todo;
  });

  const data = acharData(texto, hoje);
  if (data) texto = texto.replace(data.trecho, ' ');

  return {
    title: texto.replace(/\s+/g, ' ').trim(),
    dueDate: data?.dueDate,
    priority,
    tags,
  };
}
