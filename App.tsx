
import React, { useState, useEffect, useRef } from 'react';
import { analyzeItem } from './services/aiService';
import * as Storage from './services/storageService';
import { AppSettings, CircleItem } from './types';
import { DEFAULT_SETTINGS, PROVIDERS, MODELS_BY_PROVIDER, LANGUAGES, CURRENCIES } from './constants';

// Allowed users
const WHITELIST = [
  'stoffer@nose.dk',
  'pgg@nose.dk',
  'stilettorebel@hotmail.com',
  'simon.ellefsen@gmail.com'
];

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

const generateAutoDescription = (details: CircleItem['details']) => {
  const parts = [
    details.brand,
    details.type,
    details.color,
    details.size ? `str. ${details.size}` : ''
  ].filter(p => p && p.toLowerCase() !== 'ukendt' && p.trim() !== '');
  
  return parts.join(' ').substring(0, 58);
};

// --- AUTH COMPONENTS ---

const LoginScreen: React.FC<{ onLogin: (email: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Simulate OAuth handshake
    setTimeout(() => {
      const lowerEmail = email.toLowerCase().trim();
      if (WHITELIST.includes(lowerEmail)) {
        onLogin(lowerEmail);
      } else {
        setError("Adgang nægtet. Din e-mail er ikke på listen over godkendte brugere.");
        setIsLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-8 z-[100] animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-blue-600 rounded-3xl ios-shadow flex items-center justify-center mb-8 rotate-3">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">WeCircle-Assistent</h1>
        <p className="text-gray-500 font-medium">Log ind for at fortsætte</p>
      </div>

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Arbejds e-mail</label>
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="navn@domæne.dk"
            required
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-100 animate-in shake duration-300">
            {error}
          </div>
        )}

        <button 
          type="submit"
          disabled={isLoading || !email}
          className="w-full bg-[#808080] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Log ind med Google
            </>
          )}
        </button>
      </form>

      <p className="mt-auto text-[10px] text-gray-400 font-bold uppercase tracking-widest pb-4">
        &copy; 2025 WECIRCLE-ASSISTENT INC.
      </p>
    </div>
  );
};

// --- MAIN UI COMPONENTS ---

const Header = ({ title }: { title: string }) => (
  <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 pt-[env(safe-area-inset-top)]">
    <h1 className="text-lg font-semibold text-center text-gray-900">{title}</h1>
  </header>
);

