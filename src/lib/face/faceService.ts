/**
 * Serviço de biometria facial REAL, 100% no navegador (sem servidor).
 * Usa @vladmandic/face-api (TensorFlow.js) carregado sob demanda.
 *
 * Fluxo:
 *  - loadModels(): baixa os pesos de /models uma única vez
 *  - getDescriptor(video): detecta 1 rosto e retorna o vetor de 128 dimensões
 *  - enroll(): salva o descritor do usuário (cadastro biométrico) no localStorage
 *  - verify(): compara o rosto ao vivo com o descritor cadastrado (distância euclidiana)
 */
import type * as FaceApi from "@vladmandic/face-api";

const MODEL_URL = "/models";
// Limite de distância: < MATCH_THRESHOLD => mesma pessoa (0.6 é o padrão da lib)
export const MATCH_THRESHOLD = 0.52;

let faceapi: typeof FaceApi | null = null;
let loadingPromise: Promise<void> | null = null;

export type FaceLoadState = "idle" | "loading" | "ready" | "error";

async function ensureLib() {
  if (!faceapi) {
    faceapi = await import("@vladmandic/face-api");
  }
  return faceapi;
}

/** Carrega os modelos + backend GPU + warm-up (idempotente). */
export async function loadModels(): Promise<void> {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const api = await ensureLib();

    // Backend GPU (WebGL) — dezenas de vezes mais rápido que CPU/WASM.
    try {
      const tf = (api as unknown as { tf: any }).tf;
      if (tf?.getBackend?.() !== "webgl") {
        await tf.setBackend("webgl");
      }
      await tf.ready();
    } catch {
      /* fallback automático para o backend disponível */
    }

    await Promise.all([
      api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    // Warm-up: compila os shaders do detector num frame em branco
    // para que a 1ª detecção real já seja rápida.
    try {
      const c = document.createElement("canvas");
      c.width = 224;
      c.height = 224;
      await api.detectSingleFace(
        c,
        new api.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
      );
    } catch {
      /* ignora */
    }
  })();
  return loadingPromise;
}

export function modelsReady(): boolean {
  return (
    !!faceapi &&
    faceapi.nets.tinyFaceDetector.isLoaded &&
    faceapi.nets.faceRecognitionNet.isLoaded
  );
}

/** Detecta um único rosto no vídeo e devolve o descritor (Float32Array) + score. */
export async function getDescriptor(
  input: HTMLVideoElement | HTMLImageElement
): Promise<{ descriptor: Float32Array; score: number } | null> {
  const api = await ensureLib();
  // inputSize menor = detecção bem mais rápida (selfie já preenche o quadro)
  const options = new api.TinyFaceDetectorOptions({
    inputSize: 224,
    scoreThreshold: 0.4,
  });
  const result = await api
    .detectSingleFace(input, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!result) return null;
  return { descriptor: result.descriptor, score: result.detection.score };
}

/** Apenas detecta se há rosto enquadrado (mais leve — usado para "posicione o rosto"). */
export async function hasFace(input: HTMLVideoElement): Promise<boolean> {
  const api = await ensureLib();
  const options = new api.TinyFaceDetectorOptions({
    inputSize: 224,
    scoreThreshold: 0.4,
  });
  const det = await api.detectSingleFace(input, options);
  return !!det;
}

type Pt = { x: number; y: number };
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Eye Aspect Ratio: razão altura/largura do olho (cai bruscamente ao piscar). */
function ear(eye: Pt[]): number {
  if (eye.length < 6) return 1;
  return (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2 * dist(eye[0], eye[3]));
}

/**
 * Detecta o rosto + landmarks e devolve o EAR médio dos dois olhos.
 * Usado para a prova de vida (liveness) por piscada. Mais leve que o descritor.
 */
export async function detectForLiveness(
  input: HTMLVideoElement
): Promise<{ ear: number } | null> {
  const api = await ensureLib();
  const options = new api.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
  const res = await api.detectSingleFace(input, options).withFaceLandmarks();
  if (!res) return null;
  const left = res.landmarks.getLeftEye() as Pt[];
  const right = res.landmarks.getRightEye() as Pt[];
  return { ear: (ear(left) + ear(right)) / 2 };
}

export function euclidean(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export interface VerifyResult {
  matched: boolean;
  distance: number;
  /** confiança 0–1 estimada a partir da distância */
  confidence: number;
}

/** Compara dois descritores faciais. */
export function compare(live: Float32Array, enrolled: Float32Array): VerifyResult {
  const distance = euclidean(live, enrolled);
  const confidence = Math.max(0, Math.min(1, 1 - distance));
  return { matched: distance < MATCH_THRESHOLD, distance, confidence };
}
