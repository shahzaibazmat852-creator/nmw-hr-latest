// Ultra-smooth animation variants and configurations for 60fps performance
import { Variants, Transition } from "framer-motion";

// Spring physics for buttery-smooth animations
export const spring = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8,
} as const;

export const smoothSpring = {
  type: "spring",
  stiffness: 200,
  damping: 25,
  mass: 0.5,
} as const;

export const gentleSpring = {
  type: "spring",
  stiffness: 150,
  damping: 20,
  mass: 0.6,
} as const;

// Smooth easing curve
export const smoothEase = [0.4, 0, 0.2, 1] as const;

// Page transitions
export const pageVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.98,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: smoothEase,
    },
  },
  exit: { 
    opacity: 0, 
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: smoothEase,
    },
  },
};

// Card animations
export const cardVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.95,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: smoothSpring,
  },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      duration: 0.2,
      ease: smoothEase,
    },
  },
};

// Grid item stagger
export const containerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

export const itemVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.95,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: smoothEase,
    },
  },
};

// Fade animations
export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: smoothEase,
    },
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: smoothEase,
    },
  },
};

// Slide animations
export const slideUpVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 30,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: gentleSpring,
  },
};

export const slideLeftVariants: Variants = {
  initial: { 
    opacity: 0, 
    x: 30,
  },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: gentleSpring,
  },
};

// Dialog animations
export const dialogVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: smoothEase,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2,
      ease: smoothEase,
    },
  },
};

// List item animations
export const listItemVariants: Variants = {
  initial: { 
    opacity: 0, 
    x: -20,
  },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.35,
      ease: smoothEase,
    },
  },
};

// Hover tap configs
export const buttonTap = {
  scale: 0.95,
  transition: {
    duration: 0.1,
    ease: smoothEase,
  },
};

export const cardTap = {
  scale: 0.98,
  transition: {
    duration: 0.15,
    ease: smoothEase,
  },
};

// Stagger configuration
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const fastStaggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.05,
    },
  },
};

// Utility functions
export const createStaggerVariants = (delay: number = 0.05): Variants => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: delay,
    },
  },
});

export const createFadeInUp = (duration: number = 0.4): Variants => ({
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration,
      ease: smoothEase,
    },
  },
});

