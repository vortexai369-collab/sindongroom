export type RoomColorKey =
  | 'purple'
  | 'blue'
  | 'teal'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'indigo'
  | 'cyan';

export interface SpecialRoom {
  id: string;
  schoolId: string;
  name: string;
  category: string;
  colorKey: RoomColorKey;
  location: string;
  floor: string;
  capacity: number;
  availablePeriods: number[];
  equipment: string;
  managerName: string;
  guidelines: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Reservation {
  id: string;
  schoolId: string;
  roomId: string;
  roomName: string;
  roomCategory: string;
  roomColor: RoomColorKey;
  userName: string; // 예약자 교사 성명
  date: string; // YYYY-MM-DD
  startPeriod: number; // 1..6
  endPeriod: number; // 1..6
  grade: number; // 학년 (1..6)
  classNum: number; // 반 (1..20)
  classLabel: string; // 예: "5학년 2반"
  status: 'confirmed' | 'cancelled';
  seriesId: string;
  recurrenceSummary: string;
  source: 'manual' | 'timetable' | 'ai';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  category: 'general' | 'maintenance' | 'event' | 'urgent';
  pinned: boolean;
  authorName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  schoolId: string;
  actorName: string;
  action:
    | 'create_reservation'
    | 'update_reservation'
    | 'cancel_reservation'
    | 'manage_room'
    | 'manage_settings';
  targetId: string;
  summary: string;
  createdAt?: unknown;
}

export interface SchoolSettings {
  id: string;
  schoolId: string;
  schoolName: string;
  maxAdvanceDays: number;
  allowTeacherRecurring: boolean;
  p1Start: string;
  p1End: string;
  p2Start: string;
  p2End: string;
  p3Start: string;
  p3End: string;
  p4Start: string;
  p4End: string;
  lunchStart: string;
  lunchEnd: string;
  p5Start: string;
  p5End: string;
  p6Start: string;
  p6End: string;
  sampleCleared?: boolean;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface PeriodInfo {
  period: number;
  label: string;
  startTime: string;
  endTime: string;
}

export interface ConflictItem {
  date: string;
  period: number;
  reason: string;
}

export interface AlternativeSlot {
  roomId: string;
  roomName: string;
  date: string;
  startPeriod: number;
  endPeriod: number;
  label: string;
}

export interface AIReservationParsed {
  intent: 'create_reservation' | 'search_available';
  roomId: string;
  roomName: string;
  userName: string;
  startDate: string;
  endDate: string;
  startPeriod: number;
  endPeriod: number;
  recurrenceType: 'none' | 'daily' | 'weekly' | 'period_weekday';
  weeklyCount: number;
  grade: number;
  classNum: number;
  classLabel: string;
  missingFields: string[];
  followUpQuestion: string;
  explanation: string;
}

export type NavSectionId =
  | 'dashboard'
  | 'timetable'
  | 'calendar'
  | 'new-reservation'
  | 'all-reservations'
  | 'recurring-reservations'
  | 'room-list'
  | 'room-manage'
  | 'announcements'
  | 'system-settings';

export const ROOM_COLOR_PALETTE: Record<
  RoomColorKey,
  {
    bg: string;
    border: string;
    text: string;
    subtext: string;
    badgeBg: string;
    label: string;
  }
> = {
  purple: {
    bg: 'bg-[#F5F2FD]',
    border: 'border-[#E8DEF8]',
    text: 'text-[#5B3FB8]',
    subtext: 'text-[#7A5EC7]',
    badgeBg: 'bg-[#7A5EC7]',
    label: '라벤더 (과학실)',
  },
  blue: {
    bg: 'bg-[#F0F7FF]',
    border: 'border-[#D0E5FE]',
    text: 'text-[#1D5BD6]',
    subtext: 'text-[#3B73E0]',
    badgeBg: 'bg-[#2563EB]',
    label: '스카이블루 (컴퓨터실)',
  },
  teal: {
    bg: 'bg-[#EBFBF8]',
    border: 'border-[#C5F2EA]',
    text: 'text-[#0E7470]',
    subtext: 'text-[#138A85]',
    badgeBg: 'bg-[#0D9488]',
    label: '청록 (음악실)',
  },
  emerald: {
    bg: 'bg-[#EAF7EE]',
    border: 'border-[#C6EDD3]',
    text: 'text-[#166534]',
    subtext: 'text-[#1E8A58]',
    badgeBg: 'bg-[#22C55E]',
    label: '민트 (도서실)',
  },
  amber: {
    bg: 'bg-[#FEF6E9]',
    border: 'border-[#FDE6BA]',
    text: 'text-[#B45309]',
    subtext: 'text-[#C96718]',
    badgeBg: 'bg-[#F59E0B]',
    label: '웜샌드 (미술실)',
  },
  rose: {
    bg: 'bg-[#FFF0ED]',
    border: 'border-[#FED7D0]',
    text: 'text-[#BE123C]',
    subtext: 'text-[#D42A54]',
    badgeBg: 'bg-[#FB7185]',
    label: '피치 (실과실)',
  },
  indigo: {
    bg: 'bg-[#EEF2FF]',
    border: 'border-[#C7D2FE]',
    text: 'text-[#3730A3]',
    subtext: 'text-[#4F46E5]',
    badgeBg: 'bg-[#6366F1]',
    label: '인디고 (스마트AI실)',
  },
  cyan: {
    bg: 'bg-[#ECFEFF]',
    border: 'border-[#CFFAFE]',
    text: 'text-[#0E7490]',
    subtext: 'text-[#0891B2]',
    badgeBg: 'bg-[#06B6D4]',
    label: '시안 (체육관)',
  },
};
