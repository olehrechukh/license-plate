import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import AppGate from './components/AppGate.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { FeedProvider } from './data/FeedContext.jsx'
import { injectSpeedInsights } from '@vercel/speed-insights'
import './styles/theme.css'
import './styles/app.css'

injectSpeedInsights()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <FeedProvider>
            <AppGate>
              <App />
            </AppGate>
          </FeedProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
)
