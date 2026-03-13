"use client";

import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, Wind, Flower2, Heart, AlertCircle } from 'lucide-react';

const SYSTEM_PROMPT = `Você é Seline, consultora técnica de elite da SÉLÈNE (Moments Paris).
Sua missão é realizar uma curadoria de luxo.

REGRAS CRÍTICAS:
1. RESPOSTA 100% ÁUDIO: Sua fala deve ser apenas voz.
2. FLUXO: Cumprimente e pergunte o NOME do cliente primeiro. 
3. ESTILO: Elegante e calmo.
4. FORMATO: Responda APENAS em JSON: {"texto": "sua fala aqui", "status": "curando sua essência...", "passo": 1}`;

export default function Page() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'error'>('idle');
  const [displayText, setDisplayText] = useState('SÉLÈNE ATELIER');
  const [errorMsg, setErrorMsg] = useState('');
  
  const audioCtx = useRef<AudioContext | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const history = useRef<any[]>([]);

  // Captura a chave de ambiente (NEXT_PUBLIC_ garante que o navegador a veja)
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY || "";

  const suggestions = [
    { icon: <Wind size={14} />, label: "Perfumes Frescos" },
    { icon: <Flower2 size={14} />, label: "Florais Nobres" },
    { icon: <Sparkles size={14} />, label: "Cuidados Faciais" },
    { icon: <Heart size={14} />, label: "Linha Intense" },
  ];

  // Função vital para "acordar" o áudio no telemóvel
  const initAudio = async () => {
    try {
      if (!audioCtx.current) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioCtx.current = new AudioContextClass({ sampleRate: 24000 });
      }
      if (audioCtx.current.state === 'suspended') {
        await audioCtx.current.resume();
      }
      return true;
    } catch (e) {
      console.error("Falha ao iniciar áudio:", e);
      return false;
    }
  };

  const toggleMic = async () => {
    setErrorMsg('');
    const hasAudio = await initAudio();
    if (!hasAudio) return;

    if (status === 'listening') {
      mediaRecorder.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => chunks.current.push(e.data);
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks.current, { type: 'audio/wav' });
        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setStatus('listening');
      setDisplayText('Ouvindo você...');
    } catch (err) {
      setStatus('error');
      setErrorMsg('Microfone negado.');
    }
  };

  const handleSuggestion = async (label: string) => {
    await initAudio();
    setStatus('thinking');
    setDisplayText(`Explorando ${label}...`);
    callGemini([{ role: 'user', parts: [{ text: `Iniciando curadoria: ${label}` }] }]);
  };

  const processAudio = async (blob: Blob) => {
    setStatus('thinking');
    setDisplayText('Interpretando...');
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      callGemini([{ 
        role: 'user', 
        parts: [
          { text: "Responda ao áudio do cliente como Seline." }, 
          { inlineData: { mimeType: "audio/wav", data: base64 } }
        ] 
      }]);
    };
  };

  const callGemini = async (contents: any[]) => {
    if (!apiKey) {
      setStatus('error');
      setErrorMsg('Chave API não configurada');
      return;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [...history.current, ...contents],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);

      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;
      const cleanJson = rawText.replace(/```json|```/g, "").trim();
      const result = JSON.parse(cleanJson);

      history.current.push(contents[0], data.candidates[0].content);
      setDisplayText(result.status || 'SÉLÈNE');
      await generateVoice(result.texto);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(`Falha: ${err.message}`);
    }
  };

  const generateVoice = async (text: string) => {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: { 
            responseModalities: ["AUDIO"], 
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Leda" } } } 
          }
        })
      });
      const data = await res.json();
      const pcm = data.candidates[0].content.parts[0].inlineData.data;
      playAudio(pcm);
    } catch (e) {
      setStatus('idle');
      setDisplayText('SÉLÈNE ATELIER');
    }
  };

  const playAudio = (base64: string) => {
    if (!audioCtx.current) return;
    const binary = atob(base64);
    const bytes = new Int16Array(binary.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = (binary.charCodeAt(i * 2) & 0xFF) | (binary.charCodeAt(i * 2 + 1) << 8);
    }
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

  return (
    <div className="flex flex-col h-[100dvh] bg-white text-[#545353] font-sans overflow-hidden">
      <header className="pt-10 pb-4 flex flex-col items-center flex-none">
        <h1 className="text-4xl font-light tracking-[0.4em]">SÉLÈNE</h1>
        <div className="w-48 h-px bg-[#545353]/20 my-4"></div>
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] whitespace-nowrap px-4 text-center">
          Curadoria Cosmética, Saúde & Bem Estar
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8 overflow-hidden">
        <div className="relative flex items-center justify-center">
          {status === 'speaking' && (
            <div className="absolute flex items-center justify-center gap-1 w-full h-full opacity-30">
               {[...Array(20)].map((_, i) => (
                 <div key={i} className="w-0.5 bg-[#545353] rounded-full animate-pulse" style={{ height: `${Math.random() * 50 + 20}px`, animationDelay: `${i * 0.05}s` }} />
               ))}
            </div>
          )}
          <div className={`w-52 h-52 rounded-full border border-[#545353]/20 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm z-10 transition-all duration-700 ${status === 'speaking' ? 'scale-105 shadow-xl border-[#545353]/40' : 'shadow-sm'}`}>
            {status === 'thinking' && <Loader2 className="w-6 h-6 animate-spin mb-3 opacity-30" />}
            {status === 'listening' && <div className="w-2 h-2 rounded-full bg-red-400 animate-ping mb-3" />}
            {status === 'error' && <AlertCircle className="w-6 h-6 text-red-300 mb-3" />}
            <p className="text-[9px] tracking-[0.3em] uppercase font-bold text-center px-8 leading-relaxed">
              {status === 'error' ? errorMsg : displayText}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-sm flex-none">
          {suggestions.map((item, idx) => (
            <button key={idx} onClick={() => handleSuggestion(item.label)} disabled={status !== 'idle' && status !== 'error'} className="flex items-center gap-3 p-3 border border-[#545353]/10 rounded-xl hover:border-[#545353]/40 transition-all bg-gray-50/20 active:scale-95 disabled:opacity-30">
              <div className="text-[#545353]/50">{item.icon}</div>
              <span className="text-[9px] uppercase tracking-wider font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </main>

      <footer className="pb-12 pt-4 flex flex-col items-center flex-none">
        <button onClick={toggleMic} disabled={status === 'thinking' || status === 'speaking'} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${status === 'listening' ? 'bg-[#545353] scale-110 shadow-lg' : 'bg-white border border-[#545353]/20 hover:border-[#545353] active:bg-gray-50'}`}>
          {status === 'listening' ? <MicOff size={24} color="white" /> : <Mic size={24} color="#545353" />}
        </button>
        <p className="mt-4 text-[8px] uppercase tracking-[0.2em] opacity-40 font-bold">Toque para falar</p>
      </footer>
    </div>
  );
}