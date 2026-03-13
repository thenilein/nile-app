import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MobileSheet — unified bottom sheet primitive.
 *
 * Handles:
 *  • Spring entry / exit animation (y: 100% → 0)
 *  • Bakcdrop with blur that dismisses on tap
 *  • Drag-to-close gesture (100 px threshold)
 *  • Body scroll-lock while open
 *  • iPhone safe-area-inset-bottom padding
 *  • Centered max-width on md+ screens (like a modal)
 *
 * Children are responsible for their own drag-handle pip and header.
 */

interface MobileSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    /** Set true on success/confirmation steps so the sheet cannot be swiped away */
    disableDrag?: boolean;
    /** Override max-height. Defaults to 90dvh */
    maxHeight?: string;
}

const MobileSheet: React.FC<MobileSheetProps> = ({
    isOpen,
    onClose,
    children,
    disableDrag = false,
    maxHeight = '90dvh',
}) => {
    // ── Body scroll lock ──────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* ── Backdrop ── */}
                    <motion.div
                        key="ms-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        onClick={onClose}
                        aria-hidden="true"
                        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[3px]"
                    />

                    {/* ── Sheet panel ── */}
                    <motion.div
                        key="ms-sheet"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        drag={disableDrag ? false : 'y'}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.05}
                        onDragEnd={(_, info) => {
                            if (!disableDrag && info.offset.y > 100) onClose();
                        }}
                        className={[
                            'fixed bottom-0 z-[91] bg-white rounded-t-[24px] shadow-2xl',
                            'flex flex-col overflow-hidden',
                            // Full-width on mobile; centered at 520 px on md+
                            'left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-[520px]',
                        ].join(' ')}
                        style={{
                            maxHeight,
                            paddingBottom: 'env(safe-area-inset-bottom)',
                            touchAction: disableDrag ? 'auto' : 'none',
                        }}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MobileSheet;
