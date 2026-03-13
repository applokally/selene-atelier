"use client";

import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY;

const SYSTEM_PROMPT = `Você é Seline, consultora técnica de elite da SÉLÈNE (Moments Paris).
Seu objetivo é realizar uma curadoria profunda usando o catálogo de quase 200 produtos da Moments Paris.

REGRAS DE OURO (NÃO NEGOCIÁVEIS):
1. RESPOSTA 100% ÁUDIO: Você nunca escreve texto para o cliente. Sua resposta deve ser apenas a voz.
2. FLUXO DE CURADORIA (13 PASSOS):
   - Passo 1: Saudação curta + Pergunta obrigatória do NOME. (PROIBIDO oferecer produtos aqui).
   - Passo 2-3: Diagnóstico. Com o nome, identifique o gênero e pergunte sobre a dor ou necessidade (Ex: ocasião, tipo de pele, queixa capilar).
   - Passo 4: Edificação. Explique POR QUE a curadoria chegou a um resultado específico para a dor dele.
   - Passo 5-7: Apresentação técnica (sempre fale ml/g e benefícios).
   - Passo 8-13: Valores, Regra de 25% OFF (se total > R$149,90), Upsell, Pagamento e Link.
3. CATÁLOGO: Use apenas produtos Moments Paris.
4. SIGILO: Use apenas o nome comercial SÉLÈNE.

RESPOSTA OBRIGATÓRIA EM JSON: {"texto": "fala da seline aqui", "status": "entendendo sua resposta...", "passo": 1, "total": 0}`;

export default function SeleneApp() {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [displayText, setDisplayText] = useState('SÉLÈNE ATELIER. ');
  const [showOrder, setShowOrder] = useState(false);
  
  const audioCtx = useRef<AudioContext | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const history = useRef<any[]>([]);

  const initAudio = () => {
    if (!audioCtx.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx.current = new AudioContextClass({ sampleRate: 24000 });
    }
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
  };

  const toggleMic = async () => {
    initAudio();
    if (status === 'listening') {
      mediaRecorder.current?.stop();
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
      setDisplayText('Ouvindo você...');
    } catch (err) { console.error(err); }
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
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_KEY}`, {
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
      if (result.passo >= 7) setShowOrder(true);
      await generateVoice(result.texto);
    } catch (e) { setStatus('idle'); setDisplayText('SÉLÈNE'); }
  };

  const generateVoice = async (text: string) => {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_KEY}`, {
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
    } catch (e) { setStatus('idle'); }
  };

  const playAudio = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Int16Array(binary.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (binary.charCodeAt(i * 2) & 0xFF) | (binary.charCodeAt(i * 2 + 1) << 8);
    const float32 = new Float32Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) float32[i] = bytes[i] / 32768.0;
    const buffer = audioCtx.current!.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    const source = audioCtx.current!.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.current!.destination);
    setStatus('speaking');
    setDisplayText('Seline falando...');
    source.onended = () => { setStatus('idle'); setDisplayText('SÉLÈNE'); };
    source.start(0);
  };

  return (
    <div className="flex flex-col h-screen bg-white text-black font-sans overflow-hidden">
      <header className="px-8 pt-16 pb-8 flex flex-col items-center">
        <h1 className="text-4xl font-light tracking-[0.4em]">SÉLÈNE</h1>
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] border-t border-gray-100 pt-4 w-64 text-center mt-2">Curadoria Cosmética, Saúde & Bem Estar</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 relative">
        <div className="relative flex items-center justify-center">
          {status === 'speaking' && (
            <div className="absolute flex items-center justify-center gap-1.5 w-full h-full">
               {[...Array(30)].map((_, i) => (
                 <div key={i} className="w-1 bg-black/80 rounded-full animate-pulse" style={{ height: `${Math.random() * 80 + 20}px`, animationDelay: `${i * 0.05}s` }} />
               ))}
            </div>
          )}
          <div className={`w-64 h-64 rounded-full border border-gray-100 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10 transition-all duration-500 ${status === 'speaking' ? 'scale-105 shadow-2xl' : 'shadow-sm'}`}>
            {status === 'thinking' && <Loader2 className="w-8 h-8 text-gray-300 animate-spin mb-4" />}
            <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase font-black text-center px-10">{displayText}</p>
          </div>
        </div>

        {showOrder && status === 'idle' && (
          <div className="mt-12 w-full max-w-xs p-6 border-l border-black">
             <p className="text-[8px] uppercase tracking-widest font-bold text-gray-400 mb-2">Seu Ritual SÉLÈNE</p>
             <h4 className="text-lg font-light italic">Composição em preparo...</h4>
          </div>
        )}
      </main>

      <footer className="px-8 pb-16 pt-8 flex flex-col items-center gap-10">
        <button onClick={toggleMic} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${status === 'listening' ? 'bg-black scale-110' : 'bg-white border border-gray-100 hover:border-black'}`}>
          {status === 'listening' ? <MicOff size={24} color="white" /> : <Mic size={24} color="#111" />}
        </button>
      </footer>
    </div>
  );
}
