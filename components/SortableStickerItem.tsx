"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Wand2 } from "lucide-react";
import { ProcessedImage } from "@/lib/image-processing";

interface SortableStickerItemProps {
    img: ProcessedImage;
    onRemove: (id: string) => void;
    onInteract?: (id: string) => void;
}

export function SortableStickerItem({ img, onRemove, onInteract }: SortableStickerItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: img.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
            <Card className="overflow-hidden group relative hover:shadow-md transition-all">
                <div
                    className="aspect-[370/320] relative flex items-center justify-center p-4 cursor-grab active:cursor-grabbing bg-[url('https://media.istockphoto.com/id/1133178263/vector/checkered-geometric-vector-background-chequered-pattern.jpg?s=612x612&w=0&k=20&c=pGW5Fq9K_m102E-4w0O9cAzUvM75j4cE9tM6X2L6q4k=')] bg-contain"
                    onClick={(e) => {
                        // If interacting with buttons, don't trigger drag? 
                        // Actually onClick on div propagates.
                        // But for edit/remove we stop propagation.
                    }}
                >
                    <img
                        src={img.processed}
                        alt="Sticker"
                        className="w-full h-full object-contain pointer-events-none"
                    />

                    {/* Buttons should block drag */}
                    <div
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 shadow-sm"
                            onClick={() => onRemove(img.id)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>

                    <div
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Edit Button */}
                        {onInteract && (
                            <Button
                                size="icon"
                                className="h-8 w-8 bg-white text-zinc-900 border hover:bg-zinc-100 shadow-sm"
                                onClick={() => onInteract(img.id)}
                            >
                                <Wand2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    <div className="absolute bottom-1 right-2 text-[10px] text-zinc-400 font-mono bg-black/50 px-1.5 rounded">
                        {img.fileName}
                    </div>
                </div>
            </Card>
        </div>
    );
}
