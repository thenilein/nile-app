import React from "react";
import { ChevronRight } from "lucide-react";

type LocationSheetInsetListItem = {
    id: string;
    title: string;
    subtitle?: string;
    onSelect: () => void;
    icon?: React.ReactNode;
};

const ROWS_PER_SLIDE = 3;

function chunkItems<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

function LocationSheetListCard({ items }: { items: LocationSheetInsetListItem[] }) {
    return (
        <div className="h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {items.map((item, index) => (
                <div key={item.id}>
                    {index > 0 ? (
                        <div
                            className="h-px bg-neutral-200"
                            style={{
                                marginLeft: "calc(0.75rem + 2.5rem)",
                                marginRight: "0.75rem",
                            }}
                            aria-hidden
                        />
                    ) : null}
                    <button
                        type="button"
                        onClick={item.onSelect}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 ring-1 ring-neutral-200">
                            {item.icon ?? <span className="size-2 rounded-full bg-neutral-200" aria-hidden />}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-neutral-900">{item.title}</p>
                            {item.subtitle ? (
                                <p className="truncate text-[12px] text-neutral-500">{item.subtitle}</p>
                            ) : null}
                        </div>
                        <span
                            className="flex size-10 shrink-0 items-center justify-center text-[15px] leading-none text-neutral-400"
                            aria-hidden
                        >
                            ···
                        </span>
                    </button>
                </div>
            ))}
        </div>
    );
}

/**
 * Section header + one or more rounded cards in a horizontal row (snap scroll when >1 slide).
 * Each slide holds up to `rowsPerSlide` rows; icons optional per row.
 */
export const LocationSheetInsetList: React.FC<{
    heading: string;
    items: LocationSheetInsetListItem[];
    rowsPerSlide?: number;
}> = ({ heading, items, rowsPerSlide = ROWS_PER_SLIDE }) => {
    if (items.length === 0) return null;

    const chunks = chunkItems(items, rowsPerSlide);
    const carousel = chunks.length > 1;

    return (
        <div className="mt-6 min-w-0">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    {heading}
                </span>
                <ChevronRight className="size-4 shrink-0 text-neutral-400" strokeWidth={2} aria-hidden />
            </div>
            {carousel ? (
                <div className="-mx-1 flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible pb-1 ps-1 pe-1 [scrollbar-width:thin]">
                    {chunks.map((chunk, slideIndex) => (
                        <div
                            key={slideIndex}
                            className="min-w-0 shrink-0 snap-center snap-always"
                            style={{ flex: "0 0 calc(100% - 0.75rem)" }}
                        >
                            <LocationSheetListCard items={chunk} />
                        </div>
                    ))}
                </div>
            ) : (
                <LocationSheetListCard items={chunks[0]} />
            )}
        </div>
    );
};
