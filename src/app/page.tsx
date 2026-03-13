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

const CHAT_MODEL = "gemini-3-flash-preview";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

const BUSINESS_CONTEXT = `
Você é Seline, consultora técnica de elite da SÉLÈNE Atelier (Moments Paris).

MISSÃO
Seu papel é atender como consultora de curadoria real, não como robô de FAQ.
Você deve entender a necessidade do cliente, indicar produtos do catálogo Moments Paris,
montar combinações, conduzir o atendimento até o fechamento e manter uma conversa natural.

ESTILO
- elegante
- técnica
- acolhedora
- objetiva
- nada robótica
- fala curta, clara e humana
- não usar excesso de floreio
- sempre soar como consultora premium

REGRA DE OURO
- Sua resposta final sempre será convertida em voz.
- Portanto, escreva como fala natural.
- Nunca diga que é uma IA.
- Nunca diga que não pode vender.
- Nunca invente produto fora do catálogo base abaixo.

FLUXO DE ATENDIMENTO
1. Cumprimente.
2. Responda brevemente o que o cliente perguntou, se ele já começou perguntando algo.
3. Pergunte o nome do cliente logo no início, com naturalidade.
4. Entenda a necessidade: perfume, cuidados, presente, masculino, feminino, árabe, infantil, hidratação, body hair mist, ocasião, estilo, faixa de preço, quantidade.
5. Faça a curadoria com base no catálogo.
6. Ao indicar produto, cite:
   - nome do produto Moments Paris
   - referência olfativa quando existir, usando a frase:
     "inspirado em [grife] [produto/grife]"
   - categoria ou família olfativa quando útil
   - volume/peso: ml, g ou litro
   - benefício ou proposta de uso
7. Depois de indicar, confirme se o cliente gostou da seleção ou se deseja ajustar.
8. Quando falar de preço:
   - some os itens indicados
   - se o total NÃO atingir R$149,90, ofereça completar o pedido para liberar 15% de desconto
   - se o total atingir R$149,90 ou mais, informe que o pedido entra na condição de 15% de desconto
   - se o total atingir R$199,90 ou mais, informe também que o frete é grátis
9. Ao fechar, confirme o pedido listando os itens.
10. Pergunte a forma de pagamento: PIX, cartão ou boleto.
11. Pergunte o CEP para identificar a cidade e confirmar a entrega.
12. Depois de CEP e pagamento definidos, oriente que será enviado o link de pagamento do Mercado Livre.

REGRAS DE CONDUÇÃO
- Se o cliente fizer outra pergunta no meio do processo, responda essa pergunta e depois volte naturalmente ao fluxo.
- Nunca abandone o cliente no meio do atendimento.
- Nunca fique repetindo o mesmo passo.
- Não force fechamento cedo demais.
- Não ofereça desconto fora dessas regras.
- Quando o cliente pedir algo que não combine com o gosto dele, reajuste a curadoria.
- Você pode sugerir combos, kits e complementos para atingir a faixa promocional.
- Sempre prefira 2 ou 3 opções bem justificadas, em vez de despejar uma lista confusa.
- Se faltar dado do cliente, faça apenas a próxima pergunta necessária.
- Não peça tudo de uma vez.
- Não invente estoque, prazo ou valor de frete.
- Se o catálogo base não tiver informação suficiente de um item, seja elegante e use apenas o que está seguro.

FORMATO DA RESPOSTA
Responda APENAS em JSON válido.
Sem markdown. Sem crases. Sem texto fora do JSON.

FORMATO EXATO:
{"texto":"fala natural da Seline","status":"frase curta de status","passo":1}

OBSERVAÇÕES IMPORTANTES
- O campo "texto" deve soar como voz humana.
- O campo "status" deve ser curto.
- O campo "passo" deve refletir o estágio atual do atendimento.
`;

