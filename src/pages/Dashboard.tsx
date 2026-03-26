import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Settings, BarChart2, TrendingUp, PieChart, DollarSign, Users, Target, ChevronDown, ChevronRight, AlertTriangle, Info, CheckCircle, RotateCcw } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, PieChart as RPie, Pie, Legend } from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Hypotheses {
  rendement: number
  inflation: number
  immo: number
  croissance: number
  espVie: number
  tauxRetrait: number
  fiscaliteRetraits: number
  // Module retraite
  ageDepartP1: number
  ageDepartP2: number
  pensionP1: number
  pensionP2: number
  revenusCibles: number
  effortSupp: number
  // Module fiscal
  tmi: number
  revImposable: number
  plafondPer: number
  // Module succession
  ageDecesSim: number
  revalPatrimoine: number
  donationsAnnuelles: number
}

interface HypChange { ts: string; desc: string }

const DEFAULT_HYPO: Hypotheses = {
  rendement: 4, inflation: 2, immo: 2, croissance: 1.5,
  espVie: 87, tauxRetrait: 4, fiscaliteRetraits: 17.2,
  ageDepartP1: 63, ageDepartP2: 63, pensionP1: 0, pensionP2: 0,
  revenusCibles: 0, effortSupp: 0,
  tmi: 30, revImposable: 0, plafondPer: 0,
  ageDecesSim: 70, revalPatrimoine: 3, donationsAnnuelles: 0,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T extends object>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); if (!r) return fb; return { ...fb, ...JSON.parse(r) } } catch { return fb }
}
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
const pn = (s: unknown) => { const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n }

function capitalFutur(mensuel: number, taux: number, annees: number): number {
  if (taux === 0) return mensuel * 12 * annees
  const r = taux / 100 / 12; const n = annees * 12
  return mensuel * ((Math.pow(1 + r, n) - 1) / r)
}

function ageActuel(dateStr?: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr), t = new Date()
  let a = t.getFullYear() - d.getFullYear()
  if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--
  return a
}

function droitsSuccession(base: number): number {
  if (base <= 0) return 0
  const tr = [{ s: 8072, t: 0.05 }, { s: 12109, t: 0.10 }, { s: 15932, t: 0.15 }, { s: 552324, t: 0.20 }, { s: 902838, t: 0.30 }, { s: 1805677, t: 0.40 }, { s: Infinity, t: 0.45 }]
  let d = 0, r = base, p = 0
  for (const t of tr) { const sl = Math.min(r, t.s - p); if (sl <= 0) break; d += sl * t.t; r -= sl; p = t.s; if (r <= 0) break }
  return Math.round(d)
}

// ─── Base UI ──────────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color = '' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-[22px] font-bold ${color || 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function InfoCard({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'amber' | 'green' | 'red' }) {
  const s = { blue: 'bg-[#E6F1FB] text-[#0C447C] border-[#185FA5]/20', amber: 'bg-amber-50 text-amber-800 border-amber-200', green: 'bg-[#E1F5EE] text-[#085041] border-[#0F6E56]/20', red: 'bg-red-50 text-red-700 border-red-200' }
  return <div className={`rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${s[color]}`}>{children}</div>
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

function ScoreGauge({ score, size = 'sm' }: { score: number; size?: 'lg' | 'sm' }) {
  const color = score >= 81 ? '#0F6E56' : score >= 66 ? '#185FA5' : score >= 41 ? '#D97706' : '#DC2626'
  const r = size === 'lg' ? 44 : 26
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const sz = size === 'lg' ? 106 : 64
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: sz, height: sz }}>
      <svg width={sz} height={sz} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={size === 'lg' ? 8 : 5} />
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={size === 'lg' ? 8 : 5} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-bold" style={{ color, fontSize: size === 'lg' ? 22 : 13 }}>{score}</span>
        {size === 'lg' && <span className="text-[9px] text-gray-400">/100</span>}
      </div>
    </div>
  )
}

// ─── Hypotheses Panel ─────────────────────────────────────────────────────────

