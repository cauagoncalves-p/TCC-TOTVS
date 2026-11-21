import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

export interface FloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  id?: string;
  ariaLabel?: string;
  role?: string;
  className?: string;
  desktopWidth?: number | string;
}

interface Coords {
  top: number;
  right: number | 'auto';
  left: number | 'auto';
  width: number | string | 'auto';
  maxHeight: number;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  isOpen,
  onClose,
  anchorRef,
  children,
  id,
  ariaLabel,
  role = 'region',
  className,
  desktopWidth = '24rem'
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords>({
    top: 64,
    right: 8,
    left: 'auto',
    width: 'auto',
    maxHeight: 400
  });

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const top = Math.round(rect.bottom + 8);
    const maxHeight = Math.max(160, window.innerHeight - top - 16);

    if (isMobile) {
      setCoords({
        top,
        left: 8,
        right: 8,
        width: 'auto',
        maxHeight
      });
    } else {
      const right = Math.max(8, Math.round(window.innerWidth - rect.right));
      setCoords({
        top,
        left: 'auto',
        right,
        width: desktopWidth,
        maxHeight
      });
    }
  }, [anchorRef, desktopWidth]);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        anchorRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef, updatePosition]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        ...(coords.left === 'auto' ? {} : { left: `${coords.left}px` }),
        ...(coords.right === 'auto' ? {} : { right: `${coords.right}px` }),
        width: coords.width === 'auto' ? undefined : (typeof coords.width === 'number' ? `${coords.width}px` : coords.width),
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: `${coords.maxHeight}px`,
        zIndex: 'var(--z-dropdown)'
      }}
      className={cn(
        'bg-bg-elevated text-text-primary border border-border-subtle rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in duration-100',
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
};
