import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePortfolio } from '../context/PortfolioContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const GOAL_USD = 3000000

const Goals = () => {
  const { user } = useAuth()
  const { assets, prices, portfolioId } = usePortfolio()
  const navigate = useNavigate()
  const [manualAssets, setManualAssets] = useState<any[]>([])
  const [savings, setSavings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showAssetForm, setShowAssetForm] = useState(false)
  const [assetForm, setAssetForm] = useState({ name: '', value_try: '', category: 'ev' })

  const [showSavingForm, setShowSavingForm] = useState(false)
  const [savingForm, setSavingForm] = useState({ month: new Date().toISOString().slice(0, 7), amount_try: '' })

  useEffect(() => { if (portfolioId) fetchData() }, [portfolioId])

  const fetchData = async () => {
    const { data: ma } = await supabase
      .from('manual_assets').select('*').eq('portfolio_id', portfolioId).order('created_at', { ascending: false })
    setManualAssets(ma || [])

    const { data: sv } = await supabase
      .from('savings').select('*').eq('portfolio_id', portfolioId).order('month', { ascending: true })
    setSavings(sv || [])

    setLoading(false)
  }

  const usdRate = prices['USDTRY=X'] || 46.4
  const goalTRY = GOAL_USD * usdRate

  const getAssetValue = (asset: any) => {
    if (asset.type === 'vadeli' && asset.principal && asset.interest_rate) {
      const start = new Date(asset.start_date || asset.created_at)
      const days = Math.max(0, Math.floor((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
      const dailyRate = asset.interest_rate / 365 / 100
      return Number(asset.principal) * (1 + dailyRate * days)
    }
    if (['bes', 'vadeli'].includes(asset.type)) {
      const vals = asset.manual_values || []
      return Number(vals[vals.length - 1]?.value || 0)
    }
    const price = prices[asset.symbol] ?? asset.avg_cost ?? 0
    return price * Number(asset.quantity)
  }

  const portfolioTotal = assets.reduce((sum, a) => sum + getAssetValue(a), 0)
  const manualTotal = manualAssets.reduce((sum, a) => sum + Number(a.value_try), 0)
  const grandTotal = portfolioTotal + manualTotal
  const progressPct = Math.min((grandTotal / goalTRY) * 100, 100)

  const handleAddManualAsset = async () => {
    if (!assetForm.name || !assetForm.value_try) return
    await supabase.from('manual_assets').insert({
      portfolio_id: portfolioId,
      name: assetForm.name,
      value_try: Number(assetForm.value_try),
      category: assetForm.category
    })
    setAssetForm({ name: '', value_try: '', category: 'ev' })
    setShowAssetForm(false)
    fetchData()
  }

  const handleDeleteManualAsset = async (id: string) => {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('manual_assets').delete().eq('id', id)
    fetchData()
  }

  const handleAddSaving = async () => {
    if (!savingForm.amount_try) return
    const monthDate = savingForm.month + '-01'
    const { data: existing } = await supabase
      .from('savings').select('id').eq('portfolio_id', portfolioId).eq('month', monthDate).single()

    if (existing) {
      await supabase.from('savings').update({ amount_try: Number(savingForm.amount_try) }).eq('id', existing.id)
    } else {
      await supabase.from('savings').insert({
        portfolio_id: portfolioId,
        month: monthDate,
        amount_try: Number(savingForm.amount_try)
      })
    }
    setSavingForm({ month: new Date().toISOString().slice(0, 7), amount_try: '' })
    setShowSavingForm(false)
    fetchData()
  }

  const fc = (val: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val)

  const chartData = savings.map(s => ({
    month: new Date(s.month).toLocaleString('tr-TR', { month: 'short', year: '2-digit' }),
    tasarruf: Number(s.amount_try)
  }))

  const card = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: 'var(--shadow)'
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '14px'
  }

  const labelStyle = {
    display: 'block', marginBottom: '6px',
    fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'var(--text-secondary)' }}>Yükleniyor...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', paddingBottom: '90px', background: 'var(--bg-primary)', minHeight: '100vh' }}>

      <div style={{ paddingTop: '16px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>🎯 Hedefler</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>$3.000.000 hedefine yolculuk</p>
      </div>

      {/* Hedef Tüpü */}
      <div style={{ ...card, marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
          <p style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>Toplam Varlık</p>
          <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)' }}>%{progressPct.toFixed(1)}</p>
        </div>

        {/* Yatay Tüp */}
        <div style={{ position: 'relative', height: '24px', background: 'var(--bg-elevated)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #059669, #10b981)',
            borderRadius: '12px',
            transition: 'width 0.6s ease'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>₺0</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fc(goalTRY)} ($3.000.000)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' }}>Şu An</p>
            <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{fc(grandTotal)}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>${(grandTotal / usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' }}>Kalan</p>
            <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{fc(Math.max(goalTRY - grandTotal, 0))}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>${Math.max((goalTRY - grandTotal) / usdRate, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>

      {/* Portföy + Manuel Varlık Dağılımı */}
      <div style={{ ...card, marginBottom: '16px' }}>
        <p style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px', color: 'var(--text-primary)' }}>Toplam Dağılım</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>📊 Portföy (Hisse, Kripto vb.)</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{fc(portfolioTotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>🏠 Manuel Varlıklar (Ev, Araba vb.)</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{fc(manualTotal)}</span>
        </div>
      </div>

      {/* Manuel Varlıklar Listesi */}
      <div style={{ ...card, marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <p style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>🏠 Manuel Varlıklar</p>
          <button onClick={() => setShowAssetForm(!showAssetForm)}
            style={{ padding: '6px 12px', background: showAssetForm ? 'var(--bg-elevated)' : 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: '8px', color: 'var(--accent)', fontSize: '12px', fontWeight: '700' }}>
            {showAssetForm ? 'Kapat' : '+ Ekle'}
          </button>
        </div>

        {showAssetForm && (
          <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Ad</label>
              <input value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="örn. Ev" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Değer (₺)</label>
              <input type="number" value={assetForm.value_try} onChange={e => setAssetForm({ ...assetForm, value_try: e.target.value })} placeholder="5000000" style={inputStyle} />
            </div>
            <button onClick={handleAddManualAsset}
              style={{ width: '100%', padding: '10px', background: 'var(--accent)', borderRadius: '8px', color: 'white', fontWeight: '700', fontSize: '14px' }}>
              Kaydet
            </button>
          </div>
        )}

        {manualAssets.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0', fontSize: '13px' }}>Henüz manuel varlık eklenmedi</p>
        ) : (
          manualAssets.map((a: any, i: number) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < manualAssets.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{a.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700' }}>{fc(a.value_try)}</span>
                <button onClick={() => handleDeleteManualAsset(a.id)}
                  style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: '6px', color: 'var(--red)', padding: '4px 8px', fontSize: '11px', fontWeight: '700' }}>
                  Sil
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tasarruf Paneli */}
      <div style={{ ...card, marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <p style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>💰 Aylık Tasarruf</p>
          <button onClick={() => setShowSavingForm(!showSavingForm)}
            style={{ padding: '6px 12px', background: showSavingForm ? 'var(--bg-elevated)' : 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: '8px', color: 'var(--accent)', fontSize: '12px', fontWeight: '700' }}>
            {showSavingForm ? 'Kapat' : '+ Ekle'}
          </button>
        </div>

        {showSavingForm && (
          <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Ay</label>
              <input type="month" value={savingForm.month} onChange={e => setSavingForm({ ...savingForm, month: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Tasarruf Tutarı (₺)</label>
              <input type="number" value={savingForm.amount_try} onChange={e => setSavingForm({ ...savingForm, amount_try: e.target.value })} placeholder="15000" style={inputStyle} />
            </div>
            <button onClick={handleAddSaving}
              style={{ width: '100%', padding: '10px', background: 'var(--accent)', borderRadius: '8px', color: 'white', fontWeight: '700', fontSize: '14px' }}>
              Kaydet
            </button>
          </div>
        )}

        {chartData.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0', fontSize: '13px' }}>Henüz tasarruf kaydı yok</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(val: any) => fc(val)} contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px' }} />
              <Bar dataKey="tasarruf" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Alt Navigasyon */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 16px' }}>
        {[
          { path: '/', icon: '📊', label: 'Portföy' },
          { path: '/performans', icon: '📈', label: 'Performans' },
          { path: '/analitik-varliklar', icon: '📋', label: 'Varlıklar' },
          { path: '/varliklar', icon: '➕', label: 'İşlem' },
          { path: '/hedefler', icon: '🎯', label: 'Hedefler' },
        ].map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            style={{ background: 'none', color: location.pathname === item.path ? 'var(--accent)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '600', padding: '4px 8px' }}>
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Goals