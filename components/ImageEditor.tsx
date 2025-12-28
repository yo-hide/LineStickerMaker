"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import getCroppedImg from "@/lib/canvas-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { RotateCw, ZoomIn } from "lucide-react";

interface ImageEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    onSave: (croppedImage: string) => void;
}

export function ImageEditor({ isOpen, onClose, imageSrc, onSave }: ImageEditorProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            if (croppedAreaPixels) {
                const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
                onSave(croppedImage);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Edit Image</DialogTitle>
                </DialogHeader>

                <div className="relative flex-1 bg-zinc-900 w-full min-h-[400px]">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        rotation={rotation}
                        zoom={zoom}
                        aspect={370 / 320} // Optional: Enforce LINE Sticker aspect ratio if desired, or let free? 
                        // LINE stickers just need to fit IN 370x320. 
                        // Let's NOT enforce aspect ratio by default so users can free crop, 
                        // but the subsequent resize will handle fitting it.
                        // Actually, maybe free crop is better. 
                        // If I set aspect, it forces a shape. 
                        // Let's allow free crop.
                        // aspect={1} 
                        onCropChange={setCrop}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        objectFit="contain" // ensure seeing full image
                    />
                </div>

                <div className="p-6 bg-background space-y-6">
                    <div className="flex gap-6 items-center">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <ZoomIn className="w-4 h-4" /> Zoom
                            </label>
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.1}
                                onValueChange={(v: number[]) => setZoom(v[0])}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <RotateCw className="w-4 h-4" /> Rotation
                            </label>
                            <Slider
                                value={[rotation]}
                                min={0}
                                max={360}
                                step={1}
                                onValueChange={(v: number[]) => setRotation(v[0])}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Apply & Save</Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
