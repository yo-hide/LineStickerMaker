import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableStickerItem } from "./SortableStickerItem";
import { ProcessedImage } from "@/lib/image-processing";
import { Button } from "./ui/button";
import { Download } from "lucide-react";

interface StickerGridProps {
    images: ProcessedImage[];
    onRemove: (id: string) => void;
    onDownloadZip: () => void;
    isExporting: boolean;
    onInteract?: (id: string) => void;
    onReorder?: (newOrder: ProcessedImage[]) => void;
}

export function StickerGrid({
    images,
    onRemove,
    onDownloadZip,
    isExporting,
    onInteract,
    onReorder
}: StickerGridProps) {

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            if (onReorder) {
                const oldIndex = images.findIndex((img) => img.id === active.id);
                const newIndex = images.findIndex((img) => img.id === over.id);
                const newOrder = arrayMove(images, oldIndex, newIndex);
                onReorder(newOrder);
            }
        }
    };

    if (images.length === 0) return null;

    return (
        <div className="space-y-6 w-full">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold dark:text-white">
                    Generated Stickers ({images.length})
                </h2>

                {images.length > 0 && (
                    <Button onClick={onDownloadZip} disabled={isExporting} className="gap-2">
                        <Download className="w-4 h-4" />
                        {isExporting ? "Zipping..." : "Download ZIP"}
                    </Button>
                )}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={images.map(img => img.id)}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((img) => (
                            <SortableStickerItem
                                key={img.id}
                                img={img}
                                onRemove={onRemove}
                                onInteract={onInteract}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
