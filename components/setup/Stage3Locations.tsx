/**
 * Stage 3.1: Location Setup
 * Define storage locations before organizing items
 */
import React, { useState, useCallback } from 'react';
import { Stage3LocationsProps, DraftLocation } from './types';
import { WIZARD_STRINGS, LOCATION_TYPES } from './constants';

export const Stage3Locations: React.FC<Stage3LocationsProps> = ({
    businessId,
    locations,
    onChange,
    onNext,
    onBack,
}) => {
    const [newLocationName, setNewLocationName] = useState('');
    const [newLocationType, setNewLocationType] = useState<DraftLocation['type']>('Fridge');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Handlers
    const handleAddLocation = useCallback(() => {
        if (!newLocationName.trim()) return;

        const newLoc: DraftLocation = {
            id: crypto.randomUUID(),
            name: newLocationName.trim(),
            type: newLocationType,
            isNew: true,
        };

        onChange([...locations, newLoc]);
        setNewLocationName('');
        setNewLocationType('Fridge');
    }, [locations, newLocationName, newLocationType, onChange]);

    const handleUpdateLocation = useCallback((id: string, updates: Partial<DraftLocation>) => {
        onChange(locations.map(loc =>
            loc.id === id ? { ...loc, ...updates } : loc
        ));
    }, [locations, onChange]);

    const handleDeleteLocation = useCallback((id: string) => {
        onChange(locations.filter(loc => loc.id !== id));
    }, [locations, onChange]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {WIZARD_STRINGS.setupLocations}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {WIZARD_STRINGS.setupLocationsDesc}
                    </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                    {locations.length} Locations
                </div>
            </div>

            {/* Quick Add Form */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={newLocationName}
                        onChange={e => setNewLocationName(e.target.value)}
                        placeholder="e.g. Main Kitchen Fridge"
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
                    />
                    <select
                        value={newLocationType}
                        onChange={e => setNewLocationType(e.target.value as any)}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                        {LOCATION_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleAddLocation}
                        disabled={!newLocationName.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Locations List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm font-medium text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <div className="col-span-6">Location Name</div>
                    <div className="col-span-4">Type</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                    {locations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No locations added yet. Add one above to get started.
                        </div>
                    ) : (
                        locations.map(loc => (
                            <div key={loc.id} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div className="col-span-6">
                                    {editingId === loc.id ? (
                                        <input
                                            autoFocus
                                            type="text"
                                            value={loc.name}
                                            onChange={e => handleUpdateLocation(loc.id, { name: e.target.value })}
                                            onBlur={() => setEditingId(null)}
                                            onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                                            className="w-full px-2 py-1 rounded border border-blue-400 bg-white dark:bg-gray-800"
                                        />
                                    ) : (
                                        <div
                                            className="font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-500 flex items-center gap-2"
                                            onClick={() => setEditingId(loc.id)}
                                        >
                                            {loc.isNew && <span className="w-2 h-2 rounded-full bg-green-500" title="New" />}
                                            {loc.name}
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-4">
                                    <select
                                        value={loc.type}
                                        onChange={e => handleUpdateLocation(loc.id, { type: e.target.value as any })}
                                        className="px-2 py-1 rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600 bg-transparent text-sm"
                                    >
                                        {LOCATION_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 text-right">
                                    <button
                                        onClick={() => handleDeleteLocation(loc.id)}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    ← {WIZARD_STRINGS.back}
                </button>
                <button
                    onClick={onNext}
                    // Allow proceeding even without locations (can use defaults), or enforce at least one?
                    // Spec doesn't strictly enforce, but good UX requires at least one Default or similar.
                    // For now, allow proceed.
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                    {WIZARD_STRINGS.next}: Categories →
                </button>
            </div>
        </div>
    );
};

export default Stage3Locations;
