/**
 * Ultra-smooth animation utilities
 * Optimized for 60fps performance with hardware acceleration
 */

import { Variants, Transition } from "framer-motion";

/**
 * Smooth easing curves for ultra-smooth animations
 */
export const easing = {
  smooth: [0.4, 0.0, 0.2, 1] as [number, number, number, number],
  smoother: [0.6, -0.05, 0.01, 0.99] as [number, number, number, number],
  bounce: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
  elastic: [0.68, -0.6, 0.32, 1.6] as [number, number, number, number],
};

/**
 * Ultra-fast transitions for instant feedback
 */
export const transitions: Record<string, Transition> = {
  ultra: {
    duration: 0.15,
    ease: easing.smooth,
  },
  fast: {
    duration: 0.2,
    ease: easing.smooth,
  },
  normal: {
    duration: 0.3,
    ease: easing.smooth,
  },
  smooth: {
    duration: 0.4,
    ease: easing.smoother,
  },
  slow: {
    duration: 0.6,
    ease: easing.smoother,
  },
  spring: {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },
};

/**
 * Fade in animation - Ultra smooth
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.ultra,
  },
};

/**
 * Slide in from bottom - Ultra smooth
 */
export const slideInBottom: Variants = {
  hidden: { 
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.fast,
  },
};

/**
 * Slide in from top - Ultra smooth
 */
export const slideInTop: Variants = {
  hidden: { 
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.fast,
  },
};

/**
 * Slide in from left - Ultra smooth
 */
export const slideInLeft: Variants = {
  hidden: { 
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.fast,
  },
};

/**
 * Slide in from right - Ultra smooth
 */
export const slideInRight: Variants = {
  hidden: { 
    opacity: 0,
    x: 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.fast,
  },
};

/**
 * Scale in - Ultra smooth
 */
export const scaleIn: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.fast,
  },
};

/**
 * Scale up on hover - Ultra smooth
 */
export const scaleUp: Variants = {
  rest: {
    scale: 1,
    transition: transitions.ultra,
  },
  hover: {
    scale: 1.05,
    transition: transitions.ultra,
  },
};

/**
 * Stagger animation for lists - Ultra smooth
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.fast,
  },
};

/**
 * Card hover animation - Ultra smooth
 */
export const cardHover: Variants = {
  rest: {
    y: 0,
    transition: transitions.ultra,
  },
  hover: {
    y: -4,
    transition: transitions.ultra,
  },
};

/**
 * Button press animation - Ultra smooth
 */
export const buttonPress: Variants = {
  rest: {
    scale: 1,
    transition: transitions.ultra,
  },
  press: {
    scale: 0.95,
    transition: transitions.ultra,
  },
};

/**
 * Shimmer animation for loading states
 */
export const shimmer: Variants = {
  hidden: {
    opacity: 0.3,
  },
  visible: {
    opacity: [0.3, 0.6, 0.3],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Rotate animation - Ultra smooth
 */
export const rotate: Variants = {
  rest: {
    rotate: 0,
    transition: transitions.ultra,
  },
  rotate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: "linear",
      repeat: Infinity,
    },
  },
};

/**
 * Page transition - Ultra smooth
 */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: transitions.fast,
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: transitions.ultra,
  },
};

/**
 * Modal enter - Ultra smooth
 */
export const modalEnter: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.smooth,
  },
};

/**
 * Drawer enter - Ultra smooth
 */
export const drawerEnter: Variants = {
  hidden: {
    x: "100%",
  },
  visible: {
    x: 0,
    transition: transitions.smooth,
  },
};

/**
 * Accordion expand - Ultra smooth
 */
export const accordionExpand: Variants = {
  collapsed: { 
    height: 0,
    opacity: 0,
    transition: transitions.fast,
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: transitions.smooth,
  },
};

/**
 * Notification slide in - Ultra smooth
 */
export const notificationSlide: Variants = {
  hidden: {
    x: 400,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: transitions.smooth,
  },
  exit: {
    x: 400,
    opacity: 0,
    transition: transitions.ultra,
  },
};

/**
 * Helper function to apply will-change for GPU acceleration
 */
export const applyGPUAcceleration = (element: HTMLElement, properties: string[] = ["transform", "opacity"]) => {
  properties.forEach(prop => {
    element.style.setProperty("will-change", prop);
  });
  
  // Cleanup after animation
  setTimeout(() => {
    properties.forEach(prop => {
      element.style.removeProperty("will-change");
    });
  }, 500);
};

/**
 * Prefers reduced motion check
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Get animation variants based on user preference
 */
export const getAnimationVariant = <T extends Variants>(variants: T): T => {
  if (prefersReducedMotion()) {
    // Return simplified animations for reduced motion
    const simplified: any = {};
    Object.keys(variants).forEach(key => {
      simplified[key] = {
        ...variants[key],
        transition: { duration: 0, ease: "linear" },
      };
    });
    return simplified as T;
  }
  return variants;
};

