/**
 * Setup Step Indicator
 * Shows progress through wizard stages (1 → 3 → 4)
 */
import React from 'react';
import { WizardStage } from './types';
import { WIZARD_STRINGS } from './constants';

interface SetupStepIndicatorProps {
    currentStage: WizardStage;
}

const STAGES: { stage: WizardStage; label: string }[] = [
    { stage: 1, label: WIZARD_STRINGS.step1 },
    { stage: 2, label: WIZARD_STRINGS.step3 },  // Clean step
    { stage: 3, label: WIZARD_STRINGS.step4 },  // Confirm step
];

export const SetupStepIndicator: React.FC<SetupStepIndicatorProps> = ({ currentStage }) => {
    const getStageIndex = (stage: WizardStage) => STAGES.findIndex(s => s.stage === stage);
    const currentIndex = getStageIndex(currentStage);

    return (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-4">
                {STAGES.map((item, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = item.stage === currentStage;

                    return (
                        <React.Fragment key={item.stage}>
                            {/* Step Circle */}
                            <div className="flex items-center gap-2">
                                <div
                                    className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-colors duration-200
                    ${isCompleted
                                            ? 'bg-green-500 text-white'
                                            : isCurrent
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }
                  `}
                                >
                                    {isCompleted ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        item.stage
                                    )}
                                </div>
                                <span
                                    className={`
                    text-sm font-medium
                    ${isCurrent
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : isCompleted
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-gray-500 dark:text-gray-400'
                                        }
                  `}
                                >
                                    {item.label}
                                </span>
                            </div>

                            {/* Connector Line */}
                            {index < STAGES.length - 1 && (
                                <div
                                    className={`
                    w-12 h-0.5 transition-colors duration-200
                    ${index < currentIndex
                                            ? 'bg-green-500'
                                            : 'bg-gray-200 dark:bg-gray-700'
                                        }
                  `}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default SetupStepIndicator;