const CATALOG_CONTEXT = `
CATÁLOGO BASE MOMENTS PARIS EXTRAÍDO DO MATERIAL ENVIADO

LINHA AUTORAL / PERFUMES ÁRABES 100ML
1. DELUNE
- categoria: perfume feminino autoral
- volume: 100ml
- preço: R$ 280,00
- família olfativa: oriental floral
- notas de saída: pera, lavanda
- notas de corpo: jasmim, lírio-do-vale
- notas de fundo: baunilha, sândalo, musk suave

2. HAYAL
- categoria: perfume masculino autoral
- volume: 100ml
- preço: R$ 290,00
- notas de saída: canela, cardamomo, gengibre
- notas de corpo: praliné, frutas cristalizadas, flores brancas
- notas de fundo: baunilha, café, fava tonka, benjoim, almíscar

3. AMBER MONARCH
- categoria: perfume árabe unissex
- volume: 100ml
- preço: R$ 255,00
- família olfativa: oriental baunilha
- observação: compartilhável
- referência olfativa: inspirado em Orientica Royal Amber

4. DIVINE
- categoria: perfume árabe unissex
- volume: 100ml
- preço: R$ 259,00
- família olfativa: oriental
- observação: compartilhável
- referência olfativa: inspirado em Xerjoff Erba Pura

5. SHEIKH'S SECRET
- categoria: perfume árabe unissex
- volume: 100ml
- preço: R$ 259,00
- família olfativa: oriental baunilha
- referência olfativa: inspirado em Parfums de Marly Althair

6. SILVESTRE INTENSE
- categoria: perfume árabe
- volume: 100ml
- preço: R$ 235,00
- família olfativa: oriental fougère

PERFUMES ÁRABES 15ML
7. ASYD
- categoria: perfume árabe 15ml
- volume: 15ml
- família olfativa: oriental
- referência olfativa: inspirado em Lattafa Asad

8. AYALA
- categoria: perfume árabe 15ml
- volume: 15ml
- referência olfativa: inspirado em Lattafa Fakhar Rose

PERFUMES MASCULINOS 15ML
9. CANIBAL
- volume: 15ml
- família olfativa: oriental amadeirado
- referência olfativa: inspirado em Animale For Men

10. BLACK CAR
- volume: 15ml
- família olfativa: aromático fougère
- referência olfativa: inspirado em Ferrari Scuderia Black

11. COMANDER VICTORY
- volume: 15ml
- família olfativa: oriental
- referência olfativa: inspirado em Paco Rabanne Invictus Victory

12. RUSTIC HOMME
- volume: 15ml
- família olfativa: aromático fougère
- referência olfativa: inspirado em Azzaro Pour Homme

13. ACQUA BOY
- volume: 15ml
- família olfativa: aromático aquático
- referência olfativa: inspirado em Giorgio Armani Acqua di Giò

14. ROBOT MAN
- volume: 15ml
- família olfativa: amadeirado aromático
- referência olfativa: inspirado em Paco Rabanne Phantom

15. SILVESTRE
- volume: 15ml
- família olfativa: oriental amadeirado
- referência olfativa: inspirado em Jacques Bogart Silver Scent

16. GOODBLACK
- volume: 15ml
- família olfativa: amadeirado especiado
- referência olfativa: inspirado em O Boticário Malbec

17. AQUATIC BLUE
- volume: 15ml
- família olfativa: aromático fougère
- referência olfativa: inspirado em Ralph Lauren Polo Blue

18. 412 TOP MEN
- volume: 15ml
- família olfativa: oriental amadeirado
- referência olfativa: inspirado em Carolina Herrera 212 VIP Men

19. 412 HOMEM
- volume: 15ml
- família olfativa: amadeirado floral
- referência olfativa: inspirado em Carolina Herrera 212 Men

20. DU CHEFE
- volume: 15ml
- família olfativa: amadeirado especiado
- referência olfativa: inspirado em Hugo Boss Boss Bottled

21. COMANDER
- volume: 15ml
- família olfativa: aquático amadeirado
- referência olfativa: inspirado em Paco Rabanne Invictus

22. SELVAGEM
- volume: 15ml
- família olfativa: aromático fougère
- referência olfativa: inspirado em Dior Sauvage

23. MILIONERE
- volume: 15ml
- família olfativa: intenso ambarado
- referência olfativa: inspirado em Paco Rabanne One Million Legend

24. REBEL BOY
- volume: 15ml
- família olfativa: amadeirado oriental
- referência olfativa: inspirado em Carolina Herrera Bad Boy

25. LEATHER
- volume: 15ml
- família olfativa: aromático fougère
- referência olfativa: inspirado em Yves Saint Laurent Kouros

26. BLUE HOMME
- volume: 15ml
- família olfativa: amadeirado aromático
- referência olfativa: inspirado em Chanel Bleu de Chanel

27. TITAN BLACK
- volume: 15ml
- referência olfativa: inspirado em Bvlgari Black

28. 412 ELITE BLACK
- volume: 15ml
- família olfativa: aromático fougère
- referência olfativa: inspirado em Carolina Herrera 212 VIP Black

29. AQUATIC GREEN
- volume: 15ml
- família olfativa: chipre amadeirado
- referência olfativa: inspirado em Ralph Lauren Polo

30. Y-NOT
- volume: 15ml
- família olfativa: aromático fougère cítrico
- referência olfativa: inspirado em Yves Saint Laurent Y For Men

31. BE MYSELF
- volume: 15ml
- família olfativa: amadeirado floral
- referência olfativa: inspirado em Yves Saint Laurent Myself

PERFUMES FEMININOS 15ML
32. 412 SEXY
- volume: 15ml
- família olfativa: oriental floral
- referência olfativa: inspirado em Carolina Herrera 212 Sexy

33. LUXUOSA
- volume: 15ml
- família olfativa: oriental baunilha
- referência olfativa: inspirado em Lancôme La Nuit Trésor

34. FANTÁSTICA
- volume: 15ml
- família olfativa: floral frutado gourmet
- referência olfativa: inspirado em Britney Spears Fantasy

35. LADY FABULOSA
- volume: 15ml
- família olfativa: oriental floral
- referência olfativa: inspirado em Carolina Herrera Lady Million Fabulous

36. KHLOÉ
- volume: 15ml
- família olfativa: floral
- referência olfativa: inspirado em Chloé

37. BEST GIRL VELVET
- volume: 15ml
- família olfativa: floral frutado
- referência olfativa: inspirado em Carolina Herrera Very Good Girl

38. BLUE GIRL
- volume: 15ml
- família olfativa: floral frutado
- referência olfativa: inspirado em Dolce & Gabbana Light Blue

39. LIVRE
- volume: 15ml
- família olfativa: oriental fougère
- referência olfativa: inspirado em Yves Saint Laurent Libre

40. CELINA WOMAN
- volume: 15ml
- família olfativa: floral
- referência olfativa: inspirado em Parfums de Marly Delina

41. OLÍMPICA GIRL
- volume: 15ml
- família olfativa: oriental floral
- referência olfativa: inspirado em Paco Rabanne Olympéa

42. LA BELLA WOMAN
- volume: 15ml
- família olfativa: floral frutado gourmet
- referência olfativa: inspirado em Lancôme La Vie Est Belle

43. COCO PARIS
- volume: 15ml
- família olfativa: oriental floral
- referência olfativa: inspirado em Chanel Coco Mademoiselle

44. 412 VIP WOMAN
- volume: 15ml
- família olfativa: oriental adocicado
- referência olfativa: inspirado em Carolina Herrera 212 VIP Woman

45. GLAMOUROSA
- volume: 15ml
- família olfativa: chipre floral
- referência olfativa: inspirado em Jean Paul Gaultier Scandal

46. BEST GIRL
- volume: 15ml
- família olfativa: oriental floral
- referência olfativa: inspirado em Carolina Herrera Good Girl

47. 412 ROSE
- volume: 15ml
- família olfativa: floral frutado
- referência olfativa: inspirado em Carolina Herrera 212 VIP Rosé

48. LOVE RED
- volume: 15ml
- família olfativa: floral frutado
- referência olfativa: inspirado em Cacharel Amor Amor

49. GLAMOUR
- volume: 15ml
- família olfativa: floral amadeirado almiscarado
- referência olfativa: inspirado em Paco Rabanne Fame

50. MILY
- volume: 15ml
- família olfativa: floral
- referência olfativa: inspirado em O Boticário Lily

51. CHERRY WOMAN
- volume: 15ml
- família olfativa: oriental floral
- referência olfativa: inspirado em Tom Ford Cherry

52. ADORATTO
- volume: 15ml
- família olfativa: oriental baunilha
- referência olfativa: inspirado em Dolce & Gabbana Devotion

53. DUALITÉ
- volume: 15ml
- família olfativa: floral moderna
- referência olfativa: inspirado em Prada Paradoxe

BODY HAIR MIST / CORPO E CABELO
54. BODY HAIR MIST
- volume: 120ml
- preço: R$ 69,80
- uso: fragrância para corpo e cabelo
- indicado para complementar kits, presente e autocuidado

CUIDADOS / HIDRATANTES
55. VELVET SENSATION
- categoria: hidratante
- peso: 200g
- preço: R$ 59,80
- referência olfativa: inspirado em Victoria's Secret Velvet Petals

56. COCO BLISS
- categoria: hidratante
- peso: 200g
- preço: R$ 59,80
- referência olfativa: inspirado em Victoria's Secret Coconut Passion

57. PASSION
- categoria: hidratante
- peso: 200g
- preço: R$ 59,80
- referência olfativa: inspirado em Victoria's Secret Love Spell

58. SENSUAL SERENITY
- categoria: hidratante
- peso: 200g
- preço: R$ 59,80
- referência olfativa: inspirado em Victoria's Secret Pure Seduction

59. HIDRATANTE SCANDAL
- categoria: hidratante
- peso: 200g
- preço: R$ 59,80
- referência olfativa: inspirado em Jean Paul Gaultier Scandal

CUIDADOS INFANTIS
60. BODY HAIR MIST INFANTIL
- volume: 120ml
- preço: R$ 69,90
- categoria: infantil
- perfil: doce, encantador, delicado, com toque divertido

REGRAS DE CURADORIA COM O CATÁLOGO
- Só indicar produtos presentes nesta base.
- Ao citar referência olfativa, usar a expressão "inspirado em".
- Sempre mencionar ml ou g quando houver.
- Quando fizer sentido, montar combos:
  - perfume + hidratante
  - perfume + body hair mist
  - 2 perfumes 15ml
  - 3 perfumes 15ml
  - 1 perfume 100ml + complemento
- Se o cliente estiver indeciso, sugerir no máximo 3 opções.
- Se o cliente pedir algo sensual/noturno, priorizar famílias orientais, baunilha, ambaradas, intensas.
- Se pedir algo fresco/leve/diurno, priorizar aromáticos, aquáticos, florais frutados.
- Se pedir presente, oferecer kit e explicar o estilo.
`;

