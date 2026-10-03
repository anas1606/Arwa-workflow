import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Plus, Trash2, Calculator, Filter, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import AsyncSelectInput from '@/common/input/AsyncSelectInput';
import Input from '@/common/input/Input';
import Button from '@/common/buttons/Button';
import CommonTable from '@/common/table/CommonTable';
import { getProductsApi, calculateRawMaterialPlanningApi } from '@/lib/fetcher';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';
import { exportToExcel, exportToPdf } from '@/utils/exportUtils';

const selectClassName =
    'h-11 w-full min-w-[150px] cursor-pointer appearance-none rounded-[0.67rem] border border-gray-200 bg-white/60 pl-3 pr-9 text-sm font-medium text-grey-text-strong shadow-[inset_0_2px_4px_rgba(15,23,42,0.04)] outline-none backdrop-blur-md transition-all duration-150 hover:border-slate-300 focus:border-primary-muted focus:bg-white focus:ring-4 focus:ring-blue-500/10';

function FilterSelect({ id, label, value, onChange, options }) {
    return (
        <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-grey-muted">
                {label}
            </label>
            <div className="relative">
                <select id={id} className={selectClassName} value={value} onChange={onChange}>
                    {options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-grey-icon" />
            </div>
        </div>
    );
}

export default function RawMaterialPlanning() {
    const { canRead, isLoading: isPermissionLoading } = usePermission('raw_material_planning');

    const [selectedProducts, setSelectedProducts] = useState([{ product: null, quantity: '1' }]);
    const [defaultProducts, setDefaultProducts] = useState([]);
    
    // Filters
    const [isReserved, setIsReserved] = useState(true);
    const [originFilter, setOriginFilter] = useState('ALL');

    // Results
    const [planningData, setPlanningData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasCalculated, setHasCalculated] = useState(false);
    const [isExporting, setIsExporting] = useState(null); // 'pdf' | 'excel' | null

    useEffect(() => {
        const fetchDefaultProducts = async () => {
            try {
                const res = await getProductsApi(1, 20, '', 'ACTIVE', 'ALL', 'ALL', 'ALL', true);
                if (res.data?.success) {
                    setDefaultProducts(res.data.data.data.map(p => ({ 
                        label: p.name + (p.code ? ` (${p.code})` : ''), 
                        value: p.id 
                    })));
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchDefaultProducts();
    }, []);

    if (isPermissionLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-200 rounded-full mb-4"></div>
                    <div className="h-6 w-32 bg-slate-200 rounded mb-2"></div>
                    <div className="h-4 w-48 bg-slate-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h3>
                <p className="text-slate-500">You do not have permission to view raw material planning.</p>
            </div>
        );
    }

    const loadProducts = async (input) => {
        if (!input) return defaultProducts;
        const res = await getProductsApi(1, 20, input, 'ACTIVE', 'ALL', 'ALL', 'ALL', true);
        if (res.data?.success) {
            return res.data.data.data.map(p => ({ 
                label: p.name + (p.code ? ` (${p.code})` : ''), 
                value: p.id 
            }));
        }
        return [];
    };

    const addProductRow = () => {
        setSelectedProducts([...selectedProducts, { product: null, quantity: '1' }]);
    };

    const removeProductRow = (index) => {
        const newProducts = [...selectedProducts];
        newProducts.splice(index, 1);
        setSelectedProducts(newProducts);
    };

    const updateProductRow = (index, field, value) => {
        const newProducts = [...selectedProducts];
        newProducts[index][field] = value;
        setSelectedProducts(newProducts);
    };

    const handleCalculate = async (overrides = {}) => {
        const reserved = overrides.isReserved ?? isReserved;
        const origin = overrides.origin ?? originFilter;
        const validProducts = selectedProducts.filter(p => p.product && parseFloat(p.quantity) > 0);
        
        if (validProducts.length === 0) {
            toast.error('Please select at least one valid product and quantity.');
            return;
        }

        setIsLoading(true);
        setHasCalculated(true);

        const payload = {
            products: validProducts.map(p => ({
                productId: p.product.value,
                quantity: parseFloat(p.quantity)
            })),
            isReserved: reserved,
            origin
        };

        try {
            const res = await calculateRawMaterialPlanningApi(payload);
            if (res.data?.success) {
                setPlanningData(res.data.data);
            } else {
                toast.error(res.data?.message || res.error?.message || 'Calculation failed.');
                setPlanningData(null);
            }
        } catch (err) {
            console.error(err);
            toast.error('An error occurred during calculation.');
            setPlanningData(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Filters re-run the calculation straight away (no need to press Calculate again)
    const handleReservedChange = (e) => {
        const value = e.target.value === 'true';
        setIsReserved(value);
        if (hasCalculated) handleCalculate({ isReserved: value });
    };

    const handleOriginChange = (e) => {
        const value = e.target.value;
        setOriginFilter(value);
        if (hasCalculated) handleCalculate({ origin: value });
    };

    const handleExport = async (type) => {
        if (!planningData || planningData.length === 0) {
            toast.error('Calculate requirements first, there is nothing to export yet.');
            return;
        }
        setIsExporting(type);
        try {
            const exportColumns = [
                { header: 'Product Name', key: 'productName', width: 34, align: 'left' },
                { header: 'Product Image', key: 'image', isImage: true, width: 16 },
                { header: 'Product Code', key: (row) => row.productCode || '', width: 16 },
                { header: 'Required', key: 'requiredQuantity', width: 12 },
                { header: 'Reserved', key: 'reservedQuantity', width: 12 },
                { header: 'In Stock', key: 'availableQuantity', width: 12 },
                { 
                    header: 'Needs To Order', 
                    key: 'needsToOrder', 
                    width: 16, 
                    style: (val) => val > 0 
                        ? { fontColor: 'FFDC2626', pdfColor: [220, 38, 38], bold: true } 
                        : { pdfColor: [22, 163, 74] } 
                }
            ];

            const options = {
                fileNamePrefix: 'raw-material-planning',
                sheetName: 'Raw Material Planning',
                columns: exportColumns,
                data: planningData
            };

            if (type === 'pdf') {
                await exportToPdf(options);
            } else {
                await exportToExcel(options);
            }
        } catch (err) {
            console.error(err);
            toast.error(`Failed to export ${type === 'pdf' ? 'PDF' : 'Excel'} file.`);
        } finally {
            setIsExporting(null);
        }
    };

    const canExport = (planningData?.length || 0) > 0 && !isLoading;

    const columns = [
        {
            key: 'product',
            label: 'PRODUCT / COMPONENT',
            render: (item) => {
                return (
                    <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: '20px' }}>
                        <div className="w-6 shrink-0 flex justify-center text-grey-muted">
                            <div className="w-1.5 h-1.5 rounded-full bg-grey-border-strong" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-sm text-grey-text-strong truncate" title={item.productName}>{item.productName}</span>
                            {item.productCode && <span className="text-[10px] text-grey-muted mt-0.5 uppercase tracking-wider">{item.productCode}</span>}
                        </div>
                        {item.isIdentifier && (
                            <span className="text-[10px] uppercase tracking-wider font-bold bg-primary text-white px-2 py-0.5 rounded shrink-0">
                                Identifier
                            </span>
                        )}
                        {item.origin && (
                            <span className="text-[10px] uppercase tracking-wider font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded shrink-0 border border-gray-200">
                                {item.origin}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'required',
            label: 'REQUIRED',
            align: 'center',
            render: (item) => (
                <span className="font-semibold text-grey-text-strong">{item.requiredQuantity}</span>
            )
        },
        {
            key: 'reserved',
            label: 'RESERVED',
            align: 'center',
            render: (item) => (
                <span className="font-semibold text-primary">{item.reservedQuantity}</span>
            )
        },
        {
            key: 'available',
            label: 'IN STOCK',
            align: 'center',
            render: (item) => {
                return (
                    <span className="font-semibold text-grey-text-strong">{item.availableQuantity}</span>
                );
            }
        },
        {
            key: 'needsToOrder',
            label: 'NEEDS TO ORDER',
            align: 'center',
            render: (item) => {
                const needsOrder = item.needsToOrder > 0;
                return (
                    <span className={`font-bold px-2 py-1 rounded-md text-xs ${needsOrder ? 'bg-danger-main/10 text-danger-main' : 'bg-success-main/10 text-success-main'}`}>
                        {item.needsToOrder}
                    </span>
                );
            }
        }
    ];

    return (
        <>
            <Head>
                <title>Raw Material Planning | Arwa Weld</title>
            </Head>

            <div className="w-full flex flex-col gap-5">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-grey-text-strong">
                            Raw Material Planning
                        </h1>
                        <p className="mt-1 text-sm leading-snug text-grey-muted">
                            Plan purchases for multiple products simultaneously considering reserved identifier stock and origins.
                        </p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="card-panel flex w-full flex-col gap-3 border-none !p-3 shadow-sm shrink-0">
                    <div className="flex flex-col gap-2">
                        {selectedProducts.map((row, index) => (
                            <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="flex-1 z-[60]">
                                    <AsyncSelectInput
                                        id={`rmp-product-${index}`}
                                        value={row.product}
                                        onChange={(val) => updateProductRow(index, 'product', val)}
                                        placeholder="Select target product to manufacture..."
                                        defaultOptions={defaultProducts.length > 0 ? defaultProducts : true}
                                        loadOptions={loadProducts}
                                        hidePlaceholder={true}
                                    />
                                </div>
                                <div className="w-full sm:w-[150px]">
                                    <Input
                                        id={`rmp-qty-${index}`}
                                        type="number"
                                        placeholder="Quantity (e.g. 1)"
                                        min="1"
                                        value={row.quantity}
                                        onChange={(e) => updateProductRow(index, 'quantity', e.target.value)}
                                    />
                                </div>
                                {selectedProducts.length > 1 && (
                                    <button 
                                        onClick={() => removeProductRow(index)}
                                        className="w-10 h-10 flex items-center justify-center text-danger-main hover:bg-danger-main/10 rounded-md transition-colors shrink-0"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-grey-border pt-3">
                        <div className="flex flex-wrap items-center gap-4">
                            <button 
                                onClick={addProductRow}
                                className="text-sm font-semibold text-primary hover:text-primary-dark flex items-center gap-1 transition-colors"
                            >
                                <Plus size={16} /> Add Product
                            </button>
                            <div className="hidden sm:block h-4 w-px bg-grey-border"></div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Input
                                    type="select"
                                    value={isReserved.toString()}
                                    onChange={handleReservedChange}
                                    className="shrink-0 w-full sm:w-56"
                                    hidePlaceholder={true}
                                    options={[
                                        { value: 'true', label: 'Consider Reserved Stock' },
                                        { value: 'false', label: 'Ignore Reserved Stock' }
                                    ]}
                                />
                                <Input
                                    type="select"
                                    value={originFilter}
                                    onChange={handleOriginChange}
                                    className="shrink-0 w-full sm:w-32"
                                    hidePlaceholder={true}
                                    options={[
                                        { value: 'ALL', label: 'All Origins' },
                                        { value: 'INDIA', label: 'India' },
                                        { value: 'IMPORT', label: 'Import' }
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <Button
                                id="rmp-export-excel"
                                variant="secondary"
                                className="flex-1 sm:flex-none"
                                onClick={() => handleExport('excel')}
                                icon={FileSpreadsheet}
                                text={isExporting === 'excel' ? 'Exporting...' : 'Export Excel'}
                                disabled={!canExport || isExporting !== null}
                            />
                            <Button
                                id="rmp-export-pdf"
                                variant="secondary"
                                className="flex-1 sm:flex-none"
                                onClick={() => handleExport('pdf')}
                                icon={FileText}
                                text={isExporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
                                disabled={!canExport || isExporting !== null}
                            />
                            <Button
                                id="rmp-calculate"
                                variant="primary"
                                className="flex-1 sm:flex-none"
                                onClick={() => handleCalculate()}
                                icon={Calculator}
                                text="Calculate"
                                disabled={isLoading}
                                isLoading={isLoading}
                            />
                        </div>
                    </div>
                </div>

        {/* Table Area */}
        <div className="bg-white rounded-xl shadow-sm border border-grey-border overflow-hidden">
                    <CommonTable
                        columns={columns}
                        data={planningData || []}
                        isLoading={isLoading}
                        hidePagination={true}
                        emptyState={
                            !hasCalculated ? (
                                <div className="flex flex-col items-center justify-center text-center py-10">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                                        <Calculator size={32} />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-800 mb-1">Raw Material Planning</h3>
                                    <p className="text-sm text-slate-500 max-w-sm">Select products and configure your filters, then click calculate to view purchasing requirements.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center py-10">
                                    <span className="text-sm font-medium">No results found.</span>
                                </div>
                            )
                        }
                    />
                </div>
            </div>
        </>
    );
}
