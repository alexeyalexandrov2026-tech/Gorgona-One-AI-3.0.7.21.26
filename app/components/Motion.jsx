"use client";

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, useInView } from 'framer-motion';

const easeLux = [0.22, 1, 0.36, 1];

// Fade + rise into view once, on scroll.
export function Reveal({ children, delay = 0, y = 28, className, as = 'div' }) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: easeLux, delay }}
    >
      {children}
    </MotionTag>
  );
}

// Container that staggers its <StaggerItem> children as they enter.
export function Stagger({ children, className, gap = 0.08, as = 'div' }) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap } }
      }}
    >
      {children}
    </MotionTag>
  );
}

export function StaggerItem({ children, className, y = 26, as = 'div' }) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeLux } }
      }}
    >
      {children}
    </MotionTag>
  );
}

// Vertical parallax drift tied to scroll position.
export function Parallax({ children, className, distance = 60 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  return (
    <motion.div ref={ref} className={className} style={reduce ? { position: 'relative' } : { position: 'relative', y }}>
      {children}
    </motion.div>
  );
}

// A word/line that rises up from a mask. Uses useInView (not whileInView)
// so it fires reliably even when the element is already on screen at mount —
// e.g. a hero headline above the fold.
export function RiseMask({ children, className, delay = 0 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' });
  return (
    <span ref={ref} className={`block overflow-hidden ${className || ''}`}>
      <motion.span
        className="block"
        initial={reduce ? false : { y: '110%' }}
        animate={reduce ? undefined : { y: inView ? '0%' : '110%' }}
        transition={{ duration: 0.9, ease: easeLux, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}
