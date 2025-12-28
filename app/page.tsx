"use client";

import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ImageUploader } from "@/components/ImageUploader";
import { StickerGrid } from "@/components/StickerGrid";

import {
  resizeImage,
  sliceAndProcessStickerSheet,
  ProcessedImage,
  fileToBase64,
  MAIN_IMAGE_SIZE,
  TAB_IMAGE_SIZE,
  LINE_STICKER_MAX_WIDTH,
  LINE_STICKER_MAX_HEIGHT
} from "@/lib/image-processing";
import { Loader2, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";



export default function Home() {
  const [mainImage, setMainImage] = useState<ProcessedImage | null>(null);
  const [tabImage, setTabImage] = useState<ProcessedImage | null>(null);
  const [stickerImages, setStickerImages] = useState<ProcessedImage[]>([]);



  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Slicing config
  const [sliceCols, setSliceCols] = useState(3);
  const [sliceRows, setSliceRows] = useState(3);

  // Handlers
  const handleMainImageSelect = async (files: File[]) => {
    if (!files[0]) return;
    setIsProcessing(true);
    try {
      // 1. Load Full Res
      const base64 = await fileToBase64(files[0]);

      // 2. Resize
      const result = await resizeImage(base64, MAIN_IMAGE_SIZE.width, MAIN_IMAGE_SIZE.height);
      result.fileName = "main.png";
      setMainImage(result);
    } catch (e) {
      console.error(e);
      alert("Failed to process main image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTabImageSelect = async (files: File[]) => {
    if (!files[0]) return;
    setIsProcessing(true);
    try {
      // 1. Load Full Res
      const base64 = await fileToBase64(files[0]);

      // 2. Resize
      const result = await resizeImage(base64, TAB_IMAGE_SIZE.width, TAB_IMAGE_SIZE.height);
      result.fileName = "tab.png";
      setTabImage(result);
    } catch (e) {
      console.error(e);
      alert("Failed to process tab image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStickerSheetSelect = async (files: File[]) => {
    if (!files[0]) return;
    setIsProcessing(true);
    try {
      // 1. Load Full Res
      const base64 = await fileToBase64(files[0]);

      // 2. Slice and Resize the Sheet
      const results = await sliceAndProcessStickerSheet(base64, sliceCols, sliceRows);

      // Append to existing
      setStickerImages(prev => {
        const combined = [...prev, ...results];
        // Re-index filenames
        return combined.map((img, idx) => ({
          ...img,
          fileName: `${String(idx + 1).padStart(2, "0")}.png`
        }));
      });
    } catch (e) {
      console.error(e);
      alert("Failed to process sticker sheet");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddStickers = async (files: File[]) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const newImages = await Promise.all(files.map(async (file) => {
        // 1. Load Full Res
        const base64 = await fileToBase64(file);

        // 2. Resize
        const processed = await resizeImage(
          base64,
          LINE_STICKER_MAX_WIDTH,
          LINE_STICKER_MAX_HEIGHT
        );
        return processed;
      }));

      // Append to existing
      setStickerImages(prev => {
        const combined = [...prev, ...newImages];
        // Re-index filenames
        return combined.map((img, idx) => ({
          ...img,
          fileName: `${String(idx + 1).padStart(2, "0")}.png`
        }));
      });

    } catch (e) {
      console.error(e);
      alert("Failed to add stickers");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReorder = (newOrder: ProcessedImage[]) => {
    // Re-index filenames immediately
    const reindexed = newOrder.map((img, idx) => ({
      ...img,
      fileName: `${String(idx + 1).padStart(2, "0")}.png`
    }));
    setStickerImages(reindexed);
  };

  const handleDownloadZip = async () => {
    if (!mainImage && !tabImage && stickerImages.length === 0) return;
    setIsExporting(true);

    try {
      const zip = new JSZip();

      if (mainImage) {
        zip.file("main.png", mainImage.processed.split(",")[1], { base64: true });
      }
      if (tabImage) {
        zip.file("tab.png", tabImage.processed.split(",")[1], { base64: true });
      }

      stickerImages.forEach((img) => {
        if (img.fileName) {
          zip.file(img.fileName, img.processed.split(",")[1], { base64: true });
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "line_stickers_set.zip");
    } catch (error) {
      console.error("Error creating zip:", error);
      alert("Failed to create ZIP file.");
    } finally {
      setIsExporting(false);
    }
  };




  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-100 p-4 md:p-8">
      <main className="max-w-6xl mx-auto space-y-12 py-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-6 dark:border-zinc-800">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
              LINE Sticker Maker
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Upload assets, auto-slice, and export compliant ZIPs.
            </p>
          </div>
          <Button
            onClick={handleDownloadZip}
            size="lg"
            disabled={isExporting || (!mainImage && !tabImage && stickerImages.length === 0)}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
          >
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download ZIP
          </Button>
        </div>

        {isProcessing && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              <p className="font-medium">Processing Images...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Fixed Assets */}
          <div className="space-y-8 lg:col-span-1">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs">1</span>
                Main Image
              </h2>
              <Card className="p-4 space-y-4">
                <ImageUploader
                  label="Upload Main (240x240)"
                  description="Will be resized to fit 240x240"
                  onImagesSelected={handleMainImageSelect}
                />
                {mainImage && (
                  <div className="relative group rounded-lg overflow-hidden border dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/50 flex justify-center p-4">
                    <img src={mainImage.processed} className="w-[120px] h-[120px] object-contain" alt="Main" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setMainImage(null)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-2 left-2 text-[10px] text-zinc-400 bg-black/50 px-2 py-0.5 rounded-full">
                      {mainImage.width}x{mainImage.height}
                    </div>

                  </div>
                )}
              </Card>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs">2</span>
                Tab Image
              </h2>
              <Card className="p-4 space-y-4">
                <ImageUploader
                  label="Upload Tab (96x74)"
                  description="Will be resized to fit 96x74"
                  onImagesSelected={handleTabImageSelect}
                />
                {tabImage && (
                  <div className="relative group rounded-lg overflow-hidden border dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/50 flex justify-center p-8">
                    <img src={tabImage.processed} className="w-[48px] h-[37px] object-contain scale-150" alt="Tab" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setTabImage(null)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-2 left-2 text-[10px] text-zinc-400 bg-black/50 px-2 py-0.5 rounded-full">
                      {tabImage.width}x{tabImage.height}
                    </div>

                  </div>
                )}
              </Card>
            </section>
          </div>

          {/* Right Column: Sticker Sheet */}
          <div className="space-y-8 lg:col-span-2">
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs">3</span>
                  Sticker Sheet
                </h2>

                <div className="flex gap-4 items-center bg-white dark:bg-zinc-900 p-2 rounded-lg border shadow-sm">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="cols" className="text-xs">Cols</Label>
                    <Input
                      id="cols"
                      type="number"
                      value={sliceCols}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSliceCols(Number(e.target.value))}
                      className="w-16 h-8 text-xs"
                      min={1}
                    />
                  </div>
                  <span className="text-zinc-300">x</span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="rows" className="text-xs">Rows</Label>
                    <Input
                      id="rows"
                      type="number"
                      value={sliceRows}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSliceRows(Number(e.target.value))}
                      className="w-16 h-8 text-xs"
                      min={1}
                    />
                  </div>
                </div>
              </div>

              <Card className="p-4 space-y-4">
                <ImageUploader
                  label={`Upload Sheet (Splits into ${sliceCols * sliceRows} stickers)`}
                  description={`Currently configured to split into ${sliceCols} columns x ${sliceRows} rows.`}
                  onImagesSelected={handleStickerSheetSelect}
                />

                <div className="pt-4 border-t dark:border-zinc-800">
                  <ImageUploader
                    label="Add Individual Stickers"
                    description="Upload individual PNG/JPG files to append to the list."
                    onImagesSelected={handleAddStickers}
                    isProcessing={isProcessing}
                    maxFiles={40}
                  />
                </div>

                {stickerImages.length > 0 && (
                  <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                      <Button variant="ghost" size="sm" onClick={() => setStickerImages([])} className="text-red-500 hover:text-red-600 hover:bg-red-50 flex gap-2 ml-auto">
                        <Trash2 className="w-4 h-4" /> Clear All
                      </Button>
                    </div>
                    <StickerGrid
                      images={stickerImages}
                      onRemove={(id) => {
                        setStickerImages((prev) => {
                          const filtered = prev.filter((p) => p.id !== id);
                          return filtered.map((img, index) => ({
                            ...img,
                            fileName: `${String(index + 1).padStart(2, "0")}.png`,
                          }));
                        });
                      }}
                      onDownloadZip={() => { }}
                      isExporting={isExporting}

                      onReorder={handleReorder}
                    />
                  </div>
                )}
              </Card>
            </section>
          </div>
        </div>



      </main>
    </div>
  );
}
