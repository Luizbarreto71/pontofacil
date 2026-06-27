export type PunchType = "entrada" | "intervalo" | "retorno" | "saida";

export interface PunchEvent {
  type: PunchType;
  time: string | null; // "08:02" ou null se ainda não registrado
}

export interface DayRecord {
  id: string;
  date: string; // ISO yyyy-mm-dd
  weekday: string;
  events: PunchEvent[];
  workedMinutes: number;
  status: "completo" | "parcial" | "ausente" | "atrasado";
}

export interface User {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  empresaId?: string;
  horaEntrada?: string; // "08:00"
  horaSaida?: string; // "18:00"
}

export type NotificationChannel = "whatsapp" | "system" | "email";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string; // "08:02"
  date: string; // "Hoje", "Ontem"...
  channel: NotificationChannel;
  type: PunchType | "alerta" | "info";
  read: boolean;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  status: "presente" | "ausente" | "atrasado" | "intervalo";
  location: string;
  lastPunch: string;
  workedMinutes: number;
}

export interface LivePunch {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  avatarUrl?: string;
  type: PunchType;
  time: string; // "08:02"
  timestamp: number;
  location: string;
  lat?: number;
  lng?: number;
  faceConfidence: number; // 0–1
  gpsConfirmed: boolean;
}

export interface AppSettings {
  darkMode: boolean;
  language: "pt-BR" | "en-US" | "es-ES";
  faceRecognition: boolean;
  whatsapp: boolean;
  biometrics: boolean;
  hoursBank: boolean;
}

export const defaultSettings: AppSettings = {
  darkMode: false,
  language: "pt-BR",
  faceRecognition: true,
  whatsapp: true,
  biometrics: true,
  hoursBank: true,
};
