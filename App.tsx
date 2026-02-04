
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { analyzeItem, ANALYZE_API_URL } from './services/aiService';
import * as Storage from './services/storageService';
import type { AppSettings, CircleItem } from './types';
import { DEFAULT_SETTINGS, LANGUAGES, CURRENCIES, PROVIDERS, MODELS_BY_PROVIDER, DISCOUNT_OPTIONS } from './constants';

const WHITELIST = [
  'stoffer@nose.dk',
  'pgg@nose.dk',
  'stilettorebel@hotmail.com',
  'simon.ellefsen@gmail.com'
];
const USAGE_STORAGE_KEY = 'wecircle_usage';

const formatCurrency = (amount: number, currency: string) => {
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

const calculateNetPrice = (price: number, discountPercent: number, commissionPercent: number) => {
  if (!Number.isFinite(price)) return 0;
  const afterDiscount = price * (1 - discountPercent);
  const afterCommission = afterDiscount * (1 - commissionPercent);
  return Math.max(0, Math.round(afterCommission * 100) / 100);
};

const formatUsd = (amount: number) => {
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(amount);
};

type ProviderStatus = 'connected' | 'missing';

type UsageTotals = {
  runs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
};

const INITIAL_USAGE_TOTALS: UsageTotals = {
  runs: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  costUsd: 0
};

// Helper to rotate base64 image
const rotateImageBase64 = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
  });
};

const compressImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

// --- COMPONENTS ---

