import React from 'react';
import { motion } from 'framer-motion';

const animations = {
  initial: { 
    opacity: 0, 
    y: 40,             // Przesunięcie w dół (element nadchodzi z dołu)
    scale: 0.98        // Minimalnie mniejszy
  },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1 
  },
  exit: { 
    opacity: 0, 
    y: -20,            // Przy wyjściu lekko ucieka do góry
    scale: 0.98,
    transition: { duration: 0.2 } // Wyjście musi być szybsze niż wejście
  }
};

const AnimatedPage = ({ children }) => {
  return (
    <motion.div
      variants={animations}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ 
        type: "spring",     // Używamy fizyki, a nie czasu!
        stiffness: 100,     // Sztywność sprężyny (mniejsza = bardziej miękko)
        damping: 20,        // Tłumienie (żeby nie latało jak galareta)
        mass: 1             // Masa elementu
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPage;