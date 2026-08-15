'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function AnimatedFlame({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background Soft Pulse Glow */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.35, 0.7, 0.35],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-full bg-cyan-400/40 blur-md pointer-events-none"
      />

      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
      >
        <defs>
          {/* Main Body Gradient: Electric Cyan to Vivid Azure Blue */}
          <linearGradient id="flameOuterGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Inner Core Gradient: Ultra-bright Neon White-Cyan */}
          <linearGradient id="flameInnerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="60%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* Outer Flame (Swaying and Breathing) */}
        <motion.path
          d="M12 2C10.5 4.5 9 6.5 9 9C9 10.2 9.4 11.2 10 12C8.5 12 7 13.5 7 15.5C7 18.5 9.2 21 12 21C14.8 21 17 18.5 17 15.5C17 13.8 16 12 14.5 11.2C15.2 9.8 15 8 14 6.5C13.2 5.3 12.5 3.5 12 2Z"
          fill="url(#flameOuterGrad)"
          animate={{
            d: [
              "M12 2C10.5 4.5 9 6.5 9 9C9 10.2 9.4 11.2 10 12C8.5 12 7 13.5 7 15.5C7 18.5 9.2 21 12 21C14.8 21 17 18.5 17 15.5C17 13.8 16 12 14.5 11.2C15.2 9.8 15 8 14 6.5C13.2 5.3 12.5 3.5 12 2Z",
              "M12.2 1.8C10.2 4.2 8.7 6.8 8.8 9.2C8.8 10.4 9.6 11.4 10.2 12.1C8.2 12.2 6.8 13.8 6.8 15.8C6.8 18.8 9.2 21.2 12 21.2C14.8 21.2 17.2 18.8 17.2 15.8C17.2 13.5 15.8 11.8 14.8 10.8C15.5 9.2 15.1 7.5 13.8 6.2C13 4.9 12.6 3.2 12.2 1.8Z",
              "M11.8 2.2C10.8 4.7 9.2 6.3 9.2 8.8C9.2 10 9.2 11 9.8 11.8C8.6 11.9 7.2 13.3 7.2 15.3C7.2 18.3 9.2 20.8 12 20.8C14.8 20.8 16.8 18.3 16.8 15.3C16.8 14 16.2 12.3 14.2 11.5C14.8 10.2 14.8 8.4 14.2 7C13.5 5.6 12.4 3.8 11.8 2.2Z",
              "M12 2C10.5 4.5 9 6.5 9 9C9 10.2 9.4 11.2 10 12C8.5 12 7 13.5 7 15.5C7 18.5 9.2 21 12 21C14.8 21 17 18.5 17 15.5C17 13.8 16 12 14.5 11.2C15.2 9.8 15 8 14 6.5C13.2 5.3 12.5 3.5 12 2Z",
            ],
            scaleY: [1, 1.06, 0.96, 1],
            scaleX: [1, 0.97, 1.04, 1],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "bottom center" }}
        />

        {/* Inner Flame Core (Intense High-Speed Flickering) */}
        <motion.path
          d="M12 9C11 11 10 12.5 10 14.5C10 16.5 10.9 18 12 18C13.1 18 14 16.5 14 14.5C14 13 13.3 11.5 12.5 10.5C12.3 10 12.1 9.4 12 9Z"
          fill="url(#flameInnerGrad)"
          animate={{
            d: [
              "M12 9C11 11 10 12.5 10 14.5C10 16.5 10.9 18 12 18C13.1 18 14 16.5 14 14.5C14 13 13.3 11.5 12.5 10.5C12.3 10 12.1 9.4 12 9Z",
              "M12.1 8.5C10.8 10.8 9.8 12.8 9.8 14.8C9.8 16.8 10.9 18.2 12 18.2C13.1 18.2 14.2 16.8 14.2 14.8C14.2 12.8 13.5 11 12.8 9.8C12.5 9.2 12.3 8.8 12.1 8.5Z",
              "M11.9 9.3C11.2 11.2 10.2 12.3 10.2 14.3C10.2 16.3 10.9 17.8 12 17.8C13.1 17.8 13.8 16.3 13.8 14.3C13.8 13.2 13.1 11.8 12.3 10.9C12.1 10.4 12 9.8 11.9 9.3Z",
              "M12 9C11 11 10 12.5 10 14.5C10 16.5 10.9 18 12 18C13.1 18 14 16.5 14 14.5C14 13 13.3 11.5 12.5 10.5C12.3 10 12.1 9.4 12 9Z",
            ],
            opacity: [0.95, 1, 0.85, 0.95],
            scaleY: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "bottom center" }}
        />

        {/* Micro Spark 1 (Left rising ember) */}
        <motion.circle
          cx="10"
          cy="11"
          r="0.8"
          fill="#a5f3fc"
          animate={{
            cy: [11, 4, 1],
            cx: [10, 9, 8.5],
            opacity: [0, 1, 0],
            scale: [0.6, 1.2, 0.2],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.2,
          }}
        />

        {/* Micro Spark 2 (Right rising ember) */}
        <motion.circle
          cx="14"
          cy="12"
          r="0.7"
          fill="#e0f2fe"
          animate={{
            cy: [12, 5, 2],
            cx: [14, 15, 15.5],
            opacity: [0, 1, 0],
            scale: [0.5, 1.1, 0.1],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.9,
          }}
        />
      </svg>
    </div>
  );
}
