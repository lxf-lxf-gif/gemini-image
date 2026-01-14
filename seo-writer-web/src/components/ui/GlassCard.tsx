import React from 'react';
import { motion, type HTMLMotionProps, type MotionStyle } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  variant?: 'card' | 'panel';
  noPadding?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, variant = 'card', noPadding = false, style, className, ...props }) => {
  const baseStyle: MotionStyle = {
    background: variant === 'panel' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: variant === 'panel' ? '24px' : '16px',
    padding: noPadding ? 0 : (variant === 'panel' ? '24px' : '16px'),
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    ...(style as MotionStyle)
  };

  return (
    <motion.div style={baseStyle} className={className} {...props}>
      {children}
    </motion.div>
  );
};

export default GlassCard;
