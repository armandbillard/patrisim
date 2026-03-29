// src/components/PageTransition.tsx
import { useEffect, useState } from 'react'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
    }}>
      {children}
    </div>
  )
}