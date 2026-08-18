import { useEffect, useRef } from 'react';
import { fusoDoNavegador, reminderService } from '@/services/reminderService';

const CHAVE = 'fassaja_tz_enviado';

/**
 * Garante que o servidor conheça o fuso deste navegador.
 *
 * Sem isso o lembrete de prazo não existe: quem calcula "9h no horário dela" é
 * o servidor, e ele não tem como adivinhar o fuso — o padrão seria Greenwich,
 * que no Brasil avisaria de madrugada. Por isso o cálculo devolve "sem
 * lembrete" enquanto o fuso for desconhecido, e este hook é o que o preenche.
 *
 * Envia uma vez por fuso, guardando o último valor: quem viaja ou muda o
 * relógio do sistema volta a sincronizar, mas o uso normal não gasta uma
 * requisição por carregamento de página.
 */
export function useTimeZoneSync(ativo: boolean): void {
  const enviando = useRef(false);

  useEffect(() => {
    if (!ativo || enviando.current) return;
    const tz = fusoDoNavegador();
    if (!tz) return;

    let anterior: string | null = null;
    try {
      anterior = localStorage.getItem(CHAVE);
    } catch {
      /* localStorage indisponível: envia sempre, que é o lado seguro */
    }
    if (anterior === tz) return;

    enviando.current = true;
    reminderService
      .update({ timeZone: tz })
      .then(() => {
        try {
          localStorage.setItem(CHAVE, tz);
        } catch {
          /* sem persistência: reenvia no próximo carregamento */
        }
      })
      .catch(() => {
        /* silencioso: é sincronização de fundo, não uma ação da pessoa */
      })
      .finally(() => {
        enviando.current = false;
      });
  }, [ativo]);
}
