import React from 'react';

interface TextMarqueeProps {
  items: string[];
  speed?: number;
  direction?: 'left' | 'right';
  separator?: string;
  className?: string;
}

export const TextMarquee: React.FC<TextMarqueeProps> = ({
  items,
  speed = 30,
  direction = 'left',
  separator = '|',
  className = '',
}) => {
  // Repeat items enough times to fill wide screens and ensure seamless CSS loop
  const repeatedItems = Array(8).fill(items).flat();
  const duration = speed > 0 ? 900 / speed : 0;
  const animationDirection = direction === 'right' ? 'reverse' : 'normal';

  return (
    <div className={`overflow-hidden whitespace-nowrap relative ${className}`}>
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="inline-flex items-center will-change-transform"
        style={{
          animation: duration > 0 ? `marquee-scroll ${duration}s linear infinite` : 'none',
          animationDirection,
        }}
      >
        {repeatedItems.map((item, idx) => (
          <span key={idx} className="inline-flex items-center shrink-0">
            <span className="text-xs md:text-sm font-medium tracking-wide text-white/90 px-1">
              {item}
            </span>
            <span className="mx-3 text-[#dbee2c] opacity-80 select-none">{separator}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default TextMarquee;