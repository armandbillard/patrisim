import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Bloc1 from './pages/Bloc1'
import Landing from './pages/Landing'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/bloc1"
          element={
            <div className="flex min-h-screen bg-[#F8F8F6]">
              <Sidebar currentStep={1} />
              <main className="flex-1 ml-[220px]">
                <Bloc1 />
              </main>
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App