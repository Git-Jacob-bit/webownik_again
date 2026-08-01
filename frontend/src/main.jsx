import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { ConfirmDialogProvider } from './context/ConfirmDialogContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <ConfirmDialogProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConfirmDialogProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
