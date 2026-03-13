"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Flower2,
  Heart,
  Mic,
  MicOff,
  Sparkles,
  Wind,
  X,
} from "lucide-react";

/* =========================
   TYPES
   ========================= */

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
  produtos?: string[];
};

type VisualProduct = {
  name: string;
  volume: string;
  reference?: string;
  price?: string;
  imageSrc: string;
};

/* =========================
   CONSTANTS
   ========================= */

const CHAT_MODEL = "gemini-3-flash-preview";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

const VISUAL_PRODUCT_REGISTRY: Record<string, VisualProduct> = {
  DELUNE: {
    name: "DELUNE",
    volume: "100ml",
    price: "R$ 280,00",
    imageSrc: "/products/visual/delune.png",
  },
  HAYAL: {
    name: "HAYAL",
    volume: "100ml",
    price: "R$ 290,00",
    imageSrc: "/products/visual/hayal.png",
  },
  "AMBER MONARCH": {
    name: "AMBER MONARCH",
    volume: "100ml",
    price: "R$ 255,00",
    reference: "inspirado em Orientica Royal Amber",
    imageSrc: "/products/visual/amber-monarch.png",
  },
  DIVINE: {
    name: "DIVINE",
    volume: "100ml",
    price: "R$ 259,00",
    reference: "inspirado em Xerjoff Erba Pura",
    imageSrc: "/products/visual/divine.png",
  },
  "SHEIKH'S SECRET": {
    name: "SHEIKH'S SECRET",
    volume: "100ml",
    price: "R$ 259,00",
    reference: "inspirado em Parfums de Marly Althair",
    imageSrc: "/products/visual/sheikhs-secret.png",
  },
  ASYD: {
    name: "ASYD",
    volume: "15ml",
    reference: "inspirado em Lattafa Asad",
    imageSrc: "/products/visual/asyd.png",
  },
  AYALA: {
    name: "AYALA",
    volume: "15ml",
    reference: "inspirado em Lattafa Fakhar Rose",
    imageSrc: "/products/visual/ayala.png",
  },
  CANIBAL: {
    name: "CANIBAL",
    volume: "15ml",
    reference: "inspirado em Animale For Men",
    imageSrc: "/products/visual/canibal.png",
  },
  "BLACK CAR": {
    name: "BLACK CAR",
    volume: "15ml",
    reference: "inspirado em Ferrari Scuderia Black",
    imageSrc: "/products/visual/black-car.png",
  },
  "COMANDER VICTORY": {
    name: "COMANDER VICTORY",
    volume: "15ml",
    reference: "inspirado em Paco Rabanne Invictus Victory",
    imageSrc: "/products/visual/comander-victory.png",
  },
};

const BUSINESS_CONTEXT = `
Você é Selina, consultora de curadoria da SÉLÈNE.
SÉLÈNE é a marca e Selina é a especialista que conduz a experiência de atendimento.

MISSÃO
Você deve conduzir uma curadoria comercial real, elegante, útil e natural.
Seu trabalho é entender a necessidade do cliente, indicar produtos corretos do catálogo,
ajustar a seleção quando necessário e levar o atendimento até o fechamento.

TOM DE VOZ
- elegante
- técnica
- acolhedora
- premium
- natural
- nada robótica
- nada prolixa
- frases curtas
- ritmo objetivo

REGRAS DE CONVERSA
- faça apenas UMA pergunta por vez
- em respostas normais, use no máximo 2 frases curtas antes da pergunta
- quando apresentar uma curadoria, sugira no máximo 3 produtos por vez
- não despeje catálogo
- não repita a mesma informação já dita, a não ser que o cliente peça ou na confirmação final
- se o cliente fizer outra pergunta no meio do fluxo, responda e depois retome com naturalidade
- nunca deixe o cliente sem continuidade
- nunca diga que é uma IA
- nunca diga que não pode vender
- nunca invente produto fora do catálogo
- nunca altere o nome do produto
- nunca invente cidade a partir do CEP
- nunca invente preço quando o preço exato não estiver explicitamente presente no catálogo base

REGRAS DE CURADORIA
1. Comece com saudação breve.
2. Se o cliente já perguntou algo, responda brevemente ao ponto.
3. Pergunte o nome do cliente logo no início, com naturalidade.
4. Entenda a necessidade antes de indicar.
5. Faça a curadoria.
6. Ao citar produto, use esta ordem:
   - nome exato do produto
   - referência olfativa, quando existir, com a expressão "inspirado em"
   - volume ou peso
   - benefício ou proposta de uso, em linguagem curta
7. Depois da seleção, confirme se o cliente gostou ou quer ajuste.
8. Ao falar de valores:
   - use somente preço exato se ele estiver explícito no catálogo base
   - se o preço exato do item não estiver explícito no catálogo base, não invente número
   - nesse caso, diga que vai fechar a composição final e passar o valor correto do conjunto
9. Promoções:
   - se o pedido não atingir R$149,90, ofereça completar para liberar 15% de desconto
   - se atingir R$149,90 ou mais, informe os 15% de desconto
   - se atingir R$199,90 ou mais, informe também o frete grátis
10. Fechamento:
   - confirme os itens
   - pergunte forma de pagamento: PIX, cartão ou boleto
   - peça o CEP
   - quando receber o CEP, apenas confirme o recebimento; não diga a cidade se o sistema não a informou
   - no fechamento, diga que será gerado o link de pagamento do Mercado Pago

REGRA DO CAMPO PRODUTOS
- sempre que você citar produtos na resposta, preencha o campo "produtos" com os nomes EXATOS dos itens citados
- preserve a mesma ordem em que os produtos aparecem na fala
- use no máximo 3 produtos por resposta
- se nenhum produto for citado, use []

FORMATO DA RESPOSTA
Responda APENAS em JSON válido.
Sem markdown.
Sem crases.
Sem texto fora do JSON.

FORMATO EXATO:
{"texto":"fala natural da Selina","status":"curadoria","passo":1,"produtos":["DELUNE","DIVINE"]}
`;

