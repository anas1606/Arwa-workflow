import React, { useState, useRef, useId, forwardRef } from "react";
import { Upload, ChevronDown } from "lucide-react";
import clsx from "clsx";

const Input = forwardRef(({
    type = "text",
    id: providedId,
    label,
    required,
    options = [],
    endIcon: EndIcon,
    startIcon: StartIcon,
    placeholder = "Select",
    className = "",
    onFilesChange,
    multiple = true,
    accept = "image/*,.pdf,video/*",
    maxFiles = 12,
    error,
    hidePlaceholder = false,
    ...props
}, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;

    if (type === "file") {
        const [files, setFiles] = useState([]);
        const [isDragging, setIsDragging] = useState(false);
        const fileRef = useRef(null);

        const addFiles = (newFileList) => {
            const newFiles = Array.from(newFileList).map(f => ({
                file: f,
                preview: URL.createObjectURL(f),
                name: f.name,
                type: f.type.startsWith('image/') ? 'image' : 'pdf',
            }));
            const updated = [...files, ...newFiles].slice(0, maxFiles);
            setFiles(updated);
            onFilesChange?.(updated);
        };

        return (
            <div className="w-full">
                {label && <label className="mb-1 block text-sm font-semibold text-black">{label}</label>}
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
                    onClick={() => fileRef.current?.click()}
                    className={clsx(
                        "flex flex-col items-center justify-center cursor-pointer rounded-md border-2 border-dashed p-8 transition-all",
                        isDragging ? 'border-primary bg-brand-50/50' : (error ? 'border-red bg-danger-50/30' : 'border-black hover:border-black bg-white/30 backdrop-blur-md')
                    )}
                >
                    <Upload size={32} className={`mb-2 ${isDragging ? 'text-primary' : (error ? 'text-red' : 'text-black')}`} />
                    <p className="text-sm font-medium text-black">
                        {isDragging ? 'Drop files here...' : 'Upload your evidence (Photos, Videos, PDF)'}
                    </p>
                    <input
                        type="file"
                        ref={fileRef}
                        className="hidden"
                        multiple={multiple}
                        accept={accept}
                        onChange={(e) => addFiles(e.target.files)}
                        {...props}
                    />
                </div>
                {error && <span className="mt-1 block text-xs font-semibold text-red">{error}</span>}
            </div>
        );
    }

    if (type === "select") {
        return (
            <div className={`w-full ${className}`}>
                {label && (
                    <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink-900">
                        {label} {required && <span className="text-danger-500">*</span>}
                    </label>
                )}
                <div className="relative">
                    {StartIcon && (
                        <span className="pointer-events-none absolute z-10 left-3 top-1/2 -translate-y-1/2 text-ink-400">
                            <StartIcon size={18} />
                        </span>
                    )}
                    <select
                        id={id}
                        ref={ref}
                        className={clsx(
                            "h-11 w-full appearance-none rounded-md border px-3 text-sm outline-none transition-all",
                            "border-ink-200 bg-white/60 text-ink-900 placeholder:text-ink-400 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(15,23,42,0.04)]",
                            "focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10",
                            error ? "border-danger-500" : "",
                            StartIcon && "pl-10",
                            "pr-10" // Always reserve space for the arrow/EndIcon
                        )}
                        required={required}
                        {...props}
                    >
                        {!hidePlaceholder && (
                            <option value="" disabled className="text-ink-900">
                                {placeholder}
                            </option>
                        )}
                        {options.map((opt, idx) => (
                            <option key={idx} value={opt.value} className="text-ink-900">
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    {EndIcon ? (
                        <span className="pointer-events-none absolute z-10 right-3 top-1/2 -translate-y-1/2 text-ink-400">
                            <EndIcon size={18} />
                        </span>
                    ) : (
                        <span className="pointer-events-none absolute z-10 right-3 top-1/2 -translate-y-1/2 text-ink-400">
                            <ChevronDown size={18} />
                        </span>
                    )}
                </div>
                {error && <span className="mt-1 block text-xs font-semibold text-danger-600">{error}</span>}
            </div>
        );
    }

    // Default text/email/password etc.
    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink-900">
                    {label} {required && <span className="text-danger-500">*</span>}
                </label>
            )}
            <div className="relative">
                {StartIcon && (
                    <span className="pointer-events-none absolute z-10 left-3 top-1/2 -translate-y-1/2 text-ink-400">
                        <StartIcon size={18} />
                    </span>
                )}
                <input
                    type={type}
                    id={id}
                    ref={ref}
                    placeholder={placeholder}
                    className={clsx(
                        "h-11 w-full rounded-md border px-3 text-sm outline-none transition-all",
                        "border-ink-200 bg-white/60 text-ink-900 placeholder:text-ink-400 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(15,23,42,0.04)]",
                        "focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10",
                        error ? "border-danger-500" : "",
                        StartIcon && "pl-10",
                        EndIcon && "pr-10"
                    )}
                    required={required}
                    {...props}
                />
                {EndIcon && (
                    <span className="pointer-events-none absolute z-10 right-3 top-1/2 -translate-y-1/2 text-ink-400">
                        <EndIcon size={18} />
                    </span>
                )}
            </div>
            {error && <span className="mt-1 block text-xs font-semibold text-danger-600">{error}</span>}
        </div>
    );
});

Input.displayName = "Input";

export default Input;
