import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchSnapshots } from '../lib/snapshot'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const Analytics = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [portfolioId, setPortfolioId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<number>(30)

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (portfolioId) loadSnapshots(portfolioId, range) }, [range, portfolioId])

  const fetchData = async () => {
    const { data: portfolios } = await supabase
      .from('portfolios').select('id').eq('user_id', user.id)
    if (portfolios?.length) {
      setPortfolioId(portfolios[0].id)
      await loadSnapshots(portfolios[0].id, range)
    }
    setLoading(false)
  }

  const loadSnapshots = async (pid: string, days: number) => {
    const data = await fetchSnapshots(pid, days)
    setSnapshots(data)
  }

  const fc = (val: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'short' })}`
  }

  const chartData = snapshots.map(s => ({
    date: formatDate(s.snapshot_date),
    deger: Number(s.total_value),
    maliyet: Number(s.total_cost),
    kar: Number(s.total_value) - Number(s.total_cost)
  }))

  const first = chartData[0]?.deger || 0
  const last = chartData[chartData.length - 1]?.deger || 0
  const totalGain = last - first
  const totalGainPct = first > 0 ? (totalGain / first) * 100 : 0

  const ranges = [
    { label: '7G', value: 7 },
    { label: '1A', value: 30 },
    { label: '3A', value: 90 },
    { label: '6A', value: 180 },
    { label: '1Y', value: 365 },
  ]

  const card = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: 'var(--shadow)'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'var(--text-secondary)' }}>Yükleniyor...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', paddingBottom: '90px', background: 'var(--bg-primary)', minHeight: '100vh' }}>

      <div style={{ paddingTop: '16px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Analitik</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Portföy performansı</p>
      </div>

      {snapshots.length < 2 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 16px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>📊</p>
          <p style={{ fontWeight: '700', fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)' }}>Henüz yeterli veri yok</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
            Grafik oluşması için en az 2 gün fiyat yenilemen gerekiyor.
          </p>
        </div>
      ) : (
        <>
          {/* Özet Kartlar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Başlangıç', value: fc(first), color: 'var(--text-primary)' },
              { label: 'Güncel', value: fc(last), color: 'var(--accent)' },
              { label: 'Dönem Değişimi', value: `${totalGain >= 0 ? '+' : ''}${fc(totalGain)}`, color: totalGain >= 0 ? 'var(--green)' : 'var(--red)', sub: `${totalGain >= 0 ? '+' : ''}${totalGainPct.toFixed(2)}%` },
              { label: 'Toplam Kar/Zarar', value: fc(last - (chartData[chartData.length-1]?.maliyet||0)), color: (last - (chartData[chartData.length-1]?.maliyet||0)) >= 0 ? 'var(--green)' : 'var(--red)' },
            ].map((item, i) => (
              <div key={i} style={{ ...card, padding: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' as const, fontWeight: '600', letterSpacing: '0.5px' }}>{item.label}</p>
                <p style={{ fontSize: '16px', fontWeight: '700', color: item.color }}>{item.value}</p>
                {item.sub && <p style={{ fontSize: '12px', color: item.color, marginTop: '2px', fontWeight: '600' }}>{item.sub}</p>}
              </div>
            ))}
          </div>

          {/* Zaman Aralığı */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            {ranges.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                style={{ flex: 1, padding: '8px 0', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
                  background: range === r.value ? 'var(--accent)' : 'var(--bg-card)',
                  border: `1px solid ${range === r.value ? 'var(--accent)' : 'var(--border)'}`,
                  color: range === r.value ? 'white' : 'var(--text-secondary)',
                  boxShadow: 'var(--shadow)'
                }}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Büyüme Grafiği */}
          <div style={{ ...card, marginBottom: '16px' }}>
            <p style={{ fontWeight: '700', fontSize: '15px', marginBottom: '16px', color: 'var(--text-primary)' }}>Portföy Büyümesi</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDeger" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMaliyet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(val: any) => fc(val)} contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px', boxShadow: 'var(--shadow-md)' }} />
                <Area type="monotone" dataKey="deger" name="Değer" stroke="#6366f1" fill="url(#colorDeger)" strokeWidth={2} />
                <Area type="monotone" dataKey="maliyet" name="Maliyet" stroke="#9ca3af" fill="url(#colorMaliyet)" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Kar/Zarar Grafiği */}
          <div style={{ ...card, marginBottom: '16px' }}>
            <p style={{ fontWeight: '700', fontSize: '15px', marginBottom: '16px', color: 'var(--text-primary)' }}>Kar/Zarar Performansı</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorKar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(val: any) => fc(val)} contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px', boxShadow: 'var(--shadow-md)' }} />
                <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
                <Area type="monotone" dataKey="kar" name="Kar/Zarar" stroke="#059669" fill="url(#colorKar)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Alt Navigasyon */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 16px' }}>
        {[
          { path: '/', icon: '📊', label: 'Portföy' },
          { path: '/analitik', icon: '📈', label: 'Analitik' },
          { path: '/varliklar', icon: '➕', label: 'İşlem' },
        ].map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            style={{ background: 'none', color: location.pathname === item.path ? 'var(--accent)' : 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '600', padding: '4px 16px' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Analytics