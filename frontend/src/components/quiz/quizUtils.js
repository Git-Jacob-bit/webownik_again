// Wspólne drobiazgi quizu.
export const formatTime = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const answerLetter = index => String.fromCharCode(65 + index);
