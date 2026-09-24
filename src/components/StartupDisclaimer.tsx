import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, CheckCircle2, CheckSquare, Square } from 'lucide-react';

interface StartupDisclaimerProps {
  onComplete: () => void;
}

export const StartupDisclaimer: React.FC<StartupDisclaimerProps> = ({ onComplete }) => {
  const [show, setShow] = useState<boolean>(true);
  const [check1, setCheck1] = useState<boolean>(false);
  const [check2, setCheck2] = useState<boolean>(false);

  const handleAccept = () => {
    if (check1 && check2) {
      setShow(false);
    }
  };

  const handleAnimationComplete = () => {
    if (!show) {
      onComplete();
    }
  };

  const canContinue = check1 && check2;

  return (
    <AnimatePresence onExitComplete={handleAnimationComplete}>
      {show && (
        <motion.div
          id="startup-disclaimer-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md text-white p-4 select-none touch-none overflow-hidden"
        >
          {/* Ambient Background Glow (Blue trust accent) */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12)_0%,transparent_70%)] pointer-events-none" />

          {/* Professional Contract Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative max-w-2xl w-full flex flex-col max-h-[90vh] p-6 sm:p-8 rounded-[2rem] bg-slate-900/90 border border-slate-800/80 backdrop-blur-2xl shadow-2xl shadow-blue-950/20 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
                <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  TÉMINOS Y CONDICIONES DE USO Y EXONERACIÓN DE RESPONSABILIDAD
                </h1>
                <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mt-0.5">
                  CONTRATO LEGAL OBLIGATORIO
                </p>
              </div>
            </div>

            {/* Scrollable Contract Text */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-left text-xs text-slate-300 font-normal leading-relaxed scrollbar-thin select-text mb-5 border border-slate-800/60 bg-slate-950/40 p-4 rounded-2xl">
              <p className="font-bold text-slate-200">
                POR FAVOR, LEA ESTE CONTRATO DETENIDAMENTE. AL PRESIONAR ACEPTO, USTED DECLARA QUE CUMPLE CON LOS REQUISITOS DE EDAD Y ASUME TODA LA RESPONSABILIDAD LEGAL DE SUS ACCIONES DENTRO DEL JUEGO.
              </p>

              <div className="space-y-3">
                <div>
                  <h3 className="font-black text-white uppercase text-[11px] mb-1">1. REQUISITO DE EDAD ESTRICTO (+18)</h3>
                  <p>El acceso a este videojuego está estrictamente prohibido para menores de 18 años. Al aceptar este acuerdo, usted declara bajo juramento que tiene la mayoría de edad legal en su país de residencia. Si usted miente sobre su edad, asume de forma exclusiva toda la responsabilidad civil, penal y legal derivada de dicha falsedad.</p>
                </div>

                <div>
                  <h3 className="font-black text-white uppercase text-[11px] mb-1">2. ADVERTENCIA DE CONTENIDO EXPLÍCITO Y ADULTO</h3>
                  <p className="mb-1.5">Este videojuego es una obra de ficción para adultos que contiene:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    <li>Violencia extrema y realista, representaciones de sangre, gore y situaciones explícitas de combate.</li>
                    <li>Contenido erótico y sexual explícito.</li>
                    <li>Mecánicas de sumisión, dominación y coacción de personajes, donde los avatares pueden verse forzados o condicionados a realizar actos de naturaleza sexual o violenta como parte de las dinámicas del juego.</li>
                  </ul>
                  <p className="mt-1.5">Al continuar, usted reconoce estar plenamente informado de la naturaleza del contenido y acepta exponerse a él de manera voluntaria, consciente y bajo su propio criterio.</p>
                </div>

                <div>
                  <h3 className="font-black text-white uppercase text-[11px] mb-1">3. EXONERACIÓN DE RESPONSABILIDAD EN EL MODO MULTIJUGADOR</h3>
                  <p className="mb-1.5">El Desarrollador ofrece una plataforma de simulación virtual. Las interacciones entre usuarios en el modo multijugador, incluyendo actos ficticios de coacción, agresiones o conductas consideradas indebidas entre avatares, son estrictamente simuladas y limitadas al entorno virtual. En consecuencia:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    <li>El Desarrollador, la empresa, sus administradores y moderadores quedan totalmente libres de responsabilidad legal, penal, civil o moral por las acciones que un jugador decida realizar contra el personaje de otro jugador o contra el avatar de un administrador.</li>
                    <li>Ninguna interacción dentro del juego podrá ser interpretada como un delito de la vida real ni genera derecho a reclamar indemnizaciones por daños psicológicos, morales o emocionales.</li>
                    <li>Los administradores se reservan el derecho de sancionar o expulsar a usuarios que violen las normas técnicas o de convivencia del servidor, sin que esto genere derecho a reembolso.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-black text-white uppercase text-[11px] mb-1">4. LÍMITE DE RESPONSABILIDAD (CLÁUSULA TAL CUAL)</h3>
                  <p>El software se entrega tal cual es, sin garantías de ningún tipo. El Desarrollador no se hace responsable de las opiniones, chats, conductas o abusos que los usuarios cometan utilizando las herramientas del juego. La responsabilidad del uso de las funciones multijugador recae única y exclusivamente en el usuario final.</p>
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2.5 mb-5 shrink-0">
              <label 
                onClick={() => setCheck1(!check1)}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 cursor-pointer transition-colors select-none text-left"
              >
                <div className="mt-0.5 text-blue-500 shrink-0">
                  {check1 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-zinc-500" />}
                </div>
                <span className="text-xs font-bold text-slate-200 leading-snug">
                  - Declaro bajo juramento que tengo 18 años o más.
                </span>
              </label>

              <label 
                onClick={() => setCheck2(!check2)}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 cursor-pointer transition-colors select-none text-left"
              >
                <div className="mt-0.5 text-blue-500 shrink-0">
                  {check2 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-zinc-500" />}
                </div>
                <span className="text-xs font-bold text-slate-200 leading-snug">
                  - He leído y acepto los Términos y Condiciones de Uso y Exoneración de Responsabilidad.
                </span>
              </label>
            </div>

            {/* Action Button */}
            <button
              disabled={!canContinue}
              onClick={handleAccept}
              className={`w-full py-3.5 px-6 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${
                canContinue
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-98 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aceptar y Continuar al Sistema</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

