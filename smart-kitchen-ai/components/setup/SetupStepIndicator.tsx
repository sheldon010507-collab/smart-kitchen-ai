import React from 'react';
import { Check } from 'lucide-react';
import type { SetupStage } from '../../types';

interface Props {
    currentStage: SetupStage;
    onStageClick?: (stage: SetupStage) => void;
}

const STAGES: { stage: SetupStage; label: string }[] = [
    { stage: 1, label: 'Data Ingest' },
    { stage: 2, label: 'Audit' },
    { stage: 3, label: 'Cleanse' },
    { stage: 4, label: 'Complete' },
];

const SetupStepIndicator: React.FC<Props> = ({ currentStage, onStageClick }) => {
    return (
        <div className="flex items-center justify-center gap-2 py-6">
            {STAGES.map((s, idx) => {
                const isCompleted = s.stage < currentStage;
                const isCurrent = s.stage === currentStage;
                const isClickable = onStageClick && s.stage <= currentStage;

                return (
                    <React.Fragment key={s.stage}>
                        {/* Step Circle */}
                        <button
                            onClick={() => isClickable && onStageClick?.(s.stage)}
                            disabled={!isClickable}
                            className={`
                flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm
                transition-all duration-200
                ${isCompleted
                                    ? 'bg-green-500 text-white'
                                    : isCurrent
                                        ? 'bg-primary text-white ring-4 ring-primary/20'
                                        : 'bg-gray-200 text-gray-500'}
                ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}
              `}
                        >
                            {isCompleted ? <Check className="w-5 h-5" /> : s.stage}
                        </button>

                        {/* Label */}
                        <div
                            className={`
                hidden sm:block text-sm font-medium min-w-[60px]
                ${isCurrent ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-400'}
              `}
                        >
                            {s.label}
                        </div>

                        {/* Connector Line */}
                        {idx < STAGES.length - 1 && (
                            <div
                                className={`
                  w-8 sm:w-16 h-1 rounded-full mx-1
                  ${s.stage < currentStage ? 'bg-green-500' : 'bg-gray-200'}
                `}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default SetupStepIndicator;
