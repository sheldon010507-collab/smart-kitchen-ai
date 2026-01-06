
import React, { useState, useEffect } from 'react';
import { Staff, Shift } from '../types';
import { X, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Shift) => void;
  onDelete?: (shiftId: string) => void;
  staff: Staff[];
  initialShift?: Shift | null;
}

const AddShiftModal: React.FC<Props> = ({ isOpen, onClose, onSave, onDelete, staff, initialShift }) => {
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [hours, setHours] = useState(0);

  useEffect(() => {
    if (isOpen) {
        if (initialShift) {
            setStaffId(initialShift.staffId);
            setDate(initialShift.date);
            setStartTime(initialShift.startTime);
            setEndTime(initialShift.endTime);
            setHourlyRate(initialShift.hourlyRate || 0);
        } else if (staff.length > 0) {
            setStaffId(staff[0].id);
            setHourlyRate(staff[0].hourlyRate);
        }
    }
  }, [isOpen, initialShift, staff]);

  useEffect(() => {
      if (!initialShift && staffId) {
          const s = staff.find(st => st.id === staffId);
          if (s) setHourlyRate(s.hourlyRate);
      }
  }, [staffId, staff, initialShift]);

  useEffect(() => {
    if (!staffId) return;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    if (end < start) end.setDate(end.getDate() + 1);

    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    
    const h = parseFloat(durationHours.toFixed(2));
    setHours(h);
    setEstimatedCost(parseFloat((h * hourlyRate).toFixed(2)));
  }, [staffId, startTime, endTime, hourlyRate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) return;

    const newShift: Shift = {
      id: initialShift?.id || Date.now().toString(),
      businessId: initialShift?.businessId || '', 
      staffId,
      date,
      startTime,
      endTime,
      totalHours: hours,
      hourlyRate,
      totalCost: estimatedCost
    };

    onSave(newShift);
    onClose();
  };

  const handleDelete = () => {
      if (initialShift && onDelete) {
          if (window.confirm("Are you sure you want to delete this shift?")) {
              onDelete(initialShift.id);
              onClose();
          }
      }
  };

  return (
    <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-border overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-border">
          <h3 className="font-bold text-lg text-primary">{initialShift ? 'Edit Shift' : 'Schedule New Shift'}</h3>
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Staff Member</label>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-accent"
                  required
                  disabled={!!initialShift}
                >
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role}) - ${s.hourlyRate}/hr</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>
              
              <div>
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Rate ($/hr)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:border-accent"
                    required
                  />
              </div>
          </div>

          <div className="bg-background rounded-lg p-4 flex items-center justify-between text-sm text-primary border border-border">
             <div className="flex flex-col">
                 <span className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">ESTIMATED COST</span>
                 <span className="text-xl font-bold font-mono">${estimatedCost.toFixed(2)}</span>
             </div>
             <div className="flex flex-col items-end">
                 <span className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">DURATION</span>
                 <span className="text-xl font-bold font-mono">{hours.toFixed(1)} hrs</span>
             </div>
          </div>
          
          <div className={`flex ${initialShift ? 'justify-between' : 'justify-end'} pt-4`}>
            {initialShift && onDelete && (
                <button
                    type="button"
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700 text-sm font-bold uppercase tracking-wide flex items-center"
                >
                    <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                </button>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-bold tracking-wide hover:bg-accentHover transition-colors shadow-sm"
            >
              {initialShift ? 'Update Shift' : 'Schedule Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddShiftModal;
