import React, { useState, useEffect } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfYear,
  addYears,
  subYears,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Download, Save, Calendar as CalIcon, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface Props {
  businessId: string;
}

type ViewMode = 'week' | 'month' | 'year';

interface CalendarNote {
  note_date: string;
  content: string;
}

export const StaffCalendar: React.FC<Props> = ({ businessId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  // 加载笔记
  useEffect(() => {
    if (!businessId) return;
    fetchNotes();
  }, [businessId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_calendar_notes')
        .select('note_date, content')
        .eq('business_id', businessId);

      if (error) {
        console.error('Failed to load notes:', error);
      } else if (data) {
        const noteMap: Record<string, string> = {};
        data.forEach((row: CalendarNote) => {
          noteMap[row.note_date] = row.content;
        });
        setNotes(noteMap);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
    setLoading(false);
  };

  const saveNote = async (dateStr: string) => {
    if (!businessId) return;

    // Optimistic update
    const newNotes = { ...notes };
    if (tempNote.trim()) {
      newNotes[dateStr] = tempNote;
    } else {
      delete newNotes[dateStr];
    }
    setNotes(newNotes);
    setEditingDate(null);

    try {
      if (tempNote.trim()) {
        const { error } = await supabase
          .from('staff_calendar_notes')
          .upsert(
            {
              business_id: businessId,
              note_date: dateStr,
              content: tempNote.trim(),
            },
            { onConflict: 'business_id,note_date' }
          );

        if (error) {
          console.error('Failed to save note:', error);
        }
      } else {
        // Delete note if empty
        await supabase
          .from('staff_calendar_notes')
          .delete()
          .eq('business_id', businessId)
          .eq('note_date', dateStr);
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const handleExportExcel = () => {
    const data = Object.keys(notes)
      .sort()
      .map((dateKey) => ({
        Date: dateKey,
        Note: notes[dateKey],
      }));

    if (data.length === 0) {
      alert('No notes to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Notes');
    XLSX.writeFile(wb, `Staff_Notes_${format(currentDate, 'yyyy-MM')}.xlsx`);
  };

  const changeDate = (amount: number) => {
    if (viewMode === 'week') {
      setCurrentDate((d) => (amount > 0 ? addWeeks(d, 1) : subWeeks(d, 1)));
    } else if (viewMode === 'month') {
      setCurrentDate((d) => (amount > 0 ? addMonths(d, 1) : subMonths(d, 1)));
    } else if (viewMode === 'year') {
      setCurrentDate((d) => (amount > 0 ? addYears(d, 1) : subYears(d, 1)));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 获取要显示的日期范围
  const getDays = (): Date[] => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // 周一开始
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    } else if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
    return [];
  };

  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
      {/* View Mode Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {(['week', 'month', 'year'] as ViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className={`px-4 py-2 text-sm rounded-md capitalize font-medium transition-colors ${
              viewMode === m
                ? 'bg-white shadow text-primary font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-lg min-w-[180px] text-center">
          {viewMode === 'year'
            ? format(currentDate, 'yyyy')
            : viewMode === 'week'
            ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
            : format(currentDate, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => changeDate(1)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={goToToday}
          className="ml-2 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10 rounded-lg transition-colors"
        >
          Today
        </button>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExportExcel}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors"
      >
        <Download className="w-4 h-4" /> Export
      </button>
    </div>
  );

  const renderYearView = () => {
    const months = Array.from({ length: 12 }, (_, i) => new Date(currentDate.getFullYear(), i, 1));

    return (
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {months.map((monthStart) => {
          const monthKey = format(monthStart, 'yyyy-MM');
          const noteCount = Object.keys(notes).filter((k) => k.startsWith(monthKey)).length;

          return (
            <div
              key={monthKey}
              onClick={() => {
                setCurrentDate(monthStart);
                setViewMode('month');
              }}
              className="border border-border p-4 rounded-xl bg-white hover:bg-slate-50 hover:border-accent cursor-pointer transition-all"
            >
              <div className="font-bold text-primary mb-2">{format(monthStart, 'MMMM')}</div>
              <div className="text-sm text-secondary">
                {noteCount > 0 ? `${noteCount} note${noteCount > 1 ? 's' : ''}` : 'No notes'}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCalendarGrid = () => {
    const days = getDays();
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 bg-slate-50">
          {weekDays.map((d) => (
            <div
              key={d}
              className="p-3 text-center text-xs font-bold text-secondary uppercase border-b border-border"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(day, currentDate);
            const hasNote = !!notes[dateStr];
            const isToday = isSameDay(day, new Date());
            const isEditing = editingDate === dateStr;

            return (
              <div
                key={dateStr}
                className={`relative border-b border-r border-border p-2 min-h-[100px] transition-colors cursor-pointer ${
                  !isCurrentMonth && viewMode === 'month' ? 'bg-slate-50 opacity-50' : 'bg-white'
                } ${isEditing ? '' : 'hover:bg-slate-50'}`}
                onClick={() => {
                  if (!isEditing) {
                    setEditingDate(dateStr);
                    setTempNote(notes[dateStr] || '');
                  }
                }}
              >
                {/* Date Header */}
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`text-sm font-medium ${
                      isToday
                        ? 'bg-accent text-white w-7 h-7 flex items-center justify-center rounded-full'
                        : 'text-primary'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {hasNote && !isEditing && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" title="Has note" />
                  )}
                </div>

                {/* Note Content Display */}
                {!isEditing && notes[dateStr] && (
                  <div className="text-xs text-secondary line-clamp-3 break-words">
                    {notes[dateStr]}
                  </div>
                )}

                {/* Edit Mode */}
                {isEditing && (
                  <div
                    className="absolute inset-0 z-10 bg-white p-2 flex flex-col shadow-lg border-2 border-accent rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-accent">
                        {format(day, 'MMM d, yyyy')}
                      </span>
                      <button
                        onClick={() => setEditingDate(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      className="flex-1 w-full text-sm resize-none p-2 outline-none bg-yellow-50 border border-yellow-200 rounded"
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder="Add shift info, notes, reminders..."
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => setEditingDate(null)}
                        className="px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveNote(dateStr)}
                        className="px-3 py-1 text-sm bg-accent text-white rounded hover:bg-accentHover flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" /> Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border mt-8">
        <div className="flex items-center justify-center h-40 text-secondary">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border mt-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent/10 rounded-lg">
          <CalIcon className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-primary">Staff Calendar</h2>
          <p className="text-sm text-secondary">
            {viewMode === 'year'
              ? 'Click a month to view details'
              : 'Click any date to add a note'}
          </p>
        </div>
      </div>

      {renderHeader()}

      {viewMode === 'year' ? renderYearView() : renderCalendarGrid()}
    </div>
  );
};

export default StaffCalendar;
