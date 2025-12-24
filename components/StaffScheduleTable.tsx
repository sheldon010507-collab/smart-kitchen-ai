
import React, { useState } from 'react';
import { Staff, Shift } from '../types';
import { Download, ChevronLeft, ChevronRight, UserPlus, Clock, Trash2, Edit } from 'lucide-react';

interface Props {
  staff: Staff[];
  shifts: Shift[];
  businessId: string;
  onUpdateShift: (shift: Shift) => void;
  onAddStaff?: () => void;
  onEditShift?: (shift: Shift) => void;
  onDeleteShift?: (shiftId: string) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const StaffScheduleTable: React.FC<Props> = ({ staff, shifts, businessId, onUpdateShift, onAddStaff, onEditShift, onDeleteShift }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const getShiftForDay = (staffId: string, date: string) => {
    return shifts.find(s => s.staffId === staffId && s.date === date);
  };

  // Used when clicking an empty cell to quick-add a placeholder, or could open modal
  const handleEmptyCellClick = (staffId: string, date: string) => {
    // If no onEditShift prop, fallback to creating a default shift directly
    if (!onEditShift) {
        const newShift: Shift = {
            id: Date.now().toString() + Math.random(),
            businessId,
            staffId,
            date,
            startTime: '09:00',
            endTime: '17:00',
            totalHours: 8,
            hourlyRate: 15,
            totalCost: 120
        };
        onUpdateShift(newShift);
    } else {
        // Prepare a partial shift object to pre-fill the modal
        const s = staff.find(st => st.id === staffId);
        const tempShift: any = {
            businessId,
            staffId,
            date,
            startTime: '09:00',
            endTime: '17:00',
            hourlyRate: s?.hourlyRate || 0
        };
        onEditShift(tempShift); // Open modal with pre-filled data
    }
  };

  const handleExportCSV = () => {
    const headers = ['Staff Name', 'Role', ...weekDates.map((d, i) => `${DAYS[i]} (${d})`)];
    const rows = staff.map(s => {
      const shiftData = weekDates.map(date => {
        const shift = getShiftForDay(s.id, date);
        return shift ? `${shift.startTime}-${shift.endTime}` : 'OFF';
      });
      return [`"${s.name}"`, s.role, ...shiftData];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `schedule_${weekDates[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-[#E9E9E7]">
        <div className="flex items-center space-x-2">
          <button onClick={handlePrevWeek} className="p-1 hover:bg-[#F7F6F3] rounded text-[#787774]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium text-[#37352F] text-sm w-32 text-center">
            {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {
                new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 6)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }
          </span>
          <button onClick={handleNextWeek} className="p-1 hover:bg-[#F7F6F3] rounded text-[#787774]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex space-x-2">
          {onAddStaff && (
          <button 
            onClick={onAddStaff}
            className="flex items-center px-3 py-1.5 bg-white border border-[#E9E9E7] text-[#37352F] rounded text-xs font-medium hover:bg-[#F7F6F3] transition-colors"
          >
            <UserPlus className="w-3 h-3 mr-1.5" />
            Add Staff
          </button>
          )}
          <button 
            onClick={handleExportCSV}
            className="flex items-center px-3 py-1.5 bg-white border border-[#E9E9E7] text-[#37352F] rounded text-xs font-medium hover:bg-[#F7F6F3] transition-colors"
          >
            <Download className="w-3 h-3 mr-1.5" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E9E9E7] overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
            <thead>
                <tr className="border-b border-[#E9E9E7]">
                <th className="px-4 py-3 font-medium text-[#787774] text-xs border-r border-[#E9E9E7] bg-[#FAFAFA]">Staff Member</th>
                {weekDates.map((date, i) => (
                    <th key={date} className="px-2 py-3 border-r border-[#E9E9E7] last:border-0 bg-[#FAFAFA]">
                        <div className="text-xs font-medium text-[#787774] text-center">{DAYS[i]} <span className="font-normal text-[#9CA3AF] ml-1">{date.slice(8)}</span></div>
                    </th>
                ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-[#E9E9E7]">
                {staff.map(s => (
                <tr key={s.id} className="group">
                    <td className="px-4 py-3 border-r border-[#E9E9E7] bg-white">
                        <div className="flex items-center">
                            <div className="w-6 h-6 rounded bg-[#F7F6F3] text-[#37352F] flex items-center justify-center text-xs font-medium mr-2">
                                {s.name.charAt(0)}
                            </div>
                            <div>
                                <div className="text-sm text-[#37352F] font-medium leading-none">{s.name}</div>
                                <div className="text-[10px] text-[#787774] mt-1">{s.role}</div>
                            </div>
                        </div>
                    </td>
                    {weekDates.map(date => {
                    const shift = getShiftForDay(s.id, date);
                    return (
                        <td key={date} className="p-0 border-r border-[#E9E9E7] last:border-0 h-12 relative">
                            {shift ? (
                                <div className="w-full h-full group/cell relative cursor-pointer hover:bg-background transition-colors flex items-center justify-center">
                                    <div 
                                        onClick={() => onEditShift && onEditShift(shift)}
                                        className="w-full h-full flex items-center justify-center text-xs font-medium text-[#37352F]"
                                    >
                                        {shift.startTime}-{shift.endTime}
                                    </div>
                                    <div className="absolute top-1 right-1 hidden group-hover/cell:flex space-x-1">
                                        {onDeleteShift && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onDeleteShift(shift.id); }}
                                                className="p-1 bg-white border border-border rounded text-secondary hover:text-red-600 shadow-sm"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="absolute bottom-1 right-1 w-1 h-1 bg-[#2383E2] rounded-full pointer-events-none"></div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => handleEmptyCellClick(s.id, date)}
                                    className="w-full h-full cursor-pointer hover:bg-gray-50 flex items-center justify-center text-[#D3D1CB] hover:text-[#787774]"
                                >
                                    <span className="text-xs">-</span>
                                </div>
                            )}
                        </td>
                    );
                    })}
                </tr>
                ))}
                {staff.length === 0 && (
                <tr>
                    <td colSpan={8} className="p-8 text-center text-[#D3D1CB] italic text-xs">
                       No staff members found.
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default StaffScheduleTable;
