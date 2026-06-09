import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface FullPageOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function FullPageOverlay({ open, onClose, children, className = "" }: FullPageOverlayProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-[60] flex flex-col overflow-hidden ${className}`}
          style={{ background: "#080808" }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {/* Top scan-line accent */}
          <div className="absolute inset-x-0 top-0 h-px pointer-events-none z-10"
            style={{ background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.8) 30%, rgba(255,255,255,0.4) 50%, rgba(226,18,39,0.8) 70%, transparent)" }} />
          {children}
          {/* Bottom scan-line */}
          <div className="absolute inset-x-0 bottom-0 h-px pointer-events-none z-10"
            style={{ background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.3) 50%, transparent)" }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
