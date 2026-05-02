/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Settings, RotateCcw, Zap, Target } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GRID_SIZE, SHAPES, BLOCK_STYLES, BlockTemplate } from './constants';
type GridCell = string | null;

// Audio Synth Utility
const playSynthSound = (type: 'place' | 'clear' | 'gameOver' | 'click' | 'highScore', enabled: boolean) => {
  if (!enabled || typeof window === 'undefined') return;
  
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'place') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'clear') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'gameOver') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'highScore') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.3); // C6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    console.error('Audio error:', e);
  }
};

export default function App() {
  const [gameState, setGameState] = useState<'home' | 'playing'>('home');
  const [grid, setGrid] = useState<GridCell[][]>(() => 
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))
  );
  const [nextPieces, setNextPieces] = useState<BlockTemplate[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('block-blast-highscore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [lastBlastMsg, setLastBlastMsg] = useState<{ text: string, id: number } | null>(null);
  const [combo, setCombo] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('block-blast-sound');
    return saved !== 'false';
  });
  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    const saved = localStorage.getItem('block-blast-vibration');
    return saved !== 'false';
  });
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());
  const [floatingScores, setFloatingScores] = useState<{ id: number; score: number; x: number | string; y: number | string }[]>([]);
  const [activeGhost, setActiveGhost] = useState<{ x: number; y: number; piece: BlockTemplate | null; isValid: boolean } | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);

  // Generate 3 random pieces
  const generatePieces = useCallback(() => {
    const pieces: BlockTemplate[] = [];
    for (let i = 0; i < 3; i++) {
      const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      pieces.push({
        ...randomShape,
        id: Math.random().toString(36).substr(2, 9),
      });
    }
    setNextPieces(pieces);
  }, []);

  // Initialize pieces
  useEffect(() => {
    generatePieces();
  }, [generatePieces]);

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('block-blast-highscore', score.toString());
    }
  }, [score, highScore]);

  // Save sound settings
  useEffect(() => {
    localStorage.setItem('block-blast-sound', soundEnabled.toString());
  }, [soundEnabled]);

  // Save vibration settings
  useEffect(() => {
    localStorage.setItem('block-blast-vibration', vibrationEnabled.toString());
  }, [vibrationEnabled]);

  const resetHighScore = () => {
    setHighScore(0);
    localStorage.setItem('block-blast-highscore', '0');
    setIsNewHighScore(false);
  };

  // Check if a piece can be placed at a specific position
  const canPlacePiece = (piece: BlockTemplate, gridX: number, gridY: number, currentGrid: GridCell[][]) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] === 1) {
          const targetX = gridX + x;
          const targetY = gridY + y;
          
          if (
            targetX < 0 || targetX >= GRID_SIZE ||
            targetY < 0 || targetY >= GRID_SIZE ||
            currentGrid[targetY][targetX] !== null
          ) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Check for game over
  useEffect(() => {
    if (nextPieces.length === 0) return;

    const somePieceFits = nextPieces.some(piece => {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (canPlacePiece(piece, x, y, grid)) return true;
        }
      }
      return false;
    });

    if (!somePieceFits && !isGameOver) {
      setIsGameOver(true);
    }
  }, [grid, nextPieces, isGameOver]);

  const placePiece = (piece: BlockTemplate, gridX: number, gridY: number) => {
    if (!canPlacePiece(piece, gridX, gridY, grid)) return false;

    const newGrid = grid.map(row => [...row]);
    piece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          newGrid[gridY + y][gridX + x] = piece.color;
        }
      });
    });

    // Check for lines to clear
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];

    // Rows
    for (let y = 0; y < GRID_SIZE; y++) {
      if (newGrid[y].every(cell => cell !== null)) {
        rowsToClear.push(y);
      }
    }

    // Columns
    for (let x = 0; x < GRID_SIZE; x++) {
      let full = true;
      for (let y = 0; y < GRID_SIZE; y++) {
        if (newGrid[y][x] === null) {
          full = false;
          break;
        }
      }
      if (full) colsToClear.push(x);
    }

    const linesCleared = rowsToClear.length + colsToClear.length;
    let turnScore = 0;

    if (linesCleared > 0) {
      const cellsToAnimate = new Set<string>();
      rowsToClear.forEach(y => {
        for (let x = 0; x < GRID_SIZE; x++) cellsToAnimate.add(`${x}-${y}`);
      });
      colsToClear.forEach(x => {
        for (let y = 0; y < GRID_SIZE; y++) cellsToAnimate.add(`${x}-${y}`);
      });

      setClearingCells(cellsToAnimate);
      setTimeout(() => setClearingCells(new Set()), 400);

      rowsToClear.forEach(y => {
        for (let x = 0; x < GRID_SIZE; x++) newGrid[y][x] = null;
      });
      colsToClear.forEach(x => {
        for (let y = 0; y < GRID_SIZE; y++) newGrid[y][x] = null;
      });

      // Blast-based scoring: square the number of lines cleared for exponential reward
      const basePoints = Math.pow(linesCleared, 2) * 100;
      
      // Streak Multiplier: Reward continuous clearing
      const streakMultiplier = 1 + (streak * 0.5);
      
      turnScore = Math.floor(basePoints * streakMultiplier);
      
      setCombo(linesCleared);
      setStreak(prev => prev + 1);

      // Feedback hooks
      playSynthSound('clear', soundEnabled);
      if (vibrationEnabled && navigator.vibrate) navigator.vibrate([10, 50, 20]);
      
      // Blast Message
      const msgs = ['BLAST!', 'DOUBLE!', 'TRIPLE!', 'MEGA BLAST!', 'ULTRA!', 'UNBELIEVABLE!', 'GODLIKE!'];
      const msg = linesCleared > 1 ? msgs[Math.min(linesCleared, msgs.length - 1)] : 'BLAST!';
      setLastBlastMsg({ text: msg, id: Date.now() });

      // Add floating score
      const newScoreId = Date.now();
      setFloatingScores(prev => [...prev, { 
        id: newScoreId, 
        score: turnScore, 
        x: `${(gridX * (100 / GRID_SIZE)) + (50 / GRID_SIZE)}%`, 
        y: `${(gridY * (100 / GRID_SIZE)) + (50 / GRID_SIZE)}%` 
      }]);
      setTimeout(() => setFloatingScores(prev => prev.filter(s => s.id !== newScoreId)), 1000);
      
      if (linesCleared >= 2 || streak >= 2) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: streak >= 4 ? ['#FDE047', '#F97316', '#EF4444'] : undefined
        });
      }
    } else {
      setCombo(0);
      setStreak(0);
      playSynthSound('place', soundEnabled);
      if (vibrationEnabled && navigator.vibrate) navigator.vibrate(5);
    }

    setGrid(newGrid);
    setScore(prev => {
      const nextScore = prev + turnScore;
      if (nextScore > highScore && !isNewHighScore && highScore > 0) {
        setIsNewHighScore(true);
        playSynthSound('highScore', soundEnabled);
      }
      return nextScore;
    });
    
    const remainingPieces = nextPieces.filter(p => p.id !== piece.id);
    if (remainingPieces.length === 0) {
      generatePieces();
    } else {
      setNextPieces(remainingPieces);
    }

    return true;
  };

  const handleDrag = (info: any, piece: BlockTemplate) => {
    if (!gridRef.current) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const cellSize = gridRect.width / GRID_SIZE;
    
    // Adjusted point to account for the scale factor (1.8) while dragging
    const dropX = info.point.x - gridRect.left;
    const dropY = info.point.y - gridRect.top;
    
    const targetX = Math.floor(dropX / cellSize);
    const targetY = Math.floor(dropY / cellSize);

    if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE) {
      const isValid = canPlacePiece(piece, targetX, targetY, grid);
      setActiveGhost({ x: targetX, y: targetY, piece, isValid });
    } else {
      setActiveGhost(null);
    }
  };

  const refreshPieces = useCallback(() => {
    playSynthSound('click', soundEnabled);
    if (vibrationEnabled && navigator.vibrate) navigator.vibrate(10);
    generatePieces();
  }, [generatePieces, soundEnabled, vibrationEnabled]);

  const restartGame = useCallback(() => {
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
    setScore(0);
    setCombo(0);
    setStreak(0);
    setIsGameOver(false);
    setIsNewHighScore(false);
    setLastBlastMsg(null);
    setClearingCells(new Set());
    setFloatingScores([]);
    setActiveGhost(null);
    generatePieces();
  }, [generatePieces]);

  return (
    <div className={`min-h-screen bg-[#4A60B3] text-white flex flex-col items-center font-sans select-none overflow-hidden relative`}>
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div 
            key={`sparkle-${i}`}
            className="sparkle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'home' ? (
          <motion.div 
            key="home"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 pb-20 w-full max-w-md z-10"
          >
            {/* Title Logo */}
            <div className="mb-12 flex flex-col items-center">
              <motion.div 
                initial={{ y: -20, rotate: -2 }}
                animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="relative"
              >
                <div className="text-8xl font-black italic tracking-tighter drop-shadow-[8px_8px_0_rgba(0,0,0,0.2)] leading-none select-none">
                  <span className="text-yellow-400">BLOCK</span>
                  <br />
                  <span className="text-white">BLAST</span>
                </div>
                {/* Decorative Blocks */}
                <div className="absolute -top-6 -right-6 w-12 h-12 bg-[#F87171] block-beveled rotate-12" />
                <div className="absolute -bottom-4 -left-8 w-10 h-10 bg-[#60A5FA] block-beveled -rotate-12" />
              </motion.div>
            </div>

            {/* High Score Card */}
            <div className="bg-black/20 backdrop-blur-sm px-8 py-6 rounded-3xl border-2 border-white/10 mb-12 flex flex-col items-center gap-2 shadow-xl">
              <div className="flex items-center gap-2">
                <Crown size={24} className="text-yellow-400 fill-yellow-400" />
                <span className="text-white/60 font-bold tracking-widest text-xs uppercase">BEST SCORE</span>
              </div>
              <span className="text-5xl font-black text-white drop-shadow-md">{highScore}</span>
            </div>

            {/* Play Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playSynthSound('click', soundEnabled);
                setGameState('playing');
              }}
              className="bg-yellow-400 hover:bg-yellow-300 text-[#4A60B3] text-4xl font-black px-12 py-6 rounded-full shadow-[0_8px_0_#B45309,0_15px_30px_rgba(0,0,0,0.3)] transition-all flex items-center gap-4 group"
            >
              PLAY
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Target size={32} />
              </motion.div>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playSynthSound('click', soundEnabled);
                setIsSettingsOpen(true);
              }}
              className="mt-12 text-white/60 hover:text-white hover:bg-white/10 px-6 py-2 rounded-full transition-all flex items-center gap-2 font-bold text-sm tracking-widest border border-white/10 shadow-sm"
            >
              <Settings size={18} />
              SETTINGS
            </motion.button>
          </motion.div>
        ) : (
          <motion.div 
            key="game"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-between py-6 px-4 w-full max-w-lg z-10"
          >
            {/* Top Header Bar */}
            <div className="w-full flex justify-between items-center px-2">
              <div 
                className="flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  playSynthSound('click', soundEnabled);
                  setGameState('home');
                }}
              >
                <Crown 
                  className={`${isNewHighScore ? 'text-yellow-400 fill-yellow-400 animate-pulse' : 'text-white/80 fill-white/10'} drop-shadow-md`} 
                  size={32} 
                />
                <span className={`text-3xl font-black transition-colors ${isNewHighScore ? 'text-yellow-400' : 'text-white/80'} tracking-tight drop-shadow-sm`}>
                  {highScore}
                </span>
              </div>
              <div className="flex gap-4 items-center">
                <button 
                  onClick={refreshPieces}
                  title="Refresh Pieces"
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <RotateCcw size={28} className="text-white/80" />
                </button>
                <Settings 
                  size={36} 
                  onClick={() => {
                    playSynthSound('click', soundEnabled);
                    setIsSettingsOpen(true);
                  }}
                  className="text-white/90 cursor-pointer hover:rotate-90 transition-transform drop-shadow-md active:scale-90" 
                />
              </div>
            </div>

            {/* Large Score */}
            <div className="flex flex-col items-center -mt-6 h-28 justify-center relative">
              <AnimatePresence mode="popLayout">
                {isNewHighScore && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-6 text-yellow-400 font-black text-[10px] tracking-[0.3em] uppercase bg-yellow-400/10 px-4 py-1 rounded-full border border-yellow-400/30"
                  >
                    NEW RECORD!
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.span 
                key={score}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                className="text-8xl font-black tracking-tight drop-shadow-2xl"
              >
                {score}
              </motion.span>
              <div className="flex gap-2 mt-2 h-6">
                <AnimatePresence>
                  {combo > 1 && (
                    <motion.div 
                      key="combo"
                      initial={{ opacity: 0, y: 10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="bg-yellow-400 text-[#4A60B3] px-3 py-1 rounded-full text-[10px] font-black tracking-widest flex items-center gap-1 shadow-lg"
                    >
                      <Zap size={10} fill="currentColor" />
                      COMBO {combo}
                    </motion.div>
                  )}
                  {streak > 1 && (
                    <motion.div 
                      key="streak"
                      initial={{ opacity: 0, y: 10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest flex items-center gap-1 shadow-lg"
                    >
                      <RotateCcw size={10} className="stroke-[3]" />
                      STREAK {streak}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Main Game Grid Container */}
            <div className="relative bg-[#3F529E] p-3 rounded-md shadow-2xl">
              <AnimatePresence>
                {lastBlastMsg && (
                  <motion.div
                    key={lastBlastMsg.id}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1.5, y: -40 }}
                    exit={{ opacity: 0, scale: 2 }}
                    onAnimationComplete={() => setTimeout(() => setLastBlastMsg(null), 1000)}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-visible"
                  >
                    <span className="text-white font-black italic text-5xl drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)] select-none whitespace-nowrap">
                      {lastBlastMsg.text}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div 
                ref={gridRef}
                className="grid gap-0.5 bg-[#1B294B] border-4 border-[#1B294B] rounded-sm relative shadow-inner"
                style={{ 
                  width: 'calc(min(92vw, 420px))', 
                  height: 'calc(min(92vw, 420px))',
                  gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
                }}
              >
                {grid.map((row, y) => 
                  row.map((cell, x) => {
                    let isGhost = false;
                    if (activeGhost && activeGhost.piece) {
                      const { x: gx, y: gy, piece: gp } = activeGhost;
                      const px = x - gx;
                      const py = y - gy;
                      if (py >= 0 && py < gp.shape.length && px >= 0 && px < gp.shape[0].length) {
                        if (gp.shape[py][px] === 1) isGhost = true;
                      }
                    }

                    return (
                      <div 
                        key={`${x}-${y}`} 
                        id={`cell-${x}-${y}`}
                        className={`w-full h-full relative ${
                          clearingCells.has(`${x}-${y}`) ? 'animate-clear z-30' :
                          cell ? `${BLOCK_STYLES[cell as keyof typeof BLOCK_STYLES]} block-beveled` : 
                          isGhost ? (activeGhost?.isValid ? 'bg-white/20 border-white/50 border-[3px]' : 'bg-red-500/20 border-red-500/50 border-[3px]') :
                          'bg-[#192440]'
                        }`}
                      >
                        {clearingCells.has(`${x}-${y}`) && (
                          <motion.div 
                            initial={{ scale: 0.5, opacity: 1 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            className="absolute inset-0 bg-white rounded-sm"
                          />
                        )}
                      </div>
                    );
                  })
                )}

                {/* Floating Scores */}
                <AnimatePresence>
                  {floatingScores.map(fs => (
                    <motion.div
                      key={fs.id}
                      initial={{ opacity: 0, y: fs.y, x: fs.x, scale: 0.5 }}
                      animate={{ opacity: 1, y: fs.y - 100, scale: 1.5 }}
                      exit={{ opacity: 0 }}
                      className="absolute text-yellow-400 font-black text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] pointer-events-none z-40"
                    >
                      +{fs.score}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Piece Tray */}
            <div className="w-full h-36 flex items-center justify-around px-2 mb-4 relative">
              <AnimatePresence mode="popLayout">
                {nextPieces.map((piece) => (
                  <motion.div
                    key={piece.id}
                    layoutId={piece.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    drag
                    dragSnapToOrigin
                    onDrag={(e, info) => handleDrag(info, piece)}
                    onDragEnd={(e, info) => {
                      setActiveGhost(null);
                      if (!gridRef.current) return;
                      const gridRect = gridRef.current.getBoundingClientRect();
                      const cellSize = gridRect.width / GRID_SIZE;
                      const dropX = info.point.x - gridRect.left;
                      const dropY = info.point.y - gridRect.top;
                      const targetX = Math.floor(dropX / cellSize);
                      const targetY = Math.floor(dropY / cellSize);
                      placePiece(piece, targetX, targetY);
                    }}
                    whileDrag={{ scale: 2.2, zIndex: 100, filter: 'drop-shadow(0 25px 40px rgba(0,0,0,0.5))' }}
                    className="cursor-grab active:cursor-grabbing flex items-center justify-center min-w-[80px]"
                    style={{ touchAction: 'none' }}
                  >
                    <div 
                      className="grid gap-[2.5px]"
                      style={{
                        gridTemplateColumns: `repeat(${piece.shape[0].length}, 16px)`,
                        gridTemplateRows: `repeat(${piece.shape.length}, 16px)`,
                      }}
                    >
                      {piece.shape.map((row, y) => 
                        row.map((cell, x) => (
                          <div 
                            key={`${x}-${y}`}
                            className={`w-[16px] h-[16px] ${
                              cell === 1 ? `${BLOCK_STYLES[piece.color as keyof typeof BLOCK_STYLES]} block-beveled` : 'bg-transparent'
                            }`}
                          />
                        ))
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[70] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#3F529E] p-10 rounded-3xl border-4 border-white/20 shadow-2xl max-w-xs w-full text-center"
            >
              <h2 className="text-4xl font-black mb-2 uppercase tracking-tight text-white italic">Game Over</h2>
              
              <div className="mb-10">
                <div className="text-white/60 font-bold uppercase tracking-[0.2em] text-[10px] mb-2">Final Score</div>
                <div className="text-6xl font-black text-white drop-shadow-lg">{score}</div>
                {isNewHighScore && (
                  <div className="mt-2 text-yellow-400 font-black text-xs bg-yellow-400/20 py-1 px-3 rounded-full inline-block animate-bounce">
                    NEW RECORD!
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    playSynthSound('click', soundEnabled);
                    restartGame();
                  }}
                  className="w-full bg-[#FCD34D] hover:bg-yellow-300 text-[#34448B] font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 text-2xl"
                >
                  TRY AGAIN
                </button>
                <button 
                  onClick={() => {
                    playSynthSound('click', soundEnabled);
                    restartGame();
                    setGameState('home');
                  }}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-xl transition-all"
                >
                  HOME
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-6"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-[#3F529E] p-8 rounded-3xl border-4 border-white/20 shadow-2xl max-w-xs w-full"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-3xl font-black mb-8 uppercase tracking-tight text-white italic text-center">Settings</h2>
              
              <div className="flex flex-col gap-6 mb-10">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-lg">Sound Effects</span>
                  <button 
                    onClick={() => {
                      const newVal = !soundEnabled;
                      setSoundEnabled(newVal);
                      if (newVal) playSynthSound('click', true);
                    }}
                    className={`w-14 h-8 rounded-full transition-colors relative ${soundEnabled ? 'bg-yellow-400' : 'bg-slate-700'}`}
                  >
                    <motion.div 
                      animate={{ x: soundEnabled ? 28 : 4 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-lg">Vibration</span>
                  <button 
                    onClick={() => {
                      const newVal = !vibrationEnabled;
                      setVibrationEnabled(newVal);
                      if (newVal && navigator.vibrate) navigator.vibrate(20);
                    }}
                    className={`w-14 h-8 rounded-full transition-colors relative ${vibrationEnabled ? 'bg-yellow-400' : 'bg-slate-700'}`}
                  >
                    <motion.div 
                      animate={{ x: vibrationEnabled ? 28 : 4 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    playSynthSound('click', soundEnabled);
                    if (confirm('Reset your best score?')) {
                      resetHighScore();
                    }
                  }}
                  className="w-full bg-red-500/80 hover:bg-red-500 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  Reset Best Score
                </button>
                
                <button 
                  onClick={() => {
                    playSynthSound('click', soundEnabled);
                    setIsSettingsOpen(false);
                  }}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-xl transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
