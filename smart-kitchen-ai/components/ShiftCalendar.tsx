
import React, { useState } from 'react';
import { Shift, Staff } from '../types';
import { ChevronLeft, ChevronRight, Download, Trash2, Plus } from 'lucide-react';

interface Props {
  shifts: Shift[];
  staff: Staff[];
  onDeleteShift: (id: string) => void;
  onAddShiftClick: () => void;
  onEditShift: (shift: Shift) => void;
}

const ShiftCalendar: React.FC<Props> = ({ shifts, staff, onDeleteShift, onAddShiftClick, onEditShift }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleExportPDF = () => {
    // Uses browser native print to PDF with a specific printable area
    window.print();
  };

  const renderCells = () => {
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalSlots = [...blanks, ...days];

    return totalSlots.map((day, index) => {
      if (!day) return <div key={`blank-${index}`} className="bg-slate-50/50 border border-slate-100 min-h-[100px]" />;

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayShifts = shifts.filter(s => s.date === dateStr);

      return (
        <div key={day} className="bg-white border border-slate-100 p-2 min-h-[100px] hover:bg-slate-50 transition-colors group relative">
          <span className={`text-sm font-semibold ${new Date().toISOString().split('T')[0] === dateStr ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700'}`}>
            {day}
          </span>
          
          <div className="mt-1 space-y-1">
            {dayShifts.map(shift => {
              const s = staff.find(st => st.id === shift.staffId);
              return (
                <div 
                  key={shift.id} 
                  onClick={(e) => { e.stopPropagation(); onEditShift(shift); }}
                  className="text-xs bg-blue-50 text-blue-700 p-1 rounded border border-blue-100 flex justify-between items-center group/shift cursor-pointer hover:bg-blue-100"
                >
                  <span className="truncate max-w-[80px] font-medium" title={s?.name}>
                    {s?.name || 'Unknown'}
                  </span>
                  <span className="text-[10px] ml-1 opacity-70">
                    {shift.startTime}-{shift.endTime}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteShift(shift.id); }}
                    className="hidden group-hover/shift:block text-red-500 hover:text-red-700 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
          
          {/* Add Button visible on hover */}
          <button 
            onClick={onAddShiftClick}
            className="absolute top-2 right-2 hidden group-hover:block text-slate-300 hover:text-blue-500"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-none">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:bg-white">
        <div className="flex items-center space-x-4">
          <h3 className="font-bold text-lg text-slate-800">{monthName} {year}</h3>
          <div className="flex space-x-1 print:hidden">
            <button onClick={prevMonth} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <button 
          onClick={handleExportPDF}
          className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-blue-600 print:hidden"
        >
          <Download className="w-4 h-4" />
          <span>Export / Print</span>
        </button>
      </div>

      <div className="grid grid-cols-7 text-center border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase py-2">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      <div className="grid grid-cols-7 auto-rows-fr">
        {renderCells()}
      </div>
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          /* Target the specific component to print */
          #calendar-container, #calendar-container * {
            visibility: visible;
          }
          #calendar-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
      <div id="calendar-container" className="hidden"></div>
    </div>
  );
};

export default ShiftCalendar;
