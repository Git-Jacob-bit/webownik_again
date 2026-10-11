import { toast } from 'react-toastify';

// Snackbar tylko dla szybkich akcji na listach (dodano, usunięto, zapisano).
// Błędy formularzy i sukcesy z przekierowaniem pokazujemy przez <Alert> w miejscu akcji.
const show = (message, options = {}) => toast(message, { className: 'slip', ...options });

export const notify = {
  success: message => show(message),
  info: message => show(message),
  error: message => show(message, { autoClose: 5000, role: 'alert' }),
};

export default notify;
