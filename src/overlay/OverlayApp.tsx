import React, { useEffect, useState, useRef, useCallback } from 'react';
import './overlay.css';
import type { HighlightData } from '../types';

const HIGHLIGHT_TIMEOUT = 10000; // 10 seconds

export const OverlayApp: React.FC = () => {
  const [highlight, setHighlight] = useState<HighlightData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearHighlightWithFade = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => setHighlight(null), 300);
  }, []);

  useEffect(() => {
    const handleShowHighlight = (_event: unknown, data: HighlightData) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      setHighlight(data);
      setIsVisible(true);
      
      timeoutRef.current = setTimeout(() => {
        clearHighlightWithFade();
      }, HIGHLIGHT_TIMEOUT);
    };

    const handleClearHighlight = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      clearHighlightWithFade();
    };

    // Use window.electronAPI to access IPC
    const api = (globalThis as any).electronAPI;
    if (api?.onShowHighlight && api?.onClearHighlight) {
      api.onShowHighlight(handleShowHighlight);
      api.onClearHighlight(handleClearHighlight);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Clean up IPC listeners to prevent memory leaks
      if (api?.offShowHighlight && api?.offClearHighlight) {
        api.offShowHighlight(handleShowHighlight);
        api.offClearHighlight(handleClearHighlight);
      }
    };
  }, [clearHighlightWithFade]);

  if (!highlight) {
    return null;
  }

  // Position label below element with left padding
  const labelY = highlight.y + highlight.height + 16;

  return (
    <div className={`overlay-container ${isVisible ? 'visible' : ''}`}>
      {/* Simple dark label */}
      <div
        className="highlight-label"
        style={{
          left: '16px',
          top: `${labelY}px`,
        }}
      >
        <span className="highlight-label-text">{highlight.instruction}</span>
      </div>
    </div>
  );
};
