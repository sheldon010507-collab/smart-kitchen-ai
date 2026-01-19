/**
 * Excel Preview Component
 * Handles file upload and displays inline preview of Excel/CSV data
 * 🆕 Now with real xlsx support using SheetJS library
 */
import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { DraftInventoryItem } from './types';
import { UNIT_NORMALIZATION } from './constants';

interface ExcelPreviewProps {
    onLoad: (items: DraftInventoryItem[]) => void;
}

// Column detection patterns
const COLUMN_PATTERNS = {
    name: /^(name|item|product|ingredient|品名|名稱|項目)/i,
    category: /^(category|type|group|分類|類別)/i,
    unit: /^(unit|uom|單位)/i,
    cost: /^(cost|price|unit.?cost|成本|價格|單價)/i,
    location: /^(location|storage|位置|存放)/i,
};

// Parse CSV string
const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    });
};

// Normalize unit
const normalizeUnit = (unit: string): string => {
    const lower = unit.toLowerCase().trim();
    return UNIT_NORMALIZATION[lower] || UNIT_NORMALIZATION[unit] || unit;
};

export const ExcelPreview: React.FC<ExcelPreviewProps> = ({ onLoad }) => {
    const [fileName, setFileName] = useState<string>('');
    const [previewRows, setPreviewRows] = useState<string[][]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [columnMap, setColumnMap] = useState<Record<string, number>>({});
    const [totalRows, setTotalRows] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-detect columns
    const detectColumns = useCallback((headerRow: string[]): Record<string, number> => {
        const map: Record<string, number> = {};

        headerRow.forEach((header, index) => {
            const h = header.toLowerCase().trim();

            for (const [field, pattern] of Object.entries(COLUMN_PATTERNS)) {
                if (pattern.test(h)) {
                    if (map[field] === undefined) {
                        map[field] = index;
                    }
                }
            }
        });

        return map;
    }, []);

    // Parse and convert to draft items
    const parseFile = useCallback(async (file: File) => {
        setLoading(true);
        setError(null);

        try {
            let rows: string[][] = [];

            // Check file type and parse accordingly
            if (file.name.endsWith('.csv') || file.type === 'text/csv') {
                // CSV: parse as text
                const text = await file.text();
                rows = parseCSV(text);
            } else {
                // 🆕 Excel files: use xlsx library for real parsing
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                // Convert to 2D array, all values as strings
                rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
                    header: 1,
                    defval: '',
                    raw: false  // Convert numbers to strings
                });
            }

            if (rows.length < 2) {
                throw new Error('File must have at least a header row and one data row');
            }

            const headerRow = rows[0];
            const dataRows = rows.slice(1);

            setHeaders(headerRow);
            setPreviewRows(dataRows.slice(0, 5));
            setTotalRows(dataRows.length);

            // Auto-detect columns
            const detected = detectColumns(headerRow);
            setColumnMap(detected);

            // Convert to draft items
            const items: DraftInventoryItem[] = dataRows
                .filter(row => row.some(cell => cell.trim())) // Skip empty rows
                .map((row, index) => {
                    const name = detected.name !== undefined ? row[detected.name] : row[0];
                    const category = detected.category !== undefined ? row[detected.category] : '';
                    const unit = detected.unit !== undefined ? normalizeUnit(row[detected.unit] || 'pcs') : 'pcs';
                    const costStr = detected.cost !== undefined ? row[detected.cost] : '';
                    const location = detected.location !== undefined ? row[detected.location] : '';

                    return {
                        id: `excel-${Date.now()}-${index}`,
                        name: name?.trim() || '',
                        category: category?.trim() || '',
                        unit,
                        cost: costStr ? parseFloat(costStr.replace(/[^0-9.]/g, '')) || undefined : undefined,
                        location: location?.trim() || undefined,
                    };
                })
                .filter(item => item.name); // Remove items without names

            setFileName(file.name);
            onLoad(items);

        } catch (e: any) {
            setError(e.message || 'Failed to parse file');
        } finally {
            setLoading(false);
        }
    }, [detectColumns, onLoad]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            parseFile(file);
        }
    }, [parseFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            parseFile(file);
        }
    }, [parseFile]);

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${fileName
                        ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                    }
        `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                />

                {loading ? (
                    <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                        <span className="text-gray-600 dark:text-gray-400">Processing...</span>
                    </div>
                ) : fileName ? (
                    <div className="flex items-center justify-center gap-3">
                        <div className="text-2xl">✅</div>
                        <div>
                            <div className="font-medium text-gray-900 dark:text-white">{fileName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {totalRows} rows detected
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="text-4xl mb-2">📄</div>
                        <div className="text-gray-600 dark:text-gray-400">
                            Drop file here or <span className="text-blue-500">browse</span>
                        </div>
                        <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            Supports .csv, .xlsx, .xls
                        </div>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Preview Table */}
            {previewRows.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Preview (first 5 rows)
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    {headers.map((header, i) => (
                                        <th
                                            key={i}
                                            className={`
                        px-4 py-2 text-left font-medium
                        ${Object.values(columnMap).includes(i)
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-600 dark:text-gray-400'
                                                }
                      `}
                                        >
                                            {header}
                                            {columnMap.name === i && ' 📌'}
                                            {columnMap.category === i && ' 📌'}
                                            {columnMap.unit === i && ' 📌'}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {previewRows.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {row.map((cell, cellIndex) => (
                                            <td
                                                key={cellIndex}
                                                className="px-4 py-2 text-gray-900 dark:text-white"
                                            >
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Detection Summary */}
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        {columnMap.name !== undefined && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                Name: Column {columnMap.name + 1}
                            </span>
                        )}
                        {columnMap.category !== undefined && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                Category: Column {columnMap.category + 1}
                            </span>
                        )}
                        {columnMap.unit !== undefined && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                Unit: Column {columnMap.unit + 1}
                            </span>
                        )}
                        {columnMap.cost !== undefined && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                Cost: Column {columnMap.cost + 1}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExcelPreview;