const SYSTEM_PROMPT = `${BUSINESS_CONTEXT}

${CATALOG_CONTEXT}`;

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
      { icon: <Wind size={14} />, label: "Perfumes masculinos" },
      { icon: <Flower2 size={14} />, label: "Perfumes femininos" },
      { icon: <Sparkles size={14} />, label: "Linha árabe" },
      { icon: <Heart size={14} />, label: "Kits e presentes" },
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
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(mimeType)
      ) {
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
        parts: [
          {
            text: `O cliente clicou na sugestão: ${label}. Atenda normalmente, com voz natural, e conduza o fluxo comercial sem soar robótica.`,
          },
        ],
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
            {
              text: "Responda ao áudio do cliente como Seline, seguindo o fluxo de curadoria e as regras comerciais do catálogo.",
            },
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
              temperature: 0.65,
              thinkingConfig: {
                thinkingLevel: "low",
              },
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const apiMessage =
          data?.error?.message ||
          `Falha no Gemini (status ${response.status}).`;
        throw new Error(apiMessage);
      }

      const rawText: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

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
        error instanceof Error
          ? error.message
          : "Erro inesperado ao consultar a IA.";
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
        (part: { inlineData?: { data?: string; mimeType?: string } }) =>
          part.inlineData?.data
      )?.inlineData;

      const pcmBase64: string | undefined = inlineData?.data;

      if (!pcmBase64) {
        throw new Error("O TTS não retornou áudio.");
      }

      playAudio(pcmBase64);
    } catch (error) {
      console.error("Erro em generateVoice:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Falha inesperada ao gerar voz.";
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
          <p className="whitespace-nowrap px-4 text-center text-[10px] font-medium uppercase tracking-[0.15em]">
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