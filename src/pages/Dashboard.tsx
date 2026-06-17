import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchAllPrices } from '../lib/prices';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#8b5cf6',
];

const ASSET_LABELS: Record<string, string> = {
  hisse: 'BIST Hisse',
  usd_hisse: 'ABD Hisse',
  kripto: 'Kripto',
  etf: 'ETF',
  doviz: 'Döviz/Altın',
  bes: 'BES',
  vadeli: 'Vadeli Mevduat',
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    const { data: portfolios } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', user.id);

    if (!portfolios?.length) {
      await supabase
        .from('portfolios')
        .insert({ user_id: user.id, name: 'Ana Portföy' });
      setLoading(false);
      return;
    }

    const portfolioId = portfolios[0].id;
    const { data: assetsData } = await supabase
      .from('assets')
      .select('*, manual_values(value, recorded_at)')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false });

    const loadedAssets = assetsData || [];
    setAssets(loadedAssets);
    setLoading(false);

    if (loadedAssets.length > 0) {
      setPricesLoading(true);
      const fetchedPrices = await fetchAllPrices(loadedAssets);
      setPrices(fetchedPrices);
      setLastUpdated(new Date());
      setPricesLoading(false);
    }
  };

  const getAssetValue = (asset: any) => {
    if (['bes', 'vadeli'].includes(asset.type)) {
      const vals = asset.manual_values || [];
      return Number(vals[vals.length - 1]?.value || 0);
    }
    const price = prices[asset.symbol] ?? asset.avg_cost ?? 0;
    return price * Number(asset.quantity);
  };

  const getCostValue = (asset: any) => {
    if (['bes', 'vadeli'].includes(asset.type)) return getAssetValue(asset);
    return (asset.avg_cost || 0) * Number(asset.quantity);
  };

  const groupByType = () => {
    const groups: Record<string, any> = {};
    assets.forEach((asset) => {
      const type = asset.type;
      if (!groups[type])
        groups[type] = { type, label: ASSET_LABELS[type] || type, value: 0 };
      groups[type].value += getAssetValue(asset);
    });
    return Object.values(groups).filter((g) => g.value > 0);
  };

  const pieData = groupByType();
  const total = assets.reduce((sum, a) => sum + getAssetValue(a), 0);
  const totalCost = assets.reduce((sum, a) => sum + getCostValue(a), 0);
  const totalGain = total - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(val);

  const formatPct = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;

  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Yükleniyor...</p>
      </div>
    );

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '16px',
        paddingBottom: '80px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingTop: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700' }}>💼 Portföyüm</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {user.email}
          </p>
        </div>
        <button
          onClick={signOut}
          style={{
            padding: '8px 14px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            fontSize: '13px',
          }}
        >
          Çıkış
        </button>
      </div>

      {/* Toplam Değer */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            marginBottom: '8px',
          }}
        >
          Toplam Portföy Değeri
        </p>
        <p
          style={{
            fontSize: '32px',
            fontWeight: '700',
            color: 'var(--accent)',
          }}
        >
          {formatCurrency(total)}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '8px',
          }}
        >
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {assets.length} varlık
          </span>
          {totalCost > 0 && (
            <span
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: totalGain >= 0 ? 'var(--green)' : 'var(--red)',
              }}
            >
              {formatPct(totalGainPct)} ({formatCurrency(totalGain)})
            </span>
          )}
        </div>
        {pricesLoading && (
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '12px',
              marginTop: '8px',
            }}
          >
            Fiyatlar güncelleniyor...
          </p>
        )}
        {lastUpdated && !pricesLoading && (
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '12px',
              marginTop: '8px',
            }}
          >
            Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
          </p>
        )}
      </div>

      {/* Pasta Grafik */}
      {pieData.length > 0 && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          <p style={{ fontWeight: '600', marginBottom: '16px' }}>Dağılım</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                paddingAngle={3}
              >
                {pieData.map((_: any, index: number) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: any) => formatCurrency(val)} />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            {pieData.map((item: any, index: number) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: COLORS[index % COLORS.length],
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {item.label}
                </span>
                <span style={{ fontWeight: '600' }}>
                  %{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Varlık Listesi */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
        }}
      >
        <p style={{ fontWeight: '600', marginBottom: '16px' }}>Varlıklar</p>
        {assets.length === 0 ? (
          <p
            style={{
              color: 'var(--text-secondary)',
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            Henüz varlık eklenmedi
          </p>
        ) : (
          assets.map((asset: any) => {
            const value = getAssetValue(asset);
            const cost = getCostValue(asset);
            const gain = value - cost;
            const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
            const isManual = ['bes', 'vadeli'].includes(asset.type);
            const hasRealPrice = prices[asset.symbol] !== undefined;

            return (
              <div
                key={asset.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <p style={{ fontWeight: '600', fontSize: '15px' }}>
                    {asset.name}
                  </p>
                  <p
                    style={{ color: 'var(--text-secondary)', fontSize: '12px' }}
                  >
                    {ASSET_LABELS[asset.type]}{' '}
                    {asset.symbol ? `• ${asset.symbol}` : ''}
                    {!isManual && asset.quantity
                      ? ` • ${asset.quantity} adet`
                      : ''}
                  </p>
                  {!isManual && hasRealPrice && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        marginTop: '2px',
                      }}
                    >
                      Birim: {formatCurrency(prices[asset.symbol])}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '600' }}>{formatCurrency(value)}</p>
                  {!isManual && cost > 0 && (
                    <p
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: gain >= 0 ? 'var(--green)' : 'var(--red)',
                      }}
                    >
                      {formatPct(gainPct)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Yenile Butonu */}
      <button
        onClick={fetchAssets}
        disabled={pricesLoading}
        style={{
          width: '100%',
          padding: '12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          color: 'var(--text-secondary)',
          fontSize: '14px',
          marginBottom: '16px',
          opacity: pricesLoading ? 0.6 : 1,
        }}
      >
        {pricesLoading ? 'Güncelleniyor...' : '🔄 Fiyatları Yenile'}
      </button>

      {/* Alt Navigasyon */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '12px 0',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            color: 'var(--accent)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
          }}
        >
          <span style={{ fontSize: '20px' }}>📊</span> Portföy
        </button>
        <button
          onClick={() => navigate('/varliklar')}
          style={{
            background: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
          }}
        >
          <span style={{ fontSize: '20px' }}>➕</span> Varlık Ekle
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
