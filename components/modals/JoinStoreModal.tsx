/**
 * JoinStoreModal Component
 * 
 * Modal for staff members to join a store using a code
 * Extracted from App.tsx for reusability
 */

import React from 'react';
import { X, Building2, ArrowRight } from 'lucide-react';

interface JoinStoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    joinStoreCode: string;
    setJoinStoreCode: (code: string) => void;
    joinStoreNameAlias: string;
    setJoinStoreNameAlias: (alias: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export function JoinStoreModal({
    isOpen,
    onClose,
    joinStoreCode,
    setJoinStoreCode,
    joinStoreNameAlias,
    setJoinStoreNameAlias,
    onSubmit,
}: JoinStoreModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-border p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-secondary hover:text-primary"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center p-3 rounded-xl mb-4 bg-background border border-border">
                        <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-primary">Join a Store</h3>
                    <p className="text-secondary text-sm mt-1">Enter the code provided by your manager.</p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                            Store Code
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. DK2025"
                            value={joinStoreCode}
                            onChange={e => setJoinStoreCode(e.target.value.toUpperCase())}
                            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-center font-mono text-lg uppercase tracking-widest"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                            Alias (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. My Workplace"
                            value={joinStoreNameAlias}
                            onChange={e => setJoinStoreNameAlias(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-primary text-white rounded-lg font-bold shadow-sm hover:bg-black transition-colors flex items-center justify-center"
                    >
                        Join Store <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                </form>
            </div>
        </div>
    );
}

export default JoinStoreModal;
