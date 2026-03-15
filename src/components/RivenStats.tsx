import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { Auction } from '../types';
import { TrendingUp, DollarSign, Activity, Hash, Calendar } from 'lucide-react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface RivenStatsProps {
  auctions: Auction[];
  weaponName: string;
  weaponId: string;
}

export const RivenStats: React.FC<RivenStatsProps> = ({ auctions, weaponName, weaponId }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      const q = query(
        collection(db, 'weapon_activity'),
        where('weaponId', '==', weaponId),
        orderBy('date', 'asc'),
        limit(30)
      );
      try {
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data());
        setHistory(data);
      } catch (error) {
        console.error("Failed to fetch history", error);
        // We don't throw here to avoid crashing the whole stats view if history fails
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [weaponId]);

  const stats = useMemo(() => {
    if (auctions.length === 0) return null;

    const prices = auctions.map(a => a.top_bid || a.buyout_price || a.starting_price).sort((a, b) => a - b);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const median = prices[Math.floor(prices.length / 2)];
    const min = prices[0];
    const max = prices[prices.length - 1];

    // Price distribution buckets - set to 10 as requested
    const bucketSize = 10;
    const distribution: Record<string, number> = {};
    
    prices.forEach(p => {
      const bucket = Math.floor(p / bucketSize) * bucketSize;
      const label = `${bucket}-${bucket + bucketSize}`;
      distribution[label] = (distribution[label] || 0) + 1;
    });

    const distributionData = Object.entries(distribution).map(([range, count]) => ({
      range,
      count,
      sortKey: parseInt(range.split('-')[0])
    })).sort((a, b) => a.sortKey - b.sortKey);

    return {
      avg,
      median,
      min,
      max,
      count: auctions.length,
      distributionData
    };
  }, [auctions]);

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          label="Average Price" 
          value={Math.round(stats.avg)} 
          icon={<TrendingUp className="w-5 h-5 text-warframe-gold" />} 
          suffix=" Plat"
        />
        <StatCard 
          label="Median Price" 
          value={stats.median} 
          icon={<DollarSign className="w-5 h-5 text-warframe-gold" />} 
          suffix=" Plat"
        />
        <StatCard 
          label="Price Range" 
          value={`${stats.min} - ${stats.max}`} 
          icon={<Activity className="w-5 h-5 text-warframe-gold" />} 
          suffix=" Plat"
        />
        <StatCard 
          label="Total Listings" 
          value={stats.count} 
          icon={<Hash className="w-5 h-5 text-warframe-gold" />} 
        />
      </div>

      <div className="bg-warframe-card p-6 rounded-2xl border border-white/5">
        <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
          Price Distribution <span className="text-sm text-gray-500 font-normal">({weaponName})</span>
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.distributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="range" 
                stroke="#666" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                padding={{ left: 20, right: 20 }}
                minTickGap={60}
              />
              <YAxis 
                stroke="#666" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#151518', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#c89b3c' }}
                cursor={{ stroke: '#c89b3c', strokeWidth: 1 }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#c89b3c" 
                strokeWidth={3}
                dot={{ fill: '#c89b3c', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Activity Chart */}
      <div className="bg-warframe-card p-6 rounded-2xl border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium flex items-center gap-2">
            Market Activity <span className="text-sm text-gray-500 font-normal"> (Active Bids over time)</span>
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
            <Calendar className="w-3 h-3" /> Last 30 Days
          </div>
        </div>
        
        {loadingHistory ? (
          <div className="h-[300px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-warframe-gold animate-spin" />
            <p className="text-xs text-gray-600">Loading historical data...</p>
          </div>
        ) : history.length < 2 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-xl">
            <Activity className="w-10 h-10 text-gray-800 mb-4" />
            <p className="text-sm text-gray-500 max-w-xs">
              Not enough historical data yet. Activity is recorded daily when users search for this weapon.
            </p>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorBids" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c89b3c" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#c89b3c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#666" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  stroke="#666" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151518', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#c89b3c' }}
                  labelStyle={{ color: '#666', marginBottom: '4px', fontSize: '10px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="bidCount" 
                  name="Active Bids"
                  stroke="#c89b3c" 
                  fillOpacity={1} 
                  fill="url(#colorBids)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="listingCount" 
                  name="Total Listings"
                  stroke="#444" 
                  fill="transparent" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

const StatCard = ({ label, value, icon, suffix = "" }: { label: string, value: string | number, icon: React.ReactNode, suffix?: string }) => (
  <div className="bg-warframe-card p-4 rounded-2xl border border-white/5 flex items-center gap-4">
    <div className="p-3 bg-white/5 rounded-xl">
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-xl font-bold text-white">{value}{suffix}</p>
    </div>
  </div>
);
