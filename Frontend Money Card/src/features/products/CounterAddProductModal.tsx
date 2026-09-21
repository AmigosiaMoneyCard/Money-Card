import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Modal, ModalFooter, Button } from '@/components/ui';
import { apiService } from '@/services/api';
import { notify } from '@/utils';
import type { Branch } from '@/types';
import { Plus, AlertCircle, UploadCloud, FileSpreadsheet, Download } from 'lucide-react';

interface CounterAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  onSuccess: () => void;
}

type FoodType = 'Veg' | 'Non-Veg' | 'Drink';

interface ParsedMenuItem {
  itemName: string;
  price: number;
  category: string[];
}

export function CounterAddProductModal({
  isOpen,
  onClose,
  branch,
  onSuccess,
}: CounterAddProductModalProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Single Item form state
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [foodType, setFoodType] = useState<FoodType>('Veg');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Bulk Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedMenuItem[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('single');
      setItemName('');
      setPrice('');
      setFoodType('Veg');
      setApiError(null);
      setSelectedFile(null);
      setParsedItems([]);
      setBulkError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!branch) return null;

  // ── CSV Parsing Logic ───────────────────────────────────────
  const parseCsvText = (text: string): { items: ParsedMenuItem[]; error?: string } => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return { items: [], error: 'CSV file is empty or missing data rows' };
    }

    const headers = lines[0]
      .toLowerCase()
      .split(',')
      .map((h) => h.trim().replace(/^["']|["']$/g, ''));

    const nameIdx = headers.findIndex((h) => h.includes('item') || h.includes('name'));
    const priceIdx = headers.findIndex(
      (h) => h.includes('price') || h.includes('rate') || h.includes('cost'),
    );
    const catIdx = headers.findIndex((h) => h.includes('category') || h.includes('type'));

    if (nameIdx === -1 || priceIdx === -1) {
      return {
        items: [],
        error: 'CSV headers must include "itemName" (or "name") and "price"',
      };
    }

    const items: ParsedMenuItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const rawName = cols[nameIdx]?.trim() || '';
      const rawPrice = parseFloat(cols[priceIdx]?.trim() || '');
      const rawCategory = catIdx !== -1 && cols[catIdx] ? cols[catIdx].trim() : 'Veg';

      if (!rawName) continue;
      if (isNaN(rawPrice) || rawPrice <= 0) continue;

      const categoryList = rawCategory
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      items.push({
        itemName: rawName,
        price: Math.round(rawPrice),
        category: categoryList.length > 0 ? categoryList : ['Veg'],
      });
    }

    if (items.length === 0) {
      return { items: [], error: 'No valid rows found in CSV. Please verify name and price columns.' };
    }

    return { items };
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setBulkError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = parseCsvText(text);
      if (res.error) {
        setBulkError(res.error);
        setParsedItems([]);
      } else {
        setParsedItems(res.items);
      }
    };
    reader.onerror = () => {
      setBulkError('Failed to read file. Please try again.');
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const template =
      'itemName,price,category\nVeg Burger,120,Veg\nChicken Roll,180,Non-Veg\nCold Coffee,80,Drink\nPaneer Tikka,220,Veg\nFrench Fries,90,Veg\n';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu_template_${branch.name.toLowerCase().replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Submit Handlers ─────────────────────────────────────────
  const handleSubmitSingle = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      setApiError('Please enter an item name');
      inputRef.current?.focus();
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setApiError('Please enter a valid price greater than 0');
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    try {
      const categories: string[] = [foodType];

      const res = await apiService.products.createProduct({
        itemName: trimmedName,
        price: Math.round(numPrice),
        category: categories,
        branchId: branch.id,
        status: 'ACTIVE',
      });

      if (!res.success) {
        setApiError(res.error.message || 'Failed to add menu item');
        return;
      }

      notify.success(`"${trimmedName}" (₹${Math.round(numPrice)}) added to ${branch.name}`);
      onClose();
      onSuccess();
    } catch {
      setApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBulk = async (e: FormEvent) => {
    e.preventDefault();
    if (parsedItems.length === 0) {
      setBulkError('Please select a valid CSV file with menu items');
      return;
    }

    setIsSubmitting(true);
    setBulkError(null);

    try {
      let createdCount = 0;
      for (const item of parsedItems) {
        const res = await apiService.products.createProduct({
          itemName: item.itemName,
          price: item.price,
          category: item.category,
          branchId: branch.id,
          status: 'ACTIVE',
        });
        if (res.success) {
          createdCount++;
        }
      }

      if (createdCount > 0) {
        notify.success(`${createdCount} menu items imported to ${branch.name}`);
        onClose();
        onSuccess();
      } else {
        setBulkError('Failed to import items. Please verify counter permissions and try again.');
      }
    } catch {
      setBulkError('An error occurred during bulk import. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={`Add Menu — ${branch.name}`}
      size={activeTab === 'bulk' ? 'lg' : 'sm'}
    >
      <div className="space-y-4">
        {/* ─── Mode Switcher Tabs ─── */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'single'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Single Item
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'bulk'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Bulk Upload (CSV)</span>
          </button>
        </div>

        {/* ─── Tab 1: Single Item ─── */}
        {activeTab === 'single' && (
          <form onSubmit={handleSubmitSingle} className="space-y-4">
            {apiError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{apiError}</span>
              </div>
            )}

            {/* Item Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                ref={inputRef}
                type="text"
                placeholder="e.g. Chicken Wrap, Cold Coffee, Samosa"
                value={itemName}
                onChange={(e) => setItemName(e.target.value.slice(0, 40))}
                maxLength={40}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
              />
            </div>

            {/* Price in ₹ */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Price (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="150"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Food Type Selector (No Emojis) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFoodType('Veg')}
                  className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    foodType === 'Veg'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                  <span>Veg</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFoodType('Non-Veg')}
                  className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    foodType === 'Non-Veg'
                      ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-600"></span>
                  <span>Non-Veg</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFoodType('Drink')}
                  className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    foodType === 'Drink'
                      ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-sky-600"></span>
                  <span>Drink</span>
                </button>
              </div>
            </div>

            <ModalFooter>
              <Button
                variant="ghost"
                type="button"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Menu
              </Button>
            </ModalFooter>
          </form>
        )}

        {/* ─── Tab 2: Bulk Upload (CSV) ─── */}
        {activeTab === 'bulk' && (
          <form onSubmit={handleSubmitBulk} className="space-y-4">
            {bulkError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{bulkError}</span>
              </div>
            )}

            {/* Template Download Prompt */}
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 border border-emerald-100 p-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-800">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Format: <strong>itemName, price, category</strong></span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Template</span>
              </button>
            </div>

            {/* File Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processSelectedFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : selectedFile
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <UploadCloud className="h-5 w-5" />
                </div>
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Click to change file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Drag & drop menu CSV file here or <span className="text-emerald-700 font-semibold underline">Browse</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Supported file: .csv (max 5MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Parsed Items Preview Table */}
            {parsedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>{parsedItems.length} items ready to import</span>
                  <span className="text-emerald-700 font-semibold">Valid data format</span>
                </div>
                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                        <th className="py-2 px-3">Item Name</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedItems.slice(0, 8).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-medium text-slate-800">{item.itemName}</td>
                          <td className="py-2 px-3 text-slate-500">{item.category.join(', ')}</td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900">₹{item.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedItems.length > 8 && (
                    <div className="p-2 text-center text-xs text-slate-400 bg-slate-50/50 border-t border-slate-100">
                      + {parsedItems.length - 8} more items
                    </div>
                  )}
                </div>
              </div>
            )}

            <ModalFooter>
              <Button
                variant="ghost"
                type="button"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                disabled={parsedItems.length === 0}
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              >
                Upload & Add {parsedItems.length > 0 ? `(${parsedItems.length})` : ''}
              </Button>
            </ModalFooter>
          </form>
        )}
      </div>
    </Modal>
  );
}
