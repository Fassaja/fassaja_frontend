import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Kbd } from '@/components/common/Kbd';
import { Toggle } from '@/components/common/Toggle';
import {
  DESTINOS_DO_G,
  atalhosLigados,
  definirAtalhosLigados,
  partesDoAtalho,
  plataformaAtual,
} from '@/utils/atalhos';

interface AtalhosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Linha: React.FC<{ teclas: React.ReactNode; children: React.ReactNode }> = ({ teclas, children }) => (
  <li className="flex items-center justify-between gap-4 py-2">
    <span className="text-sm text-text-primary">{children}</span>
    <span className="flex shrink-0 items-center gap-1 text-xs text-text-soft">{teclas}</span>
  </li>
);

const Grupo: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <section>
    <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-text-soft">{titulo}</h3>
    <ul className="divide-y divide-border">{children}</ul>
  </section>
);

/** A lista de atalhos de teclado, aberta com `?` ou pelo menu da conta. */
export const AtalhosModal: React.FC<AtalhosModalProps> = ({ isOpen, onClose }) => {
  const [ligados, setLigados] = useState(atalhosLigados);
  const busca = partesDoAtalho('k', plataformaAtual());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Atalhos de teclado" size="lg">
      <div className="space-y-5">
        <Grupo titulo="Geral">
          <Linha teclas={<Kbd>N</Kbd>}>Nova tarefa</Linha>
          <Linha
            teclas={
              <>
                <Kbd>/</Kbd> ou {busca.map(t => <Kbd key={t}>{t}</Kbd>)}
              </>
            }
          >
            Buscar
          </Linha>
          <Linha teclas={<Kbd>?</Kbd>}>Esta lista</Linha>
          <Linha teclas={<Kbd>Esc</Kbd>}>Fechar janela ou menu</Linha>
        </Grupo>

        <Grupo titulo="Ir para">
          {DESTINOS_DO_G.map(d => (
            <Linha
              key={d.tecla}
              teclas={
                <>
                  <Kbd>G</Kbd> depois <Kbd>{d.tecla.toUpperCase()}</Kbd>
                </>
              }
            >
              {d.nome}
            </Linha>
          ))}
        </Grupo>

        {/* Atalho de uma tecla só pode atrapalhar quem usa leitor de voz ou
            digita com uma mão — por isso tem como desligar (WCAG 2.1.4). O
            Ctrl+K da busca continua valendo sempre. */}
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-bg-secondary px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Atalhos de uma tecla</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Desligue se eles disparam sem querer. A busca por {busca.join(' ')} continua.
            </p>
          </div>
          <Toggle
            checked={ligados}
            onChange={() => {
              setLigados(!ligados);
              definirAtalhosLigados(!ligados);
            }}
            label="Atalhos de uma tecla"
          />
        </div>
      </div>
    </Modal>
  );
};
