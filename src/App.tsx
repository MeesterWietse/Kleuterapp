import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Star, Volume2, ArrowLeft, Sparkles, BookOpen, Target, Puzzle, Mic } from 'lucide-react';

const BODY_PARTS = [
  { id: 'haar', name: 'het haar' },
  { id: 'arm', name: 'de arm' },
  { id: 'been', name: 'het been' },
  { id: 'buik', name: 'de buik' },
  { id: 'mond', name: 'de mond' },
  { id: 'neus', name: 'de neus' },
  { id: 'oor', name: 'het oor' },
];

const PUZZLE_PIECES = [
  { id: 'buik', name: 'de buik' },
  { id: 'hoofd', name: 'het hoofd' },
  { id: 'arm_l', name: 'de arm' },
  { id: 'arm_r', name: 'de arm' },
  { id: 'been_l', name: 'het been' },
  { id: 'been_r', name: 'het been' },
];

export default function App() {
  const [gameState, setGameState] = useState('start'); // 'start', 'mode-select', 'playing', 'celebration'
  const [gameMode, setGameMode] = useState('quiz'); // 'learn', 'quiz', 'puzzle'
  const [character, setCharacter] = useState('tom');
  
  const [currentTarget, setCurrentTarget] = useState(null);
  const [feedback, setFeedback] = useState('none');
  const [highlightedPart, setHighlightedPart] = useState(null); 
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [score, setScore] = useState(0);
  const [learnText, setLearnText] = useState('Klik op mij!');
  
  // Puzzel state
  const [placedPieces, setPlacedPieces] = useState([]);

  // Anti-zoom en scroll voor mobiel (native app feel)
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta') as HTMLMetaElement;
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    
    // Voorkom pull-to-refresh op mobiele browsers
    document.body.style.overscrollBehaviorY = 'contain';
  }, []);

  const speak = useCallback((text, onEnd = () => {}) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop vorige spraak
      const utterance = new SpeechSynthesisUtterance(text);
      
      const voices = window.speechSynthesis.getVoices();
      // Zoek een Vlaamse stem indien beschikbaar
      const flemishVoice = voices.find(v => v.lang === 'nl-BE' || v.lang === 'nl_BE');
      
      utterance.lang = 'nl-BE'; 
      if (flemishVoice) utterance.voice = flemishVoice;
      
      // Iets trager en hoger voor kindvriendelijker geluid
      utterance.rate = 0.85; 
      utterance.pitch = 1.1; 

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd();
      };
      
      // Fallback als onend niet vuurt (bekende bug in sommige mobiele browsers)
      setTimeout(() => setIsSpeaking(false), text.length * 150);

      window.speechSynthesis.speak(utterance);
    } else {
      onEnd();
    }
  }, []);

  // Laad stemmen alvast in
  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
  }, []);

  const selectCharacter = (selectedChar) => {
    setCharacter(selectedChar);
    setGameState('mode-select');
    // Activeer audio engine (nodig op Safari iOS zonder user interactie restricties)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    }
  };

  const startGame = (mode) => {
    setGameMode(mode);
    setScore(0);
    setGameState('playing');
    setLearnText('Klik op mij!');
    setHighlightedPart(null);
    setFeedback('none');
    setPlacedPieces([]);

    if (mode === 'quiz') {
      nextQuestion();
    } else if (mode === 'learn') {
      setTimeout(() => speak('Klik op een lichaamsdeel!'), 500);
    } else if (mode === 'puzzle') {
      setTimeout(() => speak('Maak de puzzel!'), 500);
    }
  };

  const nextQuestion = useCallback((previousTargetId = null) => {
    let availableParts = BODY_PARTS;
    if (previousTargetId) {
      // Voorkom direct dezelfde vraag twee keer na elkaar
      availableParts = BODY_PARTS.filter(p => p.id !== previousTargetId);
    }
    
    const randomPart = availableParts[Math.floor(Math.random() * availableParts.length)];
    setCurrentTarget(randomPart);
    setFeedback('none');
    setHighlightedPart(null);
    
    setTimeout(() => {
      speak(`Waar is ${randomPart.name}?`);
    }, 500);
  }, [speak]);

  const repeatQuestion = () => {
    if (gameMode === 'quiz' && currentTarget) {
      speak(`Waar is ${currentTarget.name}?`);
    } else if (gameMode === 'learn') {
      speak('Klik op een lichaamsdeel!');
    } else if (gameMode === 'puzzle') {
      speak('Sleep het stukje naar boven!');
    }
  };

  const handlePartClick = (partId) => {
    // Negeer clicks tijdens animaties of in puzzelmodus
    if (feedback === 'success' || gameMode === 'puzzle') return;

    if (partId === 'achtergrond') {
      if (gameMode === 'quiz') {
        setFeedback('error');
        speak('Probeer nog eens!');
        setTimeout(() => setFeedback('none'), 800);
      }
      return;
    }

    const clickedPartObj = BODY_PARTS.find(p => p.id === partId);
    const clickedPartName = clickedPartObj ? clickedPartObj.name : 'dat';

    if (gameMode === 'learn') {
      setHighlightedPart(partId);
      // Gebruik title case voor de tekst op het scherm
      setLearnText(clickedPartName.charAt(0).toUpperCase() + clickedPartName.slice(1));
      speak(clickedPartName);
      setTimeout(() => setHighlightedPart(null), 2500);
      return;
    }

    if (gameMode === 'quiz') {
      if (partId === currentTarget.id) {
        setFeedback('success');
        setHighlightedPart(partId); 
        
        const newScore = score + 1;
        setScore(newScore);

        if (newScore >= 7) {
          speak('Wauw! Je hebt alles gevonden! Super!');
          setTimeout(() => setGameState('celebration'), 2500);
        } else {
          const complimenten = ['Goed zo!', 'Super!', 'Heel goed!', 'Geweldig!', 'Knap gedaan!'];
          speak(complimenten[Math.floor(Math.random() * complimenten.length)]);
          setTimeout(() => nextQuestion(currentTarget.id), 3000);
        }
      } else {
        setFeedback('error');
        setHighlightedPart(partId); 
        speak(`Oeps, dat is ${clickedPartName}. Waar is ${currentTarget.name}?`);
        setTimeout(() => {
          setFeedback('none');
          setHighlightedPart(null);
        }, 2000);
      }
    }
  };

  const handlePuzzleDrop = () => {
    const currentPiece = PUZZLE_PIECES[placedPieces.length];
    const newPlaced = [...placedPieces, currentPiece.id];
    setPlacedPieces(newPlaced);
    
    const complimenten = ['Jep!', 'Past!', 'Mooi zo!', 'Knap!'];
    speak(complimenten[Math.floor(Math.random() * complimenten.length)]);

    if (newPlaced.length === PUZZLE_PIECES.length) {
      setTimeout(() => {
        speak('Hoera! De puzzel is klaar!');
        setGameState('celebration');
      }, 1500);
    }
  };

  return (
    <div className="flex justify-center bg-gray-900 min-h-[100dvh] font-sans touch-none select-none overscroll-none">
      <div className="w-full max-w-md bg-gradient-to-b from-sky-100 to-sky-300 h-[100dvh] relative overflow-hidden flex flex-col shadow-2xl">
        
        {/* Globale styles voor animaties en anti-select */}
        <style dangerouslySetInnerHTML={{__html: `
          html, body { 
            touch-action: none !important; 
            overscroll-behavior: none !important; 
            -webkit-user-select: none; 
            user-select: none; 
          }
          @keyframes popIn {
            0% { transform: scale(0.1) rotate(-15deg); opacity: 0; }
            70% { transform: scale(1.2) rotate(10deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          .animate-pop { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          
          @keyframes pulse-highlight {
            0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 255, 255, 1)); transform: scale(1.05); }
            50% { filter: drop-shadow(0 0 35px rgba(250, 204, 21, 1)); transform: scale(1.12); }
          }
          .highlight-active { 
            animation: pulse-highlight 1.5s infinite ease-in-out;
            z-index: 50;
          }
          
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
          }
          .animate-bounce-slow { animation: bounce-slow 2s infinite ease-in-out; }

          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-10px) rotate(-3deg); }
            40%, 80% { transform: translateX(10px) rotate(3deg); }
          }
          .animate-shake { animation: shake 0.5s ease-in-out; }

          @keyframes soundwaves {
            0% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.4); }
            70% { box-shadow: 0 0 0 15px rgba(14, 165, 233, 0); }
            100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); }
          }
          .animate-soundwaves { animation: soundwaves 1s infinite; }
          
          @keyframes blink {
            0%, 94%, 98%, 100% { transform: scaleY(1); }
            96% { transform: scaleY(0.1); }
          }
          .animate-blink { animation: blink 4.5s infinite; }
          
          .btn-3d {
            border-bottom-width: 6px;
            transition: all 0.1s;
          }
          .btn-3d:active {
            border-bottom-width: 0px;
            transform: translateY(6px);
          }
        `}} />

        {/* --- START SCHERM --- */}
        {gameState === 'start' && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6 relative">
            <div className="absolute top-10 left-10 text-white/20"><Sparkles size={60} /></div>
            <div className="absolute bottom-20 right-10 text-sky-400/30"><Target size={80} /></div>
            
            <h1 className="text-5xl font-extrabold text-sky-900 mb-2 tracking-tight drop-shadow-md">
              Mijn <br/><span className="text-white drop-shadow-xl text-6xl block mt-2">Lichaam</span>
            </h1>
            <p className="text-sky-800 text-xl font-bold bg-white/70 px-6 py-3 rounded-full mb-6 shadow-sm border-2 border-white">
              Kies je vriendje!
            </p>
            
            <div className="grid grid-cols-1 gap-5 w-full max-w-[260px] z-10">
              <button 
                onClick={() => selectCharacter('tom')} 
                className="btn-3d bg-white p-3 rounded-3xl border-sky-300 border-x-2 border-t-2 border-b-sky-400 hover:bg-sky-50 flex items-center justify-between"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-blue-200">
                  <div className="w-full h-full pt-4 pointer-events-none"><KidSVG character="tom" isIcon={true} viewBoxOverride="20 0 160 120" /></div>
                </div>
                <span className="text-2xl font-extrabold text-gray-700 mr-6">Tom</span>
              </button>

              <button 
                onClick={() => selectCharacter('lisa')} 
                className="btn-3d bg-white p-3 rounded-3xl border-pink-300 border-x-2 border-t-2 border-b-pink-400 hover:bg-pink-50 flex items-center justify-between"
              >
                <div className="w-16 h-16 bg-pink-100 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-pink-200">
                  <div className="w-full h-full pt-4 pointer-events-none"><KidSVG character="lisa" isIcon={true} viewBoxOverride="20 0 160 120" /></div>
                </div>
                <span className="text-2xl font-extrabold text-gray-700 mr-6">Lisa</span>
              </button>

              <button 
                onClick={() => selectCharacter('beer')} 
                className="btn-3d bg-white p-3 rounded-3xl border-amber-300 border-x-2 border-t-2 border-b-amber-400 hover:bg-amber-50 flex items-center justify-between"
              >
                <div className="w-16 h-16 bg-amber-100 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-amber-200">
                  <div className="w-full h-full pt-4 pointer-events-none"><KidSVG character="beer" isIcon={true} viewBoxOverride="20 0 160 120" /></div>
                </div>
                <span className="text-2xl font-extrabold text-gray-700 mr-6">Bram</span>
              </button>
            </div>
          </div>
        )}

        {/* --- MODUS KIEZEN --- */}
        {gameState === 'mode-select' && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6">
            <div className="w-32 h-32 bg-white rounded-full shadow-2xl flex items-center justify-center mb-4 border-4 border-white animate-bounce-slow">
              <div className="w-full h-full pt-4 pointer-events-none"><KidSVG character={character} isIcon={true} viewBoxOverride="20 0 160 120" /></div>
            </div>
            
            <p className="text-sky-900 text-3xl font-extrabold bg-white/40 px-6 py-2 rounded-full shadow-sm">Wat wil je doen?</p>
            
            <div className="flex flex-col gap-4 w-full max-w-[280px]">
              <button onClick={() => startGame('learn')} className="btn-3d bg-blue-500 border-blue-600 text-white p-4 rounded-3xl flex items-center gap-4 border-t-2 border-x-2">
                <div className="bg-white/20 p-2 rounded-xl"><BookOpen size={32} /></div>
                <div className="text-left flex-1"><div className="text-2xl font-extrabold mt-1">Ik Leer</div><div className="text-sm font-medium text-blue-100 leading-tight pb-1">Klik en luister</div></div>
              </button>
              
              <button onClick={() => startGame('quiz')} className="btn-3d bg-green-500 border-green-600 text-white p-4 rounded-3xl flex items-center gap-4 border-t-2 border-x-2">
                <div className="bg-white/20 p-2 rounded-xl"><Target size={32} /></div>
                <div className="text-left flex-1"><div className="text-2xl font-extrabold mt-1">Ik Zoek</div><div className="text-sm font-medium text-green-100 leading-tight pb-1">Test je kennis</div></div>
              </button>
              
              <button onClick={() => startGame('puzzle')} className="btn-3d bg-purple-500 border-purple-600 text-white p-4 rounded-3xl flex items-center gap-4 border-t-2 border-x-2">
                <div className="bg-white/20 p-2 rounded-xl"><Puzzle size={32} /></div>
                <div className="text-left flex-1"><div className="text-2xl font-extrabold mt-1">Ik Puzzel</div><div className="text-sm font-medium text-purple-100 leading-tight pb-1">Maak mij heel</div></div>
              </button>
            </div>
            
            <button onClick={() => setGameState('start')} className="mt-6 text-sky-800 font-extrabold flex items-center gap-2 bg-white/50 px-5 py-3 rounded-full btn-3d border-sky-300 border-x-2 border-t-2 border-b-sky-400">
              <ArrowLeft size={22} strokeWidth={3} /> Vriendje wisselen
            </button>
          </div>
        )}

        {/* --- SPEEL MODUS --- */}
        {gameState === 'playing' && (
          <div className="flex-1 flex flex-col h-full relative">
            {/* Top Bar met vaste hoogte */}
            <div className="bg-white/95 backdrop-blur-md shadow-lg p-4 rounded-b-3xl z-10 sticky top-0">
              <div className="flex justify-between items-center mb-3">
                <button onClick={() => setGameState('mode-select')} className="p-2 text-sky-600 bg-sky-100 rounded-full active:scale-90 transition">
                  <ArrowLeft size={24} strokeWidth={3} />
                </button>
                
                {/* Score Indicator Quiz */}
                {gameMode === 'quiz' && (
                  <div className="flex gap-1 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="relative">
                        <Star size={24} className="text-gray-200 fill-gray-200" />
                        {i < score && (
                          <Star 
                            size={24} 
                            className="absolute top-0 left-0 text-yellow-400 fill-yellow-400 animate-pop origin-center" 
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Labels Editie */}
                {gameMode === 'learn' && <div className="flex items-center gap-2 text-blue-600 font-extrabold bg-blue-100 px-4 py-2 rounded-full"><BookOpen size={20} /> LEREN</div>}
                {gameMode === 'puzzle' && <div className="flex items-center gap-2 text-purple-600 font-extrabold bg-purple-100 px-4 py-2 rounded-full"><Puzzle size={20} /> PUZZELEN</div>}
              </div>

              {/* Vraag / Command balk */}
              <div className="flex items-center justify-between bg-sky-50 rounded-2xl p-2 border-2 border-sky-100 relative overflow-hidden">
                <div className="flex-1 px-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-sky-900 text-center">
                    {gameMode === 'quiz' && <>Waar is <span className="text-green-600 underline decoration-4 underline-offset-4">{currentTarget?.name}</span>?</>}
                    {gameMode === 'learn' && <span className="text-blue-600 line-clamp-1">{learnText}</span>}
                    {gameMode === 'puzzle' && <span className="text-purple-600">Sleep het puzzelstuk!</span>}
                  </h2>
                </div>
                
                {/* Luidspreker knop met spreek-animatie */}
                <button 
                  onClick={repeatQuestion} 
                  className={`p-3 bg-sky-200 rounded-full text-sky-700 active:scale-90 transition ${isSpeaking ? 'animate-soundwaves' : ''}`}
                >
                  <Volume2 size={32} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Speelveld / SVG Container */}
            <div className={`flex-1 flex items-end justify-center relative px-2 pt-4 ${gameMode === 'puzzle' ? 'pb-40' : 'pb-8'}`}>
              <KidSVG 
                character={character} 
                onPartClick={handlePartClick} 
                feedback={gameMode === 'quiz' ? feedback : 'none'}
                highlightedPart={highlightedPart}
                puzzleMode={gameMode === 'puzzle'}
                placedPieces={placedPieces}
              />
              {/* Grond/Schaduw visual box onder de voetjes */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-sky-400/30 to-transparent -z-10 pointer-events-none" />
            </div>

            {/* Draggable Puzzelstukje (alleen in puzzle modus, vast beneden) */}
            {gameMode === 'puzzle' && placedPieces.length < PUZZLE_PIECES.length && (
              <div className="absolute bottom-0 left-0 right-0 h-40 bg-white/60 backdrop-blur-sm rounded-t-[3rem] border-t-4 border-purple-200 flex justify-center items-center z-40 pb-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                <DraggablePiece 
                  pieceId={PUZZLE_PIECES[placedPieces.length].id} 
                  pieceName={PUZZLE_PIECES[placedPieces.length].name}
                  character={character} 
                  onDrop={handlePuzzleDrop} 
                  speak={speak}
                />
              </div>
            )}

            {/* Grote Feedback Animatie over de volledige UI */}
            {feedback === 'success' && score < 7 && gameMode === 'quiz' && (
              <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-white/20 backdrop-blur-[2px]">
                <div className="animate-pop">
                  <Star size={200} className="text-yellow-400 drop-shadow-[0_0_40px_rgba(250,204,21,0.6)]" fill="#facc15" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- FEEST SCHERM --- */}
        {gameState === 'celebration' && (
          <div className="absolute inset-0 bg-gradient-to-b from-green-400 to-sky-500 z-50 flex flex-col items-center justify-center p-6 text-center">
            
            {/* Animating confetti/sparkles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <Sparkles size={60} className="absolute top-20 left-10 text-white animate-pulse" />
              <Star size={40} className="absolute top-40 right-10 text-yellow-300 fill-yellow-300 animate-bounce-slow" />
              <Puzzle size={50} className="absolute bottom-40 left-12 text-purple-300 animate-pop" />
              <Target size={40} className="absolute bottom-20 right-16 text-green-300 animate-pulse" />
            </div>

            <div className="animate-bounce-slow mb-10 relative z-10">
              <div className="absolute -inset-4 bg-yellow-300 rounded-full blur-2xl opacity-60 animate-pulse"></div>
              <div className="w-64 h-64 bg-white rounded-full shadow-2xl flex items-center justify-center border-8 border-yellow-300 relative z-10">
                 <div className="w-full h-full pt-5 pointer-events-none"><KidSVG character={character} isIcon={true} viewBoxOverride="20 0 160 120" /></div>
              </div>
            </div>
            
            <h2 className="text-6xl font-black text-white drop-shadow-lg mb-2 tracking-wide uppercase z-10">JOEPIE!</h2>
            <p className="text-3xl text-yellow-100 font-extrabold mb-12 drop-shadow-md z-10">Jij wint de beker!</p>
            
            <div className="flex flex-col gap-5 w-full max-w-[280px] z-10">
              <button 
                onClick={() => startGame(gameMode)} 
                className="btn-3d bg-white border-gray-200 border-x-2 border-t-2 text-green-600 text-2xl font-black py-4 px-8 rounded-full flex justify-center items-center gap-3"
              >
                <Play fill="currentColor" /> Nog een keer speeltijd!
              </button>
              <button 
                onClick={() => setGameState('mode-select')} 
                className="btn-3d bg-sky-600 border-sky-700 border-x-2 border-t-2 text-white text-xl font-bold py-4 px-8 rounded-full"
              >
                Kies een ander spelletje
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// DRAGGABLE PUZZELSTUK COMPONENT
// ==========================================
const DraggablePiece = ({ pieceId, pieceName, character, onDrop, speak }) => {
  const [renderPos, setRenderPos] = useState({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    isDragging.current = true;
    startPos.current = { x: e.clientX - renderPos.x, y: e.clientY - renderPos.y };
    speak(pieceName); // Lees voor wat we vastpakken
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    setRenderPos({
      x: e.clientX - startPos.current.x,
      y: e.clientY - startPos.current.y
    });
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    // Visuele marge: als het stukje uit de witte opvangbak onderaan is gesleept (y < -120px) klopt het
    if (renderPos.y < -120) {
      onDrop();
    }
    // Altijd snapback animatie terug naar startpunt in de bak indien fout, of onzichtbaar weghalen indien juist
    setRenderPos({ x: 0, y: 0 });
  };

  const viewBoxes = {
    'hoofd': "30 -10 140 140",
    'buik': "40 110 120 120",
    'arm_l': "-10 120 90 140",
    'arm_r': "120 120 90 140",
    'been_l': "40 200 60 140",
    'been_r': "100 200 60 140",
  };

  return (
    <div 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      // Gevlinder om het vloeiend te laten volgen tijdens het slepen. Transition enkel instellen na loslaten voor snapback
      style={{ 
        transform: `translate(${renderPos.x}px, ${renderPos.y}px)`, 
        touchAction: 'none',
        transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
      }}
      className={`relative w-32 h-32 bg-white rounded-[2rem] shadow-[0_15px_30px_rgba(0,0,0,0.15)] border-4 ${isDragging.current ? 'border-purple-500 scale-125 z-50 shadow-[0_20px_40px_rgba(0,0,0,0.3)]' : 'border-purple-300 scale-100'} cursor-grab active:cursor-grabbing flex items-center justify-center`}
    >
      <div className="absolute -top-3 -right-3 bg-purple-500 rounded-full p-1 text-white shadow-md animate-bounce-slow">
        <ArrowLeft size={16} className="rotate-90" strokeWidth={4} />
      </div>
      <div className="w-full h-full p-2 pointer-events-none">
        <KidSVG character={character} isolatePart={pieceId} isIcon={true} viewBoxOverride={viewBoxes[pieceId]} />
      </div>
    </div>
  );
};

// ==========================================
// SVG FIGUREN (MET HITBOXES & PUZZEL LOGICA)
// ==========================================
const KidSVG = ({ 
  character = 'tom', 
  onPartClick = (partId: any)=>{}, 
  feedback = 'none', 
  highlightedPart = null, 
  isIcon = false,
  puzzleMode = false,
  placedPieces = [] as string[],
  isolatePart = null as string | null, 
  viewBoxOverride = null as string | null
}: any) => {
  const handleClick = (e, part) => {
    e.stopPropagation();
    onPartClick(part);
  };

  const getHighlightClass = (part) => {
    return highlightedPart === part && !isIcon && !puzzleMode ? 'highlight-active relative' : '';
  };

  const isDimmed = (puzzleId, targetId = puzzleId) => {
    if (isolatePart) return isolatePart !== puzzleId;
    if (puzzleMode) return !placedPieces.includes(puzzleId);
    
    if (highlightedPart && !isIcon) {
      if (puzzleId === 'hoofd' && targetId === 'hoofd' && ['hoofd', 'neus', 'mond', 'oor', 'haar'].includes(highlightedPart)) {
        return false;
      }
      return highlightedPart !== targetId;
    }
    return false;
  };

  const getStyle = (puzzleId, targetId = puzzleId) => {
    if (isolatePart && isolatePart !== puzzleId) return { display: 'none' };
    if (puzzleMode && !placedPieces.includes(puzzleId)) {
      // Het silhouet in puzzel modus
      return { filter: 'brightness(0)', opacity: 0.08, pointerEvents: 'none' }; 
    }
    return { opacity: isDimmed(puzzleId, targetId) ? 0.05 : 1, transition: 'all 0.4s ease' };
  };

  const theme = {
    huid: character === 'beer' ? '#b45309' : '#fed7aa',
    huidShadow: character === 'beer' ? '#92400e' : '#f8b492',
    wang: character === 'beer' ? '#78350f' : '#f87171',
    buik: character === 'tom' ? '#3b82f6' : character === 'lisa' ? '#ec4899' : '#78350f',
    been: character === 'tom' ? '#1e3a8a' : character === 'lisa' ? '#fed7aa' : '#b45309',
    arm: character === 'tom' ? '#3b82f6' : character === 'lisa' ? '#fed7aa' : '#b45309',
    schoen: character === 'beer' ? '#78350f' : character === 'lisa' ? '#be185d' : '#f59e0b',
    haar: character === 'beer' ? '#78350f' : character === 'lisa' ? '#d97706' : '#451a03',
  };

  const renderInteractiveGroup = (targetId, puzzleId, origin, children, hitboxes) => {
    const isTargetHighlighted = getHighlightClass(targetId);
    return (
      <g 
        onClick={(e) => !isIcon && !puzzleMode && handleClick(e, targetId)} 
        // Activeer shake op DEZE group als hij fout was
        className={`${!isIcon && !puzzleMode ? 'cursor-pointer group hover:brightness-110 active:scale-95 transition-transform' : ''} ${isTargetHighlighted} ${feedback==='error' && highlightedPart===targetId ? 'animate-shake' : ''}`}
        style={{ transformOrigin: origin, ...getStyle(puzzleId, targetId) }}
      >
        {children}
        {/* Onzichtbare hitbox om vinger-klikken makkelijker te maken op een scherm */}
        {!isIcon && !puzzleMode && hitboxes}
      </g>
    );
  };

  return (
    <svg 
      viewBox={viewBoxOverride || "0 -20 200 390"} 
      // Globale shake van het mannetje als men op de (foute) achtergrond klikt
      className={`w-full h-full max-h-[75vh] drop-shadow-2xl ${feedback === 'error' && highlightedPart===null && !isIcon && !puzzleMode ? 'animate-shake' : ''}`} 
      onClick={(e) => !isIcon && !puzzleMode && handleClick(e, 'achtergrond')}
      style={{ overflow: 'visible', pointerEvents: 'auto' }}
    >
      
      {/* ================= ARMEN ================= */}
      {renderInteractiveGroup('arm', 'arm_l', '40px 145px', (
        <>
          <rect x="25" y="145" width="28" height="85" rx="14" fill={theme.arm} transform="rotate(20 40 145)" />
          {/* Schaduw aan binnenkant arm */}
          <rect x="20" y="145" width="10" height="85" rx="5" fill="#000" opacity="0.1" transform="rotate(20 40 145)" />
          {character === 'tom' && <path d="M 30 200 L 55 190" stroke="#1e3a8a" strokeWidth="4" opacity="0.3" transform="rotate(20 40 145)"/>}
          <circle cx="20" cy="225" r="14" fill={theme.huid} />
          <path d="M 12 230 Q 20 235 28 230" stroke="rgba(0,0,0,0.1)" strokeWidth="2" fill="none" />
          {/* Handvormen: duim */}
          <circle cx="30" cy="223" r="5" fill={theme.huidShadow} />
          {character === 'beer' && <circle cx="20" cy="225" r="6" fill="#fcd34d" opacity="0.8"/>}
        </>
      ), <rect x="0" y="140" width="50" height="110" fill="transparent" /> )}

      {renderInteractiveGroup('arm', 'arm_r', '160px 145px', (
        <>
          <rect x="147" y="145" width="28" height="85" rx="14" fill={theme.arm} transform="rotate(-20 160 145)" />
          {/* Schaduw aan binnenkant arm */}
          <rect x="170" y="145" width="10" height="85" rx="5" fill="#000" opacity="0.1" transform="rotate(-20 160 145)" />
          {character === 'tom' && <path d="M 145 190 L 170 200" stroke="#1e3a8a" strokeWidth="4" opacity="0.3" transform="rotate(-20 160 145)"/>}
          <circle cx="180" cy="225" r="14" fill={theme.huid} />
          <path d="M 172 230 Q 180 235 188 230" stroke="rgba(0,0,0,0.1)" strokeWidth="2" fill="none" />
          {/* Handvormen: duim */}
          <circle cx="170" cy="223" r="5" fill={theme.huidShadow} />
          {character === 'beer' && <circle cx="180" cy="225" r="6" fill="#fcd34d" opacity="0.8"/>}
        </>
      ), <rect x="150" y="140" width="50" height="110" fill="transparent" /> )}


      {/* ================= BENEN ================= */}
      {renderInteractiveGroup('been', 'been_l', '75px 250px', (
        <>
          <rect x="65" y="210" width="30" height="110" rx="10" fill={theme.been} />
          {character !== 'beer' && <path d="M 75 260 Q 80 265 85 260" stroke="#000" strokeWidth="1.5" opacity="0.2" fill="none"/>}
          <ellipse cx="75" cy="325" rx="22" ry="16" fill={theme.schoen} />
          <ellipse cx="75" cy="336" rx="22" ry="5" fill="rgba(0,0,0,0.2)" /> {/* Zool */}
          {character === 'tom' && <ellipse cx="75" cy="333" rx="22" ry="6" fill="#fff" />}
          {character === 'lisa' && <rect x="60" y="318" width="30" height="4" fill="#831843" transform="rotate(-10 75 320)"/>}
          {character === 'beer' && <><circle cx="65" cy="330" r="4" fill="#fcd34d"/><circle cx="85" cy="330" r="4" fill="#fcd34d"/></>}
        </>
      ), <rect x="50" y="210" width="50" height="140" fill="transparent" /> )}

      {renderInteractiveGroup('been', 'been_r', '125px 250px', (
        <>
          <rect x="105" y="210" width="30" height="110" rx="10" fill={theme.been} />
          {character !== 'beer' && <path d="M 115 260 Q 120 265 125 260" stroke="#000" strokeWidth="1.5" opacity="0.2" fill="none"/>}
          <ellipse cx="125" cy="325" rx="22" ry="16" fill={theme.schoen} />
          <ellipse cx="125" cy="336" rx="22" ry="5" fill="rgba(0,0,0,0.2)" /> {/* Zool */}
          {character === 'tom' && <ellipse cx="125" cy="333" rx="22" ry="6" fill="#fff" />}
          {character === 'lisa' && <rect x="110" y="318" width="30" height="4" fill="#831843" transform="rotate(10 125 320)"/>}
          {character === 'beer' && <><circle cx="115" cy="330" r="4" fill="#fcd34d"/><circle cx="135" cy="330" r="4" fill="#fcd34d"/></>}
        </>
      ), <rect x="100" y="210" width="50" height="140" fill="transparent" /> )}


      {/* ================= BUIK ================= */}
      {renderInteractiveGroup('buik', 'buik', '100px 180px', (
        <>
          {character === 'lisa' ? (
            <>
              <path d="M 40 230 L 160 230 L 130 130 L 70 130 Z" fill={theme.buik} />
              <path d="M 60 120 L 140 120 L 165 240 L 35 240 Z" fill={theme.buik} />
              <rect x="55" y="175" width="90" height="8" fill="#be185d" /> 
              {/* Schaduw/Diepte in jurk */}
              <path d="M 50 200 L 150 200 L 160 235 L 40 235 Z" fill="#000" opacity="0.1" />
              {/* Polkadots extra */}
              <circle cx="100" cy="180" r="8" fill="#fbcfe8" /> 
              <circle cx="80" cy="150" r="5" fill="#fbcfe8" opacity="0.8"/> 
              <circle cx="120" cy="210" r="6" fill="#fbcfe8" opacity="0.8"/> 
              <circle cx="100" cy="150" r="3" fill="#be185d" opacity="0.6"/> 
              <circle cx="100" cy="165" r="3" fill="#be185d" opacity="0.6"/> 
            </>
          ) : character === 'beer' ? (
            <>
              <ellipse cx="100" cy="175" rx="65" ry="75" fill={theme.buik} />
              {/* 3D shading beer buik */}
              <ellipse cx="100" cy="185" rx="55" ry="65" fill="#000" opacity="0.05" /> 
              <ellipse cx="100" cy="185" rx="45" ry="55" fill="#d97706" /> 
              <path d="M 98 210 Q 100 215 102 210" stroke="#78350f" strokeWidth="2" fill="none"/> 
              <path d="M 80 160 Q 100 140 120 160" stroke="#78350f" strokeWidth="2" fill="none" opacity="0.3"/> 
            </>
          ) : (
            <>
              <rect x="50" y="125" width="100" height="95" rx="20" fill={theme.buik} />
              {/* Schaduw onderkant shirt */}
              <path d="M 50 200 Q 100 210 150 200 L 150 220 L 50 220 Z" fill="#000" opacity="0.15" /> 
              <path d="M 80 125 Q 100 150 120 125" fill={theme.huid} stroke={theme.huidShadow} strokeWidth="3"/> 
              <polygon points="100,150 105,165 120,165 108,175 112,190 100,180 88,190 92,175 80,165 95,165" fill="#fff" opacity="0.9" /> 
            </>
          )}
        </>
      ), <rect x="55" y="120" width="90" height="110" fill="transparent" /> )}


      {/* ================= HOOFD EN GEZICHT ================= */}
      <g style={getStyle('hoofd', 'hoofd')}>
        {/* HALS */}
        <rect x="90" y="115" width="20" height="25" fill={theme.huid} />
        
        {/* OREN */}
        {renderInteractiveGroup('oor', 'hoofd', '100px 85px', (
          character === 'beer' ? (
            <>
              <circle cx="45" cy="45" r="24" fill={theme.huid} />
              <circle cx="155" cy="45" r="24" fill={theme.huid} />
              <circle cx="45" cy="45" r="14" fill="#fcd34d" opacity="0.9"/>
              <circle cx="155" cy="45" r="14" fill="#fcd34d" opacity="0.9"/>
            </>
          ) : (
            <>
              <circle cx="48" cy="85" r="16" fill={theme.huid} />
              <circle cx="152" cy="85" r="16" fill={theme.huid} />
              <path d="M 45 80 Q 50 85 45 90" stroke="#ea580c" strokeWidth="1.5" fill="none" opacity="0.4"/>
              <path d="M 155 80 Q 150 85 155 90" stroke="#ea580c" strokeWidth="1.5" fill="none" opacity="0.4"/>
            </>
          )
        ), (
          character === 'beer' ? (
            <><rect x="20" y="20" width="40" height="50" fill="transparent" /><rect x="140" y="20" width="40" height="50" fill="transparent" /></>
          ) : (
            <><rect x="25" y="65" width="30" height="40" fill="transparent" /><rect x="145" y="65" width="30" height="40" fill="transparent" /></>
          )
        ))}

      {/* ================= HOOFD BASIS ================= */}
        <g style={{ opacity: (!puzzleMode && !isIcon && highlightedPart && !['neus', 'mond', 'oor', 'haar'].includes(highlightedPart)) ? 0.05 : 1, transition: 'opacity 0.4s' }}>
          <circle cx="100" cy="80" r="50" fill={theme.huid} />
          {/* 3D highlights */}
          <path d="M 55 60 Q 100 20 145 60 Q 100 10 55 60 Z" fill="#fff" opacity="0.2" />
          {/* Kin schaduw */}
          <path d="M 60 100 Q 100 135 140 100 Q 100 120 60 100 Z" fill={theme.huidShadow} opacity="0.4" />
          <circle cx="65" cy="95" r="10" fill={theme.wang} opacity="0.6" style={{ filter: "blur(2px)" }} />
          <circle cx="135" cy="95" r="10" fill={theme.wang} opacity="0.6" style={{ filter: "blur(2px)" }} />
        </g>

        {/* HAAR */}
        {renderInteractiveGroup('haar', 'hoofd', '100px 40px', (
          <>
            {character === 'tom' && (
              <>
                <path d="M 48 70 Q 70 10 100 15 Q 130 10 152 70 Q 140 20 100 5 Q 60 20 48 70 Z" fill={theme.haar} />
                <path d="M 70 25 L 65 5 L 80 15 L 85 -5 L 100 10 L 110 -5 L 120 15 L 135 5 L 130 25 Z" fill={theme.haar} />
                <path d="M 70 30 Q 100 15 130 30" stroke="#000" strokeWidth="2" opacity="0.2" fill="none" />
              </>
            )}
            {character === 'lisa' && (
              <>
                <path d="M 48 75 Q 70 20 100 20 Q 130 20 152 75 Q 140 30 100 30 Q 60 30 48 75 Z" fill={theme.haar} />
                <path d="M 100 20 Q 110 40 120 30" stroke="#b45309" strokeWidth="2" fill="none" opacity="0.3"/>
                <ellipse cx="25" cy="80" rx="20" ry="30" fill={theme.haar} transform="rotate(25 25 80)" />
                <ellipse cx="175" cy="80" rx="20" ry="30" fill={theme.haar} transform="rotate(-25 175 80)" />
                <path d="M 35 60 L 20 50 L 25 70 Z" fill="#be185d" /><path d="M 35 60 L 50 50 L 45 70 Z" fill="#be185d" /><circle cx="35" cy="60" r="4" fill="#fbcfe8" />
                <path d="M 165 60 L 150 50 L 155 70 Z" fill="#be185d" /><path d="M 165 60 L 180 50 L 175 70 Z" fill="#be185d" /><circle cx="165" cy="60" r="4" fill="#fbcfe8" />
              </>
            )}
            {character === 'beer' && (
              <path d="M 85 35 Q 100 10 115 35 L 105 30 L 100 40 L 95 30 Z" fill={theme.haar} />
            )}
          </>
        ), (
          character === 'beer' ? (
             <rect x="70" y="-10" width="60" height="45" fill="transparent" />
          ) : character === 'lisa' ? (
             <>
               <rect x="50" y="-10" width="100" height="50" fill="transparent" />
               <rect x="10" y="40" width="40" height="60" fill="transparent" />
               <rect x="150" y="40" width="40" height="60" fill="transparent" />
             </>
          ) : (
             <rect x="40" y="-10" width="120" height="50" fill="transparent" />
          )
        ))}

        {/* OGEN (Niet aanklikbaar, MET BLINK) */}
        <g pointerEvents="none" className="animate-blink" style={{ transformOrigin: '100px 70px', opacity: (!puzzleMode && !isIcon && highlightedPart && !['neus', 'mond', 'oor', 'haar'].includes(highlightedPart)) ? 0.05 : 1, transition: 'opacity 0.4s' }}>
          <circle cx="78" cy="70" r="11" fill="#fff" />
          <circle cx="122" cy="70" r="11" fill="#fff" />
          <circle cx="78" cy="70" r="6" fill="#000" />
          <circle cx="122" cy="70" r="6" fill="#000" />
          <circle cx="75" cy="67" r="2.5" fill="#fff" />
          <circle cx="119" cy="67" r="2.5" fill="#fff" />
          {/* Highlights in ogen */}
          <circle cx="81" cy="72" r="1" fill="#fff" opacity="0.8" />
          <circle cx="125" cy="72" r="1" fill="#fff" opacity="0.8" />
          
          {character === 'lisa' && <><path d="M 69 65 L 63 60 M 72 62 L 68 55 M 87 65 L 93 60 M 84 62 L 88 55" stroke="#000" strokeWidth="1.5" strokeLinecap="round" /><path d="M 131 65 L 137 60 M 128 62 L 132 55 M 113 65 L 107 60 M 116 62 L 112 55" stroke="#000" strokeWidth="1.5" strokeLinecap="round" /></>}
          {character === 'tom' && <><path d="M 65 55 Q 78 50 88 55" stroke={theme.haar} strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M 112 55 Q 122 50 135 55" stroke={theme.haar} strokeWidth="3" fill="none" strokeLinecap="round" /></>}
        </g>

        {/* NEUS */}
        {renderInteractiveGroup('neus', 'hoofd', '100px 88px', (
          character === 'beer' ? (
             <>
               <ellipse cx="100" cy="95" rx="22" ry="16" fill="#fcd34d" />
               <ellipse cx="100" cy="88" rx="14" ry="9" fill="#000" />
               <circle cx="96" cy="85" r="3" fill="#fff" />
             </>
          ) : (
            <>
              <ellipse cx="100" cy="88" rx="8" ry="6" fill="#fca5a5" />
              <path d="M 96 88 Q 100 92 104 88" stroke="#ef4444" strokeWidth="1.5" fill="none" opacity="0.6"/>
            </>
          )
        ), <rect x="80" y="75" width="40" height="25" fill="transparent" /> )}

        {/* MOND */}
        {renderInteractiveGroup('mond', 'hoofd', '100px 108px', (
          character === 'beer' ? (
            <>
              <path d="M 100 95 L 100 108" stroke="#000" strokeWidth="2.5" />
              <path d="M 88 108 Q 100 118 112 108" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M 94 112 Q 100 120 106 112 Z" fill="#ef4444" />
            </>
          ) : (
            <>
              <path d="M 78 102 Q 100 125 122 102 Z" fill="#ef4444" />
              <path d="M 83 104 Q 100 108 117 104 Z" fill="#fff" />
              <path d="M 88 110 Q 100 118 112 110 Z" fill="#fbcfe8" />
            </>
          )
        ), <rect x="70" y="95" width="60" height="30" fill="transparent" /> )}
      </g>
    </svg>
  );
};

