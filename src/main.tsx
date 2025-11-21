import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/refreshDatacube'
import './utils/runAdmissionsCrmNormalization'

createRoot(document.getElementById("root")!).render(<App />);
