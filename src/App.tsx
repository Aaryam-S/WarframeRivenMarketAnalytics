import React, { useState, useEffect, useMemo, ErrorInfo, ReactNode } from 'react';
import { warframeMarketService } from './services/warframeMarket';
import { RivenItem, RivenAttribute, Auction } from './types';
import { RivenStats } from './components/RivenStats';
import { AuctionList } from './components/AuctionList';
import { Search, Loader2, Info, AlertCircle, ChevronRight, LayoutGrid, BarChart2, X, ChevronDown, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, loginWithGoogle, logout, db, OperationType, handleFirestoreError, testConnection } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [error, setError] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [rivenItems, setRivenItems] = useState<RivenItem[]>([]);
  const [attributes, setAttributes] = useState<RivenAttribute[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWeapon, setSelectedWeapon] = useState<RivenItem | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [view, setView] = useState<'list' | 'stats'>('list');
  const [onlyWithBids, setOnlyWithBids] = useState(false);
  const [positiveFilters, setPositiveFilters] = useState<string[]>([]);
  const [negativeFilter, setNegativeFilter] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const [items, attrs] = await Promise.all([
          warframeMarketService.getRivenItems(),
          warframeMarketService.getRivenAttributes()
        ]);
        setRivenItems(items);
        setAttributes(attrs);
      } catch (error) {
        console.error("Failed to load metadata", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return [];
    return rivenItems
      .filter(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 8);
  }, [searchQuery, rivenItems]);

  const recordActivity = async (weapon: RivenItem, auctions: Auction[]) => {
    if (!auth.currentUser) return;
    
    const date = new Date().toISOString().split('T')[0];
    const activityId = `${weapon.url_name}_${date}`;
    const bidCount = auctions.filter(a => (a.top_bid && a.top_bid > 0)).length;
    
    const path = `weapon_activity/${activityId}`;
    try {
      await setDoc(doc(db, 'weapon_activity', activityId), {
        weaponId: weapon.url_name,
        weaponName: weapon.item_name,
        date,
        bidCount,
        listingCount: auctions.length,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      setError(err);
    }
  };

  const handleSearch = async (item: RivenItem) => {
    setSelectedWeapon(item);
    setSearchQuery('');
    setPositiveFilters([]);
    setNegativeFilter(null);
    setSearching(true);
    try {
      const results = await warframeMarketService.searchAuctions(item.url_name);
      setAuctions(results);
      recordActivity(item, results);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setSearching(false);
    }
  };

  const displayedAuctions = useMemo(() => {
    let filtered = auctions;
    
    if (onlyWithBids) {
      filtered = filtered.filter(a => (a.top_bid && a.top_bid > 0));
    }

    if (positiveFilters.length > 0) {
      filtered = filtered.filter(auction => {
        const auctionPositives = auction.item.attributes.filter(attr => attr.positive).map(attr => attr.url_name);
        return positiveFilters.every(filter => auctionPositives.includes(filter));
      });
    }

    if (negativeFilter) {
      filtered = filtered.filter(auction => {
        const auctionNegatives = auction.item.attributes.filter(attr => !attr.positive).map(attr => attr.url_name);
        return auctionNegatives.includes(negativeFilter);
      });
    }

    return filtered;
  }, [auctions, onlyWithBids, positiveFilters, negativeFilter]);

  const togglePositiveFilter = (urlName: string) => {
    setPositiveFilters(prev => {
      if (prev.includes(urlName)) {
        return prev.filter(f => f !== urlName);
      }
      if (prev.length < 3) {
        return [...prev, urlName];
      }
      return prev;
    });
  };

  const getAttrLabel = (attr: RivenAttribute) => {
    if (attr.item_name) return attr.item_name;
    return attr.url_name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-warframe-gold animate-spin" />
        <p className="text-gray-400 animate-pulse">Synchronizing with Warframe.market...</p>
      </div>
    );
  }

  if (error) {
    let message = "Something went wrong.";
    if (error.message) {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) message = `Market Data Error: ${parsed.error}`;
      } catch (e) {
        message = error.message;
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-warframe-card border border-red-500/30 p-8 rounded-3xl max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-white">Application Error</h2>
          <p className="text-gray-400 mb-6 text-sm">{message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition-all text-sm font-medium"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <header className="mb-12 flex flex-col items-center">
        <div className="w-full flex justify-end mb-8">
          {authReady && (
            <div className="flex items-center gap-4 bg-warframe-card border border-white/10 p-2 rounded-2xl">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-warframe-gold/20 flex items-center justify-center overflow-hidden border border-warframe-gold/30">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-warframe-gold" />
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-bold text-white leading-none">{user.displayName}</p>
                      <p className="text-[10px] text-gray-500 leading-none mt-1">Contributor</p>
                    </div>
                  </div>
                  <button 
                    onClick={logout}
                    className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-red-400 transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={loginWithGoogle}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all text-sm font-medium"
                >
                  <LogIn className="w-4 h-4 text-warframe-gold" />
                  Login to Track Activity
                </button>
              )}
            </div>
          )}
        </div>

        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold mb-4 tracking-tight"
        >
          RIVEN <span className="text-warframe-gold italic">ANALYTICS</span>
        </motion.h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-center">
          Real-time market insights for Warframe Riven Mods. Search any weapon to see live listings, 
          price distributions, and historical trends.
        </p>
      </header>

      {/* Search Section */}
      <div className="relative max-w-2xl mx-auto mb-12">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-warframe-gold transition-colors" />
          <input
            type="text"
            placeholder="Search weapon (e.g. Rubico, Torid, Glaive...)"
            className="w-full bg-warframe-card border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-warframe-gold/50 transition-all text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <AnimatePresence>
          {filteredItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-warframe-card border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl"
            >
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSearch(item)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <img src={`https://warframe.market/static/assets/${item.thumb}`} alt="" className="w-8 h-8 object-contain" />
                    <span className="font-medium">{item.item_name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-warframe-gold transition-colors" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <main>
        {!selectedWeapon ? (
          <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
            <Info className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-400">Select a weapon to begin analysis</h2>
            <p className="text-gray-600 mt-2">Data is pulled directly from the Warframe.market Auctions API</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-warframe-card rounded-3xl border border-white/10 p-4 flex items-center justify-center">
                  <img src={`https://warframe.market/static/assets/${selectedWeapon.icon}`} alt={selectedWeapon.item_name} className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">{selectedWeapon.item_name}</h2>
                  <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mt-1">
                    {selectedWeapon.riven_type} Riven • {auctions.length} Active Listings
                  </p>
                </div>
              </div>

              <div className="flex bg-warframe-card p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setView('list')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    view === 'list' ? "bg-warframe-gold text-black" : "text-gray-400 hover:text-white"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" /> Listings
                </button>
                <button
                  onClick={() => setView('stats')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    view === 'stats' ? "bg-warframe-gold text-black" : "text-gray-400 hover:text-white"
                  )}
                >
                  <BarChart2 className="w-4 h-4" /> Statistics
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-warframe-card/50 border border-white/5 p-3 rounded-2xl w-fit">
              <input
                type="checkbox"
                id="onlyWithBids"
                checked={onlyWithBids}
                onChange={(e) => setOnlyWithBids(e.target.checked)}
                className="w-4 h-4 accent-warframe-gold cursor-pointer"
              />
              <label htmlFor="onlyWithBids" className="text-sm text-gray-400 cursor-pointer select-none">
                Only show listings with active bids
              </label>
            </div>

            {/* Stat Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Positive Stats Dropdown */}
              <div className="bg-warframe-card border border-white/10 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <LayoutGrid className="w-3 h-3" /> Positive Stats (Up to 3)
                </h3>
                <div className="relative">
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm appearance-none focus:outline-none focus:border-warframe-blue/50 transition-all cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value) {
                        togglePositiveFilter(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    value=""
                  >
                    <option value="" disabled>Add positive stat...</option>
                    {attributes
                      .filter(a => !a.search_only && !positiveFilters.includes(a.url_name))
                      .sort((a, b) => getAttrLabel(a).localeCompare(getAttrLabel(b)))
                      .map(attr => (
                        <option key={attr.id} value={attr.url_name}>
                          {getAttrLabel(attr)}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {positiveFilters.map(filter => {
                    const attr = attributes.find(a => a.url_name === filter);
                    return (
                      <span 
                        key={filter}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-warframe-blue/20 border border-warframe-blue/30 text-warframe-blue rounded-lg text-xs font-medium"
                      >
                        {attr ? getAttrLabel(attr) : filter}
                        <button onClick={() => togglePositiveFilter(filter)}>
                          <X className="w-3 h-3 hover:text-white transition-colors" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Negative Stat Dropdown */}
              <div className="bg-warframe-card border border-white/10 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" /> Negative Stat (Optional)
                </h3>
                <div className="relative">
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm appearance-none focus:outline-none focus:border-red-500/50 transition-all cursor-pointer"
                    value={negativeFilter || ""}
                    onChange={(e) => setNegativeFilter(e.target.value || null)}
                  >
                    <option value="">None (Any negative)</option>
                    {attributes
                      .filter(a => !a.search_only)
                      .sort((a, b) => getAttrLabel(a).localeCompare(getAttrLabel(b)))
                      .map(attr => (
                        <option key={attr.id} value={attr.url_name}>
                          {getAttrLabel(attr)}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                {negativeFilter && (
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium">
                      {getAttrLabel(attributes.find(a => a.url_name === negativeFilter)!) || negativeFilter}
                      <button onClick={() => setNegativeFilter(null)}>
                        <X className="w-3 h-3 hover:text-white transition-colors" />
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {searching ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-warframe-gold animate-spin" />
                <p className="text-gray-500">Fetching auction data...</p>
              </div>
            ) : displayedAuctions.length === 0 ? (
              <div className="text-center py-20 bg-warframe-card rounded-3xl border border-white/5">
                <AlertCircle className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No auctions match your filters</h3>
                <p className="text-gray-500 mt-1">Try disabling the "Only with bids" filter or searching for a different weapon.</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {view === 'list' ? (
                  <AuctionList auctions={displayedAuctions} attributes={attributes} />
                ) : (
                  <RivenStats auctions={displayedAuctions} weaponName={selectedWeapon.item_name} weaponId={selectedWeapon.url_name} />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-20 pt-8 border-t border-white/5 text-center text-gray-600 text-sm">
        <p>This application is not affiliated with Digital Extremes or Warframe.market.</p>
        <p className="mt-1">Data provided by Warframe.market API.</p>
      </footer>
    </div>
  );
}
