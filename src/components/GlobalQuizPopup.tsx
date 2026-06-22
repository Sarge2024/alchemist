import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { QA_DATA } from './QuizPopups';

const POPUP_INTERVAL = 10 * 60 * 1000; // 10 minutes in ms
const MAX_POPUPS_PER_SESSION = 2;
const STORAGE_KEY = 'global_quiz_popup_count';

export function GlobalQuizPopup() {
  const { user } = useAuth();
  const [currentQA, setCurrentQA] = useState<{ question: string; answer: string } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only run if user is logged in
    if (!user) return;

    // Check how many popups have been shown in this session
    const getPopupCount = () => parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10);

    let popupCount = getPopupCount();
    if (popupCount >= MAX_POPUPS_PER_SESSION) {
      return; // Already showed the max amount for this session
    }

    const intervalId = setInterval(() => {
      popupCount = getPopupCount();
      
      if (popupCount < MAX_POPUPS_PER_SESSION && !isVisible) {
        // Pick a random question
        const randomItem = QA_DATA[Math.floor(Math.random() * QA_DATA.length)];
        setCurrentQA(randomItem);
        setShowAnswer(false);
        setIsVisible(true);
        
        // Update session count
        sessionStorage.setItem(STORAGE_KEY, (popupCount + 1).toString());
      } else if (popupCount >= MAX_POPUPS_PER_SESSION) {
        clearInterval(intervalId);
      }
    }, POPUP_INTERVAL);

    return () => clearInterval(intervalId);
  }, [user, isVisible]);

  if (!isVisible || !currentQA) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
        className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-amber-100 overflow-hidden"
      >
        <div className="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-100">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-900">Dica Preciosa</span>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 p-1 rounded-full transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-slate-800 font-medium leading-relaxed mb-4">
            {currentQA.question}
          </p>

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <span>Mostrar Resposta</span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-3 border-t border-slate-100 mt-2"
            >
              <p className="text-slate-600 leading-relaxed text-sm">
                {currentQA.answer}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
