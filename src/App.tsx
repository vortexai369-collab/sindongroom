import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Layers,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Repeat,
  Search,
  Settings,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  db,
  handleFirestoreError,
  OperationType,
  SCHOOL_ID,
} from './firebase';
import {
  Announcement,
  AuditLog,
  NavSectionId,
  PeriodInfo,
  Reservation,
  ROOM_COLOR_PALETTE,
  SchoolSettings,
  SpecialRoom,
} from './types';
import {
  addDays,
  DEFAULT_SCHOOL_SETTINGS,
  formatKoreanDate,
  formatWeekRangeLabel,
  getMonthCalendarGrid,
  getTodayStr,
  getWeekDays,
  isPeriodInReservation,
  KOR_WEEKDAYS,
  settingsToPeriods,
} from './utils/dateAndConflict';
import {
  bootstrapInitialSchoolData,
  buildDemoPreviewData,
} from './services/firestoreService';
import { ReservationModal } from './components/ReservationModal';
import {
  AnnouncementsView,
  MonthlyCalendarView,
  ReservationListView,
  RoomDirectoryAndManageView,
  SystemSettingsView,
} from './components/ManagementViews';

export default function App() {
  // ==========================================================================
  // Navigation & UI State
  // ==========================================================================
  const [activeNav, setActiveNav] = useState<NavSectionId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Unified teacher identity for Jeonju Sindong Elementary School
  const unifiedStaffLabel = '전주신동초 교직원';

  // Timetable Navigation & Filters
  // ==========================================================================
  const [referenceDate, setReferenceDate] = useState<string>(getTodayStr());
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [calendarViewMode, setCalendarViewMode] = useState<'week' | 'day'>('day');

  // Mini Month Calendar State (Left pane)
  const [miniCalYear, setMiniCalYear] = useState<number>(() => {
    return Number(getTodayStr().split('-')[0]) || 2026;
  });
  const [miniCalMonth, setMiniCalMonth] = useState<number>(() => {
    return Number(getTodayStr().split('-')[1]) || 10;
  });

  // ==========================================================================
  // Reservation Modal State
  // ==========================================================================
  const [resModalOpen, setResModalOpen] = useState<boolean>(false);
  const [resModalMode, setResModalMode] = useState<'create' | 'detail' | 'edit'>('create');
  const [resModalInitialDate, setResModalInitialDate] = useState<string>(getTodayStr());
  const [resModalInitialPeriod, setResModalInitialPeriod] = useState<number>(2);
  const [resModalInitialRoomId, setResModalInitialRoomId] = useState<string>('');
  const [resModalInitialRecurrence, setResModalInitialRecurrence] = useState<
    'none' | 'daily' | 'weekly' | 'period_weekday'
  >('none');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // ==========================================================================
  // Firestore Subscriptions
  // ==========================================================================
  const demoData = useMemo(() => buildDemoPreviewData(getTodayStr()), []);
  const [liveRooms, setLiveRooms] = useState<SpecialRoom[]>([]);
  const [liveReservations, setLiveReservations] = useState<Reservation[]>([]);
  const [liveAnnouncements, setLiveAnnouncements] = useState<Announcement[]>([]);
  const [liveSettings, setLiveSettings] = useState<SchoolSettings | null>(null);
  const [liveAuditLogs, setLiveAuditLogs] = useState<AuditLog[]>([]);

  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [resLoaded, setResLoaded] = useState(false);
  const [annLoaded, setAnnLoaded] = useState(false);

  useEffect(() => {
    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        const list: SpecialRoom[] = snap.docs.map((d) => {
          const data = d.data() as SpecialRoom;
          return {
            ...data,
            availablePeriods: Array.from(
              new Set([...(data.availablePeriods || [1, 2, 3, 4, 5, 6]), 7])
            ),
          };
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setLiveRooms(list);
        setRoomsLoaded(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'rooms');
        setRoomsLoaded(true);
      }
    );

    const unsubRes = onSnapshot(
      collection(db, 'reservations'),
      (snap) => {
        const list: Reservation[] = snap.docs.map((d) => d.data() as Reservation);
        setLiveReservations(list);
        setResLoaded(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'reservations');
        setResLoaded(true);
      }
    );

    const unsubAnnounce = onSnapshot(
      collection(db, 'announcements'),
      (snap) => {
        const list: Announcement[] = snap.docs.map((d) => d.data() as Announcement);
        list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        setLiveAnnouncements(list);
        setAnnLoaded(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'announcements');
        setAnnLoaded(true);
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'school_config'),
      (snap) => {
        if (snap.exists()) {
          setLiveSettings(snap.data() as SchoolSettings);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'settings/school_config')
    );

    const unsubLogs = onSnapshot(
      collection(db, 'auditLogs'),
      (snap) => {
        const list: AuditLog[] = snap.docs.map((d) => d.data() as AuditLog);
        list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        setLiveAuditLogs(list.slice(0, 50));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
    );

    return () => {
      unsubRooms();
      unsubRes();
      unsubAnnounce();
      unsubSettings();
      unsubLogs();
    };
  }, []);

  const rooms: SpecialRoom[] =
    roomsLoaded && (liveRooms.length > 0 || liveSettings !== null) ? liveRooms : demoData.rooms;
  const reservations: Reservation[] = resLoaded ? liveReservations : demoData.reservations;
  const announcements: Announcement[] = annLoaded ? liveAnnouncements : demoData.announcements;
  const settings: SchoolSettings = liveSettings || DEFAULT_SCHOOL_SETTINGS;
  const auditLogs: AuditLog[] = liveAuditLogs;

  useEffect(() => {
    if (selectedRoomFilter !== 'all' && !rooms.some((r) => r.id === selectedRoomFilter)) {
      setSelectedRoomFilter('all');
    }
  }, [rooms, selectedRoomFilter]);

  const periods: PeriodInfo[] = useMemo(() => settingsToPeriods(settings), [settings]);
  const weekDays = useMemo(() => getWeekDays(referenceDate), [referenceDate]);

  const miniCalendarGrid = useMemo(
    () => getMonthCalendarGrid(miniCalYear, miniCalMonth),
    [miniCalYear, miniCalMonth]
  );

  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!bootstrappedRef.current && roomsLoaded && liveRooms.length === 0) {
      bootstrappedRef.current = true;
      void bootstrapInitialSchoolData();
    }
  }, [roomsLoaded, liveRooms.length]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const handleMiniMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (miniCalMonth === 1) {
        setMiniCalYear((y) => y - 1);
        setMiniCalMonth(12);
      } else {
        setMiniCalMonth((m) => m - 1);
      }
    } else {
      if (miniCalMonth === 12) {
        setMiniCalYear((y) => y + 1);
        setMiniCalMonth(1);
      } else {
        setMiniCalMonth((m) => m + 1);
      }
    }
  };

  const handleOpenNewModal = (opts?: {
    date?: string;
    period?: number;
    roomId?: string;
    recurring?: boolean;
  }) => {
    setResModalMode('create');
    setSelectedReservation(null);
    setResModalInitialDate(opts?.date || referenceDate);
    setResModalInitialPeriod(opts?.period || 2);
    setResModalInitialRoomId(opts?.roomId || (rooms[0]?.id || ''));
    setResModalInitialRecurrence(opts?.recurring ? 'weekly' : 'none');
    setResModalOpen(true);
  };

  const handleOpenDetailModal = (r: Reservation) => {
    setSelectedReservation(r);
    setResModalMode('detail');
    setResModalInitialDate(r.date);
    setResModalInitialPeriod(r.startPeriod);
    setResModalInitialRoomId(r.roomId);
    setResModalOpen(true);
  };

  const currentSelectedRoom =
    selectedRoomFilter === 'all'
      ? rooms[0]
      : rooms.find((r) => r.id === selectedRoomFilter) || rooms[0];



  const fontClass = 'font-apple-sd';

  return (
    <div className={`min-h-screen bg-[#F8FAFC] p-2.5 sm:p-4 lg:p-6 flex flex-col ${fontClass} text-[#0F172A]`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-white bg-[#1E232A] rounded-2xl shadow-xl transition-all">
          <CheckCircle2 className="w-4 h-4 text-[#86EFAC]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Enclosing Canvas Card matching the reference image */}
      <div className="w-full max-w-[1600px] mx-auto bg-white rounded-[28px] sm:rounded-[32px] p-4 sm:p-6 lg:p-7 shadow-xs border border-[#E2EAE5] flex-1 flex flex-col gap-5">
        {/* ================================================================== */}
        {/* CSS Selector: header.sticky */}
        {/* Modern, clean header matching the reference design */}
        {/* ================================================================== */}
        <header className="sticky top-0 z-30 pb-4 border-b border-[#EEF2F0] flex flex-wrap items-center justify-between gap-3 bg-white">
          {/* Logo & School Title Area */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-xl text-[#8A91A0] hover:text-[#1E232A] hover:bg-[#F4F6F8]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* School Title Area */}
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-black text-[#1E232A] tracking-tight">
                전주신동초 특별실 관리
              </h1>
            </div>
          </div>

          {/* Center Info Badge & Search Bar */}
          <div className="flex items-center gap-3 flex-1 max-w-xl mx-2 sm:mx-6 justify-center">
            {/* Soft pink/red status badge like reference image */}
            <div className="hidden xl:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF0F5] border border-[#FDE2EB] text-[#D84A78] text-xs sm:text-sm font-semibold shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#D84A78]" />
              <span>전주신동초 교직원 특별실 이용 중</span>
            </div>

            {/* Modern pill search bar */}
            <div className="relative w-full max-w-xs sm:max-w-sm">
              <Search className="w-4 h-4 text-[#8A91A0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setActiveNav('all-reservations');
                  }
                }}
                placeholder="특별실, 예약 교사, 학급 검색..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#F4F6F8] hover:bg-[#EEF1F4] border border-[#E5E9EE] rounded-full focus:bg-white focus:outline-none focus:border-[#1E232A] transition-all text-[#1E232A] placeholder-[#8A91A0]"
              />
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mint pill action button matching reference image */}
            <button
              type="button"
              onClick={() => handleOpenNewModal()}
              className="inline-flex items-center gap-2 px-4.5 py-2 text-sm sm:text-base font-bold text-[#166534] bg-[#DCFCE7] hover:bg-[#BBF7D0] border border-[#BBF7D0] rounded-full transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span>새 예약 등록</span>
            </button>

            {/* Unified Staff Identity Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#EEF2F0]">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#F4F6F8] border border-[#E5E9EE] text-xs sm:text-sm font-bold text-[#1E232A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                <span>{unifiedStaffLabel}</span>
              </div>
            </div>
          </div>
        </header>

        {/* ================================================================== */}
        {/* Content Layout: Left Sidebar + Right Main Panel */}
        {/* ================================================================== */}
        <div className="flex-1 flex gap-5 overflow-hidden">
          {/* ================================================================ */}
          {/* CSS Selector: aside.bg-white */}
          {/* Sidebar with roomy item spacing & soft charcoal active badge */}
          {/* ================================================================ */}
          <aside
            className={`relative bg-white border-r border-[#EEF2F0] pr-4 flex flex-col shrink-0 transition-all duration-200 ${
              sidebarCollapsed ? 'w-16' : 'w-60'
            } hidden lg:flex`}
          >
            {/* Middle Collapse / Expand Toggle Button on Sidebar Border */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-[#CBD5E1] shadow-md hover:shadow-lg hover:bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] flex items-center justify-center transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#1E232A]/20"
              title={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
              aria-label={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 transition-transform group-hover:scale-110" />
              ) : (
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:scale-110" />
              )}
            </button>

            <div className="flex-1 space-y-6 overflow-y-auto pr-1">
              {/* Group 1: 학교 업무 */}
              <div className="space-y-1.5">
                {!sidebarCollapsed && (
                  <div className="px-3 pb-1 text-xs font-bold tracking-wider text-[#64748B] uppercase">
                    학교 업무
                  </div>
                )}
                <SidebarItem
                  icon={<LayoutDashboard className="w-4.5 h-4.5" />}
                  label="홈 대시보드"
                  active={activeNav === 'dashboard'}
                  collapsed={sidebarCollapsed}
                  onClick={() => setActiveNav('dashboard')}
                />
                <SidebarItem
                  icon={<CalendarDays className="w-4.5 h-4.5" />}
                  label="월간 예약 달력"
                  active={activeNav === 'calendar'}
                  collapsed={sidebarCollapsed}
                  onClick={() => {
                    setSelectedRoomFilter('all');
                    setActiveNav('calendar');
                  }}
                />
              </div>

              {/* Group 2: 예약 관리 */}
              <div className="space-y-1.5">
                {!sidebarCollapsed && (
                  <div className="px-3 pb-1 text-xs font-bold tracking-wider text-[#64748B] uppercase">
                    예약 관리
                  </div>
                )}
                <SidebarItem
                  icon={<ListChecks className="w-4.5 h-4.5" />}
                  label="전체 예약 목록"
                  active={activeNav === 'all-reservations'}
                  collapsed={sidebarCollapsed}
                  onClick={() => setActiveNav('all-reservations')}
                />
              </div>

              {/* Group 3: 시설 관리 */}
              <div className="space-y-1.5">
                {!sidebarCollapsed && (
                  <div className="px-3 pb-1 text-xs font-bold tracking-wider text-[#64748B] uppercase">
                    시설 관리
                  </div>
                )}
                <SidebarItem
                  icon={<Settings className="w-4.5 h-4.5" />}
                  label="특별실 관리"
                  active={activeNav === 'room-manage'}
                  collapsed={sidebarCollapsed}
                  onClick={() => setActiveNav('room-manage')}
                />
              </div>

              {/* Group 4: 운영 관리 */}
              <div className="space-y-1.5">
                {!sidebarCollapsed && (
                  <div className="px-3 pb-1 text-xs font-bold tracking-wider text-[#64748B] uppercase">
                    운영 관리
                  </div>
                )}
                <SidebarItem
                  icon={<Megaphone className="w-4.5 h-4.5" />}
                  label="공지사항"
                  active={activeNav === 'announcements'}
                  collapsed={sidebarCollapsed}
                  onClick={() => setActiveNav('announcements')}
                />
                <SidebarItem
                  icon={<Clock className="w-4 h-4" />}
                  label="시간표 시정 설정"
                  active={activeNav === 'system-settings'}
                  collapsed={sidebarCollapsed}
                  onClick={() => setActiveNav('system-settings')}
                />
              </div>
            </div>

            {/* Bottom Profile Box matching reference image */}
            {!sidebarCollapsed && (
              <div className="mt-4 p-3 rounded-2xl bg-[#F4F6F8] border border-[#E5E9EE] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E8DEF8] text-[#5B3FB8] flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#1E232A] truncate">{unifiedStaffLabel}</div>
                  <div className="text-[10px] text-[#667085]">특별실 통합 관리</div>
                </div>
              </div>
            )}
          </aside>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div
                className="fixed inset-0 bg-black/40"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="relative w-64 bg-white h-full flex flex-col p-5 shadow-2xl z-10">
                <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F0]">
                  <span className="font-bold text-sm text-[#1E232A]">전주신동초 메뉴</span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-[#8A91A0]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-4 space-y-4 flex-1 overflow-y-auto">
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[#98A2B3] uppercase">학교 업무</div>
                    <SidebarItem
                      icon={<LayoutDashboard className="w-4 h-4" />}
                      label="홈 대시보드"
                      active={activeNav === 'dashboard'}
                      onClick={() => {
                        setActiveNav('dashboard');
                        setMobileMenuOpen(false);
                      }}
                    />
                    <SidebarItem
                      icon={<CalendarDays className="w-4 h-4" />}
                      label="월간 예약 달력"
                      active={activeNav === 'calendar'}
                      onClick={() => {
                        setSelectedRoomFilter('all');
                        setActiveNav('calendar');
                        setMobileMenuOpen(false);
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[#98A2B3] uppercase">예약 관리</div>
                    <SidebarItem
                      icon={<ListChecks className="w-4 h-4" />}
                      label="전체 예약 목록"
                      active={activeNav === 'all-reservations'}
                      onClick={() => {
                        setActiveNav('all-reservations');
                        setMobileMenuOpen(false);
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[#98A2B3] uppercase">시설 관리</div>
                    <SidebarItem
                      icon={<Settings className="w-4 h-4" />}
                      label="특별실 관리"
                      active={activeNav === 'room-manage'}
                      onClick={() => {
                        setActiveNav('room-manage');
                        setMobileMenuOpen(false);
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[#98A2B3] uppercase">운영 관리</div>
                    <SidebarItem
                      icon={<Megaphone className="w-4 h-4" />}
                      label="공지사항"
                      active={activeNav === 'announcements'}
                      onClick={() => {
                        setActiveNav('announcements');
                        setMobileMenuOpen(false);
                      }}
                    />
                    <SidebarItem
                      icon={<Clock className="w-4 h-4" />}
                      label="시간표 시정 설정"
                      active={activeNav === 'system-settings'}
                      onClick={() => {
                        setActiveNav('system-settings');
                        setMobileMenuOpen(false);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* Main Workspace Area */}
          {/* ================================================================ */}
          <main className="flex-1 overflow-y-auto space-y-5">
            {/* Conditional Views */}
            {activeNav === 'calendar' && (
              <MonthlyCalendarView
                referenceDate={referenceDate}
                onSelectDateToTimetable={(d) => {
                  setReferenceDate(d);
                  setActiveNav('dashboard');
                }}
                reservations={reservations}
                rooms={rooms}
                selectedRoomFilter={selectedRoomFilter}
                onChangeRoomFilter={setSelectedRoomFilter}
                onSwitchViewMode={(mode) => {
                  setCalendarViewMode(mode);
                  setActiveNav('dashboard');
                }}
                periods={periods}
                onClickReservation={handleOpenDetailModal}
              />
            )}

            {(activeNav === 'all-reservations' || activeNav === 'recurring-reservations') && (
              <ReservationListView
                mode={activeNav === 'recurring-reservations' ? 'recurring' : 'all'}
                reservations={reservations}
                rooms={rooms}
                periods={periods}
                initialSearch={searchQuery}
                onOpenNewModal={(recurring) => handleOpenNewModal({ recurring })}
                onSelectReservation={handleOpenDetailModal}
                onSuccessMessage={showToast}
              />
            )}

            {(activeNav === 'room-list' || activeNav === 'room-manage') && (
              <RoomDirectoryAndManageView
                isManageMode={activeNav === 'room-manage'}
                rooms={rooms}
                reservations={reservations}
                periods={periods}
                referenceDate={referenceDate}
                onQuickReserveRoom={(roomId) => handleOpenNewModal({ roomId })}
                onSelectReservation={handleOpenDetailModal}
                onSuccessMessage={showToast}
              />
            )}

            {activeNav === 'announcements' && (
              <AnnouncementsView
                announcements={announcements}
                onSuccessMessage={showToast}
              />
            )}

            {activeNav === 'system-settings' && (
              <SystemSettingsView
                settings={settings}
                auditLogs={auditLogs}
                onSuccessMessage={showToast}
              />
            )}

            {/* Dashboard & Timetable (Primary Screen matching the reference design layout) */}
            {(activeNav === 'dashboard' || activeNav === 'timetable') && (
              <div className="w-full space-y-4">
                {/* Timetable Date Navigator Header */}
                    <div className="p-3.5 px-4 rounded-2xl bg-white border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-extrabold text-[#1E232A] tracking-tight tabular-nums">
                          {calendarViewMode === 'week'
                            ? formatWeekRangeLabel(referenceDate)
                            : formatKoreanDate(referenceDate)}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const delta = calendarViewMode === 'week' ? -7 : -1;
                              setReferenceDate(addDays(referenceDate, delta));
                            }}
                            className="p-1 rounded-lg border border-[#E4E7EC] hover:bg-[#F4F6F8] text-[#1E232A] transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const delta = calendarViewMode === 'week' ? 7 : 1;
                              setReferenceDate(addDays(referenceDate, delta));
                            }}
                            className="p-1 rounded-lg border border-[#E4E7EC] hover:bg-[#F4F6F8] text-[#1E232A] transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReferenceDate(getTodayStr())}
                            className="px-2.5 py-1 text-xs font-bold text-[#1E232A] bg-[#F4F6F8] rounded-lg hover:bg-[#E9ECEF] transition-colors"
                          >
                            오늘
                          </button>
                        </div>
                      </div>

                       {/* Day vs Week vs Month view toggle */}
                      <div className="flex items-center p-0.5 bg-[#F4F6F8] border border-[#E5E9EE] rounded-full text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomFilter('all');
                            setCalendarViewMode('day');
                          }}
                          className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                            calendarViewMode === 'day'
                              ? 'bg-white text-[#1E232A] shadow-xs'
                              : 'text-[#667085] hover:text-[#1E232A]'
                          }`}
                        >
                          일간 보기
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomFilter('all');
                            setCalendarViewMode('week');
                          }}
                          className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                            calendarViewMode === 'week'
                              ? 'bg-white text-[#1E232A] shadow-xs'
                              : 'text-[#667085] hover:text-[#1E232A]'
                          }`}
                        >
                          주간 보기
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomFilter('all');
                            setActiveNav('calendar');
                          }}
                          className="px-3 py-1 rounded-full text-[#667085] hover:text-[#1E232A] transition-all cursor-pointer"
                        >
                          월간 보기
                        </button>
                      </div>
                    </div>

                    {/* Special Room Filter Bar (전체보기 기본 + 특별실별 필터링) */}
                    <div className="p-3 px-4 rounded-2xl bg-white border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-[#475467] mr-1.5">
                          특별실 필터:
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRoomFilter('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedRoomFilter === 'all'
                              ? 'bg-[#1E232A] text-white shadow-xs'
                              : 'bg-[#F4F6F8] text-[#475467] hover:bg-[#E9ECEF]'
                          }`}
                        >
                          전체보기
                        </button>
                        {rooms
                          .filter((r) => r.active)
                          .map((room) => {
                            const c =
                              ROOM_COLOR_PALETTE[room.colorKey] || ROOM_COLOR_PALETTE.purple;
                            const isSelected = selectedRoomFilter === room.id;
                            return (
                              <button
                                key={room.id}
                                type="button"
                                onClick={() => setSelectedRoomFilter(room.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  isSelected
                                    ? `${c.bg} ${c.border} ${c.text} ring-1 ring-current shadow-xs`
                                    : 'bg-white border-[#E4E7EC] text-[#475467] hover:bg-[#F8FAFC]'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${c.badgeBg}`} />
                                {room.name}
                              </button>
                            );
                          })}
                      </div>

                      {selectedRoomFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setSelectedRoomFilter('all')}
                          className="text-xs font-semibold text-[#667085] hover:text-[#1E232A] underline cursor-pointer"
                        >
                          전체보기로 초기화
                        </button>
                      )}
                    </div>

                    {/* Week Columns (Monday ~ Friday) */}
                    {calendarViewMode === 'week' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        {weekDays.map((day) => {
                          const dayReservations = reservations.filter(
                            (r) =>
                              r.status === 'confirmed' &&
                              r.date === day.date &&
                              (selectedRoomFilter === 'all' || r.roomId === selectedRoomFilter)
                          );
                          const isDayActive = day.date === referenceDate;

                          return (
                            <div key={day.date} className="flex flex-col space-y-2.5">
                              {/* Column Header matching MON 20 style */}
                              <div
                                onClick={() => setReferenceDate(day.date)}
                                className={`p-2 rounded-2xl text-center cursor-pointer transition-colors ${
                                  day.isToday
                                    ? 'bg-[#EAF7EE] border border-[#C6EDD3]'
                                    : isDayActive
                                    ? 'bg-[#F4F6F8] border border-[#E5E9EE]'
                                    : 'hover:bg-gray-50 border border-transparent'
                                }`}
                              >
                                <div className="text-[10px] font-bold text-[#8A91A0] uppercase tracking-wider">
                                  {day.dayName}
                                </div>
                                <div className="mt-0.5 flex items-center justify-center">
                                  <span
                                    className={`inline-flex items-center justify-center w-6 h-6 text-xs font-extrabold rounded-full tabular-nums ${
                                      day.isToday
                                        ? 'bg-[#166534] text-white shadow-xs'
                                        : isDayActive
                                        ? 'bg-[#1E232A] text-white'
                                        : 'text-[#1E232A]'
                                    }`}
                                  >
                                    {Number(day.date.split('-')[2])}
                                  </span>
                                </div>
                              </div>

                              {/* 1 ~ 6교시 및 점심시간 Slot Cards styled as pastel cards */}
                              <div className="flex flex-col space-y-2">
                                {periods.map((p) => {
                                  const matchingRes = dayReservations.filter((r) =>
                                    isPeriodInReservation(p.period, r.startPeriod, r.endPeriod)
                                  );

                                  if (matchingRes.length > 0) {
                                    return (
                                      <div key={p.period} className="space-y-1.5">
                                        {matchingRes.map((r) => {
                                          const c =
                                            ROOM_COLOR_PALETTE[r.roomColor] ||
                                            ROOM_COLOR_PALETTE.purple;
                                          return (
                                            <div
                                              key={r.id}
                                              onClick={() => handleOpenDetailModal(r)}
                                              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] shadow-2xs ${c.bg} ${c.border}`}
                                            >
                                              <div className="flex items-center justify-between text-[11px] font-bold text-[#667085]">
                                                <span>{p.label}</span>
                                                <span className="tabular-nums text-[10px]">
                                                  {p.startTime}~{p.endTime}
                                                </span>
                                              </div>
                                              <div className="mt-1 font-extrabold text-xs text-[#1E232A] truncate">
                                                {r.roomName}
                                              </div>
                                              <div className="text-[11px] font-semibold text-[#475467] truncate mt-0.5">
                                                {r.classLabel}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }

                                  // Empty Slot (clickable button card)
                                  return (
                                    <button
                                      key={p.period}
                                      type="button"
                                      onClick={() =>
                                        handleOpenNewModal({
                                          date: day.date,
                                          period: p.period,
                                          roomId:
                                            selectedRoomFilter !== 'all'
                                              ? selectedRoomFilter
                                              : undefined,
                                        })
                                      }
                                      className="group w-full py-2.5 px-3 rounded-2xl border border-[#E4E7EC] bg-white hover:border-[#1E232A] hover:bg-[#F8FAFC] text-[#1E232A] font-medium text-xs transition-all text-center flex items-center justify-between cursor-pointer"
                                    >
                                      <span className="font-bold text-[#475467] group-hover:text-[#1E232A]">
                                        {p.label}
                                      </span>
                                      <span className="text-[10px] text-[#98A2B3] group-hover:text-[#1E232A] tabular-nums">
                                        {p.startTime}~{p.endTime}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Day View */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {rooms
                          .filter(
                            (r) => selectedRoomFilter === 'all' || r.id === selectedRoomFilter
                          )
                          .map((room) => {
                            const c =
                              ROOM_COLOR_PALETTE[room.colorKey] || ROOM_COLOR_PALETTE.purple;
                            const roomDayRes = reservations.filter(
                              (r) =>
                                r.status === 'confirmed' &&
                                r.date === referenceDate &&
                                r.roomId === room.id
                            );

                            return (
                              <div
                                key={room.id}
                                className="p-4 rounded-2xl border border-[#E2E8F0] bg-white space-y-3 shadow-2xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${c.badgeBg}`} />
                                    <span className="font-bold text-sm text-[#1E232A]">
                                      {room.name}
                                    </span>
                                    <span className="text-xs text-[#8A91A0]">({room.floor})</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenNewModal({
                                        date: referenceDate,
                                        roomId: room.id,
                                      })
                                    }
                                    className="text-xs font-bold text-[#166534] bg-[#DCFCE7] px-2.5 py-1 rounded-full"
                                  >
                                    + 예약
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
                                  {periods.map((p) => {
                                    const res = roomDayRes.find((r) =>
                                      isPeriodInReservation(p.period, r.startPeriod, r.endPeriod)
                                    );
                                    if (res) {
                                      return (
                                        <div
                                          key={p.period}
                                          onClick={() => handleOpenDetailModal(res)}
                                          className={`p-2 rounded-xl border text-center cursor-pointer text-[11px] truncate ${c.bg} ${c.border}`}
                                          title={`${p.label} (${p.startTime}~${p.endTime}) · ${res.classLabel}`}
                                        >
                                          <div className="font-bold text-[#1E232A]">
                                            {p.label}
                                          </div>
                                          <div className="text-[9px] text-[#667085] tabular-nums">
                                            {p.startTime}~{p.endTime}
                                          </div>
                                          <div className="text-[10px] text-[#475467] font-semibold truncate mt-0.5">
                                            {res.classLabel}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <button
                                        key={p.period}
                                        type="button"
                                        onClick={() =>
                                          handleOpenNewModal({
                                            date: referenceDate,
                                            period: p.period,
                                            roomId: room.id,
                                          })
                                        }
                                        title={`${p.label} (${p.startTime}~${p.endTime})`}
                                        className="p-2 rounded-xl border border-[#E4E7EC] hover:border-[#1E232A] hover:bg-[#F8FAFC] text-center text-[11px] transition-colors cursor-pointer"
                                      >
                                        <div className="font-semibold text-[#1E232A]">
                                          {p.label}
                                        </div>
                                        <div className="text-[9px] text-[#667085] tabular-nums">
                                          {p.startTime}~{p.endTime}
                                        </div>
                                        <div className="text-[10px] text-[#166534] font-medium mt-0.5">
                                          가능
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Reservation Modal (Create / Detail / Edit) */}
      {/* ==================================================================== */}
      <ReservationModal
        isOpen={resModalOpen}
        onClose={() => {
          setResModalOpen(false);
          setSelectedReservation(null);
        }}
        mode={resModalMode}
        initialDate={resModalInitialDate}
        initialPeriod={resModalInitialPeriod}
        initialRoomId={resModalInitialRoomId}
        initialRecurrence={resModalInitialRecurrence}
        selectedReservation={selectedReservation}
        rooms={rooms}
        reservations={reservations}
        periods={periods}
        onSuccessMessage={showToast}
      />
    </div>
  );
}

// ============================================================================
// Sidebar Navigation Item Helper
// With roomy item spacing and soft charcoal active badge matching reference image
// ============================================================================
function SidebarItem({
  icon,
  label,
  active = false,
  collapsed = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm sm:text-[15px] font-semibold rounded-2xl transition-all cursor-pointer ${
        active
          ? 'bg-[#1E232A] text-white font-bold shadow-xs'
          : 'text-[#475467] hover:text-[#1E232A] hover:bg-[#F4F6F8]'
      } ${collapsed ? 'justify-center px-0' : ''}`}
    >
      <span className="shrink-0 [&>svg]:w-4.5 [&>svg]:h-4.5">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}
