"use client";

import { useState, useCallback } from "react";
import { Upload, Image as ImageIcon, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
    label: string;
    description?: string;
    onImagesSelected: (files: File[]) => void;
    isProcessing?: boolean;
    maxFiles?: number;
    accept?: string;
}

export function ImageUploader({
    label,
    description,
    onImagesSelected,
    isProcessing = false,
    maxFiles = 1,
    accept = "image/*"
}: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const validateAndPassFiles = useCallback((fileList: FileList | File[]) => {
        setError(null);
        const files = Array.from(fileList);

        // Filter for images
        const imageFiles = files.filter(file => file.type.startsWith("image/"));

        if (imageFiles.length === 0) {
            setError("Please select image files (PNG, JPG).");
            return;
        }

        if (maxFiles === 1 && imageFiles.length > 1) {
            setError("Please upload only one image for this section.");
            // Just take the first one? Or reject? Let's take the first one but warn.
            onImagesSelected([imageFiles[0]]);
            return;
        }

        onImagesSelected(imageFiles);
    }, [maxFiles, onImagesSelected]);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) {
                validateAndPassFiles(e.dataTransfer.files);
            }
        },
        [validateAndPassFiles]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files?.length) {
                validateAndPassFiles(e.target.files);
            }
            // Reset value to allow selecting same file again if needed
            e.target.value = "";
        },
        [validateAndPassFiles]
    );

    return (
        <div className="w-full space-y-2">
            <div className="flex justify-between items-baseline">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {label}
                </label>
                {description && (
                    <span className="text-xs text-zinc-500">{description}</span>
                )}
            </div>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "relative flex flex-col items-center justify-center w-full min-h-[200px] border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ease-in-out group overflow-hidden",
                    isDragging
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.01] shadow-lg"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/50",
                    isProcessing && "opacity-50 cursor-not-allowed",
                    error && "border-red-400 bg-red-50 dark:bg-red-900/10"
                )}
            >
                <input
                    type="file"
                    multiple={maxFiles > 1}
                    accept={accept}
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    disabled={isProcessing}
                />

                <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 pointer-events-none">
                    <div className={cn(
                        "p-3 rounded-full transition-colors duration-300",
                        isDragging ? "bg-blue-100 text-blue-600" : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200 group-hover:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500",
                        error && "bg-red-100 text-red-500"
                    )}>
                        {error ? <FileWarning className="w-8 h-8" /> : (
                            isDragging ? <Upload className="w-8 h-8 animate-bounce" /> : <ImageIcon className="w-8 h-8" />
                        )}
                    </div>

                    <div className="space-y-1">
                        <p className={cn("text-base font-medium transition-colors", error ? "text-red-500" : "text-zinc-700 dark:text-zinc-300")}>
                            {error ? error : (isDragging ? "Drop it here!" : "Click or drag image")}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            {maxFiles > 1 ? "Supports multiple files" : "Single file only"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
