// src/App.tsx — VERSION FINALE avec toutes les routes + ScrollToTop + animations

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ScrollToTop from './components/ScrollToTop'
import PageTransition from './components/PageTransition'
import Landing from './pages/Landing'
import Bloc0 from './pages/Bloc0'
import Bloc1 from './pages/Bloc1'
import Bloc2 from './pages/Bloc2'
import Bloc3 from './pages/Bloc3'
import Bloc4 from './pages/Bloc4'
import Bloc5 from './pages/Bloc5'
import Bloc6 from './pages/Bloc6'
import Bloc7 from './pages/Bloc7'
import Analyse from './pages/Analyse'
import Dashboard from './pages/Dashboard'
import Demo from './pages/Demo'

// Wrapper avec sidebar + animation
function WithSidebar({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F8F8F6]">
      <Sidebar currentStep={step} />
      <main className="flex-1 ml-[220px]">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Landing */}
        <Route path="/" element={<Landing />} />

        {/* Onboarding — Partie 0 */}
        <Route path="/start" element={
          <PageTransition><Bloc0 /></PageTransition>
        } />

        {/* Blocs 1–7 avec sidebar */}
        <Route path="/bloc1" element={<WithSidebar step={1}><Bloc1 /></WithSidebar>} />
        <Route path="/bloc2" element={<WithSidebar step={2}><Bloc2 /></WithSidebar>} />
        <Route path="/bloc3" element={<WithSidebar step={3}><Bloc3 /></WithSidebar>} />
        <Route path="/bloc4" element={<WithSidebar step={4}><Bloc4 /></WithSidebar>} />
        <Route path="/bloc5" element={<WithSidebar step={5}><Bloc5 /></WithSidebar>} />
        <Route path="/bloc6" element={<WithSidebar step={6}><Bloc6 /></WithSidebar>} />
        <Route path="/bloc7" element={<WithSidebar step={7}><Bloc7 /></WithSidebar>} />

        {/* Demo */}
        <Route path="/demo" element={
          <PageTransition><Demo /></PageTransition>
        } />

        {/* Analyse IA */}
        <Route path="/analyse" element={
          <PageTransition><Analyse /></PageTransition>
        } />

        {/* Dashboard */}
        <Route path="/dashboard/*" element={<Dashboard />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}