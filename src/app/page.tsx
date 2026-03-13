"use client";

import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, Wind, Flower2, Heart } from 'lucide-react';

/**
 * Helper para aceder à chave da API de forma segura.
 * No Next.js (Vercel), o 'process.env' é substituído em tempo de build.
 * Esta função evita erros de referência em ambientes de preview.
 */
const getGeminiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GEMINI_KEY) {
      return process.env.NEXT_PUBLIC_GEMINI_KEY;
    }
  } catch (e) {
    // Fallback silencioso para ambientes onde 'process' não existe
  }
  return ""; 
};

const SYSTEM_PROMPT = `Você é Seline, consultora técnica de elite da SÉLÈNE (Moments Paris).
Seu objetivo é realizar uma curadoria profunda usando o catálogo da Moments Paris.

REGRAS DE OURO:
1. RESPOSTA 100% ÁUDIO: Apenas voz. Não escreva texto para o cliente.
2. FLUXO: Saudação + Pergunta do Nome (Obrigatório). Só avance após saber o nome.
3. ESTILO: Elegante, técnico e acolhedor.
4. TEMA: Cor #545353. Refira-se à experiência como algo sensorial e luxuoso.

RESPOSTA OBRIGATÓRIA EM JSON: {"texto": "fala da seline aqui", "status": "curando sua essência...", "passo": 1}`;

export default function Page() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [displayText, setDisplayText] = useState('SÉLÈNE ATELIER');
  
  const audioCtx = useRef<AudioContext | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const history = useRef<any[]>([]);

  const suggestions = [
    { icon: <Wind size={14} />, label: "Perfumes Frescos" },
    { icon: <Flower2 size={14} />, label: "Florais Nobres" },
    { icon: <Sparkles size={14} />, label: "Cuidados Faciais" },
    { icon: <Heart size={14} />, label: "Linha Intense" },
  ];

  const initAudio = () => {
    if (!audioCtx.current) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioCtx.current = new AudioContextClass({ sampleRate: 24000 });
    }
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
  };

  const toggleMic = async () => {
    initAudio();
    if (status === 'listening') {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];
      mediaRecorder.current.onstop = () => processAudio(new Blob(chunks.current, { type: 'audio/wav' }));
      mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
      mediaRecorder.current.start();
      setStatus('listening');
      setDisplayText('Ouvindo sua voz...');
    } catch (err) { 
      console.error(err); 
      setDisplayText('Erro no microfone');
      setStatus('idle');
    }
  };

  const processAudio = async (blob: Blob) => {
    setStatus('thinking');
    setDisplayText('Analisando Curadoria...');
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      executeGemini([{ role: 'user', parts: [{ text: "Atenda o áudio do cliente." }, { inlineData: { mimeType: "audio/wav", data: base64 } }] }]);
    };
  };

  const executeGemini = async (contents: any[]) => {
    const key = getGeminiKey();
    if (!key) {
      setDisplayText('Configurar API Key');
      setStatus('idle');
      return;
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [...history.current, ...contents],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const data = await res.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text);
      history.current.push(contents[0], data.candidates[0].content);
      setDisplayText(result.status || 'SÉLÈNE');
      await generateVoice(result.texto);
    } catch (e) { 
      setStatus('idle'); 
      setDisplayText('SÉLÈNE ATELIER'); 
    }
  };

  const generateVoice = async (text: string) => {
    const key = getGeminiKey();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: text }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Leda" } } } }
        })
      });
      const data = await res.json();
      const pcm = data.candidates[0].content.parts[0].inlineData.data;
      playAudio(pcm);
    } catch (e) { 
      setStatus('idle'); 
    }
  };

  const playAudio = (base64: string) => {
    if (!audioCtx.current) return;
    const binary = atob(base64);
    const bytes = new Int16Array(binary.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (binary.charCodeAt(i * 2) & 0xFF) | (binary.charCodeAt(i * 2 + 1) << 8);
    const float32 = new Float32Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) float32[i] = bytes[i] / 32768.0;
    const buffer = audioCtx.current.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    const source = audioCtx.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.current.destination);
    setStatus('speaking');
    setDisplayText('Seline falando...');
    source.onended = () => { 
      setStatus('idle'); 
      setDisplayText('SÉLÈNE ATELIER'); 
    };
    source.start(0);
  };

  const handleSuggestion = (label: string) => {
    initAudio();
    const contents = [{ role: 'user', parts: [{ text: `Desejo iniciar uma curadoria focada em: ${label}` }] }];
    executeGemini(contents);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white text-[#545353] font-sans overflow-hidden">
      {/* Cabeçalho de Luxo */}
      <header className="pt-10 pb-4 flex flex-col items-center flex-none">
        <h1 className="text-4xl font-light tracking-[0.4em] text-[#545353]">SÉLÈNE</h1>
        <div className="w-48 h-px bg-[#545353]/20 my-4"></div>
        <p className="text-[10px] text-[#545353] font-medium uppercase tracking-[0.15em] whitespace-nowrap px-4">
          Curadoria Cosmética, Saúde & Bem Estar
        </p>
      </header>

      {/* Experiência Central */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8 overflow-hidden">
        {/* Visualizador Sensorial */}
        <div className="relative flex items-center justify-center flex-none">
          {status === 'speaking' && (
            <div className="absolute flex items-center justify-center gap-1 w-full h-full opacity-40">
               {[...Array(24)].map((_, i) => (
                 <div key={i} className="w-0.5 bg-[#545353] rounded-full animate-pulse" style={{ height: `${Math.random() * 60 + 20}px`, animationDelay: `${i * 0.05}s` }} />
               ))}
            </div>
          )}
          <div className={`w-52 h-52 rounded-full border border-[#545353]/30 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm z-10 transition-all duration-700 ${status === 'speaking' ? 'scale-105 shadow-xl border-[#545353]/50' : 'shadow-sm'}`}>
            {status === 'thinking' ? (
              <Loader2 className="w-6 h-6 text-[#545353]/40 animate-spin mb-3" />
            ) : (status === 'listening' ? (
              <div className="w-2 h-2 rounded-full bg-red-400 animate-ping mb-3" />
            ) : null)}
            <p className="text-[9px] tracking-[0.3em] text-[#545353] uppercase font-bold text-center px-8 leading-loose">
              {displayText}
            </p>
          </div>
        </div>

        {/* Cards de Sugestões Iniciais */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm flex-none">
          {suggestions.map((item, idx) => (
            <button 
              key={idx} 
              onClick={() => handleSuggestion(item.label)}
              className="flex items-center gap-3 p-3 border border-[#545353]/10 rounded-xl hover:border-[#545353]/40 transition-colors bg-gray-50/30 text-left active:scale-95 transition-transform"
            >
              <div className="text-[#545353]/60 flex-none">{item.icon}</div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#545353]/80 leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </main>

      {/* Rodapé de Controlo */}
      <footer className="pb-12 pt-4 flex flex-col items-center flex-none">
        <button 
          onClick={toggleMic} 
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${status === 'listening' ? 'bg-[#545353] scale-110 shadow-lg' : 'bg-white border border-[#545353]/20 shadow-sm hover:border-[#545353]'}`}
        >
          {status === 'listening' ? <MicOff size={24} color="white" /> : <Mic size={24} color="#545353" />}
        </button>
        <p className="mt-4 text-[8px] uppercase tracking-[0.2em] text-[#545353]/40 font-bold">Toque para iniciar</p>
      </footer>
    </div>
  );
}