const SwipeableListItem: React.FC<{ 
  item: CircleItem; 
  onDelete: (id: string) => void; 
  onClick: () => void;
  netPrice: number;
}> = ({ item, onDelete, onClick, netPrice }) => {
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const threshold = -80;

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    if (diff < 0) {
      setTranslateX(diff);
    } else {
      setTranslateX(0);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (translateX < threshold) {
      setTranslateX(threshold);
    } else {
      setTranslateX(0);
    }
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setTimeout(() => onDelete(item.id), 300);
  };

  return (
    <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'opacity-0 h-0 mb-0' : 'mb-4'}`}>
      <div 
        className="absolute inset-0 bg-red-500 rounded-[28px] flex items-center justify-end pr-6 cursor-pointer"
        onClick={confirmDelete}
      >
        <span className="text-white font-bold text-sm uppercase tracking-wider">Slet</span>
      </div>

      <div 
        className="relative bg-white rounded-[28px] p-5 ios-shadow flex gap-5 transition-transform duration-200 ease-out cursor-pointer group"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => translateX === 0 && onClick()}
      >
        <img src={item.photos[0]} className="w-20 h-20 rounded-2xl object-cover bg-gray-100" />
        <div className="flex-1 py-1 flex flex-col justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600 mb-0.5">{formatCurrency(item.price, item.currency || 'DKK')}</p>
            <p className="text-[11px] font-semibold text-green-600 mb-1">Efter WeCircle: {formatCurrency(netPrice, item.currency || 'DKK')}</p>
            <p className="text-base font-semibold text-[#111827] line-clamp-2 leading-tight">{item.description}</p>
          </div>
        </div>

        {!isTouchDevice && (
          <button 
            onClick={confirmDelete}
            className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

const VoiceInput: React.FC<{ onResult: (text: string) => void; className?: string }> = ({ onResult, className }) => (
  <VoiceInputButton onResult={onResult} className={className} />
);

const MIN_CROP_SIZE = 40;

const CropModal: React.FC<{ src: string; onCrop: (cropped: string) => void; onCancel: () => void }> = ({ src, onCrop, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 300, height: 300 });
  const [interaction, setInteraction] = useState<'move' | 'resize' | null>(null);
  const [activeHandle, setActiveHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [dragStart, setDragStart] = useState<{ pointerCanvasX: number; pointerCanvasY: number; crop: typeof crop } | null>(null);
  const [canvasMetrics, setCanvasMetrics] = useState<{ offsetX: number; offsetY: number; ratio: number }>({ offsetX: 0, offsetY: 0, ratio: 1 });

  useEffect(() => {
    const img = new Image();
    img.src = currentSrc;
    img.onload = () => {
      setImgObj(img);
      const initWidth = Math.max(MIN_CROP_SIZE, img.width * 0.7);
      const initHeight = Math.max(MIN_CROP_SIZE, img.height * 0.7);
      setCrop({
        width: initWidth,
        height: initHeight,
        x: (img.width - initWidth) / 2,
        y: (img.height - initHeight) / 2,
      });
    };
  }, [currentSrc]);

  const redrawCanvas = useCallback(() => {
    if (!imgObj || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const canvas = canvasRef.current;
    const ratio = Math.min(canvas.width / imgObj.width, canvas.height / imgObj.height);
    const displayW = imgObj.width * ratio;
    const displayH = imgObj.height * ratio;
    const offsetX = (canvas.width - displayW) / 2;
    const offsetY = (canvas.height - displayH) / 2;

    setCanvasMetrics({ offsetX, offsetY, ratio });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgObj, offsetX, offsetY, displayW, displayH);

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(
      offsetX + crop.x * ratio,
      offsetY + crop.y * ratio,
      crop.width * ratio,
      crop.height * ratio
    );
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      offsetX + crop.x * ratio,
      offsetY + crop.y * ratio,
      crop.width * ratio,
      crop.height * ratio
    );

    const handles: Array<{ x: number; y: number }> = [
      { x: offsetX + crop.x * ratio, y: offsetY + crop.y * ratio },
      { x: offsetX + (crop.x + crop.width) * ratio, y: offsetY + crop.y * ratio },
      { x: offsetX + crop.x * ratio, y: offsetY + (crop.y + crop.height) * ratio },
      { x: offsetX + (crop.x + crop.width) * ratio, y: offsetY + (crop.y + crop.height) * ratio },
    ];
    ctx.fillStyle = '#fff';
    handles.forEach(({ x, y }) => {
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.strokeRect(x - 6, y - 6, 12, 12);
    });
    ctx.restore();
  }, [imgObj, crop]);

  useEffect(() => {
    redrawCanvas();
  }, [imgObj, crop, redrawCanvas]);

  const rotateImage = async () => {
    const rotated = await rotateImageBase64(currentSrc);
    setCurrentSrc(rotated);
  };

  const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const getPointer = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      canvasX: clientX - rect.left,
      canvasY: clientY - rect.top,
    };
  };

  const getHandleAtPoint = (canvasX: number, canvasY: number): typeof activeHandle => {
    const { offsetX, offsetY, ratio } = canvasMetrics;
    const positions: Record<'nw' | 'ne' | 'sw' | 'se', { x: number; y: number }> = {
      nw: { x: offsetX + crop.x * ratio, y: offsetY + crop.y * ratio },
      ne: { x: offsetX + (crop.x + crop.width) * ratio, y: offsetY + crop.y * ratio },
      sw: { x: offsetX + crop.x * ratio, y: offsetY + (crop.y + crop.height) * ratio },
      se: { x: offsetX + (crop.x + crop.width) * ratio, y: offsetY + (crop.y + crop.height) * ratio },
    };
    const HIT = 16;
    return (Object.entries(positions) as Array<[typeof activeHandle, { x: number; y: number }]>).find(
      ([, pos]) =>
        Math.abs(canvasX - pos.x) <= HIT &&
        Math.abs(canvasY - pos.y) <= HIT
    )?.[0] ?? null;
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!imgObj) return;
    const pointer = getPointer(clientX, clientY);
    if (!pointer) return;
    const handle = getHandleAtPoint(pointer.canvasX, pointer.canvasY);
    const { offsetX, offsetY, ratio } = canvasMetrics;
    const canvasCrop = {
      x: offsetX + crop.x * ratio,
      y: offsetY + crop.y * ratio,
      width: crop.width * ratio,
      height: crop.height * ratio,
    };
    const inside =
      pointer.canvasX >= canvasCrop.x &&
      pointer.canvasX <= canvasCrop.x + canvasCrop.width &&
      pointer.canvasY >= canvasCrop.y &&
      pointer.canvasY <= canvasCrop.y + canvasCrop.height;
    if (handle) {
      setInteraction('resize');
      setActiveHandle(handle);
      setDragStart({ pointerCanvasX: pointer.canvasX, pointerCanvasY: pointer.canvasY, crop });
    } else if (inside) {
      setInteraction('move');
      setActiveHandle(null);
      setDragStart({ pointerCanvasX: pointer.canvasX, pointerCanvasY: pointer.canvasY, crop });
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!dragStart || !imgObj || !interaction) return;
    const pointer = getPointer(clientX, clientY);
    if (!pointer) return;
    const deltaCanvasX = pointer.canvasX - dragStart.pointerCanvasX;
    const deltaCanvasY = pointer.canvasY - dragStart.pointerCanvasY;
    const deltaX = deltaCanvasX / canvasMetrics.ratio;
    const deltaY = deltaCanvasY / canvasMetrics.ratio;

    const base = dragStart.crop;
    const limitX = (x: number) => clampValue(x, 0, imgObj.width - MIN_CROP_SIZE);
    const limitY = (y: number) => clampValue(y, 0, imgObj.height - MIN_CROP_SIZE);

    const next = { ...base };

    if (interaction === 'move') {
      next.x = clampValue(base.x + deltaX, 0, imgObj.width - base.width);
      next.y = clampValue(base.y + deltaY, 0, imgObj.height - base.height);
      setCrop(next);
      return;
    }

    if (interaction === 'resize' && activeHandle) {
      switch (activeHandle) {
        case 'nw': {
          const newX = limitX(base.x + deltaX);
          const newY = limitY(base.y + deltaY);
          next.width = clampValue(base.width + (base.x - newX), MIN_CROP_SIZE, imgObj.width - newX);
          next.height = clampValue(base.height + (base.y - newY), MIN_CROP_SIZE, imgObj.height - newY);
          next.x = newX;
          next.y = newY;
          break;
        }
        case 'ne': {
          const newY = limitY(base.y + deltaY);
          next.width = clampValue(base.width + deltaX, MIN_CROP_SIZE, imgObj.width - base.x);
          next.height = clampValue(base.height + (base.y - newY), MIN_CROP_SIZE, imgObj.height - newY);
          next.y = newY;
          break;
        }
        case 'sw': {
          const newX = limitX(base.x + deltaX);
          next.width = clampValue(base.width + (base.x - newX), MIN_CROP_SIZE, imgObj.width - newX);
          next.height = clampValue(base.height + deltaY, MIN_CROP_SIZE, imgObj.height - base.y);
          next.x = newX;
          break;
        }
        case 'se': {
          next.width = clampValue(base.width + deltaX, MIN_CROP_SIZE, imgObj.width - base.x);
          next.height = clampValue(base.height + deltaY, MIN_CROP_SIZE, imgObj.height - base.y);
          break;
        }
      }
      setCrop(next);
    }
  };

  const handlePointerEnd = () => {
    setInteraction(null);
    setActiveHandle(null);
    setDragStart(null);
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col p-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6 pt-[env(safe-area-inset-top)]">
        <button onClick={onCancel} className="text-white/60 font-medium px-4">Annuller</button>
        <div className="flex items-center gap-4">
          <button onClick={rotateImage} className="text-white p-2 bg-white/10 rounded-full active:scale-90 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button onClick={() => {
            if (!imgObj) return;
            const maxSide = Math.max(crop.width, crop.height);
            const scale = 1024 / maxSide;
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = Math.max(1, Math.round(crop.width * scale));
            finalCanvas.height = Math.max(1, Math.round(crop.height * scale));
            finalCanvas
              .getContext('2d')
              ?.drawImage(imgObj, crop.x, crop.y, crop.width, crop.height, 0, 0, finalCanvas.width, finalCanvas.height);
            onCrop(finalCanvas.toDataURL('image/jpeg', 0.85));
          }} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold">Udfør</button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center touch-none">
        <canvas 
          ref={canvasRef} 
          width={window.innerWidth - 32} 
          height={window.innerHeight - 180} 
          className="rounded-xl"
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerEnd}
          onMouseLeave={handlePointerEnd}
          onTouchStart={(e) => handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handlePointerEnd}
        />
      </div>
      <p className="text-white/40 text-[10px] text-center mt-4 font-bold uppercase tracking-widest">
        Træk i området eller hjørnerne for at flytte og ændre størrelsen
      </p>
    </div>
  );
};

const VoiceInputButton: React.FC<{ onResult: (text: string) => void; className?: string }> = ({ onResult, className }) => {
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Stemmegenkendelse understøttes ikke i denne browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'da-DK';
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    recognition.start();
  };

  return (
    <button 
      onClick={startListening}
      className={`p-2 rounded-full transition-all active:scale-90 ${isListening ? 'bg-blue-600 text-white animate-pulse' : 'bg-blue-50 text-blue-600'} ${className}`}
      title="Dikter tekst"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    </button>
  );
};

const LoginScreen: React.FC<{ onLogin: (email: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    const lowerEmail = email.toLowerCase().trim();
    if (WHITELIST.includes(lowerEmail)) {
      onLogin(lowerEmail);
    } else {
      setError("Adgang nægtet. E-mail ikke på listen.");
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-8 z-[100] animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-[#2563eb] rounded-[32px] ios-shadow flex items-center justify-center mb-10">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-[#111827] mb-2 tracking-tight">WeCircle-Assistent</h1>
        <p className="text-[#6B7280] font-medium text-lg">Log ind for at fortsætte</p>
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-[#9CA3AF] uppercase ml-1 tracking-widest">E-MAIL</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            placeholder="navn@domæne.dk" 
            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[20px] p-5 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-[#9CA3AF]" 
          />
        </div>
        {error && <div className="text-red-500 text-xs font-bold text-center">{error}</div>}
        <div className="space-y-4">
          <button onClick={handleLogin} className="w-full bg-[#D1D1D1] text-[#717171] py-5 rounded-[22px] font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Log ind med Google
          </button>
          <button onClick={handleLogin} className="w-full bg-[#838383] text-white py-5 rounded-[22px] font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm">
            <svg className="w-6 h-6 mb-1" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 21.8-88.5 21.8-11.4 0-53.8-24.3-89.8-23.6-47.5 1-89.2 27.2-113 70.3-48.4 87.4-12.4 217.3 35.1 285.4 23.3 33.7 51.5 71.3 87.7 70.1 34.6-1.2 47.9-22.3 89.8-22.3 41.9 0 54 22.3 90.5 21.6 37.1-.6 61.6-33.8 85-67.6 27.1-39.2 38.3-77.2 38.6-79.2-.8-.4-74.3-28.5-74.7-106.6zM280.4 71.5c16.1-19.4 26.9-46.3 23.9-73.1-23.3 1-51.2 15.6-67.9 35-14.9 17.2-28 44.2-24.4 70.5 26.1 2 52.3-13.1 68.4-32.4z"/></svg>
            Log ind med Apple ID
          </button>
        </div>
      </div>
      <p className="mt-auto text-[11px] text-[#9CA3AF] font-bold uppercase tracking-[0.25em] pb-8">© 2025 WECIRCLE-ASSISTENT INC.</p>
    </div>
  );
};

// --- MAIN APP ---

const App: React.FC = () => {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [view, setView] = useState<'history' | 'capture' | 'review' | 'settings'>('history');
  const [history, setHistory] = useState<CircleItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [voiceContext, setVoiceContext] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [reviewItem, setReviewItem] = useState<Partial<CircleItem> | null>(null);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [showSimilarLinks, setShowSimilarLinks] = useState(false);
  const [providerStatus, setProviderStatus] = useState<Record<string, ProviderStatus>>({});
  const [isCheckingProviders, setIsCheckingProviders] = useState(false);
  const [usageTotals, setUsageTotals] = useState<UsageTotals>(INITIAL_USAGE_TOTALS);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('wecircle_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (WHITELIST.includes(parsed.email)) setUser(parsed);
      } catch (error) {
        console.warn("Kunne ikke læse cached brugerdata", error);
      }
    }
    const loadData = async () => {
      try {
        const storedHistory = await Storage.getHistory();
        setHistory(storedHistory);
      } catch (error) {
        console.warn("Kunne ikke hente historik", error);
      } finally { setIsLoadingHistory(false); }
    };
    loadData();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USAGE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUsageTotals({
          runs: parsed.runs || 0,
          promptTokens: parsed.promptTokens || 0,
          completionTokens: parsed.completionTokens || 0,
          totalTokens: parsed.totalTokens || 0,
          costUsd: parsed.costUsd || 0
        });
      }
    } catch (error) {
      console.warn('Kunne ikke læse forbrugsdata', error);
    }
  }, []);

  useEffect(() => {
    const fetchProviderStatus = async () => {
      setIsCheckingProviders(true);
      try {
        const providerStatusUrl = (() => {
          const base = ANALYZE_API_URL.replace(/\/?analyze(\.ts)?$/i, "");
          if (!base || base === "/") return "/api/providerStatus";
          if (base.endsWith("/api")) return `${base}/providerStatus`;
          if (base.endsWith("/api/")) return `${base}providerStatus`;
          return `${base}/api/providerStatus`;
        })();
        const response = await fetch(providerStatusUrl);
        if (!response.ok) throw new Error('Status endpoint fejlede');
        const data = await response.json();
        const map: Record<string, ProviderStatus> = {};
        data.statuses?.forEach((entry: { provider: string; hasKey: boolean }) => {
          map[entry.provider] = entry.hasKey ? 'connected' : 'missing';
        });
        setProviderStatus(map);
      } catch (error) {
        console.warn('Kunne ikke hente provider-status', error);
      } finally {
        setIsCheckingProviders(false);
      }
    };
    fetchProviderStatus();
  }, []);

  const recordUsage = (usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number; costUsd?: number; }) => {
    const totalIncrement = usage?.totalTokens ?? ((usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0));
    setUsageTotals(prev => {
      const next = {
        runs: prev.runs + 1,
        promptTokens: prev.promptTokens + (usage?.promptTokens ?? 0),
        completionTokens: prev.completionTokens + (usage?.completionTokens ?? 0),
        totalTokens: prev.totalTokens + totalIncrement,
        costUsd: prev.costUsd + (usage?.costUsd ?? 0)
      };
      try {
        localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.warn('Kunne ikke gemme forbrugsdata', error);
      }
      return next;
    });
  };

  const resetUsage = () => {
    setUsageTotals(INITIAL_USAGE_TOTALS);
    try {
      localStorage.removeItem(USAGE_STORAGE_KEY);
    } catch (error) {
      console.warn('Kunne ikke nulstille forbrugsdata', error);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setCapturedPhotos(prev => [...prev, compressed]);
        setAnalysisError(null);
      };
      reader.readAsDataURL(file);
    });
    if (view !== 'capture') setView('capture');
  };

  const handleQuickRotate = async (idx: number) => {
    const rotated = await rotateImageBase64(capturedPhotos[idx]);
    setCapturedPhotos(prev => prev.map((img, i) => i === idx ? rotated : img));
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await Storage.deleteHistoryItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Kunne ikke slette varen.", err);
      alert("Kunne ikke slette varen.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('wecircle_user');
  };

  const handleAnalyze = async () => {
    if (capturedPhotos.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const { result, usage } = await analyzeItem(capturedPhotos, settings, voiceContext);
      setReviewItem({
        photos: capturedPhotos,
        description: result.description,
        price: result.price,
        priceNew: result.priceNew,
        currency: settings.currency,
        details: { 
          brand: result.brand,
          type: result.type,
          color: result.color,
          size: result.size,
          material: result.material,
          condition: result.condition,
          style: result.style
        },
        similarLinks: result.similarLinks
      });
      recordUsage(usage);
      setView('review');
      setShowSimilarLinks(false);
    } catch (error: any) {
      setAnalysisError(error.message || "Der opstod en fejl under analysen.");
    } finally { setIsAnalyzing(false); }
  };

  if (!user) return <LoginScreen onLogin={(e) => { setUser({email: e}); localStorage.setItem('wecircle_user', JSON.stringify({email: e})); }} />;

  const currentProvider = PROVIDERS.find(p => p.id === settings.provider);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-gray-50 font-inter text-[#111827]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-6 py-4 pt-[env(safe-area-inset-top)] flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">
          {view === 'history' ? 'Mine Emner' : view === 'capture' ? 'Nyt Emne' : view === 'review' ? 'Gennemse' : 'Indstillinger'}
        </h1>
      </header>

      <main className="flex-1 p-6 pb-32">
        {view === 'history' && (
          <div className="space-y-0 animate-in fade-in">
            {isLoadingHistory ? (
              <div className="flex justify-center pt-20"><div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-20 text-gray-300 opacity-40">
                <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                <p className="font-bold uppercase tracking-widest text-[10px]">Ingen varer endnu</p>
              </div>
              ) : (
                history.map(item => {
                  const basePrice = typeof item.price === 'number' ? item.price : 0;
                  const netPrice = calculateNetPrice(basePrice, settings.discountPercent, settings.commissionPercent);
                  return (
                    <SwipeableListItem 
                      key={item.id} 
                      item={item} 
                      netPrice={netPrice}
                      onDelete={handleDeleteHistoryItem} 
                      onClick={() => { setReviewItem(item); setView('review'); setShowSimilarLinks(false); }} 
                    />
                  );
                })
              )}
            </div>
          )}

        {view === 'capture' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              {capturedPhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-[24px] overflow-hidden bg-white border border-gray-100 ios-shadow group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => handleQuickRotate(idx)} className="bg-black/40 backdrop-blur text-white p-2 rounded-xl active:scale-90 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={() => setCapturedPhotos(p => p.filter((_, i) => i !== idx))} className="bg-red-500/80 backdrop-blur text-white p-2 rounded-xl active:scale-90 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <button onClick={() => setCropIndex(idx)} className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur py-2 rounded-xl text-[10px] font-bold uppercase text-[#111827] shadow-sm active:scale-95 transition-all">Beskær</button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-[24px] border-2 border-dashed border-[#E5E7EB] flex flex-col items-center justify-center text-[#9CA3AF] active:bg-gray-100 transition-colors">
                <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                <span className="text-[10px] font-bold uppercase tracking-widest">Tilføj Foto</span>
              </button>
              <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
            </div>

            <section className="bg-white rounded-[28px] p-6 ios-shadow space-y-4 border border-white">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em]">Stemme-kontekst (Valgfrit)</label>
                <VoiceInput onResult={(t) => setVoiceContext(prev => prev + (prev ? " " : "") + t)} />
              </div>
              <textarea 
                value={voiceContext} onChange={(e) => setVoiceContext(e.target.value)}
                placeholder="Fortæl om stand, nypris eller andet..."
                rows={4} className="w-full bg-[#F9FAFB] border-none rounded-[20px] p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-300"
              />
            </section>

            {analysisError && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-[22px] animate-in fade-in zoom-in duration-200">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Analyse-fejl</p>
                    <p className="text-sm text-red-700 font-medium leading-relaxed">{analysisError}</p>
                    <button onClick={() => setAnalysisError(null)} className="mt-2 text-[10px] font-black text-red-500 uppercase tracking-tighter hover:underline">Fjern besked</button>
                  </div>
                </div>
              </div>
            )}

            <button disabled={capturedPhotos.length === 0 || isAnalyzing} onClick={handleAnalyze} className="w-full bg-[#2563eb] text-white py-5 rounded-[22px] font-bold text-lg shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
              {isAnalyzing ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                  <span>Analyserer...</span>
                </>
              ) : "Identificer & Prissæt"}
            </button>
          </div>
        )}

        {view === 'review' && reviewItem && (
          <div className="space-y-6 animate-in fade-in pb-10">
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
              {reviewItem.photos?.map((photo, idx) => <img key={idx} src={photo} className="w-28 h-28 object-cover rounded-2xl border bg-white shadow-sm" />)}
            </div>

            <section className="bg-white rounded-[28px] p-6 ios-shadow space-y-6 border border-white">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest px-1">Titel</label>
                  <VoiceInputButton onResult={(t) => setReviewItem({ ...reviewItem, description: t })} />
                </div>
                <textarea
                  value={reviewItem.description}
                  onChange={(e) => setReviewItem({ ...reviewItem, description: e.target.value })}
                  className="w-full bg-[#F9FAFB] border-none rounded-[20px] p-4 text-base font-bold resize-none leading-snug"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9CA3AF] uppercase px-1">Nypris ({settings.currency})</label>
                  <input type="number" value={reviewItem.priceNew || ''} onChange={(e) => setReviewItem({ ...reviewItem, priceNew: parseFloat(e.target.value) || 0 })} className="w-full bg-[#F9FAFB] border-none rounded-[20px] p-4 text-lg font-bold text-gray-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9CA3AF] uppercase px-1">Vurderet Pris ({settings.currency})</label>
                  <input type="number" value={reviewItem.price || ''} onChange={(e) => setReviewItem({ ...reviewItem, price: parseFloat(e.target.value) || 0 })} className="w-full bg-[#F9FAFB] border-none rounded-[20px] p-4 text-lg font-bold text-blue-600" />
                  {Number.isFinite(reviewItem.price) && (
                    <p className="text-[11px] font-bold text-green-600 px-1">
                      Efter WeCircle: {formatCurrency(calculateNetPrice(reviewItem.price || 0, settings.discountPercent, settings.commissionPercent), settings.currency)}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[28px] p-6 ios-shadow space-y-4 border border-white">
              <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest px-1">Vare-detaljer</label>
              <div className="grid grid-cols-2 gap-3">
                {['brand', 'type', 'color', 'size', 'condition', 'material', 'style'].map(field => (
                  <div key={field} className="bg-[#F9FAFB] p-3 rounded-[16px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-[#9CA3AF] uppercase font-bold">{field}</span>
                      <VoiceInputButton
                        onResult={(text) => setReviewItem(prev => ({
                          ...prev,
                          details: { ...prev?.details, [field]: text }
                        }))}
                        className="p-1 bg-transparent text-[#9CA3AF] hover:text-blue-600"
                      />
                    </div>
                    <textarea
                      className="w-full bg-transparent border-none text-sm font-semibold leading-snug resize-none"
                      rows={2}
                      value={reviewItem.details?.[field as keyof typeof reviewItem.details] || ''}
                      onChange={(e) => setReviewItem({ ...reviewItem, details: { ...reviewItem.details, [field]: e.target.value } })}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Collapsible Similar Links Section */}
            {reviewItem.similarLinks && reviewItem.similarLinks.length > 0 && (
              <section className="bg-white rounded-[28px] overflow-hidden ios-shadow border border-white">
                <button 
                  onClick={() => setShowSimilarLinks(!showSimilarLinks)}
                  className="w-full p-6 flex justify-between items-center active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className={`w-5 h-5 text-blue-600 transition-transform ${showSimilarLinks ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                    <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Lignende varer til salg ({reviewItem.similarLinks.length})</label>
                  </div>
                </button>
                {showSimilarLinks && (
                  <div className="px-6 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {reviewItem.similarLinks.map((link, idx) => {
                      let domain = "Link";
                      try { domain = new URL(link).hostname.replace('www.', ''); } catch(error) {
                        console.warn("Ugyldigt link i similarLinks", link, error);
                      }
                      return (
                        <a 
                          key={idx} 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between bg-[#F9FAFB] p-4 rounded-[16px] group active:bg-gray-100 transition-all border border-transparent hover:border-blue-100"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter block mb-0.5">{domain}</span>
                            <div className="text-[11px] font-semibold text-[#111827] truncate">{link}</div>
                          </div>
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            <button onClick={() => {
              const item = { ...reviewItem, id: reviewItem.id || Date.now().toString(), timestamp: Date.now() } as CircleItem;
              Storage.saveHistoryItem(item);
              setHistory(prev => [item, ...prev.filter(i => i.id !== item.id)]);
              setView('history');
              setCapturedPhotos([]);
              setVoiceContext("");
              setAnalysisError(null);
            }} className="w-full bg-[#2563eb] text-white py-5 rounded-[22px] font-bold text-lg shadow-xl active:scale-95 transition-all">Gem Emne</button>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-6 animate-in fade-in pb-10">
            {/* AI Settings Section */}
            <section className="bg-white rounded-[28px] overflow-hidden ios-shadow border border-white">
              <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-1">AI Konfiguration</h3>
                {(() => {
                  const status = providerStatus[settings.provider];
                  const label = isCheckingProviders
                    ? 'Kontrollerer...'
                    : status === 'connected'
                      ? 'Forbundet'
                      : status === 'missing'
                        ? 'Mangler API nøgle'
                        : 'Ukendt';
                  const style = status === 'connected'
                    ? 'bg-green-100 text-green-600'
                    : status === 'missing'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-500';
                  return (
                    <span className={`${style} text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter`}>
                      {label}
                    </span>
                  );
                })()}
              </div>
              <div className="divide-y divide-gray-50">
                <div className="p-5 flex justify-between items-center">
                  <span className="text-sm font-semibold">Udbyder</span>
                  <select 
                    value={settings.provider} 
                    onChange={(e) => {
                      const newProvider = e.target.value;
                      setSettings(prev => {
                        const models = MODELS_BY_PROVIDER[newProvider] || [];
                        const nextModel = models.find(m => m.id === prev.model)?.id || models[0]?.id || "";
                        return { ...prev, provider: newProvider, model: nextModel };
                      });
                    }}
                    className="bg-transparent text-sm font-bold text-blue-600 outline-none"
                  >
                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Model</span>
                    <div className="flex items-center gap-2">
                      <select 
                        value={settings.model} 
                        onChange={(e) => setSettings(prev => ({...prev, model: e.target.value}))}
                        className="bg-transparent text-sm font-bold text-blue-600 outline-none text-right max-w-[180px] truncate"
                      >
                        {MODELS_BY_PROVIDER[settings.provider]?.length
                          ? MODELS_BY_PROVIDER[settings.provider]!.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                          : <option value="">Ingen modeller tilgængelige</option>
                        }
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-[#9CA3AF]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-[10px] font-bold uppercase tracking-tight">{currentProvider?.name}: {settings.model}</span>
                    </div>
                    {currentProvider?.apiKeyUrl && (
                      <a 
                        href={currentProvider.apiKeyUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 uppercase tracking-tighter"
                      >
                        Hent nøgle
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* WeCircle configuration */}
            <section className="bg-white rounded-[28px] overflow-hidden ios-shadow border border-white">
              <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-1">WeCircle</h3>
                <span className="bg-blue-100 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  Provision {Math.round(settings.commissionPercent * 100)}%
                </span>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Rabat</span>
                  <select
                    value={settings.discountPercent}
                    onChange={(e) => setSettings(prev => ({ ...prev, discountPercent: parseFloat(e.target.value) }))}
                    className="bg-transparent text-sm font-bold text-blue-600 outline-none"
                  >
                    {DISCOUNT_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {Math.round(option * 100)}%
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-[#6B7280] font-semibold">
                  Din pris til kunden reduceres med valgt rabat, og vi trækker altid {Math.round(settings.commissionPercent * 100)}% provision bagefter.
                </p>
              </div>
            </section>

            <section className="bg-white rounded-[28px] overflow-hidden ios-shadow border border-white">
              <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-1">Forbrug</h3>
                <button onClick={resetUsage} className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter hover:underline">
                  Nulstil
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm font-semibold">
                  <div className="bg-[#F9FAFB] rounded-[16px] p-3">
                    <p className="text-[10px] uppercase text-[#9CA3AF] font-bold">Analyser</p>
                    <p>{usageTotals.runs}</p>
                  </div>
                  <div className="bg-[#F9FAFB] rounded-[16px] p-3">
                    <p className="text-[10px] uppercase text-[#9CA3AF] font-bold">Samlet tokens</p>
                    <p>{usageTotals.totalTokens}</p>
                  </div>
                  <div className="bg-[#F9FAFB] rounded-[16px] p-3">
                    <p className="text-[10px] uppercase text-[#9CA3AF] font-bold">Prompt tokens</p>
                    <p>{usageTotals.promptTokens}</p>
                  </div>
                  <div className="bg-[#F9FAFB] rounded-[16px] p-3">
                    <p className="text-[10px] uppercase text-[#9CA3AF] font-bold">Svar tokens</p>
                    <p>{usageTotals.completionTokens}</p>
                  </div>
                </div>
                <div className="bg-[#F9FAFB] rounded-[16px] p-3">
                  <p className="text-[10px] uppercase text-[#9CA3AF] font-bold">Estimeret pris (USD)</p>
                  <p className="text-sm font-semibold">{formatUsd(usageTotals.costUsd)}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-1">Kun vist, hvis udbyderen rapporterer omkostninger.</p>
                </div>
              </div>
            </section>

            {/* Prompt configuration section */}
            <section className="bg-white rounded-[28px] overflow-hidden ios-shadow border border-white">
              <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-1">Prompt Konfiguration</h3>
                <button 
                  onClick={() => setSettings({...settings, customPrompt: DEFAULT_SETTINGS.customPrompt})}
                  className="text-[9px] font-black text-blue-600 uppercase tracking-tighter active:scale-95 transition-transform"
                >
                  Nulstil
                </button>
              </div>
              <div className="p-5">
                <textarea 
                  value={settings.customPrompt}
                  onChange={(e) => setSettings({...settings, customPrompt: e.target.value})}
                  placeholder="Indtast instruktioner til AI..."
                  rows={8}
                  className="w-full bg-[#F9FAFB] border-none rounded-[20px] p-4 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-300 leading-relaxed"
                />
                <p className="mt-3 text-[9px] text-[#9CA3AF] font-medium leading-normal px-1">
                  Brug <span className="text-blue-500 font-bold">{"{language}"}</span> og <span className="text-blue-500 font-bold">{"{currency}"}</span> som pladsholdere for de valgte indstillinger.
                </p>
              </div>
            </section>

            {/* Regional Settings Section */}
            <section className="bg-white rounded-[28px] overflow-hidden ios-shadow border border-white">
              <div className="p-5 border-b border-gray-50">
                <h3 className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-1">Regionalt</h3>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="p-5 flex justify-between items-center">
                  <span className="text-sm font-semibold">Sprog</span>
                  <select 
                    value={settings.language} 
                    onChange={(e) => setSettings({...settings, language: e.target.value})}
                    className="bg-transparent text-sm font-bold text-blue-600 outline-none"
                  >
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="p-5 flex justify-between items-center">
                  <span className="text-sm font-semibold">Valuta</span>
                  <select 
                    value={settings.currency} 
                    onChange={(e) => setSettings({...settings, currency: e.target.value})}
                    className="bg-transparent text-sm font-bold text-blue-600 outline-none"
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Account Section */}
            <section className="bg-white rounded-[28px] overflow-hidden ios-shadow border border-white">
              <div className="p-5 border-b border-gray-50">
                <h3 className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-1">Brugerkonto</h3>
              </div>
              <div className="p-5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold truncate max-w-[180px]">{user?.email}</span>
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Logget ind</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="bg-red-50 text-red-600 px-5 py-2 rounded-full text-xs font-bold active:scale-95 transition-all border border-red-100"
                >
                  Log ud
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {cropIndex !== null && <CropModal src={capturedPhotos[cropIndex]} onCancel={() => setCropIndex(null)} onCrop={(res) => { setCapturedPhotos(p => p.map((img, i) => i === cropIndex ? res : img)); setCropIndex(null); }} />}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 safe-area-bottom px-10 py-3 flex justify-between items-center z-50">
        <button onClick={() => { setView('history'); setAnalysisError(null); }} className={`flex flex-col items-center gap-1.5 ${view === 'history' ? 'text-blue-600' : 'text-gray-300'}`}>
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <span className="text-[9px] font-bold uppercase tracking-widest">Varer</span>
        </button>
        <button onClick={() => { if (view !== 'capture') setView('capture'); else fileInputRef.current?.click(); setAnalysisError(null); }} className="bg-[#2563eb] text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center -translate-y-6 border-4 border-white active:scale-90 transition-all">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
        </button>
        <button onClick={() => { setView('settings'); setAnalysisError(null); }} className={`flex flex-col items-center gap-1.5 ${view === 'settings' ? 'text-blue-600' : 'text-gray-300'}`}>
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
          <span className="text-[9px] font-bold uppercase tracking-widest">Profil</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
