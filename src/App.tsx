import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Landing from './pages/Landing'
import Bloc1 from './pages/Bloc1'
import Bloc2 from './pages/Bloc2'
import Bloc3 from './pages/Bloc3'
import Bloc4 from './pages/Bloc4'
import Bloc5 from './pages/Bloc5'
import Bloc6 from './pages/Bloc6'
import Bloc7 from './pages/Bloc7'
import Analyse from './pages/Analyse'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {[1,2,3,4,5,6,7].map(n => (
          <Route key={n} path={`/bloc${n}`} element={
            <div className="flex min-h-screen bg-[#F8F8F6]">
              <Sidebar currentStep={n} />
              <main className="flex-1 ml-[220px]">
                {n===1 && <Bloc1 />}
                {n===2 && <Bloc2 />}
                {n===3 && <Bloc3 />}
                {n===4 && <Bloc4 />}
                {n===5 && <Bloc5 />}
                {n===6 && <Bloc6 />}
                {n===7 && <Bloc7 />}
              </main>
            </div>
          } />
        ))}

        <Route path="/analyse" element={<Analyse />} />
        <Route path="/dashboard/*" element={<Dashboard />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App