const HistoryCard: React.FC<{ 
  item: CircleItem, 
  onDelete: (id: string) => void,
  onEdit: (item: CircleItem) => void 
}> = ({ item, onDelete, onEdit }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.description);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={() => onEdit(item)}
      className="w-full text-left bg-white rounded-2xl p-4 ios-shadow mb-4 flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 active:scale-[0.97] transition-all border border-transparent active:border-blue-100 outline-none block"
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100">
        <img src={item.photos[0]} alt="Item" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-blue-600 mb-0.5">
              {item.price} {item.currency}
            </p>
            <span 
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="text-gray-300 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </div>
          <p className="text-base font-medium text-gray-900 line-clamp-2 mb-2 leading-tight">
            {item.description}
          </p>
        </div>
        <div className="flex gap-2">
          <span 
            onClick={copyToClipboard}
            className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-all ${
              copied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            {copied ? 'Kopieret' : 'Kopier'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 active:bg-blue-100">
            Rediger
          </span>
        </div>
      </div>
    </button>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [view, setView] = useState<'history' | 'capture' | 'review' | 'settings'>('history');
  const [history, setHistory] = useState<CircleItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [reviewItem, setReviewItem] = useState<Partial<CircleItem> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('wecircle_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (WHITELIST.includes(parsed.email)) {
          setUser(parsed);
        }
      } catch (e) { console.error(e); }
    }

    const loadData = async () => {
      try {
        const storedHistory = await Storage.getHistory();
        setHistory(storedHistory);
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
      const savedSettings = localStorage.getItem('wecircle_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (e) { console.error(e); }
      }
    };
    loadData();
  }, []);

  const handleLoginSuccess = (email: string) => {
    const newUser = { email };
    setUser(newUser);
    localStorage.setItem('wecircle_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('wecircle_user');
  };

  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('wecircle_settings', JSON.stringify(newSettings));
  };

  const handleProviderChange = (newProvider: string) => {
    const models = MODELS_BY_PROVIDER[newProvider] || [];
    const firstModel = models.length > 0 ? models[0].id : '';
    saveSettings({ ...settings, provider: newProvider, model: firstModel });
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Er du sikker på, at du vil slette dette emne?")) return;
    try {
      await Storage.deleteHistoryItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleEditItem = (item: CircleItem) => {
    setReviewItem({ ...item });
    setView('review');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setCapturedPhotos(prev => [...prev, compressed]);
      };
      reader.readAsDataURL(file);
    });
    if (view !== 'capture' && view !== 'review') setView('capture');
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleAnalyze = async () => {
    if (capturedPhotos.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeItem(capturedPhotos, settings);
      setReviewItem({
        photos: capturedPhotos,
        description: result.description,
        price: result.price,
        currency: settings.currency,
        details: {
          brand: result.brand,
          type: result.type,
          color: result.color,
          size: result.size,
        },
        similarLink: result.similarLink
      });
      setView('review');
    } catch (error: any) {
      setAnalysisError(error.message || "Der skete en fejl under analysen.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReEstimate = async () => {
    if (!reviewItem || !reviewItem.photos) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const context = `Mærke: ${reviewItem.details?.brand}, Type: ${reviewItem.details?.type}, Farve: ${reviewItem.details?.color}, Størrelse: ${reviewItem.details?.size}. Beskrivelse: ${reviewItem.description}`;
      const result = await analyzeItem(reviewItem.photos, settings, context);
      setReviewItem({
        ...reviewItem,
        price: result.price,
        description: result.description,
        similarLink: result.similarLink || reviewItem.similarLink
      });
    } catch (error: any) {
      setAnalysisError(error.message || "Kunne ikke re-estimere pris.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveReview = async () => {
    if (!reviewItem) return;
    const isExisting = !!reviewItem.id;
    const itemToSave: CircleItem = {
      id: reviewItem.id || Date.now().toString(),
      timestamp: reviewItem.timestamp || Date.now(),
      photos: reviewItem.photos || [],
      description: reviewItem.description || '',
      price: reviewItem.price || 0,
      currency: reviewItem.currency || settings.currency,
      details: reviewItem.details || {},
      similarLink: reviewItem.similarLink
    };
    try {
      await Storage.saveHistoryItem(itemToSave);
      if (isExisting) {
        setHistory(prev => prev.map(item => item.id === itemToSave.id ? itemToSave : item));
      } else {
        setHistory(prev => [itemToSave, ...prev]);
      }
      setCapturedPhotos([]);
      setReviewItem(null);
      setView('history');
    } catch (err) { setAnalysisError("Kunne ikke gemme emnet."); }
  };

  const updateDetailAndDescription = (key: keyof CircleItem['details'], value: string) => {
    if (!reviewItem) return;
    const newDetails = { ...reviewItem.details, [key]: value };
    const currentDesc = reviewItem.description || '';
    const autoDesc = generateAutoDescription(reviewItem.details || {});
    const shouldAutoUpdate = !currentDesc || 
                            currentDesc.toLowerCase().includes('ukendt') || 
                            currentDesc === autoDesc ||
                            currentDesc.trim() === '';

    setReviewItem({
      ...reviewItem,
      details: newDetails,
      description: shouldAutoUpdate ? generateAutoDescription(newDetails) : currentDesc
    });
  };

  const isDetailMissing = (val: string | undefined) => !val || val.toLowerCase() === 'ukendt';

  if (!user) {
    return <LoginScreen onLogin={handleLoginSuccess} />;
  }

  const selectedProviderInfo = PROVIDERS.find(p => p.id === settings.provider);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      <Header title={
        view === 'history' ? 'Mine Emner' : 
        view === 'capture' ? 'Nyt Emne' : 
        view === 'review' ? (reviewItem?.id ? 'Rediger Emne' : 'Gennemse Emne') :
        'Indstillinger'
      } />

      <main className="flex-1 p-4 pb-32">
        {view === 'history' && (
          <div className="space-y-4">
            {isLoadingHistory ? (
              <div className="flex justify-center pt-20">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-center font-medium">Ingen historik endnu.<br/>Tag et billede for at starte.</p>
              </div>
            ) : (
              history.map(item => <HistoryCard key={item.id} item={item} onDelete={handleDeleteItem} onEdit={handleEditItem} />)
            )}
          </div>
        )}

        {view === 'capture' && (
          <div className="flex flex-col gap-6 h-full animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-3">
              {capturedPhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img src={photo} alt="Capture" className="w-full h-full object-cover" />
                  <button onClick={() => setCapturedPhotos(prev => prev.filter((_, i) => i !== idx))} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              <button onClick={triggerFileInput} className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 active:bg-gray-100 transition-colors ios-btn-active">
                <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                <span className="text-xs font-semibold">Tilføj foto</span>
              </button>
            </div>
            {analysisError && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">{analysisError}</div>}
            <div className="mt-auto space-y-3">
              <button disabled={capturedPhotos.length === 0 || isAnalyzing} onClick={handleAnalyze} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg shadow-lg active:scale-[0.96] transition-all disabled:opacity-50 disabled:active:scale-100">
                {isAnalyzing ? "Analyserer..." : "Identificer & Prissæt"}
              </button>
              <button onClick={() => { setView('history'); setCapturedPhotos([]); }} className="w-full py-3 text-gray-500 font-medium ios-btn-active">Annuller</button>
            </div>
          </div>
        )}

        {view === 'review' && reviewItem && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
              {reviewItem.photos?.map((photo, idx) => <img key={idx} src={photo} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-gray-200 flex-shrink-0" />)}
            </div>

            {Object.values(reviewItem.details || {}).some(v => isDetailMissing(v as string | undefined)) && (
              <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex gap-3 items-center">
                <span className="text-xl">⚠️</span>
                <p className="text-xs text-orange-800 font-medium leading-tight">Nogle detaljer mangler. Udfyld dem for bedre prissætning.</p>
              </div>
            )}

            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Annoncetekst (Maks 58 tegn)</h2>
                <button onClick={() => setReviewItem({ ...reviewItem, description: generateAutoDescription(reviewItem.details || {}) })} className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Nulstil
                </button>
              </div>
              <textarea value={reviewItem.description} maxLength={58} onChange={(e) => setReviewItem({ ...reviewItem, description: e.target.value })} rows={2} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium leading-tight" />
            </section>

            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Produktdetaljer</h2>
              <div className="grid grid-cols-2 gap-4">
                {[ { label: 'Mærke', key: 'brand' }, { label: 'Type', key: 'type' }, { label: 'Farve', key: 'color' }, { label: 'Størrelse', key: 'size' }].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1">{field.label}</label>
                    <input type="text" value={reviewItem.details?.[field.key as keyof typeof reviewItem.details] || ''} onChange={(e) => updateDetailAndDescription(field.key as keyof CircleItem['details'], e.target.value)} placeholder="Mangler..." className={`w-full bg-gray-50 border rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDetailMissing(reviewItem.details?.[field.key as keyof typeof reviewItem.details] as string | undefined) ? 'border-orange-200 bg-orange-50/30 text-orange-800 placeholder-orange-300' : 'border-gray-100 text-gray-700'}`} />
                  </div>
                ))}
              </div>
              <div className="pt-2 flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Vurderet Pris ({settings.currency})</label>
                  <input type="number" inputMode="decimal" value={reviewItem.price || ''} onChange={(e) => setReviewItem({ ...reviewItem, price: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-lg font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button 
                  disabled={isAnalyzing}
                  onClick={handleReEstimate}
                  className="bg-blue-50 text-blue-600 h-14 px-4 rounded-xl flex items-center justify-center font-bold text-xs uppercase transition-all active:scale-95 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : "Re-vurder"}
                </button>
              </div>
              {reviewItem.similarLink && (
                <div className="pt-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Lignende vare fundet</label>
                  <a href={reviewItem.similarLink} target="_blank" rel="noopener noreferrer" className="block w-full bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-600 font-medium truncate underline decoration-blue-200">
                    Se på nettet →
                  </a>
                </div>
              )}
            </section>

            <div className="space-y-3 pt-4">
              <button onClick={handleSaveReview} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg shadow-lg active:scale-[0.96] transition-all">Gem Ændringer</button>
              <button onClick={() => { if (reviewItem.id) setView('history'); else setView('capture'); setReviewItem(null); }} className="w-full py-3 text-gray-500 font-medium active:text-gray-900">Annuller</button>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-300 pb-10">
            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Brugerprofil</h2>
              <div className="flex items-center justify-between p-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                  <p className="text-[10px] font-bold text-green-500 uppercase">Autoriseret adgang</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-xs uppercase"
                >
                  Log ud
                </button>
              </div>
            </section>

            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lokalisering</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-medium text-gray-500 ml-1">Sprog</label>
                  <select value={settings.language} onChange={(e) => saveSettings({ ...settings, language: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-medium text-gray-500 ml-1">Valuta</label>
                  <select value={settings.currency} onChange={(e) => saveSettings({ ...settings, currency: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Konfiguration</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1">AI Udbyder</label>
                  <select 
                    value={settings.provider} 
                    onChange={(e) => handleProviderChange(e.target.value)} 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Model</label>
                  <select 
                    value={settings.model} 
                    onChange={(e) => saveSettings({ ...settings, model: e.target.value })} 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {(MODELS_BY_PROVIDER[settings.provider] || []).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                {selectedProviderInfo?.apiKeyUrl && (
                  <div className="pt-2 px-1">
                    <a 
                      href={selectedProviderInfo.apiKeyUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Hvordan får jeg en API nøgle til {selectedProviderInfo.name}?
                    </a>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4 mb-10">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prompt Instrukser</h2>
                <button onClick={() => { if (window.confirm("Vil du nulstille til standard?")) saveSettings(DEFAULT_SETTINGS); }} className="text-[10px] font-bold text-blue-600 uppercase">Nulstil</button>
              </div>
              <textarea value={settings.customPrompt} onChange={(e) => saveSettings({ ...settings, customPrompt: e.target.value })} rows={6} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed" />
            </section>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 safe-area-bottom px-8 py-2 flex justify-between items-center z-50">
        <button onClick={() => { setView('history'); setReviewItem(null); }} className={`flex flex-col items-center gap-1 transition-colors active:scale-90 ${view === 'history' ? 'text-blue-600' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill={view === 'history' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <span className="text-[10px] font-bold">Varer</span>
        </button>

        <div className="relative -top-5">
          <button onClick={() => { if (view === 'review') { setView('history'); setCapturedPhotos([]); setReviewItem(null); } triggerFileInput(); }} className="bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-200 flex items-center justify-center active:scale-90 transition-all border-4 border-white">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          </button>
          <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
        </div>

        <button onClick={() => { setView('settings'); setReviewItem(null); }} className={`flex flex-col items-center gap-1 transition-colors active:scale-90 ${view === 'settings' ? 'text-blue-600' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill={view === 'settings' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="text-[10px] font-bold">Indstil</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
