"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  Wind,
  Flower2,
  Heart,
  AlertCircle,
} from "lucide-react";

type AppStatus = "idle" | "listening" | "thinking" | "speaking" | "error";

type GeminiHistoryPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiHistoryItem = {
  role: "user" | "model";
  parts: GeminiHistoryPart[];
};

type SelineResponse = {
  texto: string;
  status?: string;
  passo?: number;
};

const SYSTEM_PROMPT = `Você é Seline, consultora técnica de elite da SÉLÈNE (Moments Paris).
Sua missão é realizar uma curadoria de luxo, com fala elegante, técnica, acolhedora e minimalista.

REGRAS CRÍTICAS:
1. RESPOSTA 100% ÁUDIO: você jamais conversa por chat; sua resposta será convertida em voz.
2. FLUXO OBRIGATÓRIO: no primeiro contato, cumprimente e pergunte primeiro o NOME do cliente.
3. SÓ AVANCE para curadoria após identificação do nome.
4. OFEREÇA quando fizer sentido: 25% OFF acima de R$149,90.
5. ESTILO: frases curtas, elegantes, naturais e calmas.
6. FORMATO: responda APENAS em JSON válido, sem markdown, sem crases, sem texto extra.

FORMATO EXATO:
{"texto":"sua fala aqui","status":"curando sua essência...","passo":1}`;

const CHAT_MODEL = "gemini-2.0-flash";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

