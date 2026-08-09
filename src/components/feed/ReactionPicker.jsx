import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ThumbsUp, Heart, Smile } from 'lucide-react';
import { V } from '../../utils/design-system.js';

const REACTIONS = [
  { key: 'like', icon: ThumbsUp, label: 'Like', color: '#3B82F6' },
  { key: 'love', icon: Heart,    label: 'Love', color: '#EF4444' },
  { key: 'haha', icon: Smile,    label: 'Haha', color: '#F59E0B' },
];

export default function ReactionPicker({ onSelect, onClose }) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const pickerRef = useRef(null);

  const handleSelect = useCallback((reaction) => {
    onSelect(reaction);
    onClose();
  }, [onSelect, onClose]);

  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('touchstart', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      style={{
        display: 'flex',
        gap: '6px',
        padding: '8px 12px',
        borderRadius: '16px',
        background: '#FFFFFF',
        boxShadow: '0 4px 24px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.08)',
        animation: 'pickerIn 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
      }}
    >
      {REACTIONS.map((item, i) => {
        const Icon = item.icon;
        const active = activeIndex === i;
        return (
          <div
            key={item.key}
            onClick={() => handleSelect(item.key)}
            onMouseEnter={() => setActiveIndex(i)}
            onTouchStart={() => setActiveIndex(i)}
            onTouchEnd={() => handleSelect(item.key)}
            title={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: active ? '42px' : '38px',
              height: active ? '42px' : '38px',
              borderRadius: '50%',
              cursor: 'pointer',
              transition: 'all 140ms cubic-bezier(0.16, 1, 0.3, 1)',
              transform: active ? 'translateY(-4px) scale(1.12)' : 'translateY(0) scale(1)',
              background: active ? `${item.color}15` : 'transparent',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon
              size={active ? 20 : 18}
              color={item.color}
              fill={active ? item.color : 'transparent'}
              strokeWidth={2}
              style={{
                transition: 'all 140ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// Inject pickerIn animation
if (typeof document !== 'undefined' && !document.getElementById('vio-picker-style')) {
  const style = document.createElement('style');
  style.id = 'vio-picker-style';
  style.textContent = `
    @keyframes pickerIn {
      from { opacity: 0; transform: translateY(6px) scale(0.92); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
}