const CATALOG_CONTEXT = `
CATÁLOGO BASE MOMENTS PARIS

LINHA AUTORAL / PERFUMES ÁRABES 100ML
1. DELUNE
- categoria: perfume feminino autoral
- volume: 100ml
- preço: R$ 280,00
- família olfativa: oriental floral

2. HAYAL
- categoria: perfume masculino autoral
- volume: 100ml
- preço: R$ 290,00

3. AMBER MONARCH
- categoria: perfume árabe unissex
- volume: 100ml
- preço: R$ 255,00
- família olfativa: oriental baunilha
- referência olfativa: inspirado em Orientica Royal Amber

4. DIVINE
- categoria: perfume árabe unissex
- volume: 100ml
- preço: R$ 259,00
- família olfativa: oriental
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
- volume: 15ml
- referência olfativa: inspirado em Lattafa Asad

8. AYALA
- volume: 15ml
- referência olfativa: inspirado em Lattafa Fakhar Rose

PERFUMES MASCULINOS 15ML
9. CANIBAL
- volume: 15ml
- referência olfativa: inspirado em Animale For Men

10. BLACK CAR
- volume: 15ml
- referência olfativa: inspirado em Ferrari Scuderia Black

11. COMANDER VICTORY
- volume: 15ml
- referência olfativa: inspirado em Paco Rabanne Invictus Victory

12. RUSTIC HOMME
- volume: 15ml
- referência olfativa: inspirado em Azzaro Pour Homme

13. ACQUA BOY
- volume: 15ml
- referência olfativa: inspirado em Giorgio Armani Acqua di Giò

14. ROBOT MAN
- volume: 15ml
- referência olfativa: inspirado em Paco Rabanne Phantom

15. SILVESTRE
- volume: 15ml
- referência olfativa: inspirado em Jacques Bogart Silver Scent

16. GOODBLACK
- volume: 15ml
- referência olfativa: inspirado em O Boticário Malbec

17. AQUATIC BLUE
- volume: 15ml
- referência olfativa: inspirado em Ralph Lauren Polo Blue

18. 412 TOP MEN
- volume: 15ml
- referência olfativa: inspirado em Carolina Herrera 212 VIP Men

19. 412 HOMEM
- volume: 15ml
- referência olfativa: inspirado em Carolina Herrera 212 Men

20. DU CHEFE
- volume: 15ml
- referência olfativa: inspirado em Hugo Boss Boss Bottled

21. COMANDER
- volume: 15ml
- referência olfativa: inspirado em Paco Rabanne Invictus

22. SELVAGEM
- volume: 15ml
- referência olfativa: inspirado em Dior Sauvage

23. MILIONERE
- volume: 15ml
- referência olfativa: inspirado em Paco Rabanne One Million Legend

24. REBEL BOY
- volume: 15ml
- referência olfativa: inspirado em Carolina Herrera Bad Boy

25. LEATHER
- volume: 15ml
- referência olfativa: inspirado em Yves Saint Laurent Kouros

26. BLUE HOMME
- volume: 15ml
- referência olfativa: inspirado em Chanel Bleu de Chanel

27. TITAN BLACK
- volume: 15ml
- referência olfativa: inspirado em Bvlgari Black

28. 412 ELITE BLACK
- volume: 15ml
- referência olfativa: inspirado em Carolina Herrera 212 VIP Black

29. AQUATIC GREEN
- volume: 15ml
- referência olfativa: inspirado em Ralph Lauren Polo

30. Y-NOT
- volume: 15ml
- referência olfativa: inspirado em Yves Saint Laurent Y For Men

31. BE MYSELF
- volume: 15ml
- referência olfativa: inspirado em Yves Saint Laurent Myself

PERFUMES FEMININOS 15ML
32. 412 SEXY
- volume: 15ml
- referência olfativa: inspirado em Carolina Herrera 212 Sexy

33. LUXUOSA
- volume: 15ml
- referência olfativa: inspirado em Lancôme La Nuit Trésor

34. FANTÁSTICA
- volume: 15ml
- referência olfativa: inspirado em Britney Spears Fantasy

35. LADY FABULOSA
- volume: 15ml
- referência olfativa: inspirado em Carolina Herrera Lady Million Fabulous

36. KHLOÉ
- volume: 15ml
- referência olfativa: inspirado em Chloé

37. BEST GIRL VELVET
- volume: 15ml
- referência olfativa: inspirado em Carolina Herrera Very Good Girl

38. BLUE GIRL
- volume: 15ml
- referência olfativa: inspirado em Dolce & Gabbana Light Blue

39. LIVRE
- volume: 15ml
- referência olfativa: inspirado em Yves Saint Laurent Libre

40. CELINA WOMAN
- volume: 15ml
- referência olfativa: inspirado em Parfums de Marly Delina

41. OLÍMPICA GIRL
- volume: 15ml
- referência olfativa: inspirado em Paco Rabanne Olympéa

42. LA BELLA WOMAN
- volume: 15ml
- referência olfativa: inspirado em Lancôme La Vie Est Belle

43. COCO PARIS
- volume: 15ml
- referência olfativa: inspirado em Chanel Coco Mademoiselle

44. 412 VIP WOMAN
- volume: 15ml
- referência olfativa: inspirado em Carolina Herrera 212 VIP Woman

45. GLAMOUROSA
- volume: 15ml
- referência olfativa: inspirado em Jean Paul Gaultier Scandal

46. BEST GIRL
- volume: 15ml
- referência olfativa: inspirado em Carolina Herrera Good Girl

47. 412 ROSE
- volume: 15ml
- referência olfativa: inspirado em Carolina Herrera 212 VIP Rosé

48. LOVE RED
- volume: 15ml
- referência olfativa: inspirado em Cacharel Amor Amor

49. GLAMOUR
- volume: 15ml
- referência olfativa: inspirado em Paco Rabanne Fame

50. MILY
- volume: 15ml
- referência olfativa: inspirado em O Boticário Lily

51. CHERRY WOMAN
- volume: 15ml
- referência olfativa: inspirado em Tom Ford Cherry

52. ADORATTO
- volume: 15ml
- referência olfativa: inspirado em Dolce & Gabbana Devotion

53. DUALITÉ
- volume: 15ml
- referência olfativa: inspirado em Prada Paradoxe

BODY HAIR MIST
54. BODY HAIR MIST
- volume: 120ml
- preço: R$ 69,80
- uso: fragrância para corpo e cabelo

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

60. BODY HAIR MIST INFANTIL
- volume: 120ml
- preço: R$ 69,90
- categoria: infantil
`;

