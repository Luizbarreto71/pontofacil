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

/** Carrega os modelos (idempotente). */
export async function loadModels(): Promise<void> {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const api = await ensureLib();
    await Promise.all([
      api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
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
  const options = new api.TinyFaceDetectorOptions({
    inputSize: 320,
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
