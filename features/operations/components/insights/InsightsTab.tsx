/**
 * InsightsTab Component
 * 
 * AI 洞察页面，提供：
 * - 操作建议
 * - 趋势分析
 */

import React, { useState } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';
import { useOperationsData } from '../../hooks/useOperationsData';
import { generateOperationalInsights } from '../../../../services/geminiService';

export const InsightsTab: React.FC = () => {
    const { shifts, menu } = useOperationsData();
    const [insights, setInsights] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const handleGenerateInsights = async () => {
        setLoading(true);
        try {
            const result = await generateOperationalInsights(shifts, menu);
            setInsights(result);
        } catch (e) {
            console.error(e);
            setInsights('Failed to generate insights.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-background p-10 rounded-xl border border-border">
                <h2 className="text-2xl font-bold mb-3 text-primary tracking-tight">AI Operations Advisor</h2>
                <p className="text-secondary mb-8 text-base">Analyze trends and receive strategic advice based on your data.</p>
                <button
                    onClick={handleGenerateInsights}
                    disabled={loading}
                    className="px-6 py-3 bg-accent text-white font-bold rounded-lg hover:bg-accentHover transition-colors flex items-center disabled:opacity-50 shadow-sm text-sm"
                >
                    {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Lightbulb className="w-5 h-5 mr-2" />}
                    Generate Insights
                </button>
            </div>

            {insights && (
                <div className="bg-white p-10 rounded-xl border border-border shadow-sm">
                    <div className="prose prose-slate max-w-none text-primary">
                        {insights.split('\n').map((line, i) => (
                            <p key={i} className="mb-4 leading-relaxed">
                                {line}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
