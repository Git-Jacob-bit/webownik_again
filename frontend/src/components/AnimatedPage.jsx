import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Krótkie, ciche wejście strony. Przy ograniczonym ruchu – sama zmiana przezroczystości.
const AnimatedPage = ({ children }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPage;