const SYSTEM_PROMPT = `${BUSINESS_CONTEXT}

${CATALOG_CONTEXT}`;

/* =========================
   HELPERS
   ========================= */

function normalizeProductKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getVisualProductsFromNames(names: string[]) {
  const seen = new Set<string>();

  return names
    .map((name) => normalizeProductKey(name))
    .map((key) => VISUAL_PRODUCT_REGISTRY[key])
    .filter((item): item is VisualProduct => Boolean(item))
    .filter((item) => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    })
    .slice(0, 3);
}

function getVisualProductsFromText(text: string) {
  const normalizedText = normalizeProductKey(text);
  const matches: VisualProduct[] = [];

  Object.entries(VISUAL_PRODUCT_REGISTRY).forEach(([key, item]) => {
    if (normalizedText.includes(key) && !matches.some((m) => m.name === item.name)) {
      matches.push(item);
    }
  });

  return matches.slice(0, 3);
}

function mergeVisualProducts(primary: VisualProduct[], secondary: VisualProduct[]) {
  const seen = new Set<string>();

  return [...primary, ...secondary].filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

/* =========================
   COMPONENTS
   ========================= */

function LaboratoryOrb({ status }: { status: AppStatus }) {
  return (
    <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-[#545353]/12 bg-white/70 shadow-[0_20px_60px_rgba(84,83,83,0.08)] backdrop-blur-sm">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_35%,rgba(84,83,83,0.08),transparent_58%)]" />
      <div className="absolute inset-3 rounded-full border border-[#545353]/8" />
      <div className="absolute inset-7 rounded-full border border-[#545353]/6" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`lab-core ${status}`} />
      </div>

      <div className="absolute bottom-12 left-1/2 h-16 w-[120px] -translate-x-1/2">
        <div className="absolute left-0 top-4 h-10 w-7 rounded-b-[14px] rounded-t-[8px] border border-[#545353]/15 bg-white/60">
          <div className={`liquid liquid-left ${status}`} />
        </div>
        <div className="absolute left-1/2 top-0 h-14 w-8 -translate-x-1/2 rounded-b-[16px] rounded-t-[9px] border border-[#545353]/15 bg-white/60">
          <div className={`liquid liquid-center ${status}`} />
        </div>
        <div className="absolute right-0 top-5 h-9 w-7 rounded-b-[14px] rounded-t-[8px] border border-[#545353]/15 bg-white/60">
          <div className={`liquid liquid-right ${status}`} />
        </div>
      </div>

      <div className="absolute inset-0">
        <span className={`bubble bubble-1 ${status}`} />
        <span className={`bubble bubble-2 ${status}`} />
        <span className={`bubble bubble-3 ${status}`} />
        <span className={`bubble bubble-4 ${status}`} />
        <span className={`bubble bubble-5 ${status}`} />
        <span className={`bubble bubble-6 ${status}`} />
      </div>

      <div className="absolute inset-0">
        <span className={`halo halo-a ${status}`} />
        <span className={`halo halo-b ${status}`} />
        <span className={`halo halo-c ${status}`} />
      </div>

      <style jsx>{`
        .lab-core {
          width: 84px;
          height: 84px;
          border-radius: 9999px;
          background:
            radial-gradient(circle at 35% 35%, rgba(255,255,255,0.75), transparent 28%),
            radial-gradient(circle at 65% 70%, rgba(84,83,83,0.12), transparent 40%),
            linear-gradient(180deg, rgba(84,83,83,0.10), rgba(84,83,83,0.03));
          box-shadow:
            inset 0 0 18px rgba(84,83,83,0.08),
            0 0 24px rgba(84,83,83,0.06);
          animation: coreIdle 6s ease-in-out infinite;
          position: relative;
        }

        .lab-core::before,
        .lab-core::after {
          content: "";
          position: absolute;
          inset: -10px;
          border-radius: 9999px;
          border: 1px solid rgba(84,83,83,0.10);
        }

        .lab-core::before {
          animation: ringSpin 9s linear infinite;
        }

        .lab-core::after {
          inset: -18px;
          animation: ringSpinReverse 12s linear infinite;
          opacity: 0.45;
        }

        .lab-core.listening {
          animation: coreListening 1.8s ease-in-out infinite;
        }

        .lab-core.thinking {
          animation: coreThinking 2.4s ease-in-out infinite;
        }

        .lab-core.speaking {
          animation: coreSpeaking 1.2s ease-in-out infinite;
        }

        .lab-core.error {
          animation: coreError 1.6s ease-in-out infinite;
        }

        .liquid {
          position: absolute;
          left: 2px;
          right: 2px;
          bottom: 2px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(84,83,83,0.26), rgba(84,83,83,0.11));
          transition: all 300ms ease;
        }

        .liquid-left { height: 34%; }
        .liquid-center { height: 42%; }
        .liquid-right { height: 30%; }

        .liquid.idle {
          animation: liquidIdle 5s ease-in-out infinite;
        }

        .liquid.listening {
          animation: liquidListening 1.5s ease-in-out infinite;
        }

        .liquid.thinking {
          animation: liquidThinking 1.9s ease-in-out infinite;
        }

        .liquid.speaking {
          animation: liquidSpeaking 0.9s ease-in-out infinite;
        }

        .liquid.error {
          animation: liquidError 1.3s ease-in-out infinite;
        }

        .bubble {
          position: absolute;
          display: block;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: rgba(84,83,83,0.16);
          opacity: 0;
        }

        .bubble-1 { left: 30%; bottom: 33%; animation-delay: 0s; }
        .bubble-2 { left: 39%; bottom: 27%; animation-delay: 0.6s; }
        .bubble-3 { left: 48%; bottom: 31%; animation-delay: 1.1s; }
        .bubble-4 { left: 57%; bottom: 29%; animation-delay: 1.5s; }
        .bubble-5 { left: 66%; bottom: 35%; animation-delay: 0.9s; }
        .bubble-6 { left: 51%; bottom: 24%; animation-delay: 1.8s; }

        .bubble.idle {
          animation: bubbleFloat 7s ease-in-out infinite;
        }

        .bubble.listening {
          animation: bubbleFloat 2s ease-in-out infinite;
        }

        .bubble.thinking {
          animation: bubbleFloatThinking 1.9s ease-in-out infinite;
        }

        .bubble.speaking {
          animation: bubbleFloatSpeaking 1.1s ease-in-out infinite;
        }

        .bubble.error {
          animation: bubbleError 1.4s ease-in-out infinite;
        }

        .halo {
          position: absolute;
          inset: 22px;
          border-radius: 9999px;
          border: 1px solid rgba(84,83,83,0.08);
          opacity: 0;
        }

        .halo-a { animation-delay: 0s; }
        .halo-b { animation-delay: 0.5s; }
        .halo-c { animation-delay: 1s; }

        .halo.listening {
          animation: haloPulse 1.6s ease-out infinite;
        }

        .halo.thinking {
          animation: haloThinking 2.2s ease-out infinite;
        }

        .halo.speaking {
          animation: haloSpeaking 1s ease-out infinite;
        }

        .halo.error {
          animation: haloError 1.5s ease-out infinite;
        }

        @keyframes coreIdle {
          0%, 100% { transform: scale(0.98) rotate(0deg); }
          50% { transform: scale(1.03) rotate(6deg); }
        }

        @keyframes coreListening {
          0%, 100% { transform: scale(0.98); }
          50% { transform: scale(1.08); }
        }

        @keyframes coreThinking {
          0%, 100% { transform: scale(0.98) rotate(0deg); }
          25% { transform: scale(1.04) rotate(8deg); }
          50% { transform: scale(1.08) rotate(-8deg); }
          75% { transform: scale(1.03) rotate(4deg); }
        }

        @keyframes coreSpeaking {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.06); }
          50% { transform: scale(0.98); }
          75% { transform: scale(1.07); }
        }

        @keyframes coreError {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          50% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
        }

        @keyframes ringSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes ringSpinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes liquidIdle {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.08); }
        }

        @keyframes liquidListening {
          0%, 100% { transform: scaleY(0.95); }
          50% { transform: scaleY(1.22); }
        }

        @keyframes liquidThinking {
          0%, 100% { transform: scaleY(1) translateY(0); }
          33% { transform: scaleY(1.28) translateY(-1px); }
          66% { transform: scaleY(0.92) translateY(1px); }
        }

        @keyframes liquidSpeaking {
          0%, 100% { transform: scaleY(0.92); }
          50% { transform: scaleY(1.34); }
        }

        @keyframes liquidError {
          0%, 100% { transform: scaleY(1); opacity: 0.85; }
          50% { transform: scaleY(1.18); opacity: 1; }
        }

        @keyframes bubbleFloat {
          0% { transform: translateY(0) scale(0.7); opacity: 0; }
          20% { opacity: 0.5; }
          100% { transform: translateY(-85px) scale(1.05); opacity: 0; }
        }

        @keyframes bubbleFloatThinking {
          0% { transform: translateY(0) scale(0.7); opacity: 0; }
          15% { opacity: 0.8; }
          100% { transform: translateY(-100px) scale(1.12); opacity: 0; }
        }

        @keyframes bubbleFloatSpeaking {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { opacity: 0.9; }
          100% { transform: translateY(-72px) scale(0.95); opacity: 0; }
        }

        @keyframes bubbleError {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          20% { opacity: 0.45; }
          100% { transform: translateY(-45px) scale(0.8); opacity: 0; }
        }

        @keyframes haloPulse {
          0% { transform: scale(0.85); opacity: 0.22; }
          100% { transform: scale(1.18); opacity: 0; }
        }

        @keyframes haloThinking {
          0% { transform: scale(0.9) rotate(0deg); opacity: 0.18; }
          100% { transform: scale(1.22) rotate(18deg); opacity: 0; }
        }

        @keyframes haloSpeaking {
          0% { transform: scale(0.92); opacity: 0.28; }
          100% { transform: scale(1.12); opacity: 0; }
        }

        @keyframes haloError {
          0% { transform: scale(0.94); opacity: 0.22; }
          100% { transform: scale(1.04); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function VisualProductCard({ product }: { product: VisualProduct }) {
  const [hiddenByError, setHiddenByError] = useState(false);

  if (hiddenByError) return null;

  return (
    <div className="w-[132px] flex-none rounded-2xl border border-[#545353]/10 bg-white/90 p-2 shadow-[0_10px_30px_rgba(84,83,83,0.08)]">
      <div className="mb-2 overflow-hidden rounded-xl bg-[#f7f7f7]">
        <img
          src={product.imageSrc}
          alt={product.name}
          className="h-[132px] w-full object-contain"
          loading="lazy"
          onError={() => setHiddenByError(true)}
        />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#545353]">
          {product.name}
        </p>
        <p className="text-[10px] text-[#545353]/65">{product.volume}</p>
        {product.price ? (
          <p className="text-[10px] font-medium text-[#545353]/80">{product.price}</p>
        ) : null}
      </div>
    </div>
  );
}

function ProductShowcasePopup({
  open,
  products,
  onClose,
}: {
  open: boolean;
  products: VisualProduct[];
  onClose: () => void;
}) {
  if (!open || products.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-32 z-30 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-[420px] rounded-[28px] border border-[#545353]/10 bg-white/92 p-4 shadow-[0_24px_80px_rgba(84,83,83,0.12)] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#545353]/50">
              Curadoria visual
            </p>
            <p className="mt-1 text-[11px] text-[#545353]/70">
              Mostrando apenas os itens com imagem disponível
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#545353]/10 bg-white text-[#545353]/70 transition hover:border-[#545353]/25 hover:text-[#545353]"
            aria-label="Fechar vitrine visual"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {products.map((product) => (
            <VisualProductCard key={product.name} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================
   PAGE
   ========================= */

export default function Page() {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [popupProducts, setPopupProducts] = useState<VisualProduct[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

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
  };

  const setErrorState = (message: string) => {
    setStatus("error");
    setErrorMsg(message);
  };

  const syncPopupProducts = (result: SelineResponse) => {
    const namesFromJson = Array.isArray(result.produtos)
      ? result.produtos.filter((item): item is string => typeof item === "string")
      : [];

    const products = mergeVisualProducts(
      getVisualProductsFromNames(namesFromJson),
      getVisualProductsFromText(result.texto)
    ).slice(0, 3);

    if (products.length > 0) {
      setPopupProducts(products);
      setIsPopupOpen(true);
      return;
    }

    setPopupProducts([]);
    setIsPopupOpen(false);
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

    await callGemini([
      {
        role: "user",
        parts: [
          {
            text: `O cliente clicou na sugestão: ${label}. Atenda com voz natural, conduza a curadoria de forma elegante, faça apenas uma pergunta por vez e, se citar produtos, preencha corretamente o campo produtos.`,
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

    try {
      const base64 = await blobToBase64(blob);

      await callGemini([
        {
          role: "user",
          parts: [
            {
              text: "Responda ao áudio do cliente como Selina, seguindo rigorosamente as regras de curadoria, brevidade, catálogo e condução comercial. Se citar produtos, preencha corretamente o campo produtos.",
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
              temperature: 0.3,
              topP: 0.8,
              maxOutputTokens: 260,
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
          data?.error?.message || `Falha no Gemini (status ${response.status}).`;
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

      syncPopupProducts(result);
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
            contents: [{ parts: [{ text }] }],
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
        (part: { inlineData?: { data?: string } }) => part.inlineData?.data
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

      source.onended = () => {
        setIdleState();
      };

      source.start(0);
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      setErrorState("Falha ao reproduzir o áudio da Selina.");
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
        <LaboratoryOrb status={status} />

        {status === "error" && (
          <div className="flex max-w-sm items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-[11px] text-red-500">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

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

      <ProductShowcasePopup
        open={isPopupOpen}
        products={popupProducts}
        onClose={() => setIsPopupOpen(false)}
      />
    </div>
  );
}
