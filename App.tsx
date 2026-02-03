
import React, { useState, useEffect, useRef } from 'react';
import { analyzeItem } from './services/aiService';
import * as Storage from './services/storageService';
import { AppSettings, CircleItem, AIResult } from './types';
import { DEFAULT_SETTINGS, PROVIDERS, MODELS_BY_PROVIDER, LANGUAGES, CURRENCIES } from './constants';

// Utility for image compression
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

// UI Components
const Header = ({ title }: { title: string }) => (
  <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3">
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
    <div 
      onClick={() => onEdit(item)}
      className="bg-white rounded-2xl p-4 ios-shadow mb-4 flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer active:scale-[0.98] transition-all"
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
        <img src={item.photos[0]} alt="Item" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-sm font-medium text-blue-600 mb-1">
            {item.price} {item.currency}
          </p>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="text-gray-300 hover:text-red-500 transition-colors p-1 -mt-1 -mr-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-base font-medium text-gray-900 line-clamp-2 mb-2 leading-tight">
          {item.description}
        </p>
        <div className="flex gap-2">
          <button 
            onClick={copyToClipboard}
            className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-all ${
              copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            {copied ? 'Kopieret' : 'Kopier'}
          </button>
          <button 
            className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 active:bg-blue-100"
          >
            Rediger
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
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
        } catch (e) {
          console.error("Failed to parse settings", e);
        }
      }
    };
    loadData();
  }, []);

  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('wecircle_settings', JSON.stringify(newSettings));
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Er du sikker på, at du vil slette dette emne?")) return;
    try {
      await Storage.deleteHistoryItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const handleEditItem = (item: CircleItem) => {
    setReviewItem(item);
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
    if (view !== 'capture' && view !== 'review') {
      setView('capture');
    }
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
        }
      });
      setView('review');
    } catch (error: any) {
      console.error(error);
      setAnalysisError(error.message || "Der skete en fejl under analysen.");
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
      details: reviewItem.details || {}
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
    } catch (err) {
      setAnalysisError("Kunne ikke gemme emnet.");
    }
  };

  const isDetailMissing = (val: string | undefined) => !val || val.toLowerCase() === 'ukendt';

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24">
      <Header title={
        view === 'history' ? 'Mine Emner' : 
        view === 'capture' ? 'Nyt Emne' : 
        view === 'review' ? (reviewItem?.id ? 'Rediger Emne' : 'Gennemse Emne') :
        'Indstillinger'
      } />

      <main className="flex-1 p-4">
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
              history.map(item => (
                <HistoryCard 
                  key={item.id} 
                  item={item} 
                  onDelete={handleDeleteItem} 
                  onEdit={handleEditItem}
                />
              ))
            )}
          </div>
        )}

        {view === 'capture' && (
          <div className="flex flex-col gap-6 h-full animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-3">
              {capturedPhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img src={photo} alt="Capture" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setCapturedPhotos(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button 
                onClick={triggerFileInput}
                className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 active:bg-gray-50 transition-colors"
              >
                <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-semibold">Tilføj foto</span>
              </button>
            </div>

            {analysisError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                {analysisError}
              </div>
            )}

            <div className="mt-auto space-y-3">
              <button 
                disabled={capturedPhotos.length === 0 || isAnalyzing}
                onClick={handleAnalyze}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {isAnalyzing ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyserer...
                  </div>
                ) : 'Identificer & Prissæt'}
              </button>
              <button 
                onClick={() => { setView('history'); setCapturedPhotos([]); }}
                className="w-full py-3 text-gray-500 font-medium active:text-gray-900"
              >
                Annuller
              </button>
            </div>
          </div>
        )}

        {view === 'review' && reviewItem && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {reviewItem.photos?.map((photo, idx) => (
                <img key={idx} src={photo} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-gray-200 flex-shrink-0" />
              ))}
            </div>

            {Object.values(reviewItem.details || {}).some(v => isDetailMissing(v as string | undefined)) && (
              <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex gap-3 items-center">
                <span className="text-xl">⚠️</span>
                <p className="text-xs text-orange-800 font-medium leading-tight">
                  Vi kunne ikke identificere alle detaljer. Venligst udfyld de manglende felter nedenfor.
                </p>
              </div>
            )}

            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Beskrivelse (Maks 58 tegn)</h2>
              <div className="space-y-1">
                <textarea 
                  value={reviewItem.description}
                  maxLength={58}
                  onChange={(e) => setReviewItem({ ...reviewItem, description: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium leading-tight"
                />
                <div className="text-[10px] text-right text-gray-400 font-bold uppercase tracking-widest px-1">
                  {reviewItem.description?.length || 0} / 58
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detaljer</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Mærke', key: 'brand' },
                  { label: 'Type', key: 'type' },
                  { label: 'Farve', key: 'color' },
                  { label: 'Størrelse', key: 'size' }
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase px-1">{field.label}</label>
                    <input 
                      type="text"
                      value={reviewItem.details?.[field.key as keyof typeof reviewItem.details] || ''}
                      onChange={(e) => setReviewItem({
                        ...reviewItem,
                        details: { ...reviewItem.details, [field.key]: e.target.value }
                      })}
                      placeholder="Mangler..."
                      className={`w-full bg-gray-50 border rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDetailMissing(reviewItem.details?.[field.key as keyof typeof reviewItem.details] as string | undefined) 
                        ? 'border-orange-300 text-orange-800 placeholder-orange-300' : 'border-gray-100 text-gray-700'
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Pris ({settings.currency})</label>
                <input 
                  type="number"
                  value={reviewItem.price || ''}
                  onChange={(e) => setReviewItem({ ...reviewItem, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-lg font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </section>

            <div className="space-y-3 pt-4">
              <button 
                onClick={handleSaveReview}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg shadow-lg active:scale-[0.98] transition-all"
              >
                Gem Ændringer
              </button>
              <button 
                onClick={() => { 
                  if (reviewItem.id) {
                    setView('history');
                  } else {
                    setView('capture');
                  }
                  setReviewItem(null); 
                }}
                className="w-full py-3 text-gray-500 font-medium active:text-gray-900"
              >
                Annuller
              </button>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-300 pb-10">
            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Udbyder</h2>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => {
                      const firstModel = MODELS_BY_PROVIDER[p.id][0].id;
                      saveSettings({ ...settings, provider: p.id, model: firstModel });
                    }}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                      settings.provider === p.id 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-100 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <span className="text-lg">{p.icon}</span>
                    <span className="text-xs font-bold">{p.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Model</h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Valgt Model</label>
                  <select 
                    value={settings.model}
                    onChange={(e) => saveSettings({ ...settings, model: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-medium text-gray-700"
                  >
                    {MODELS_BY_PROVIDER[settings.provider].map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Installation på iPhone</h2>
              <div className="text-sm text-gray-600 space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <p className="font-medium text-blue-800">For at få appen på din hjemmeskærm:</p>
                <ol className="list-decimal list-inside space-y-2 text-xs">
                  <li>Åbn denne side i <strong>Safari</strong></li>
                  <li>Tryk på <strong>Del</strong>-ikonet (firkant med pil op)</li>
                  <li>Rul ned og vælg <strong>"Føj til hjemmeskærm"</strong></li>
                </ol>
              </div>
            </section>

            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lokalisering</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 ml-1">Sprog</label>
                  <select 
                    value={settings.language}
                    onChange={(e) => saveSettings({ ...settings, language: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-medium text-gray-700"
                  >
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 ml-1">Valuta</label>
                  <select 
                    value={settings.currency}
                    onChange={(e) => saveSettings({ ...settings, currency: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-medium text-gray-700"
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl p-4 ios-shadow space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prompt Instrukser</h2>
                <button 
                  onClick={() => {
                    if (window.confirm("Vil du nulstille alle indstillinger til standard?")) {
                      saveSettings(DEFAULT_SETTINGS);
                    }
                  }}
                  className="text-[10px] font-bold text-blue-600 uppercase"
                >
                  Nulstil alt
                </button>
              </div>
              <textarea 
                value={settings.customPrompt}
                onChange={(e) => saveSettings({ ...settings, customPrompt: e.target.value })}
                rows={6}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </section>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 safe-area-bottom px-6 py-2 flex justify-between items-center z-50">
        <button 
          onClick={() => { setView('history'); setReviewItem(null); }}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'history' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-[10px] font-bold">Mine Varer</span>
        </button>

        <div className="relative -top-6">
          <button 
            onClick={() => {
              if (view === 'review') {
                setView('history');
                setCapturedPhotos([]);
                setReviewItem(null);
              }
              triggerFileInput();
            }}
            className="bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-200 flex items-center justify-center active:scale-90 transition-all border-4 border-white"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            ref={fileInputRef} 
            onChange={handlePhotoUpload} 
            className="hidden" 
          />
        </div>

        <button 
          onClick={() => { setView('settings'); setReviewItem(null); }}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'settings' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-bold">Indstillinger</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
