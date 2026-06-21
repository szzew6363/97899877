import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   MODAL SHELL — Unified full-screen modal container
   Matches ProviderSettingsModal dimensions exactly:
   - fixed inset-0 z-50
   - w-full h-full bg-[#080808] flex flex-col overflow-hidden
   - Header: px-5 py-3.5, border-b border-[#1a1a1a]
   - Icon: w-9 h-9 rounded-xl bg-primary/10 border border-primary/20
   - Content: flex-1 overflow-y-auto
══════════════════════════════════════════════════════════════════════ */

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  zIndex?: number;
}

export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  icon,
  iconColor = "#e21227",
  children,
  headerRight,
  zIndex = 50,
}: ModalShellProps) {
  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="modal-shell"
          className="fixed inset-0 flex flex-col overflow-hidden"
          style={{ zIndex, background: "#080808" }}
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Top accent line */}
          <div
            className="absolute inset-x-0 top-0 h-px pointer-events-none z-10"
            style={{ background: `linear-gradient(90deg, transparent, ${iconColor}, rgba(255,255,255,0.3), ${iconColor}, transparent)` }}
          />

          {/* Inner container — matches ProviderSettingsModal exactly */}
          <div className="relative w-full h-full bg-[#080808] flex flex-col overflow-hidden">
            {/* Top glow */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a1a] shrink-0">
              <div className="flex items-center gap-3">
                {/* Icon — w-9 h-9 matches ProviderSettingsModal */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    background: `${iconColor}18`,
                    borderColor: `${iconColor}30`,
                  }}
                >
                  {icon}
                </div>
                <div>
                  <h2 className="text-[15px] font-black text-foreground">{title}</h2>
                  {subtitle && (
                    <p className="text-[10px] text-muted-foreground font-mono">{subtitle}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {headerRight}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Content — flex-1 overflow-y-auto matches ProviderSettingsModal ── */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>

            {/* Bottom glow */}
            <div
              className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
              style={{ background: `linear-gradient(90deg, transparent, ${iconColor}60, transparent)` }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODAL SHELL SECTION — For tab-based modals
   Provides the section content wrapper with consistent padding/spacing
══════════════════════════════════════════════════════════════════════ */
interface ModalShellSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalShellSection({ children, className = "" }: ModalShellSectionProps) {
  return (
    <div className={`p-4 space-y-3 ${className}`}>
      {children}
    </div>
  );
}