function HypothesesPanel({ hypo, onChange, module, onLog }: {
  hypo: Hypotheses; onChange: (h: Hypotheses) => void
  module: string; onLog: (desc: string) => void
}) {
  const [open, setOpen] = useState(false)
  const isCustom = JSON.stringify(hypo) !== JSON.stringify(DEFAULT_HYPO)

  const set = (k: keyof Hypotheses, v: number) => {
    onLog(`${k} modifié : ${hypo[k]} → ${v} (Module ${module})`)
    onChange({ ...hypo, [k]: v })
  }

  const preset = (mode: 'pessimiste' | 'base' | 'optimiste') => {
    const h = { ...hypo }
    if (mode === 'base') { h.rendement = 4; h.inflation = 2; h.immo = 2 }
    else if (mode === 'pessimiste') { h.rendement = 2.5; h.inflation = 3; h.immo = 1.5 }
    else { h.rendement = 5.5; h.inflation = 1.5; h.immo = 2.5 }
    onLog(`Scénario ${mode} appliqué`)
    onChange(h)
  }

  return (
    <div className="mb-6">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-gray-700 transition-colors">
        <Settings size={14} />
        Hypothèses
        {isCustom && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Personnalisées</span>}
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex gap-2 mb-2">
            {['Pessimiste', 'Base', 'Optimiste'].map(p => (
              <button key={p} type="button" onClick={() => preset(p.toLowerCase() as 'pessimiste' | 'base' | 'optimiste')}
                className="px-3 py-1.5 rounded-lg text-[11px] border border-gray-200 text-gray-600 hover:border-[#185FA5] hover:text-[#185FA5] transition-colors font-medium">
                {p}
              </button>
            ))}
            {isCustom && (
              <button type="button" onClick={() => { onLog('Hypothèses réinitialisées'); onChange(DEFAULT_HYPO) }}
                className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                <RotateCcw size={11} />Réinitialiser
              </button>
            )}
          </div>
          {[
            { k: 'rendement' as const, l: 'Rendement portefeuille', min: 0, max: 12, step: 0.1, suf: '%/an' },
            { k: 'inflation' as const, l: 'Inflation annuelle', min: 0, max: 6, step: 0.1, suf: '%/an' },
            { k: 'immo' as const, l: 'Revalorisation immobilière', min: 0, max: 5, step: 0.1, suf: '%/an' },
            { k: 'croissance' as const, l: 'Croissance des revenus', min: 0, max: 5, step: 0.1, suf: '%/an' },
          ].map(({ k, l, min, max, step, suf }) => (
            <div key={k}>
              <div className="flex justify-between mb-1">
                <span className="text-[12px] text-gray-600">{l}</span>
                <span className="text-[12px] font-semibold text-[#185FA5]">{hypo[k]}{suf}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={hypo[k]}
                onChange={e => set(k, Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MODULE 1 — BILAN ─────────────────────────────────────────────────────────

function ModuleBilan({ hypo, onLog, ai }: { hypo: Hypotheses; onLog: (d: string) => void; ai: Record<string, unknown> | null }) {
  const bloc2 = loadLS<Record<string, unknown>>('patrisim_bloc2', {})
  const bloc3 = loadLS<Record<string, unknown>>('patrisim_bloc3', {})
  const bloc4 = loadLS<Record<string, unknown>>('patrisim_bloc4', {})
  const bloc5 = loadLS<Record<string, unknown>>('patrisim_bloc5', {})
  const bloc6 = loadLS<Record<string, unknown>>('patrisim_bloc6', {})

  const totalImmo = pn((bloc2 as { totalImmo?: number }).totalImmo)
  const totalFin = pn((bloc2 as { totalFinancier?: number }).totalFinancier)
  const totalAutres = pn((bloc2 as { totalAutres?: number }).totalAutres)
  const totalBrut = totalImmo + totalFin + totalAutres
  const creditsImmo = (bloc3 as { creditsImmo?: { crd?: string; mensualiteHA?: string; mensualiteAssurance?: string }[] }).creditsImmo || []
  const creditsConso = (bloc3 as { creditsConso?: { crd?: string; mensualite?: string }[] }).creditsConso || []
  const totalDettes = creditsImmo.reduce((a, c) => a + pn(c.crd), 0) + creditsConso.reduce((a, c) => a + pn(c.crd), 0)
  const totalMens = creditsImmo.reduce((a, c) => a + pn(c.mensualiteHA) + pn(c.mensualiteAssurance), 0) + creditsConso.reduce((a, c) => a + pn(c.mensualite), 0)
  const patrimoineNet = totalBrut - totalDettes
  const tauxEndet = totalBrut > 0 ? Math.round(totalDettes / totalBrut * 100) : 0

  const b4 = bloc4 as { p1Pro?: { salaire?: string }; p2Pro?: { salaire?: string }; mensualitesCredits?: string; assurances?: string; abonnements?: string; fiscal?: { impotNet?: string } }
  const revP1 = pn(b4.p1Pro?.salaire), revP2 = pn(b4.p2Pro?.salaire)
  const charges = pn(b4.mensualitesCredits) + pn(b4.assurances) + pn(b4.abonnements)
  const irMensuel = pn(b4.fiscal?.impotNet) / 12
  const revDispoActuel = Math.max(0, revP1 + revP2 - charges - irMensuel)

  const b5 = bloc5 as { retraiteP1?: { ageDepartSouhaite?: number; revenusCibles?: number } }
  const p1Data = loadLS<{ dateNaissance?: string }>('patrisim_bloc1_p1', {})
  const ageP1 = ageActuel(p1Data.dateNaissance)
  const annsRetrait = ageP1 !== null ? Math.max(0, (b5.retraiteP1?.ageDepartSouhaite || 63) - ageP1) : 20

  // Projection 3 scénarios
  const projData = (() => {
    const today = new Date().getFullYear()
    const data: { annee: number; base: number; opti: number; pessi: number }[] = []
    let base = patrimoineNet, opti = patrimoineNet, pessi = patrimoineNet
    const epargne = Math.max(0, revP1 + revP2 - charges - irMensuel)
    for (let i = 0; i <= annsRetrait + 25; i++) {
      base += epargne * 12 * (1 + hypo.rendement / 100) - (i > annsRetrait ? Math.max(0, (b5.retraiteP1?.revenusCibles || 0) - pn(b5.retraiteP1?.ageDepartSouhaite || 0) * 0.5) * 12 : 0)
      opti += epargne * 12 * (1 + (hypo.rendement + 1.5) / 100)
      pessi += epargne * 12 * (1 + Math.max(0, hypo.rendement - 1.5) / 100)
      data.push({ annee: today + i, base: Math.max(0, Math.round(base)), opti: Math.max(0, Math.round(opti)), pessi: Math.max(0, Math.round(pessi)) })
    }
    return data
  })()

  const donuts = [
    { name: 'Immobilier', value: totalImmo, fill: '#185FA5' },
    { name: 'Financier', value: totalFin, fill: '#0F6E56' },
    { name: 'Autres', value: totalAutres, fill: '#6B7280' },
  ].filter(d => d.value > 0)

  const passifData = [
    { name: 'Crédit immo', value: creditsImmo.reduce((a, c) => a + pn(c.crd), 0), fill: '#DC2626' },
    { name: 'Crédit conso', value: creditsConso.reduce((a, c) => a + pn(c.crd), 0), fill: '#F87171' },
  ].filter(d => d.value > 0)

  const b6obj = (bloc6 as { objectifsOrder?: string[]; objCapital?: { montant?: string; horizon?: number }; objRetraite?: { capitalNecessaire?: string } }).objectifsOrder || []
  const aiScore = (ai as { score_patrimonial?: { global?: number; details?: Record<string, number>; commentaire_global?: string } } | null)?.score_patrimonial
  const aiAlertes = (ai as { alertes?: { niveau: string; categorie: string; message: string; action_recommandee: string }[] } | null)?.alertes || []
  const aiSynthese = (ai as { synthese_executive?: { phrase_bilan?: string } } | null)?.synthese_executive

  return (
    <div className="space-y-8">
      <HypothesesPanel hypo={hypo} onChange={() => {}} module="Bilan" onLog={onLog} />

      {/* Row 1 */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Patrimoine brut" value={`${fmt(totalBrut)} €`} sub={totalBrut > 0 ? `Immo ${Math.round(totalImmo/totalBrut*100)}% · Fin ${Math.round(totalFin/totalBrut*100)}%` : ''} color="text-[#185FA5]" />
        <MetricCard label="Dettes totales" value={`${fmt(totalDettes)} €`} sub={`Mensualités ${fmt(totalMens)} €/mois`} color="text-red-600" />
        <MetricCard label="Patrimoine net" value={`${fmt(patrimoineNet)} €`} color={patrimoineNet >= 0 ? 'text-[#0F6E56]' : 'text-red-600'} />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Taux d'endettement</p>
          <p className={`text-[22px] font-bold ${tauxEndet < 33 ? 'text-[#0F6E56]' : tauxEndet < 50 ? 'text-amber-600' : 'text-red-600'}`}>{tauxEndet}%</p>
          <div className={`mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${tauxEndet < 33 ? 'bg-[#E1F5EE] text-[#085041]' : tauxEndet < 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
            {tauxEndet < 33 ? '< 33% ✓' : tauxEndet < 50 ? '33–50% ⚠' : '> 50% ✗'}
          </div>
        </div>
      </div>

      {/* Row 2 — Revenus */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#185FA5]/20 shadow-sm p-5">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Revenu disponible actuel</p>
          <p className="text-[28px] font-bold text-[#185FA5]">{fmt(revDispoActuel)} €<span className="text-[14px] font-normal text-gray-400">/mois</span></p>
          <p className="text-[11px] text-gray-400 mt-2">Revenus {fmt(revP1+revP2)} € · Charges -{fmt(charges)} € · Impôts -{fmt(irMensuel)} €</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Revenu disponible à la retraite</p>
          <p className="text-[28px] font-bold text-gray-400">—</p>
          <p className="text-[11px] text-gray-400 mt-2">Dans {annsRetrait} ans · Sera affiné après Bloc 5</p>
        </div>
      </div>

      {/* Row 3 — Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[13px] font-semibold text-gray-800 mb-3">Répartition actif brut</p>
          {totalBrut > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <RPie><Pie data={donuts} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
                  {donuts.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie><Tooltip formatter={(v: number) => `${fmt(v)} €`} /></RPie>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-2">
                {donuts.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span className="text-[11px] text-gray-500">{d.name} · {fmt(d.value)} €</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-[13px] text-gray-400">Aucun actif renseigné</p>}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[13px] font-semibold text-gray-800 mb-3">Passif par type</p>
          {passifData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={passifData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>{passifData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-[13px] text-gray-400">Aucune dette renseignée</p>}
        </div>
      </div>

      {/* Row 5 — Projection */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[13px] font-semibold text-gray-800 mb-4">Projection de votre patrimoine net</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={projData}>
            <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${fmt(v/1000)}k`} />
            <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
            <Legend />
            {annsRetrait > 0 && <ReferenceLine x={new Date().getFullYear() + annsRetrait} stroke="#185FA5" strokeDasharray="4 2" />}
            <Line type="monotone" dataKey="base" stroke="#185FA5" strokeWidth={2} dot={false} name="Base" />
            <Line type="monotone" dataKey="opti" stroke="#0F6E56" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Optimiste" />
            <Line type="monotone" dataKey="pessi" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Pessimiste" />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-gray-400 mt-2">Hypothèses : rendement {hypo.rendement}%/an · inflation {hypo.inflation}%/an · immo +{hypo.immo}%/an</p>
      </div>

      {/* Row 6 — Alertes IA */}
      {aiAlertes.length > 0 && (
        <div>
          <SectionTitle>Points de vigilance IA</SectionTitle>
          <div className="space-y-3">
            {aiAlertes.slice(0, 4).map((al, i) => (
              <div key={i} className={`rounded-2xl border px-5 py-4 flex gap-3 ${al.niveau === 'critique' ? 'bg-red-50 border-red-200' : al.niveau === 'attention' ? 'bg-amber-50 border-amber-200' : 'bg-[#E6F1FB] border-[#185FA5]/20'}`}>
                {al.niveau === 'critique' ? <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" /> : al.niveau === 'attention' ? <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" /> : <Info size={15} className="text-[#185FA5] flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{al.categorie}</p>
                  <p className="text-[13px] text-gray-800 font-medium">{al.message}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{al.action_recommandee}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 7 — Score IA */}
      {aiScore && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-6">
            <ScoreGauge score={aiScore.global || 0} size="lg" />
            <div className="flex-1 space-y-2">
              {Object.entries(aiScore.details || {}).map(([k, v]) => {
                const labels: Record<string, string> = { solidite_bilan: 'Solidité', efficacite_fiscale: 'Fiscalité', preparation_retraite: 'Retraite', diversification: 'Diversification', protection_famille: 'Protection', optimisation_succession: 'Succession' }
                const c = (v as number) >= 75 ? 'bg-[#0F6E56]' : (v as number) >= 50 ? 'bg-[#185FA5]' : (v as number) >= 30 ? 'bg-amber-500' : 'bg-red-500'
                return (
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-500 w-24">{labels[k] || k}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full"><div className={`h-full rounded-full ${c}`} style={{ width: `${v}%` }} /></div>
                    <span className="text-[11px] font-semibold text-gray-700 w-6 text-right">{v as number}</span>
                  </div>
                )
              })}
            </div>
            <div className="max-w-xs">
              {aiSynthese?.phrase_bilan && <p className="text-[13px] text-[#0C447C] italic">"{aiSynthese.phrase_bilan}"</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MODULE 2 — RETRAITE ──────────────────────────────────────────────────────

function ModuleRetraite({ hypo, onChange, onLog, ai }: { hypo: Hypotheses; onChange: (h: Hypotheses) => void; onLog: (d: string) => void; ai: Record<string, unknown> | null }) {
  const [effortSlider, setEffortSlider] = useState(0)
  const bloc5 = loadLS<{ retraiteP1?: { ageDepartSouhaite?: number; revenusCibles?: number }; capaciteEpargne?: string }>('patrisim_bloc5', {})
  const p1Data = loadLS<{ dateNaissance?: string }>('patrisim_bloc1_p1', {})
  const ageP1 = ageActuel(p1Data.dateNaissance)
  const ageDepart = hypo.ageDepartP1 || (bloc5.retraiteP1?.ageDepartSouhaite ?? 63)
  const annsRetrait = ageP1 !== null ? Math.max(0, ageDepart - ageP1) : 20
  const capacite = pn(bloc5.capaciteEpargne) || 500
  const pension = hypo.pensionP1 || Math.round((pn(loadLS<{ p1Pro?: { salaire?: string } }>('patrisim_bloc4', {}).p1Pro?.salaire)) * 0.5)
  const revCibles = hypo.revenusCibles || (bloc5.retraiteP1?.revenusCibles ?? 2000)
  const gap = Math.max(0, revCibles - pension)

  const capitalRetraite = capitalFutur(capacite + effortSlider, hypo.rendement, annsRetrait)
  const capitalOpti = capitalFutur(capacite + effortSlider, hypo.rendement + 1.5, annsRetrait)
  const capitalPessi = capitalFutur(capacite + effortSlider, Math.max(0, hypo.rendement - 1.5), annsRetrait)
  const anneeRetraite = new Date().getFullYear() + annsRetrait

  // Phase retraite
  const retirData: { age: number; base: number; opti: number; pessi: number }[] = []
  let cb = capitalRetraite, co = capitalOpti, cp = capitalPessi
  for (let i = 0; i <= 40; i++) {
    const age = ageDepart + i
    const retrait = gap * 12
    cb = Math.max(0, cb * (1 + hypo.rendement / 100) - retrait)
    co = Math.max(0, co * (1 + (hypo.rendement + 1.5) / 100) - retrait)
    cp = Math.max(0, cp * (1 + Math.max(0, hypo.rendement - 1.5) / 100) - retrait)
    retirData.push({ age, base: Math.round(cb), opti: Math.round(co), pessi: Math.round(cp) })
  }

  const ageEpuisement = retirData.find(d => d.base === 0)?.age
  const aiRetraite = (ai as { analyse_retraite?: { recommandations_specifiques?: string[]; statut?: string } } | null)?.analyse_retraite

  return (
    <div className="space-y-8">
      <HypothesesPanel hypo={hypo} onChange={onChange} module="Retraite" onLog={onLog} />

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Départ prévu" value={`Dans ${annsRetrait} ans`} sub={`Année ${anneeRetraite}`} />
        <MetricCard label="Pension estimée nette" value={`${fmt(pension)} €/mois`} />
        <MetricCard label="Objectif revenus" value={`${fmt(revCibles)} €/mois`} />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Déficit mensuel</p>
          <p className={`text-[22px] font-bold ${gap === 0 ? 'text-[#0F6E56]' : gap <= 500 ? 'text-amber-600' : 'text-red-600'}`}>{gap === 0 ? '0 €' : `${fmt(gap)} €`}</p>
          <p className={`text-[10px] mt-1 font-semibold px-2 py-0.5 rounded-full inline-block ${gap === 0 ? 'bg-[#E1F5EE] text-[#085041]' : gap <= 500 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
            {gap === 0 ? '✓ Couvert' : gap <= 500 ? '⚠ Modéré' : '✗ Important'}
          </p>
        </div>
      </div>

      {/* Accumulation */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[13px] font-semibold text-gray-800 mb-4">Capital projeté à la retraite</p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-[#E6F1FB] rounded-xl p-3 text-center"><p className="text-[10px] text-gray-400 uppercase mb-1">Capital base</p><p className="text-[18px] font-bold text-[#185FA5]">{fmt(capitalRetraite)} €</p></div>
          <div className="bg-[#E1F5EE] rounded-xl p-3 text-center"><p className="text-[10px] text-gray-400 uppercase mb-1">Optimiste</p><p className="text-[18px] font-bold text-[#0F6E56]">{fmt(capitalOpti)} €</p></div>
          <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-[10px] text-gray-400 uppercase mb-1">Pessimiste</p><p className="text-[18px] font-bold text-red-600">{fmt(capitalPessi)} €</p></div>
        </div>
      </div>

      {/* Phase retraite */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[13px] font-semibold text-gray-800 mb-4">Combien de temps votre capital tiendra-t-il ?</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={retirData}>
            <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Âge', position: 'insideBottom', offset: -4, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${fmt(v/1000)}k`} />
            <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
            <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 2" />
            {ageP1 && <ReferenceLine x={hypo.espVie} stroke="#6B7280" strokeDasharray="4 2" label={{ value: `Esp. vie ${hypo.espVie}`, fontSize: 10 }} />}
            <Line type="monotone" dataKey="base" stroke="#185FA5" strokeWidth={2} dot={false} name="Base" />
            <Line type="monotone" dataKey="opti" stroke="#0F6E56" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Optimiste" />
            <Line type="monotone" dataKey="pessi" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Pessimiste" />
          </LineChart>
        </ResponsiveContainer>
        {ageEpuisement ? (
          <InfoCard color={ageEpuisement > hypo.espVie ? 'green' : ageEpuisement > hypo.espVie - 5 ? 'amber' : 'red'}>
            {ageEpuisement > hypo.espVie ? `✓ Votre capital tient jusqu'à ${ageEpuisement} ans (au-delà de votre espérance de vie)`
            : `⚠ Votre capital s'épuise à ${ageEpuisement} ans (${hypo.espVie - ageEpuisement} ans avant votre espérance de vie)`}
          </InfoCard>
        ) : <InfoCard color="green">✓ Votre capital couvre toute votre retraite</InfoCard>}
      </div>

      {/* Simulateur effort supplémentaire */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p className="text-[13px] font-semibold text-gray-800">Simuler un effort supplémentaire</p>
        <div className="space-y-2">
          <div className="flex justify-between mb-1">
            <span className="text-[12px] text-gray-500">Effort mensuel additionnel</span>
            <span className="text-[12px] font-bold text-[#185FA5]">{fmt(effortSlider)} €/mois</span>
          </div>
          <input type="range" min={0} max={2000} step={50} value={effortSlider} onChange={e => setEffortSlider(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
        </div>
        {effortSlider > 0 && (
          <InfoCard color="blue">
            Avec <strong>{fmt(effortSlider)} €/mois supplémentaires</strong> : Capital retraite : <strong>+{fmt(capitalFutur(effortSlider, hypo.rendement, annsRetrait))} €</strong>
          </InfoCard>
        )}
        {aiRetraite?.recommandations_specifiques?.map((r, i) => (
          <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 text-[13px] text-gray-700">{r}</div>
        ))}
      </div>
    </div>
  )
}

// ─── MODULE 4 — FISCAL ────────────────────────────────────────────────────────

function ModuleFiscal({ hypo, onChange, onLog, ai }: { hypo: Hypotheses; onChange: (h: Hypotheses) => void; onLog: (d: string) => void; ai: Record<string, unknown> | null }) {
  const [perSlider, setPerSlider] = useState(0)
  const bloc4 = loadLS<{ fiscal?: { rfr?: string; revenuImposable?: string; impotNet?: string; prelevementsSociaux?: string; nbParts?: string }; p1Pro?: { salaire?: string } }>('patrisim_bloc4', {})
  const rfr = pn(bloc4.fiscal?.rfr)
  const revImp = hypo.revImposable || pn(bloc4.fiscal?.revenuImposable)
  const ir = pn(bloc4.fiscal?.impotNet)
  const ps = pn(bloc4.fiscal?.prelevementsSociaux)
  const nb = pn(bloc4.fiscal?.nbParts) || 1
  const tmi = hypo.tmi || 30
  const pression = ir + ps
  const tauxMoyen = rfr > 0 ? Math.round(ir / rfr * 1000) / 10 : 0

  const plafondPer = hypo.plafondPer || Math.min(pn(bloc4.p1Pro?.salaire) * 12 * 0.10, 35194)
  const economiePer = Math.round(perSlider * tmi / 100)
  const effortNet = perSlider - economiePer

  const tranches = [
    { label: '0%', max: 11497, color: '#E5E7EB', width: 8 },
    { label: '11%', max: 29315, color: '#BFDBFE', width: 13 },
    { label: '30%', max: 83823, color: '#185FA5', width: 40 },
    { label: '41%', max: 177106, color: '#D97706', width: 27 },
    { label: '45%', max: Infinity, color: '#DC2626', width: 12 },
  ]
  const pos = Math.min(revImp / 200000 * 100, 99)

  const envelopes = [
    { n: 'PEA', entree: '0%', vie: '0%', sortie: '0% IR après 5 ans', plafond: '150 000 €', dispo: 'Blocage 5 ans', avantage: 'Exonération IR', reco: tmi >= 30 ? 'Recommandé' : 'Selon objectif' },
    { n: 'CTO', entree: '0%', vie: 'PFU 30%', sortie: 'PFU 30%', plafond: 'Illimité', dispo: 'Immédiate', avantage: 'Flexibilité', reco: tmi < 30 ? 'Recommandé' : 'Selon objectif' },
    { n: 'AV', entree: '0%', vie: '0%', sortie: '7.5% après 8 ans', plafond: 'Illimité', dispo: 'Rachat possible', avantage: 'Transmission', reco: 'Recommandé' },
    { n: 'PER', entree: `Déductible (TMI ${tmi}%)`, vie: '0%', sortie: 'IR à la sortie', plafond: '10% revenus', dispo: 'Retraite', avantage: `Économie ${tmi}% dès maintenant`, reco: tmi >= 30 ? 'Recommandé' : 'Selon objectif' },
    { n: 'Livrets', entree: '0%', vie: '0%', sortie: '0%', plafond: '22 950 €', dispo: 'Immédiate', avantage: 'Liquidité totale', reco: 'Précaution seule' },
  ]

  const aiFiscal = (ai as { analyse_fiscale?: { optimisations_identifiees?: { levier: string; description: string; economie_annuelle_estimee: number }[]; enveloppe_recommandee?: string } } | null)?.analyse_fiscale

  const projFiscal = Array.from({ length: 20 }, (_, i) => {
    const rev = revImp * Math.pow(1 + hypo.croissance / 100, i)
    const irSans = ir * Math.pow(1 + hypo.croissance / 100, i)
    const irAvec = Math.max(0, irSans - (aiFiscal?.optimisations_identifiees?.reduce((a, o) => a + o.economie_annuelle_estimee, 0) || 0))
    return { an: new Date().getFullYear() + i, sans: Math.round(irSans), avec: Math.round(irAvec) }
  })

  return (
    <div className="space-y-8">
      <HypothesesPanel hypo={hypo} onChange={onChange} module="Fiscal" onLog={onLog} />

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="TMI actuel" value={`${tmi}%`} sub="Tranche marginale" color="text-[#185FA5]" />
        <MetricCard label="Taux moyen réel" value={`${tauxMoyen}%`} sub="IR net / RFR" />
        <MetricCard label="Pression fiscale" value={`${fmt(pression)} €/an`} sub={`${fmt(pression/12)} €/mois`} color="text-red-600" />
        <MetricCard label="Potentiel économie" value={aiFiscal?.optimisations_identifiees ? `${fmt(aiFiscal.optimisations_identifiees.reduce((a, o) => a + o.economie_annuelle_estimee, 0))} €/an` : '—'} color="text-[#0F6E56]" />
      </div>

      {/* Tranches IR */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[13px] font-semibold text-gray-800 mb-4">Tranches d'imposition 2025</p>
        <div className="relative h-8 flex rounded-xl overflow-hidden mb-2">
          {tranches.map(t => (
            <div key={t.label} className="flex items-center justify-center" style={{ width: `${t.width}%`, backgroundColor: t.color }}>
              <span className="text-[9px] text-white font-bold">{t.label}</span>
            </div>
          ))}
          {revImp > 0 && <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${pos}%` }} />}
        </div>
        {revImp > 0 && <p className="text-[12px] text-gray-600">Votre TMI : <strong className="text-[#185FA5]">{tmi}%</strong> · RFR : <strong>{fmt(rfr)} €</strong></p>}
      </div>

      {/* Comparateur enveloppes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
        <p className="text-[13px] font-semibold text-gray-800 mb-4">Quelle enveloppe choisir ?</p>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['', 'PEA', 'CTO', 'AV', 'PER', 'Livrets'].map(h => <th key={h} className="text-left py-2 px-2 text-gray-500 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              { row: "Fiscalité entrée", vals: envelopes.map(e => e.entree) },
              { row: "Fiscalité sortie", vals: envelopes.map(e => e.sortie) },
              { row: "Plafond", vals: envelopes.map(e => e.plafond) },
              { row: "Disponibilité", vals: envelopes.map(e => e.dispo) },
              { row: "Avantage principal", vals: envelopes.map(e => e.avantage) },
            ].map(({ row, vals }) => (
              <tr key={row} className="border-b border-gray-50">
                <td className="py-2 px-2 text-gray-500 font-medium">{row}</td>
                {vals.map((v, i) => <td key={i} className="py-2 px-2 text-gray-700">{v}</td>)}
              </tr>
            ))}
            <tr>
              <td className="py-2 px-2 text-gray-500 font-medium">Pour vous</td>
              {envelopes.map((e, i) => (
                <td key={i} className="py-2 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${e.reco === 'Recommandé' ? 'bg-[#E1F5EE] text-[#085041]' : e.reco === 'Selon objectif' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{e.reco}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {aiFiscal?.enveloppe_recommandee && <InfoCard color="blue" >{aiFiscal.enveloppe_recommandee}</InfoCard>}
      </div>

      {/* Simulateur PER */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p className="text-[13px] font-semibold text-gray-800">Simulateur versement PER</p>
        <div className="space-y-2">
          <div className="flex justify-between mb-1">
            <span className="text-[12px] text-gray-500">Versement annuel simulé</span>
            <span className="text-[12px] font-bold text-[#185FA5]">{fmt(perSlider)} €/an</span>
          </div>
          <input type="range" min={0} max={plafondPer} step={100} value={perSlider} onChange={e => setPerSlider(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
        </div>
        {perSlider > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-gray-500">Versement simulé</span><strong>{fmt(perSlider)} €/an</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Économie IR immédiate</span><strong className="text-[#0F6E56]">−{fmt(economiePer)} € (TMI {tmi}%)</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Effort net</span><strong>{fmt(effortNet)} €/an soit {fmt(effortNet/12)} €/mois</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Plafond restant</span><strong>{fmt(Math.max(0, plafondPer - perSlider))} €</strong></div>
            <div className="flex justify-between border-t border-gray-200 pt-2"><span className="text-gray-500">Capital estimé retraite</span><strong className="text-[#185FA5]">{fmt(capitalFutur(perSlider/12, hypo.rendement, 20))} €</strong></div>
          </div>
        )}
      </div>

      {/* Projection fiscale */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[13px] font-semibold text-gray-800 mb-4">Projection de votre charge fiscale</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={projFiscal}>
            <XAxis dataKey="an" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${fmt(v/1000)}k`} />
            <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
            <Line type="monotone" dataKey="sans" stroke="#DC2626" strokeWidth={2} dot={false} name="Sans optimisation" />
            <Line type="monotone" dataKey="avec" stroke="#0F6E56" strokeWidth={2} dot={false} name="Avec optimisations IA" />
          </LineChart>
        </ResponsiveContainer>
        {aiFiscal?.optimisations_identifiees && aiFiscal.optimisations_identifiees.length > 0 && (
          <p className="text-[12px] text-[#0F6E56] mt-2">Économie cumulée estimée : <strong>{fmt(aiFiscal.optimisations_identifiees.reduce((a, o) => a + o.economie_annuelle_estimee, 0) * 20)} €</strong> sur 20 ans</p>
        )}
      </div>
    </div>
  )
}

// ─── MODULE 5 — SUCCESSION ────────────────────────────────────────────────────

function ModuleSuccession({ hypo, onChange, onLog, ai }: { hypo: Hypotheses; onChange: (h: Hypotheses) => void; onLog: (d: string) => void; ai: Record<string, unknown> | null }) {
  const [benefSel, setBenefSel] = useState('')
  const [donSim, setDonSim] = useState(0)

  const bloc7 = loadLS<{ heritiers?: { lien?: string; prenom?: string; age?: string; situation?: string }[]; donations?: { beneficiaire?: string; montant?: string; date?: string }[] }>('patrisim_bloc7', {})
  const bloc2 = loadLS<{ avs?: { nom?: string; valeurRachat?: string }[] }>('patrisim_bloc2', {})
  const bloc3 = loadLS<{ totalDettes?: number }>('patrisim_bloc3', {})
  const patrimoineNet = (() => {
    const b2 = loadLS<{ totalImmo?: number; totalFinancier?: number; totalAutres?: number }>('patrisim_bloc2', {})
    return (b2.totalImmo||0) + (b2.totalFinancier||0) + (b2.totalAutres||0) - (bloc3.totalDettes||0)
  })()

  const heritiers = bloc7.heritiers || []
  const donations = bloc7.donations || []
  const avs = bloc2.avs || []
  const avHorsSuc = avs.reduce((a, av) => a + Math.min(pn(av.valeurRachat), 152500), 0)

  const abattTotal = heritiers.reduce((a, h) => {
    const ab: Record<string, number> = { 'Conjoint': 0, 'Partenaire PACS': 0, 'Enfant commun': 100000, "Enfant d'une autre union": 100000, 'Petit-enfant': 31865, 'Frère / Sœur': 15932, 'Neveu / Nièce': 7967 }
    return a + (ab[h.lien || ''] ?? 1594) + (h.situation === 'Handicapé' ? 159325 : 0)
  }, 0)

  const totalDonne = donations.reduce((a, d) => a + pn(d.montant), 0)
  const nbHeritiersHorsConj = heritiers.filter(h => h.lien !== 'Conjoint' && h.lien !== 'Partenaire PACS').length || 1
  const baseAvOp = Math.max(0, patrimoineNet - abattTotal - avHorsSuc - totalDonne)
  const droitsAvant = droitsSuccession(baseAvOp / nbHeritiersHorsConj) * nbHeritiersHorsConj
  const aiSucc = (ai as { analyse_succession?: { droits_estimes_apres_optim?: number; economie_potentielle?: number; optimisations_disponibles?: { outil: string; description: string; economie_estimee: number; complexite: string }[] } } | null)?.analyse_succession
  const droitsApres = aiSucc?.droits_estimes_apres_optim ?? Math.round(droitsAvant * 0.7)
  const economiePot = droitsAvant - droitsApres

  // Simulateur donation
  const benefHerit = heritiers.find(h => h.prenom === benefSel)
  const abBenef: Record<string, number> = { 'Conjoint': 0, 'Partenaire PACS': 0, 'Enfant commun': 100000, "Enfant d'une autre union": 100000, 'Petit-enfant': 31865, 'Frère / Sœur': 15932, 'Neveu / Nièce': 7967 }
  const abattBenef = abBenef[benefHerit?.lien || ''] ?? 1594
  const donsPasses = donations.filter(d => d.beneficiaire === benefSel).reduce((a, d) => a + pn(d.montant), 0)
  const abattRestant = Math.max(0, abattBenef - donsPasses)
  const droitsDon = donSim > abattRestant ? droitsSuccession(donSim - abattRestant) : 0
  const economieSuc = donSim > 0 ? droitsSuccession(donSim / nbHeritiersHorsConj) : 0

  // Projection
  const projData = Array.from({ length: 30 }, (_, i) => {
    const age = (ageActuel(loadLS<{ dateNaissance?: string }>('patrisim_bloc1_p1', {}).dateNaissance) || 50) + i
    const patr = patrimoineNet * Math.pow(1 + hypo.revalPatrimoine / 100, i) - (hypo.donationsAnnuelles * i)
    const donationsProgr = totalDonne + hypo.donationsAnnuelles * i
    const baseOp = Math.max(0, patr - abattTotal - avHorsSuc - donationsProgr)
    const sansOptim = droitsSuccession(baseOp / nbHeritiersHorsConj) * nbHeritiersHorsConj
    const avecOptim = Math.round(sansOptim * 0.7)
    return { age, sansOptim: Math.round(Math.max(0, patr - sansOptim)), avecOptim: Math.round(Math.max(0, patr - avecOptim)) }
  })

  return (
    <div className="space-y-8">
      <HypothesesPanel hypo={hypo} onChange={onChange} module="Succession" onLog={onLog} />

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Patrimoine transmissible" value={`${fmt(Math.max(0, patrimoineNet - avHorsSuc))} €`} />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Droits estimés avant optim.</p>
          <p className="text-[22px] font-bold text-red-600">{fmt(droitsAvant)} €</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Droits estimés après optim.</p>
          <p className="text-[22px] font-bold text-[#0F6E56]">{fmt(droitsApres)} €</p>
        </div>
        <MetricCard label="Économie potentielle" value={`${fmt(economiePot)} €`} color="text-[#0F6E56]" sub={droitsAvant > 0 ? `${Math.round(economiePot/droitsAvant*100)}% de réduction` : ''} />
      </div>

      {/* Table héritiers */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[13px] font-semibold text-gray-800 mb-4">Répartition successorale</p>
        {heritiers.filter(h => h.lien !== 'Conjoint' && h.lien !== 'Partenaire PACS').length === 0
          ? <InfoCard color="blue">Aucun héritier renseigné — complétez le Bloc 7</InfoCard>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-gray-100">{['Héritier', 'Lien', 'Abattement', 'Base taxable', 'Droits estimés'].map(h => <th key={h} className="text-left py-2 px-3 text-gray-400 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {heritiers.filter(h => h.lien !== 'Conjoint' && h.lien !== 'Partenaire PACS').map((h, i) => {
                  const ab = abBenef[h.lien || ''] ?? 1594
                  const base = Math.max(0, patrimoineNet / nbHeritiersHorsConj - ab)
                  const droits = droitsSuccession(base)
                  return (
                    <tr key={i} className={`border-b border-gray-50 ${droits > 20000 ? 'bg-red-50' : droits > 5000 ? 'bg-amber-50' : 'bg-[#E1F5EE]/30'}`}>
                      <td className="py-2 px-3 font-medium">{h.prenom || 'Héritier'}</td>
                      <td className="py-2 px-3">{h.lien}</td>
                      <td className="py-2 px-3">{fmt(ab)} €</td>
                      <td className="py-2 px-3">{fmt(base)} €</td>
                      <td className={`py-2 px-3 font-semibold ${droits > 20000 ? 'text-red-600' : droits > 5000 ? 'text-amber-600' : 'text-[#0F6E56]'}`}>{fmt(droits)} €</td>
                    </tr>
                  )
                })}
                {heritiers.find(h => h.lien === 'Conjoint' || h.lien === 'Partenaire PACS') && (
                  <tr className="bg-[#E1F5EE]"><td colSpan={5} className="py-2 px-3 text-[#085041] font-semibold text-center">✓ Conjoint/PACS : Exonération totale de droits</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Simulateur donation */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p className="text-[13px] font-semibold text-gray-800">Simulateur donation du vivant</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 block">Bénéficiaire</label>
            <select value={benefSel} onChange={e => setBenefSel(e.target.value)} className="w-full h-10 bg-gray-50 border border-transparent rounded-lg px-3 text-[13px] focus:outline-none focus:border-[#185FA5] cursor-pointer">
              <option value="">Sélectionnez…</option>
              {heritiers.map(h => <option key={h.prenom}>{h.prenom}</option>)}
            </select>
          </div>
          <div>
            <div className="flex justify-between mb-1"><span className="text-[12px] text-gray-500">Montant simulation</span><span className="text-[12px] font-bold text-[#185FA5]">{fmt(donSim)} €</span></div>
            <input type="range" min={0} max={500000} step={5000} value={donSim} onChange={e => setDonSim(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5] mt-3" />
          </div>
        </div>
        {benefSel && donSim > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-gray-500">Abattement disponible</span><strong>{fmt(abattRestant)} €</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Droits à payer maintenant</span><strong className={droitsDon > 0 ? 'text-red-600' : 'text-[#0F6E56]'}>{droitsDon === 0 ? '0 € (dans abattement)' : `${fmt(droitsDon)} €`}</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Économie sur succession future</span><strong className="text-[#0F6E56]">{fmt(economieSuc)} €</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Abattement reconstitué le</span><strong>{new Date(Date.now() + 15*365.25*24*3600*1000).toLocaleDateString('fr-FR')}</strong></div>
          </div>
        )}
      </div>

      {/* Projection */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[13px] font-semibold text-gray-800 mb-3">Évolution du patrimoine transmissible</p>
        <div className="mb-3 space-y-1">
          <div className="flex justify-between"><span className="text-[12px] text-gray-500">Donations annuelles simulées</span><span className="text-[12px] font-bold text-[#185FA5]">{fmt(hypo.donationsAnnuelles)} €/an</span></div>
          <input type="range" min={0} max={50000} step={1000} value={hypo.donationsAnnuelles}
            onChange={e => { onLog(`Donations annuelles : ${hypo.donationsAnnuelles} → ${e.target.value}`); onChange({ ...hypo, donationsAnnuelles: Number(e.target.value) }) }}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={projData}>
            <XAxis dataKey="age" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${fmt(v/1000)}k`} />
            <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
            <Line type="monotone" dataKey="sansOptim" stroke="#DC2626" strokeWidth={1.5} dot={false} name="Sans optimisation" />
            <Line type="monotone" dataKey="avecOptim" stroke="#0F6E56" strokeWidth={2} dot={false} name="Avec optimisations" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── MODULE 6 — OBJECTIF PRINCIPAL ────────────────────────────────────────────

function ModuleObjectif({ hypo, onChange, onLog, ai }: { hypo: Hypotheses; onChange: (h: Hypotheses) => void; onLog: (d: string) => void; ai: Record<string, unknown> | null }) {
  const [stepStatus, setStepStatus] = useState<Record<number, string>>(() => {
    try { return JSON.parse(localStorage.getItem('patrisim_step_status') || '{}') } catch { return {} }
  })
  const [effortSim, setEffortSim] = useState(0)
  const [objSel, setObjSel] = useState(0)

  const aiObj = (ai as { analyse_objectif_principal?: { objectif?: string; montant_cible?: number; horizon_ans?: number; situation_actuelle?: string; gap_analyse?: string; probabilite_succes?: number; plan_action?: { etape: number; action: string; delai: string; impact_estime: string; priorite: string }[]; projection_avec_optimisation?: string; projection_sans_optimisation?: string; facteurs_favorables?: string[] } } | null)?.analyse_objectif_principal
  const aiReco = (ai as { recommandations?: { categorie: string; titre: string; description: string; urgence: string; economie_ou_gain_estime: number }[] } | null)?.recommandations || []
  const bloc6 = loadLS<{ objectifsOrder?: string[] }>('patrisim_bloc6', {})
  const objectifs = bloc6.objectifsOrder || []

  const setStatus = (etape: number, status: string) => {
    const ns = { ...stepStatus, [etape]: status }
    setStepStatus(ns)
    localStorage.setItem('patrisim_step_status', JSON.stringify(ns))
  }

  const patrimoineActuel = (() => {
    const b2 = loadLS<{ totalImmo?: number; totalFinancier?: number; totalAutres?: number }>('patrisim_bloc2', {})
    return (b2.totalImmo||0) + (b2.totalFinancier||0) + (b2.totalAutres||0)
  })()

  const capacite = pn(loadLS<{ capaciteEpargne?: string }>('patrisim_bloc5', {}).capaciteEpargne) || 500
  const montantCible = aiObj?.montant_cible || 500000
  const horizon = aiObj?.horizon_ans || 20

  // Trajectoire
  const trajData = Array.from({ length: horizon + 1 }, (_, i) => {
    const actuel = patrimoineActuel + capitalFutur(capacite + effortSim, hypo.rendement, i)
    const avecIA = patrimoineActuel + capitalFutur(capacite + effortSim + 200, hypo.rendement + 0.5, i)
    const sansAction = patrimoineActuel + capitalFutur(Math.max(0, capacite - 200), Math.max(0, hypo.rendement - 1), i)
    return { an: new Date().getFullYear() + i, actuel: Math.round(actuel), avecIA: Math.round(avecIA), sansAction: Math.round(sansAction), cible: montantCible }
  })
  const anneeAtteinte = trajData.find(d => d.actuel >= montantCible)?.an
  const anneeAtteintIA = trajData.find(d => d.avecIA >= montantCible)?.an
  const gainAnnees = anneeAtteinte && anneeAtteintIA ? anneeAtteinte - anneeAtteintIA : null

  const probaColor = (p: number) => p >= 70 ? 'text-[#0F6E56]' : p >= 40 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="space-y-8">
      {objectifs.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {objectifs.map((o, i) => (
            <button key={o} type="button" onClick={() => setObjSel(i)}
              className={`px-3.5 py-2 rounded-lg text-[12px] border font-medium transition-all ${objSel === i ? 'bg-[#185FA5] border-[#185FA5] text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
              {i + 1}. {o}
            </button>
          ))}
        </div>
      )}

      {/* Hero */}
      <div className="bg-[#E6F1FB] rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-[#0C447C] uppercase tracking-wider mb-1">Objectif principal</p>
            <p className="text-[24px] font-bold text-gray-900">{aiObj?.objectif || objectifs[objSel] || 'Non défini'}</p>
            <p className="text-[13px] text-[#0C447C] mt-1">Montant cible : {fmt(montantCible)} € · Horizon : {horizon} ans</p>
          </div>
          <div className="text-center">
            <p className={`text-[36px] font-bold ${probaColor(aiObj?.probabilite_succes || 0)}`}>{aiObj?.probabilite_succes || 0}%</p>
            <p className="text-[11px] text-gray-500">Probabilité de succès</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-500 mb-1">Patrimoine actuel : {fmt(patrimoineActuel)} €</p>
            <p className="text-[11px] text-gray-500 mb-2">Objectif : {fmt(montantCible)} €</p>
            <div className="h-2 bg-white rounded-full w-48 overflow-hidden">
              <div className="h-full bg-[#185FA5] rounded-full" style={{ width: `${Math.min(100, Math.round(patrimoineActuel / montantCible * 100))}%` }} />
            </div>
            <p className="text-[10px] text-[#0C447C] mt-1">{Math.min(100, Math.round(patrimoineActuel / montantCible * 100))}% atteint</p>
          </div>
        </div>
      </div>

      {/* Gap analyse */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Situation actuelle</p>
          <p className="text-[13px] text-gray-700">{aiObj?.situation_actuelle || '—'}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Analyse de l'écart</p>
          <p className="text-[13px] text-gray-700">{aiObj?.gap_analyse || '—'}</p>
        </div>
      </div>

      {/* Plan d'action avec suivi */}
      {aiObj?.plan_action && aiObj.plan_action.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <p className="text-[13px] font-semibold text-gray-800">Plan d'action personnalisé</p>
          {aiObj.plan_action.map(step => (
            <div key={step.etape} className={`rounded-xl p-4 border transition-all ${stepStatus[step.etape] === 'done' ? 'bg-[#E1F5EE] border-[#0F6E56]/20' : stepStatus[step.etape] === 'progress' ? 'bg-[#E6F1FB] border-[#185FA5]/20' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-start gap-3">
                <span className={`w-7 h-7 rounded-full text-[12px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${stepStatus[step.etape] === 'done' ? 'bg-[#0F6E56] text-white' : 'bg-[#185FA5] text-white'}`}>{step.etape}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-gray-800">{step.action}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{step.delai}</span>
                    <span className="text-[10px] bg-[#E1F5EE] text-[#085041] px-2 py-0.5 rounded-full">{step.impact_estime}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${step.priorite === 'haute' ? 'bg-red-50 text-red-600' : step.priorite === 'moyenne' ? 'bg-amber-50 text-amber-700' : 'bg-[#E6F1FB] text-[#0C447C]'}`}>{step.priorite}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {['done', 'progress', 'todo'].map(s => (
                    <button key={s} type="button" onClick={() => setStatus(step.etape, s)}
                      className={`px-2 py-1 rounded-lg text-[10px] border font-medium transition-all ${stepStatus[step.etape] === s ? (s === 'done' ? 'bg-[#0F6E56] text-white border-[#0F6E56]' : s === 'progress' ? 'bg-[#185FA5] text-white border-[#185FA5]' : 'bg-gray-300 text-gray-600 border-gray-300') : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                      {s === 'done' ? '✓' : s === 'progress' ? '⟳' : '○'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trajectoire */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[13px] font-semibold text-gray-800 mb-3">Votre trajectoire vers l'objectif</p>
        <div className="mb-3 space-y-1">
          <div className="flex justify-between"><span className="text-[12px] text-gray-500">Effort mensuel supplémentaire</span><span className="text-[12px] font-bold text-[#185FA5]">{fmt(effortSim)} €/mois</span></div>
          <input type="range" min={0} max={2000} step={50} value={effortSim} onChange={e => setEffortSim(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trajData}>
            <XAxis dataKey="an" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${fmt(v/1000)}k`} />
            <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
            <ReferenceLine y={montantCible} stroke="#D97706" strokeDasharray="6 3" label={{ value: 'Objectif', fontSize: 10, fill: '#D97706' }} />
            <Line type="monotone" dataKey="actuel" stroke="#185FA5" strokeWidth={2} dot={false} name="Trajectoire actuelle" />
            <Line type="monotone" dataKey="avecIA" stroke="#0F6E56" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Avec recommandations IA" />
            <Line type="monotone" dataKey="sansAction" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Sans action" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
          {anneeAtteinte && <p className="text-gray-500">À votre rythme : objectif en <strong>{anneeAtteinte}</strong></p>}
          {anneeAtteintIA && <p className="text-[#0F6E56]">Avec IA : objectif en <strong>{anneeAtteintIA}</strong> {gainAnnees && gainAnnees > 0 ? `(${gainAnnees} ans gagnés)` : ''}</p>}
        </div>
      </div>

      {/* Comparaison avec/sans */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-red-200 bg-red-50 rounded-2xl p-5">
          <p className="text-[11px] font-bold text-red-600 uppercase mb-2">Sans optimisation</p>
          <p className="text-[13px] text-red-700">{aiObj?.projection_sans_optimisation || '—'}</p>
        </div>
        <div className="border border-[#0F6E56]/30 bg-[#E1F5EE] rounded-2xl p-5">
          <p className="text-[11px] font-bold text-[#085041] uppercase mb-2">Avec recommandations PatriSim</p>
          <p className="text-[13px] text-[#085041]">{aiObj?.projection_avec_optimisation || '—'}</p>
        </div>
      </div>

      {/* Recommandations liées */}
      {aiReco.length > 0 && (
        <div className="space-y-3">
          <p className="text-[13px] font-semibold text-gray-800">Recommandations liées à cet objectif</p>
          {aiReco.slice(0, 4).map((rec, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{rec.categorie}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${rec.urgence === 'immediate' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>{rec.urgence}</span>
              </div>
              <p className="text-[13px] font-semibold text-gray-800">{rec.titre}</p>
              <p className="text-[12px] text-gray-500 mt-1">{rec.description}</p>
              {rec.economie_ou_gain_estime > 0 && <p className="text-[11px] text-[#0F6E56] font-semibold mt-1">Gain estimé : +{fmt(rec.economie_ou_gain_estime)} €</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── PANNEAU HYPOTHÈSES ───────────────────────────────────────────────────────

function PanneauHypotheses({ hypo, onChange, onLog, history }: {
  hypo: Hypotheses; onChange: (h: Hypotheses) => void
  onLog: (d: string) => void; history: HypChange[]
}) {
  const bloc1Mode = loadLS<{ v?: string }>('patrisim_bloc1_mode', {}).v || 'seul'
  const isCouple = bloc1Mode === 'couple'
  const p1 = loadLS<{ prenom?: string }>('patrisim_bloc1_p1', {})
  const p2 = loadLS<{ prenom?: string }>('patrisim_bloc1_p2', {})
  const foyerBloc1 = loadLS<{ statutMatrimonial?: string; regimeMatrimonial?: string }>('patrisim_bloc1_foyer', {})
  const isMarieOuPacse = ['Marié(e)', 'Pacsé(e)'].includes(foyerBloc1.statutMatrimonial || '')

  const set = (k: keyof Hypotheses, v: number) => { onLog(`${k} : ${hypo[k]} → ${v}`); onChange({ ...hypo, [k]: v }) }

  const bloc2 = loadLS<{ totalImmo?: number; totalFinancier?: number; avs?: { valeurRachat?: string }[] }>('patrisim_bloc2', {})
  const avVal = (bloc2.avs || []).reduce((a, av) => a + pn(av.valeurRachat), 0)
  const pensionP1 = pn(loadLS<{ p1Pro?: { salaire?: string } }>('patrisim_bloc4', {}).p1Pro?.salaire) * 0.5
  const revP2 = pn(loadLS<{ p2Pro?: { salaire?: string } }>('patrisim_bloc4', {}).p2Pro?.salaire)
  const patrimoineNet = (bloc2.totalImmo||0) + (bloc2.totalFinancier||0)

  // Simulation décès prématuré
  const ageP1 = ageActuel(loadLS<{ dateNaissance?: string }>('patrisim_bloc1_p1', {}).dateNaissance)
  const ansAvant = ageP1 !== null ? Math.max(0, hypo.ageDecesSim - ageP1) : 10
  const revDispoP2 = Math.max(0, revP2 + pensionP1 * 0.5 + pn(loadLS<{ revenusFinanciers?: string }>('patrisim_bloc4', {}).revenusFinanciers) / 12)
  const chargesRef = pn(loadLS<{ assurances?: string; abonnements?: string }>('patrisim_bloc4', {}).assurances) + pn(loadLS<{ abonnements?: string }>('patrisim_bloc4', {}).abonnements)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[22px] font-bold text-gray-900 mb-1">Hypothèses & scénarios</h2>
        <p className="text-[13px] text-gray-400">Modifiez les paramètres pour simuler différentes situations.</p>
      </div>

      {/* Hypothèses globales */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <p className="text-[13px] font-semibold text-gray-800">Hypothèses globales</p>
        <div className="flex gap-2 mb-2">
          {['Pessimiste', 'Base', 'Optimiste'].map(p => (
            <button key={p} type="button" onClick={() => {
              const h = { ...hypo }
              if (p === 'Base') { h.rendement = 4; h.inflation = 2; h.immo = 2 }
              else if (p === 'Pessimiste') { h.rendement = 2.5; h.inflation = 3; h.immo = 1.5 }
              else { h.rendement = 5.5; h.inflation = 1.5; h.immo = 2.5 }
              onLog(`Scénario ${p} appliqué`); onChange(h)
            }} className="px-3.5 py-2 rounded-lg text-[12px] border border-gray-200 text-gray-600 hover:border-[#185FA5] hover:text-[#185FA5] font-medium">{p}</button>
          ))}
          <button type="button" onClick={() => { onLog('Hypothèses réinitialisées'); onChange(DEFAULT_HYPO) }}
            className="ml-auto flex items-center gap-1 text-[12px] text-gray-400 hover:text-red-500">
            <RotateCcw size={12} />Tout réinitialiser
          </button>
        </div>
        <div className="grid grid-cols-2 gap-6">
          {([
            ['rendement', 'Rendement portefeuille', 0, 12, 0.1, '%/an'],
            ['inflation', 'Inflation annuelle', 0, 6, 0.1, '%/an'],
            ['immo', 'Revalorisation immobilière', 0, 5, 0.1, '%/an'],
            ['croissance', 'Croissance des revenus', 0, 5, 0.1, '%/an'],
            ['espVie', "Espérance de vie", 75, 100, 1, 'ans'],
            ['tauxRetrait', 'Taux de retrait retraite', 0, 8, 0.1, '%/an'],
          ] as [keyof Hypotheses, string, number, number, number, string][]).map(([k, l, min, max, step, suf]) => (
            <div key={k}>
              <div className="flex justify-between mb-1"><span className="text-[12px] text-gray-600">{l}</span><span className="text-[12px] font-semibold text-[#185FA5]">{hypo[k]}{suf}</span></div>
              <input type="range" min={min} max={max} step={step} value={hypo[k] as number} onChange={e => set(k, Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
            </div>
          ))}
        </div>
      </div>

      {/* Simulation décès prématuré */}
      {isCouple && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-[13px] font-semibold text-gray-800">Simulation d'un décès prématuré</p>
          <div className="space-y-2">
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-gray-500">Décès de {p1.prenom || 'Personne 1'} à</span>
              <span className="text-[12px] font-bold text-[#185FA5]">{hypo.ageDecesSim} ans (dans {ansAvant} ans)</span>
            </div>
            <input type="range" min={45} max={90} value={hypo.ageDecesSim} onChange={e => set('ageDecesSim', Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#185FA5]" />
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-gray-500">Capital AV versé</span><strong>{fmt(avVal)} €</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Pension de réversion {p2.prenom || 'P2'}</span><strong>{fmt(Math.round(pensionP1 * 0.5))} €/mois (50%)</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Droits de succession</span><strong className="text-[#0F6E56]">0 € (conjoint exonéré)</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Patrimoine restant</span><strong>{fmt(patrimoineNet)} €</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Revenus disponibles {p2.prenom || 'P2'}</span><strong>{fmt(Math.round(revDispoP2))} €/mois</strong></div>
            <InfoCard color={revDispoP2 >= chargesRef * 1.5 ? 'green' : 'red'}>
              {revDispoP2 >= chargesRef * 1.5 ? '✓ Situation stable' : '⚠ Situation précaire — revenus potentiellement insuffisants'}
            </InfoCard>
          </div>
        </div>
      )}

      {/* Simulation divorce */}
      {isCouple && isMarieOuPacse && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-[13px] font-semibold text-gray-800">Simulation divorce</p>
          <p className="text-[12px] text-gray-400">Simulation basée sur votre régime matrimonial : <strong>{foyerBloc1.regimeMatrimonial || 'non renseigné'}</strong></p>
          <InfoCard color="amber">Cette simulation est purement indicative. Une liquidation réelle nécessite l'intervention d'un notaire et éventuellement d'un avocat.</InfoCard>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#E6F1FB] rounded-xl p-4">
              <p className="text-[11px] text-[#0C447C] font-semibold mb-2">{p1.prenom || 'Personne 1'}</p>
              <p className="text-[18px] font-bold text-[#185FA5]">{fmt(Math.round(patrimoineNet / 2))} €</p>
              <p className="text-[11px] text-[#0C447C]">après partage estimé</p>
            </div>
            <div className="bg-[#E1F5EE] rounded-xl p-4">
              <p className="text-[11px] text-[#085041] font-semibold mb-2">{p2.prenom || 'Personne 2'}</p>
              <p className="text-[18px] font-bold text-[#0F6E56]">{fmt(Math.round(patrimoineNet / 2))} €</p>
              <p className="text-[11px] text-[#085041]">après partage estimé</p>
            </div>
          </div>
        </div>
      )}

      {/* Historique */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[13px] font-semibold text-gray-800 mb-3">Historique des modifications</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {[...history].reverse().map((h, i) => (
              <div key={i} className="flex gap-2 text-[11px]">
                <span className="text-gray-400 flex-shrink-0">{h.ts}</span>
                <span className="text-gray-600">{h.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard shell ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: '/dashboard/bilan', label: 'Bilan patrimonial', icon: <BarChart2 size={16} /> },
  { path: '/dashboard/retraite', label: 'Simulation retraite', icon: <TrendingUp size={16} /> },
  { path: '/dashboard/portefeuille', label: 'Analyse portefeuille', icon: <PieChart size={16} /> },
  { path: '/dashboard/fiscal', label: 'Optimisation fiscale', icon: <DollarSign size={16} /> },
  { path: '/dashboard/succession', label: 'Succession simulée', icon: <Users size={16} /> },
  { path: '/dashboard/objectif', label: 'Objectif principal', icon: <Target size={16} /> },
  { path: '/dashboard/hypotheses', label: 'Hypothèses', icon: <Settings size={16} /> },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [hypo, setHypo] = useState<Hypotheses>(() => loadLS('patrisim_hypo', DEFAULT_HYPO))
  const [history, setHistory] = useState<HypChange[]>(() => loadLS<{ items?: HypChange[] }>('patrisim_hypo_history', {}).items || [])
  const [ai, setAI] = useState<Record<string, unknown> | null>(() => {
    try { const c = localStorage.getItem('patrisim_analyse'); if (!c) return null; return JSON.parse(c).data } catch { return null }
  })

  useEffect(() => { localStorage.setItem('patrisim_hypo', JSON.stringify(hypo)) }, [hypo])

  const logChange = useCallback((desc: string) => {
    const entry: HypChange = { ts: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), desc }
    setHistory(h => { const nh = [...h, entry].slice(-50); localStorage.setItem('patrisim_hypo_history', JSON.stringify({ items: nh })); return nh })
  }, [])

  const module = location.pathname.split('/').pop() || 'bilan'
  const titles: Record<string, string> = { bilan: 'Bilan patrimonial', retraite: 'Simulation retraite', portefeuille: 'Analyse de portefeuille', fiscal: 'Optimisation fiscale', succession: 'Succession simulée', objectif: 'Objectif principal', hypotheses: 'Hypothèses & scénarios' }

  return (
    <div className="flex min-h-screen bg-[#F8F8F6]">
      {/* Sidebar dashboard */}
      <div className="w-[220px] bg-white border-r border-gray-100 flex flex-col fixed top-0 left-0 h-full z-40">
        <div className="px-5 py-5 border-b border-gray-100">
          <button type="button" onClick={() => navigate('/')} className="text-[18px] font-bold text-gray-900">
            Patri<span className="text-[#185FA5]">Sim</span>
          </button>
          <p className="text-[10px] text-gray-400 mt-0.5">Dashboard</p>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button key={item.path} type="button" onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[12px] font-medium transition-colors ${location.pathname === item.path ? 'bg-[#E6F1FB] text-[#0C447C]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
              <span className={location.pathname === item.path ? 'text-[#185FA5]' : 'text-gray-400'}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          <button type="button" onClick={() => navigate('/analyse')} className="w-full py-2 rounded-lg text-[11px] text-[#185FA5] border border-[#185FA5]/30 hover:bg-[#E6F1FB] transition-colors font-medium">
            Voir l'analyse IA
          </button>
          <button type="button" onClick={() => navigate('/bloc1')} className="w-full py-2 rounded-lg text-[11px] text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
            ← Modifier le profil
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 ml-[220px]">
        <div className="max-w-4xl mx-auto px-8 py-8 pb-16">
          {module !== 'hypotheses' && (
            <h1 className="text-[24px] font-bold text-gray-900 mb-6">{titles[module] || 'Dashboard'}</h1>
          )}

          {module === 'bilan' && <ModuleBilan hypo={hypo} onLog={logChange} ai={ai} />}
          {module === 'retraite' && <ModuleRetraite hypo={hypo} onChange={setHypo} onLog={logChange} ai={ai} />}
          {module === 'fiscal' && <ModuleFiscal hypo={hypo} onChange={setHypo} onLog={logChange} ai={ai} />}
          {module === 'succession' && <ModuleSuccession hypo={hypo} onChange={setHypo} onLog={logChange} ai={ai} />}
          {module === 'objectif' && <ModuleObjectif hypo={hypo} onChange={setHypo} onLog={logChange} ai={ai} />}
          {module === 'hypotheses' && <PanneauHypotheses hypo={hypo} onChange={setHypo} onLog={logChange} history={history} />}
          {module === 'portefeuille' && (
            <div className="space-y-6">
              <HypothesesPanel hypo={hypo} onChange={setHypo} module="Portefeuille" onLog={logChange} />
              <InfoCard color="blue">Module Analyse portefeuille — Les graphiques Recharts d'allocation et de cohérence MiFID II s'afficheront ici basés sur vos actifs du Bloc 2.</InfoCard>
              {ai && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-[13px] font-semibold text-gray-800 mb-3">Analyse IA de votre portefeuille</p>
                  <p className="text-[13px] text-gray-600">{(ai as { analyse_portefeuille?: { coherence_profil_mifid?: string } }).analyse_portefeuille?.coherence_profil_mifid || '—'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer disclaimer */}
        <div className="max-w-4xl mx-auto px-8 pb-8">
          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            PatriSim est un outil de simulation pédagogique. Les résultats affichés sont des estimations basées sur les données saisies et des hypothèses simplifiées. Ils ne constituent pas un conseil en investissement au sens de la réglementation MiFID II. Consultez un CGP agréé pour toute décision financière.
          </p>
        </div>
      </div>
    </div>
  )
}