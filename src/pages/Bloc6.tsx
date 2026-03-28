import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, GripVertical } from 'lucide-react'
import SyntheseButton from '../components/SyntheseButton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MifidReponses {
  q1:number; q2:number; q3:number; q4:number; q5:number; q6:number; q7:number
}

interface Bloc6State {
  // Questionnaire risque — étape séparée
  mifidDone: boolean
  reponses: MifidReponses
  // Objectifs
  objectifsSelectionnes: string[]
  objectifsOrder: string[]
  objCapitalMontant: string
  objCapitalHorizon: number
  objRevenusMontant: string
  objRevenusQuand: string
  objImpotsEconomie: string
  objImpotsToleranceBlockage: string
  objTransmissionMontant: string
  objTransmissionBenef: string[]
  objTransmissionHorizon: string
  // Convictions — question préalable
  aConvictions: boolean | null
  universInvest: string[]
  prefGeo: string
  secteursPriv: string[]
  secteursExcl: string[]
  prefESG: string
  // Diversification & suivi
  liquiditePct: number
  suiviFrequence: string
  modeConseil: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T extends object>(key:string, fb:T):T {
  try{const r=localStorage.getItem(key);if(!r)return fb;return{...fb,...JSON.parse(r)}}catch{return fb}
}
const fmt=(n:number)=>n.toLocaleString('fr-FR',{maximumFractionDigits:0})
const pn=(s:unknown)=>{const n=parseFloat(String(s).replace(/\s/g,'').replace(',','.'));return isNaN(n)?0:n}

function getProfilMifid(score:number) {
  if(score<=10) return {label:'Défensif',      color:'#185FA5', bg:'#E6F1FB', text:'#0C447C', pos:0}
  if(score<=14) return {label:'Équilibré',     color:'#0F6E56', bg:'#E1F5EE', text:'#085041', pos:1}
  if(score<=17) return {label:'Dynamique',     color:'#D97706', bg:'#FEF3C7', text:'#92400E', pos:2}
  return           {label:'Offensif',          color:'#DC2626', bg:'#FEF2F2', text:'#991B1B', pos:3}
}

const PROFIL_LABELS = ['Défensif','Équilibré','Dynamique','Offensif']

// ─── UI de base ───────────────────────────────────────────────────────────────

function SectionTitle({children}:{children:string}){
  return(<div className="flex items-center gap-3 mb-5"><span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">{children}</span><div className="flex-1 h-px bg-gray-100"/></div>)
}
function Field({label,children,tooltip}:{label:string;children:React.ReactNode;tooltip?:string}){
  return(<div><div className="flex items-center gap-1.5 mb-2"><label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest">{label}</label>{tooltip&&<div className="group relative"><span className="w-4 h-4 rounded-full border border-gray-200 text-gray-400 text-[10px] flex items-center justify-center cursor-help">?</span><div className="absolute bottom-6 left-0 bg-gray-900 text-white text-[11px] px-3 py-2 rounded-lg w-56 hidden group-hover:block z-20 shadow-xl">{tooltip}</div></div>}</div>{children}</div>)
}
function Input({value,onChange,type='text',placeholder='',suffix}:{value:string;onChange:(v:string)=>void;type?:string;placeholder?:string;suffix?:string}){
  return(<div className="relative"><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full h-10 bg-gray-50 border border-transparent rounded-lg px-3 text-[13px] text-gray-800 placeholder-gray-300 focus:outline-none focus:bg-white focus:border-[#185FA5] focus:shadow-[0_0_0_3px_rgba(24,95,165,0.08)] transition-all" style={suffix?{paddingRight:'2.5rem'}:{}}/>{suffix&&<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 pointer-events-none">{suffix}</span>}</div>)
}
function Chips({options,value,onChange,multi=false,small=false}:{options:string[];value:string|string[];onChange:(v:string|string[])=>void;multi?:boolean;small?:boolean}){
  const isSel=(o:string)=>multi?(value as string[]).includes(o):value===o
  const click=(o:string)=>{if(multi){const a=value as string[];onChange(a.includes(o)?a.filter(x=>x!==o):[...a,o])}else onChange(o)}
  return(<div className="flex flex-wrap gap-2">{options.map(o=><button key={o} type="button" onClick={()=>click(o)} className={`${small?'px-3 py-1.5 text-[11px]':'px-3.5 py-2 text-[12px]'} rounded-lg border transition-all font-medium ${isSel(o)?'bg-[#185FA5] border-[#185FA5] text-white':'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{o}</button>)}</div>)
}
function InfoCard({children,color='blue'}:{children:React.ReactNode;color?:'blue'|'amber'|'green'|'red'}){
  const s={blue:'bg-[#E6F1FB] text-[#0C447C] border-[#185FA5]/20',amber:'bg-amber-50 text-amber-800 border-amber-200',green:'bg-[#E1F5EE] text-[#085041] border-[#0F6E56]/20',red:'bg-red-50 text-red-700 border-red-200'}
  return<div className={`rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${s[color]}`}>{children}</div>
}

// ─── DragList priorisation ────────────────────────────────────────────────────

function PriorityList({items,onChange}:{items:string[];onChange:(items:string[])=>void}){
  const [drag,setDrag]=useState<number|null>(null)
  const [over,setOver]=useState<number|null>(null)
  const end=()=>{if(drag!==null&&over!==null&&drag!==over){const n=[...items];const[m]=n.splice(drag,1);n.splice(over,0,m);onChange(n)}setDrag(null);setOver(null)}
  return(
    <div className="space-y-2">
      {items.map((item,i)=>(
        <div key={item} draggable onDragStart={()=>setDrag(i)} onDragOver={e=>{e.preventDefault();setOver(i)}} onDragEnd={end}
          className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3 cursor-grab active:cursor-grabbing transition-all ${over===i&&drag!==i?'border-[#185FA5] bg-[#E6F1FB]':'border-gray-100'}`}>
          <span className="w-6 h-6 rounded-full bg-[#185FA5] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
          <span className="text-[13px] text-gray-700 font-medium flex-1">{item}</span>
          <GripVertical size={16} className="text-gray-300"/>
        </div>
      ))}
    </div>
  )
}

// ─── Questionnaire MiFID (étape séparée) ─────────────────────────────────────

function QuestionnaireMifid({reponses,onChange,onValidate}:{
  reponses:MifidReponses;
  onChange:(r:MifidReponses)=>void;
  onValidate:()=>void
}){
  const questions = [
    {q:'Votre portefeuille perd 20% en 3 mois. Quelle est votre réaction ?',opts:[{l:'Je vends tout pour sécuriser ce qui reste',p:1},{l:"J'attends sans rien faire",p:2},{l:"Je renforce mes positions, c'est une opportunité",p:3}]},
    {q:'Pour vos investissements, votre horizon de placement est :',opts:[{l:'Moins de 3 ans',p:1},{l:'Entre 3 et 8 ans',p:2},{l:'Plus de 8 ans',p:3}]},
    {q:'Votre priorité en matière d\'investissement est :',opts:[{l:'Protéger mon capital avant tout, même si le rendement est faible',p:1},{l:'Générer des revenus réguliers avec un risque limité',p:2},{l:'Faire croître mon capital sur le long terme',p:3}]},
    {q:'Votre expérience en matière d\'investissement financier :',opts:[{l:'Nulle ou très limitée',p:1},{l:'Quelques investissements sur des produits simples (livrets, AV)',p:2},{l:'Expérience régulière sur des produits variés (actions, ETF, immobilier...)',p:3}]},
    {q:'Dans les 12 prochains mois, vous pourriez avoir besoin de mobiliser :',opts:[{l:"Plus de 50% de votre épargne",p:1},{l:'Entre 10% et 50%',p:2},{l:'Moins de 10%',p:3}]},
    {q:'Une baisse temporaire de 30% de votre portefeuille vous semble :',opts:[{l:"Inacceptable — je ne peux pas supporter cette perte",p:1},{l:"Difficile mais supportable sur le court terme",p:2},{l:"Une opportunité d'achat à saisir",p:3}]},
    {q:"En cas de perte totale de cet investissement, l'impact sur votre vie quotidienne serait :",opts:[{l:'Catastrophique — cela affecterait gravement mon niveau de vie',p:1},{l:'Difficile mais gérable',p:2},{l:"Négligeable — cela n'affecterait pas mon niveau de vie",p:3}]},
  ]
  const keys:('q1'|'q2'|'q3'|'q4'|'q5'|'q6'|'q7')[]=(['q1','q2','q3','q4','q5','q6','q7'])
  const score=Object.values(reponses).reduce((a,b)=>a+b,0)
  const nb=Object.values(reponses).filter(v=>v>0).length
  const profil=nb===7?getProfilMifid(score):null

  return(
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <span className="text-[11px] font-semibold text-[#185FA5] uppercase tracking-widest">Questionnaire obligatoire</span>
        <h2 className="text-[22px] font-bold text-gray-900">Profil investisseur MiFID II</h2>
        <p className="text-[13px] text-gray-400">7 questions pour déterminer votre tolérance au risque</p>
      </div>

      <InfoCard color="blue">Ce questionnaire est conforme aux exigences MiFID II. Vos réponses déterminent votre profil investisseur officiel.</InfoCard>

      {/* Progression */}
      <div className="flex gap-1 justify-center">
        {keys.map((k,i)=><div key={k} className={`h-1.5 rounded-full transition-all ${reponses[k]>0?'bg-[#185FA5] w-8':'bg-gray-200 w-4'}`}/>)}
      </div>
      <p className="text-[12px] text-gray-400 text-center">Question {Math.min(nb+1,7)} / 7</p>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q,i)=>(
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-7 h-7 rounded-full bg-[#E6F1FB] text-[#0C447C] text-[12px] font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
              <p className="text-[14px] font-semibold text-gray-800 leading-snug">{q.q}</p>
            </div>
            <div className="space-y-2">
              {q.opts.map((opt,j)=>(
                <button key={j} type="button" onClick={()=>onChange({...reponses,[keys[i]]:opt.p})}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-[13px] ${reponses[keys[i]]===opt.p?'bg-[#185FA5] border-[#185FA5] text-white':'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'}`}>
                  <span className={`font-semibold mr-2 ${reponses[keys[i]]===opt.p?'text-blue-200':'text-gray-400'}`}>{['a','b','c'][j]})</span>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Résultat */}
      {profil&&(
        <div className="rounded-2xl border-2 p-6 space-y-3" style={{borderColor:profil.color,backgroundColor:profil.bg}}>
          <div className="flex items-center justify-between">
            <div><p className="text-[11px] uppercase tracking-widest mb-1" style={{color:profil.text}}>Votre profil investisseur</p>
              <p className="text-[26px] font-bold" style={{color:profil.color}}>{profil.label}</p></div>
            <div className="text-right"><p className="text-[11px] uppercase tracking-widest mb-1" style={{color:profil.text}}>Score MiFID II</p>
              <p className="text-[26px] font-bold" style={{color:profil.color}}>{score} / 21</p></div>
          </div>
          {/* Jauge */}
          <div className="relative h-3 rounded-full overflow-hidden flex">
            {PROFIL_LABELS.map((l,i)=>{
              const p=getProfilMifid(i<=0?8:i<=1?12:i<=2?16:19)
              return<div key={l} className="flex-1 transition-all" style={{backgroundColor:i===profil.pos?p.color:`${p.color}30`}}/>
            })}
          </div>
          <div className="flex justify-between text-[9px] text-gray-500">
            {PROFIL_LABELS.map(l=><span key={l} className={l===profil.label?'font-bold':''}>{ l}</span>)}
          </div>
          <p className="text-[11px] text-gray-400 italic">Ce profil peut être ajusté par votre conseiller avec justification.</p>
        </div>
      )}

      <button type="button" disabled={nb<7} onClick={onValidate}
        className="w-full py-4 rounded-2xl bg-[#185FA5] text-white text-[14px] font-semibold hover:bg-[#0C447C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(24,95,165,0.25)]">
        {nb<7?`Répondre aux ${7-nb} questions restantes`:'Valider mon profil investisseur →'}
      </button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Bloc6() {
  const navigate = useNavigate()
  const [savedAt, setSavedAt] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [toast, setToast] = useState(false)

  const bloc5 = loadLS<{retraiteP1?:{ageDepartSouhaite?:number;revenusCibles?:number}}>('patrisim_bloc5',{})
  const bloc4 = loadLS<{fiscal?:{tmi?:number};p1Pro?:{salaire?:string}}>('patrisim_bloc4',{})
  const tmi = bloc4.fiscal?.tmi||30
  const plafondPer = Math.min(pn(bloc4.p1Pro?.salaire)*12*0.10,35194)
  const patrimoineBrut = loadLS<{totalImmo?:number;totalFinancier?:number;totalAutres?:number}>('patrisim_bloc2',{})
  const patrimoineActuel = (patrimoineBrut.totalImmo||0)+(patrimoineBrut.totalFinancier||0)+(patrimoineBrut.totalAutres||0)

  const [state, setState] = useState<Bloc6State>(() => {
    const s = loadLS<Bloc6State>('patrisim_bloc6',{
      mifidDone:false,
      reponses:{q1:0,q2:0,q3:0,q4:0,q5:0,q6:0,q7:0},
      objectifsSelectionnes:[], objectifsOrder:[],
      objCapitalMontant:'', objCapitalHorizon:15,
      objRevenusMontant:'', objRevenusQuand:'',
      objImpotsEconomie:'', objImpotsToleranceBlockage:'',
      objTransmissionMontant:'', objTransmissionBenef:[], objTransmissionHorizon:'',
      aConvictions:null,
      universInvest:[], prefGeo:'', secteursPriv:[], secteursExcl:[], prefESG:'',
      liquiditePct:20, suiviFrequence:'', modeConseil:'',
    } as Bloc6State)
    // Pré-remplir retraite depuis Bloc5
    if(!s.objCapitalMontant&&bloc5.retraiteP1?.revenusCibles) s.objCapitalMontant=String(bloc5.retraiteP1.revenusCibles*12*25)
    return s
  })

  const upd = useCallback(<K extends keyof Bloc6State>(k:K,v:Bloc6State[K])=>setState(s=>({...s,[k]:v})),[])
  useEffect(()=>{localStorage.setItem('patrisim_bloc6',JSON.stringify(state));setSavedAt(new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}))},[state])

  // Sync order des objectifs
  useEffect(()=>{
    const cur=state.objectifsOrder.filter(o=>state.objectifsSelectionnes.includes(o))
    const news=state.objectifsSelectionnes.filter(o=>!state.objectifsOrder.includes(o))
    upd('objectifsOrder',[...cur,...news])
  },[state.objectifsSelectionnes])

  const score=Object.values(state.reponses).reduce((a,b)=>a+b,0)
  const profil=state.mifidDone?getProfilMifid(score):null

  // Calculs objectifs
  const montantCible=pn(state.objCapitalMontant)
  const gap=Math.max(0,montantCible-patrimoineActuel)
  const effortMensuel=state.objCapitalHorizon>0&&gap>0?Math.round(gap/(((Math.pow(1.04,state.objCapitalHorizon)-1)/(0.04/12)))):0
  const capitalRente=pn(state.objRevenusMontant)*12/0.04

  const handleSuivant=()=>{
    const e:string[]=[]
    if(!state.mifidDone) e.push('Complétez d\'abord le questionnaire MiFID II')
    if(!state.objectifsSelectionnes.length) e.push('Sélectionnez au moins un objectif patrimonial')
    if(e.length){setErrors(e);return}
    setToast(true)
    setTimeout(()=>navigate('/bloc7'),1200)
  }

  // Si questionnaire MiFID pas encore fait — afficher QCM en pleine page
  if(!state.mifidDone){
    return(
      <div className="min-h-screen bg-[#F8F8F6]">
        <div className="max-w-3xl mx-auto px-8 py-8 pb-24">
          <div className="mb-6 flex items-center gap-3">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 6 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#185FA5] rounded-full" style={{width:'85%'}}/></div>
            {savedAt&&<span className="ml-auto text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"/>Brouillon · {savedAt}</span>}
          </div>
          <QuestionnaireMifid
            reponses={state.reponses}
            onChange={r=>upd('reponses',r)}
            onValidate={()=>upd('mifidDone',true)}
          />
        </div>
        <div className="fixed bottom-0 left-[220px] right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 px-8 py-4 flex justify-between z-30">
          <button type="button" onClick={()=>navigate('/bloc5')} className="text-[13px] text-gray-400 hover:text-gray-600">← Retour</button>
        </div>
      </div>
    )
  }

  // Formulaire principal (après MiFID)
  return(
    <div className="min-h-screen bg-[#F8F8F6]">
      {toast&&<div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-[13px] font-medium"><CheckCircle size={16} className="text-green-400"/>Étape 6 enregistrée ✓</div>}

      <div className="max-w-4xl mx-auto px-8 py-8 pb-40">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Étape 6 sur 7</span>
            <div className="flex-1 max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#185FA5] rounded-full" style={{width:'85%'}}/></div>
            {savedAt&&<span className="ml-auto text-[11px] text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"/>Brouillon · {savedAt}</span>}
          </div>
          <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight">Profil investisseur</h1>
        </div>

        {/* Badge profil MiFID */}
        {profil&&(
          <div className="mb-6 rounded-2xl p-4 flex items-center justify-between" style={{backgroundColor:profil.bg,borderWidth:2,borderStyle:'solid',borderColor:profil.color}}>
            <div>
              <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{color:profil.text}}>Votre profil MiFID II</p>
              <p className="text-[20px] font-bold" style={{color:profil.color}}>{profil.label} · {score}/21</p>
            </div>
            <button type="button" onClick={()=>upd('mifidDone',false)} className="text-[11px] text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg">
              Modifier le questionnaire
            </button>
          </div>
        )}

        {/* ══ OBJECTIFS ══════════════════════════════════════════════════ */}
        <SectionTitle>Objectifs patrimoniaux</SectionTitle>
        <p className="text-[13px] text-gray-400 mb-4">Sélectionnez vos objectifs — PatriSim les intégrera dans l'analyse IA.</p>

        <div className="mb-4">
          <Chips
            options={['Préparer ma retraite','Atteindre un capital cible','Générer des revenus complémentaires','Réduire mes impôts','Transmettre un patrimoine','Acquérir ma résidence principale','Financer les études de mes enfants','Autre objectif']}
            value={state.objectifsSelectionnes} onChange={v=>upd('objectifsSelectionnes',v as string[])} multi small
          />
        </div>

        <div className="space-y-4 mb-6">
          {state.objectifsSelectionnes.includes('Atteindre un capital cible')&&(
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-[13px] font-semibold text-gray-800">Atteindre un capital cible</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Montant cible"><Input value={state.objCapitalMontant} onChange={v=>upd('objCapitalMontant',v)} placeholder="250 000" suffix="€"/></Field>
                <Field label="Horizon">
                  <div className="space-y-1">
                    <div className="flex justify-between mb-1"><span className="text-[12px] text-gray-500">Horizon</span><span className="text-[12px] font-bold text-[#185FA5]">{state.objCapitalHorizon} ans</span></div>
                    <input type="range" min={1} max={30} value={state.objCapitalHorizon} onChange={e=>upd('objCapitalHorizon',Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]"/>
                  </div>
                </Field>
              </div>
              {montantCible>0&&<InfoCard color="blue">Patrimoine actuel : <strong>{fmt(patrimoineActuel)} €</strong> · Manque : <strong>{fmt(gap)} €</strong> · Effort mensuel estimé : <strong>{fmt(effortMensuel)} €/mois</strong> (4%/an)</InfoCard>}
            </div>
          )}

          {state.objectifsSelectionnes.includes('Générer des revenus complémentaires')&&(
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-[13px] font-semibold text-gray-800">Générer des revenus complémentaires</p>
              <Field label="Montant souhaité"><Input value={state.objRevenusMontant} onChange={v=>upd('objRevenusMontant',v)} placeholder="500" suffix="€/mois"/></Field>
              <Field label="À partir de quand">
                <Chips options={['Maintenant','Dans 3 ans','Dans 5 ans','À la retraite']} value={state.objRevenusQuand} onChange={v=>upd('objRevenusQuand',v as string)} small/>
              </Field>
              {pn(state.objRevenusMontant)>0&&<InfoCard color="blue">Capital nécessaire pour générer <strong>{state.objRevenusMontant} €/mois</strong> en rente : <strong>{fmt(capitalRente)} €</strong> (4%/an)</InfoCard>}
            </div>
          )}

          {state.objectifsSelectionnes.includes('Réduire mes impôts')&&(
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-[13px] font-semibold text-gray-800">Réduire mes impôts</p>
              {tmi>=30&&plafondPer>0&&<InfoCard color="amber">Avec votre TMI à <strong>{tmi}%</strong>, un versement PER de <strong>{fmt(plafondPer)} €</strong> vous économise <strong>{fmt(Math.round(plafondPer*tmi/100))} €/an</strong>.</InfoCard>}
              <Field label="Économie annuelle souhaitée"><Input value={state.objImpotsEconomie} onChange={v=>upd('objImpotsEconomie',v)} placeholder="2 000" suffix="€/an"/></Field>
              <Field label="Tolérance blocage des fonds">
                <Chips options={['Court terme acceptable','Long terme uniquement','Peu importe']} value={state.objImpotsToleranceBlockage} onChange={v=>upd('objImpotsToleranceBlockage',v as string)} small/>
              </Field>
            </div>
          )}

          {state.objectifsSelectionnes.includes('Transmettre un patrimoine')&&(
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-[13px] font-semibold text-gray-800">Transmettre un patrimoine</p>
              <Field label="Montant cible à transmettre"><Input value={state.objTransmissionMontant} onChange={v=>upd('objTransmissionMontant',v)} placeholder="200 000" suffix="€"/></Field>
              <Field label="À qui">
                <Chips options={['Enfants','Conjoint','Petits-enfants','Association','Mixte']} value={state.objTransmissionBenef} onChange={v=>upd('objTransmissionBenef',v as string[])} multi small/>
              </Field>
              <Field label="Horizon">
                <Chips options={['De mon vivant','À mon décès','Les deux']} value={state.objTransmissionHorizon} onChange={v=>upd('objTransmissionHorizon',v as string)} small/>
              </Field>
            </div>
          )}
        </div>

        {/* Priorisation */}
        {state.objectifsOrder.length>1&&(
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-8">
            <p className="text-[13px] font-semibold text-gray-800">Classez vos objectifs par ordre de priorité</p>
            <p className="text-[12px] text-gray-400">Faites glisser pour réorganiser — l'objectif n°1 guidera l'analyse IA</p>
            <PriorityList items={state.objectifsOrder} onChange={items=>upd('objectifsOrder',items)}/>
          </div>
        )}

        {/* ══ CONVICTIONS — question préalable ════════════════════════════ */}
        <SectionTitle>Convictions & préférences d'investissement</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-6">
          <Field label="Avez-vous des convictions particulières sur vos investissements ?">
            <div className="flex gap-3">
              {[{l:'Oui, j\'ai des préférences précises',v:true},{l:'Non / Je ne sais pas encore',v:false}].map(opt=>(
                <button key={String(opt.v)} type="button" onClick={()=>upd('aConvictions',opt.v)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 text-[13px] text-left transition-all ${state.aConvictions===opt.v?'border-[#185FA5] bg-[#E6F1FB] text-[#0C447C] font-semibold':'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </Field>

          {state.aConvictions===false&&(
            <InfoCard color="blue">Pas de problème — l'analyse IA s'appuiera sur votre profil MiFID II (<strong>{profil?.label}</strong>) pour formuler des recommandations adaptées.</InfoCard>
          )}

          {state.aConvictions===true&&(
            <div className="space-y-5 pt-2 border-t border-gray-100">
              <Field label="Types de placements qui vous intéressent">
                <Chips options={['Immobilier physique','SCPI / OPCI','Bourse — actions','ETF / Fonds indiciels','Obligations','Assurance-vie','PER','Private equity','Or et métaux précieux','Cryptomonnaies','ISR / ESG / Impact investing']}
                  value={state.universInvest} onChange={v=>upd('universInvest',v as string[])} multi small/>
              </Field>
              <Field label="Préférence géographique">
                <Chips options={['France uniquement','Europe','Monde entier','Marchés émergents inclus']} value={state.prefGeo} onChange={v=>upd('prefGeo',v as string)} small/>
              </Field>
              <Field label="Secteurs à exclure (optionnel)">
                <Chips options={['Armement','Tabac','Alcool',"Jeux d'argent",'Énergies fossiles']} value={state.secteursExcl} onChange={v=>upd('secteursExcl',v as string[])} multi small/>
              </Field>
              <Field label="Approche ESG / Investissement responsable">
                <Chips options={['Pas de préférence','Critères ESG importants','ESG prioritaire','Impact investing uniquement']} value={state.prefESG} onChange={v=>upd('prefESG',v as string)} small/>
              </Field>
            </div>
          )}
        </div>

        {/* ══ SUIVI ═══════════════════════════════════════════════════════ */}
        <SectionTitle>Suivi & accompagnement</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-6">
          <div className="space-y-2">
            <Field label="Quelle part de votre patrimoine souhaitez-vous pouvoir mobiliser rapidement ?">
              <div className="space-y-2">
                <div className="flex justify-between mb-1"><span className="text-[12px] text-gray-500">Liquidité souhaitée</span><span className="text-[12px] font-bold text-[#185FA5]">{state.liquiditePct}%{patrimoineActuel>0?` (≈ ${fmt(Math.round(patrimoineActuel*state.liquiditePct/100))} €)`:''}</span></div>
                <input type="range" min={0} max={100} step={5} value={state.liquiditePct} onChange={e=>upd('liquiditePct',Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#185FA5]"/>
              </div>
            </Field>
          </div>
          <Field label="Fréquence de suivi souhaitée">
            <Chips options={['Mensuelle','Trimestrielle','Semestrielle','Annuelle']} value={state.suiviFrequence} onChange={v=>upd('suiviFrequence',v as string)} small/>
          </Field>
          <Field label="Mode de conseil préféré">
            <Chips options={['Autonome (je décide seul)','Guidé (conseils puis je décide)','Délégué (je fais confiance au conseiller)']} value={state.modeConseil} onChange={v=>upd('modeConseil',v as string)} small/>
          </Field>
        </div>

        {/* Erreurs */}
        {errors.length>0&&<div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-1">{errors.map(e=><p key={e} className="text-[12px] text-red-600">⚠ {e}</p>)}</div>}
      </div>

      <SyntheseButton
        onSuivant={handleSuivant}
        onRetour={()=>navigate('/bloc5')}
        labelSuivant="Suivant — Succession & transmission →"
        savedAt={savedAt}
        errors={errors}
        items={[
          ...(profil?[{label:'Profil MiFID II',value:profil.label,color:`text-[${profil.color}]`}]:[]),
          {label:'Objectifs sélectionnés',value:`${state.objectifsSelectionnes.length}`},
          {label:'Objectif principal',value:state.objectifsOrder[0]||'—'},
          {label:'Liquidité souhaitée',value:`${state.liquiditePct}%`},
        ]}
      />
    </div>
  )
}