export default function Page() {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [displayText, setDisplayText] = useState("SÉLÈNE ATELIER");
  const [errorMsg, setErrorMsg] = useState("");

  const audioCtx = useRef<AudioContext | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const history = useRef<GeminiHistoryItem[]>([]);

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY ?? "";

  const suggestions = useMemo(
    () => [
      { icon: <Wind size={14} />, label: "Perfumes Frescos" },
      { icon: <Flower2 size={14} />, label: "Florais Nobres" },
      { icon: <Sparkles size={14} />, label: "Cuidados Faciais" },
      { icon: <Heart size={14} />, label: "Linha Intense" },
    ],
    []
  );

  useEffect(() => {
    return () => {
      try {
        mediaRecorder.current?.stop();
      } catch {}

      mediaStream.current?.getTracks().forEach((track) => track.stop());

      if (audioCtx.current && audioCtx.current.state !== "closed") {
        void audioCtx.current.close();
      }
    };
  }, []);

  const setIdleState = () => {
    setStatus("idle");
    setDisplayText("SÉLÈNE ATELIER");
  };

  const setErrorState = (message: string) => {
    setStatus("error");
    setErrorMsg(message);
  };

  const initAudio = async (): Promise<boolean> => {
    try {
      if (!audioCtx.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;

        if (!AudioContextClass) {
          setErrorState("Áudio não suportado neste navegador.");
          return false;
        }

        audioCtx.current = new AudioContextClass({ sampleRate: 24000 });
      }

      if (audioCtx.current.state === "suspended") {
        await audioCtx.current.resume();
      }

      return true;
    } catch (error) {
      console.error("Falha ao iniciar áudio:", error);
      setErrorState("Não foi possível iniciar o áudio.");
      return false;
    }
  };

  const getRecorderMimeType = (): string => {
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];

    for (const mimeType of mimeTypes) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    return "";
  };

  const cleanupMediaStream = () => {
    mediaStream.current?.getTracks().forEach((track) => track.stop());
    mediaStream.current = null;
    mediaRecorder.current = null;
  };

  const toggleMic = async () => {
    setErrorMsg("");

    const hasAudio = await initAudio();
    if (!hasAudio) return;

    if (status === "listening") {
      mediaRecorder.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;

      const mimeType = getRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunks.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("Erro no MediaRecorder:", event);
        cleanupMediaStream();
        setErrorState("Falha ao gravar o áudio.");
      };

      recorder.onstop = async () => {
        try {
          const actualMimeType =
            recorder.mimeType && recorder.mimeType.trim() !== ""
              ? recorder.mimeType
              : "audio/webm";

          const audioBlob = new Blob(chunks.current, { type: actualMimeType });
          cleanupMediaStream();
          await processAudio(audioBlob, actualMimeType);
        } catch (error) {
          console.error("Erro ao finalizar gravação:", error);
          cleanupMediaStream();
          setErrorState("Falha ao processar a gravação.");
        }
      };

      recorder.start();
      setStatus("listening");
      setDisplayText("Ouvindo você...");
    } catch (error) {
      console.error("Erro ao acessar microfone:", error);
      cleanupMediaStream();
      setErrorState("Microfone negado ou indisponível.");
    }
  };

  const handleSuggestion = async (label: string) => {
    setErrorMsg("");

    const hasAudio = await initAudio();
    if (!hasAudio) return;

    setStatus("thinking");
    setDisplayText(`Explorando ${label}...`);

    await callGemini([
      {
        role: "user",
        parts: [{ text: `Iniciando curadoria para a categoria: ${label}.` }],
      },
    ]);
  };

  const blobToBase64 = async (blob: Blob): Promise<string> => {
    const arrayBuffer = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...slice);
    }

    return btoa(binary);
  };

  const processAudio = async (blob: Blob, mimeType: string) => {
    setStatus("thinking");
    setDisplayText("Interpretando...");

    try {
      const base64 = await blobToBase64(blob);

      await callGemini([
        {
          role: "user",
          parts: [
            { text: "Responda ao áudio do cliente como Seline." },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ]);
    } catch (error) {
      console.error("Erro ao converter áudio:", error);
      setErrorState("Falha ao preparar o áudio enviado.");
    }
  };

  const extractJsonText = (raw: string): SelineResponse => {
    const clean = raw.replace(/```json|```/gi, "").trim();
    return JSON.parse(clean) as SelineResponse;
  };

  const callGemini = async (contents: GeminiHistoryItem[]) => {
    if (!apiKey) {
      setErrorState("Chave API não configurada na Vercel.");
      return;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [...history.current, ...contents],
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const apiMessage =
          data?.error?.message || `Falha no Gemini (status ${response.status}).`;
        throw new Error(apiMessage);
      }

      const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("O Gemini não retornou texto válido.");
      }

      const result = extractJsonText(rawText);

      if (!result?.texto) {
        throw new Error("O JSON retornado não contém o campo 'texto'.");
      }

      history.current.push(contents[0], data.candidates[0].content);

      setDisplayText(result.status || "Curando sua essência...");
      await generateVoice(result.texto);
    } catch (error) {
      console.error("Erro em callGemini:", error);
      const message =
        error instanceof Error ? error.message : "Erro inesperado ao consultar a IA.";
      setErrorState(message);
    }
  };

  const generateVoice = async (text: string) => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text }],
              },
            ],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Leda",
                  },
                },
              },
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const apiMessage =
          data?.error?.message || `Falha no TTS (status ${response.status}).`;
        throw new Error(apiMessage);
      }

      const inlineData = data?.candidates?.[0]?.content?.parts?.find(
        (part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData?.data
      )?.inlineData;

      const pcmBase64: string | undefined = inlineData?.data;

      if (!pcmBase64) {
        throw new Error("O TTS não retornou áudio.");
      }

      playAudio(pcmBase64);
    } catch (error) {
      console.error("Erro em generateVoice:", error);
      const message =
        error instanceof Error ? error.message : "Falha inesperada ao gerar voz.";
      setErrorState(message);
    }
  };

  const playAudio = (base64: string) => {
    if (!audioCtx.current) {
      setErrorState("Contexto de áudio não inicializado.");
      return;
    }

    try {
      const binary = atob(base64);
      const bytes = new Int16Array(binary.length / 2);

      for (let i = 0; i < bytes.length; i++) {
        bytes[i] =
          (binary.charCodeAt(i * 2) & 0xff) |
          (binary.charCodeAt(i * 2 + 1) << 8);
      }

      const float32 = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        float32[i] = bytes[i] / 32768;
      }

      const buffer = audioCtx.current.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = audioCtx.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.current.destination);

      setStatus("speaking");
      setDisplayText("Seline falando...");

      source.onended = () => {
        setIdleState();
      };

      source.start(0);
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      setErrorState("Falha ao reproduzir o áudio da Seline.");
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-white font-sans text-[#545353]">
      <header className="flex-none pb-4 pt-10">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-light tracking-[0.4em]">SÉLÈNE</h1>
          <div className="my-4 h-px w-48 bg-[#545353]/20" />
          <p className="px-4 text-center text-[10px] font-medium uppercase tracking-[0.15em] whitespace-nowrap">
            Curadoria Cosmética, Saúde &amp; Bem Estar
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden px-6">
        <div className="relative flex items-center justify-center">
          {status === "speaking" && (
            <div className="absolute flex h-full w-full items-center justify-center gap-1 opacity-30">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 animate-pulse rounded-full bg-[#545353]"
                  style={{
                    height: `${Math.random() * 50 + 20}px`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          )}

          <div
            className={`z-10 flex h-52 w-52 flex-col items-center justify-center rounded-full border border-[#545353]/20 bg-white/40 backdrop-blur-sm transition-all duration-700 ${
              status === "speaking"
                ? "scale-105 border-[#545353]/40 shadow-xl"
                : "shadow-sm"
            }`}
          >
            {status === "thinking" && (
              <Loader2 className="mb-3 h-6 w-6 animate-spin opacity-30" />
            )}

            {status === "listening" && (
              <div className="mb-3 h-2 w-2 animate-ping rounded-full bg-red-400" />
            )}

            {status === "error" && (
              <AlertCircle className="mb-3 h-6 w-6 text-red-300" />
            )}

            <p className="px-8 text-center text-[9px] font-bold uppercase leading-relaxed tracking-[0.3em]">
              {status === "error" ? errorMsg : displayText}
            </p>
          </div>
        </div>

        <div className="grid w-full max-w-sm flex-none grid-cols-2 gap-3">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestion(item.label)}
              disabled={status !== "idle" && status !== "error"}
              className="flex items-center gap-3 rounded-xl border border-[#545353]/10 bg-gray-50/20 p-3 transition-all hover:border-[#545353]/40 active:scale-95 disabled:opacity-30"
            >
              <div className="text-[#545353]/50">{item.icon}</div>
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </main>

      <footer className="flex flex-none flex-col items-center pb-12 pt-4">
        <button
          onClick={toggleMic}
          disabled={status === "thinking" || status === "speaking"}
          className={`flex h-20 w-20 items-center justify-center rounded-full shadow-sm transition-all duration-300 ${
            status === "listening"
              ? "scale-110 bg-[#545353] shadow-lg"
              : "border border-[#545353]/20 bg-white hover:border-[#545353] active:bg-gray-50"
          }`}
        >
          {status === "listening" ? (
            <MicOff size={24} color="white" />
          ) : (
            <Mic size={24} color="#545353" />
          )}
        </button>

        <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.2em] opacity-40">
          Toque para falar
        </p>
      </footer>
    </div>
  );
}