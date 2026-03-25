import { useNavigate, useLocation } from 'react-router-dom'

interface SidebarProps {
  currentStep: number
}

const steps = [
  { num: 1, label: 'Profil civil', path: '/bloc1' },
  { num: 2, label: 'Actif patrimonial', path: '/bloc2' },
  { num: 3, label: 'Passif & dettes', path: '/bloc3' },
  { num: 4, label: 'Flux & fiscalité', path: '/bloc4' },
  { num: 5, label: 'Projets & retraite', path: '/bloc5' },
  { num: 6, label: 'Profil investisseur', path: '/bloc6' },
  { num: 7, label: 'Succession', path: '/bloc7' },
]

export default function Sidebar({ currentStep }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-white border-r border-black/10 flex flex-col py-6 px-4">
      <div className="text-[16px] font-medium mb-8">
        Patri<span className="text-[#185FA5]">Sim</span>
      </div>

      <nav className="flex flex-col gap-1">
        {steps.map((step) => {
          const isActive = location.pathname === step.path
          const isDone = step.num < currentStep

          return (
            <button
              key={step.num}
              onClick={() => navigate(step.path)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-left transition-colors ${
                isActive
                  ? 'bg-[#E6F1FB] text-[#0C447C] font-medium'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 border ${
                  isActive
                    ? 'bg-[#185FA5] border-[#185FA5] text-white'
                    : isDone
                    ? 'bg-[#3B6D11] border-[#3B6D11] text-white'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                {isDone ? '✓' : step.num}
              </span>
              {step.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto">
        <div className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
          Données chiffrées · Sécurisé
        </div>
      </div>
    </aside>
  )
}
