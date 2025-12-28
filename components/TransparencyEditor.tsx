"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { removeColorFromImage } from "@/lib/image-processing";
import { Loader2 } from "lucide-react";

interface TransparencyEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    onSave: (newImageSrc: string) => void;
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

function rgbToHex(r: number, g: number, b: number) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function TransparencyEditor({ isOpen, onClose, imageSrc, onSave }: TransparencyEditorProps) {
    const [currentSrc, setCurrentSrc] = useState(imageSrc);
    const [targetColor, setTargetColor] = useState("#00ff00"); // Hex
    const [tolerance, setTolerance] = useState(15);
    const [feather, setFeather] = useState(4);
    const [despill, setDespill] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentSrc(imageSrc);
            setTargetColor("#00ff00");
            setTolerance(15);
            setFeather(4);
            setDespill(true);
        }
    }, [isOpen, imageSrc]);

    // Draw image on canvas for picking
    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        img.src = currentSrc;
    }, [isOpen, currentSrc]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
        setTargetColor(hex);
    };

    const handleApply = async () => {
        setIsProcessing(true);
        try {
            const rgb = hexToRgb(targetColor);
            if (!rgb) {
                alert("Invalid Hex Color");
                return;
            }
            const newSrc = await removeColorFromImage(currentSrc, rgb, tolerance, feather, despill);
            setCurrentSrc(newSrc);
        } catch (error) {
            console.error(error);
            alert("Failed to apply transparency");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setCurrentSrc(imageSrc);
    };

    const handleSave = () => {
        onSave(currentSrc);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Transparency</DialogTitle>
                    <DialogDescription>
                        Click on the image to select a color to remove, or enter a Hex code.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-4 flex items-center justify-center border overflow-auto">
                        {/* Key wrapper for rendering canvas properly */}
                        <canvas
                            ref={canvasRef}
                            className="max-w-full h-auto cursor-crosshair border shadow-sm bg-[url('https://media.istockphoto.com/id/1133178263/vector/checkered-geometric-vector-background-chequered-pattern.jpg?s=612x612&w=0&k=20&c=pGW5Fq9K_m102E-4w0O9cAzUvM75j4cE9tM6X2L6q4k=')] bg-contain"
                            onClick={handleCanvasClick}
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label>Target Color (Hex)</Label>
                            <div className="flex gap-2">
                                <div
                                    className="w-10 h-10 rounded border shadow-sm shrink-0 transition-colors"
                                    style={{ backgroundColor: targetColor }}
                                />
                                <Input
                                    value={targetColor}
                                    onChange={(e) => setTargetColor(e.target.value)}
                                    placeholder="#FFFFFF"
                                    className="font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Tolerance</Label>
                                <span className="text-xs text-zinc-500">{tolerance}%</span>
                            </div>
                            <Slider
                                value={[tolerance]}
                                onValueChange={(v) => setTolerance(v[0])}
                                min={0}
                                max={100}
                                step={1}
                            />
                            <p className="text-xs text-zinc-500">
                                Higher values remove more similar colors.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Edge Smoothness (Feather)</Label>
                                <span className="text-xs text-zinc-500">{feather}px</span>
                            </div>
                            <Slider
                                value={[feather]}
                                onValueChange={(v) => setFeather(v[0])}
                                min={0}
                                max={20}
                                step={1}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="despill"
                                checked={despill}
                                onChange={(e) => setDespill(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                            />
                            <Label htmlFor="despill" className="cursor-pointer">Enable Despill (Remove color cast)</Label>
                        </div>

                        <div className="flex flex-col gap-2 pt-4">
                            <Button onClick={handleApply} disabled={isProcessing} className="w-full">
                                {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Apply Transparency
                            </Button>
                            <Button variant="outline" onClick={handleReset} disabled={isProcessing} className="w-full">
                                Reset Image
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
