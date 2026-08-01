import React from 'react';


const InlineMessage = ({ message = '', type = 'error' }) => {
  const success = type === 'success';

  return (
    <div className="h-14 mb-3" aria-live="polite" aria-atomic="true">
      <div
        className={`h-full px-3 py-2 rounded-lg border text-xs sm:text-sm leading-tight text-center flex items-center justify-center overflow-hidden transition-opacity duration-150 ${
          message ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${
          success
            ? 'bg-green-500/10 border-green-500/50 text-green-200'
            : 'bg-red-500/10 border-red-500/50 text-red-200'
        }`}
        role={message ? (success ? 'status' : 'alert') : undefined}
      >
        {message || '\u00a0'}
      </div>
    </div>
  );
};

export default InlineMessage;
