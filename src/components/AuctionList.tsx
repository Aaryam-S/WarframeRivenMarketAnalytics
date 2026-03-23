import React, { useState, useMemo, useEffect } from 'react';
import { Auction, RivenAttribute } from '../types';
import { User, Clock, Shield, Zap, RefreshCw, Star, ArrowUp, ArrowDown } from 'lucide-react';

interface AuctionListProps {
  auctions: Auction[];
  attributes: RivenAttribute[];
  totalFetched?: number;
}

export const AuctionList: React.FC<AuctionListProps> = ({ auctions, attributes, totalFetched = 0 }) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [visibleCount, setVisibleCount] = useState(500);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  useEffect(() => {
    setVisibleCount(500);
    setIsLoadingAll(false);
  }, [auctions]);

  useEffect(() => {
    if (isLoadingAll && visibleCount < auctions.length) {
      const timer = setTimeout(() => {
        setVisibleCount(prev => prev + 500);
      }, 100);
      return () => clearTimeout(timer);
    } else if (isLoadingAll && visibleCount >= auctions.length) {
      setIsLoadingAll(false);
    }
  }, [isLoadingAll, visibleCount, auctions.length]);

  const getAttrLabel = (urlName: string) => {
    const attr = attributes.find(a => a.url_name === urlName);
    if (attr?.item_name) return attr.item_name;
    return urlName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const sortedAuctions = useMemo(() => {
    return [...auctions].sort((a, b) => {
      const priceA = a.top_bid || a.buyout_price || a.starting_price || 0;
      const priceB = b.top_bid || b.buyout_price || b.starting_price || 0;
      return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
    });
  }, [auctions, sortOrder]);

  const visibleAuctions = sortedAuctions.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {visibleCount < sortedAuctions.length ? (
            <>
              <button
                onClick={() => setVisibleCount(prev => prev + 500)}
                disabled={isLoadingAll}
                className="px-4 py-2 bg-warframe-gold/10 hover:bg-warframe-gold/20 text-warframe-gold border border-warframe-gold/30 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load More
              </button>
              <button
                onClick={() => setIsLoadingAll(true)}
                disabled={isLoadingAll}
                className="px-4 py-2 bg-warframe-blue/10 hover:bg-warframe-blue/20 text-warframe-blue border border-warframe-blue/30 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingAll ? 'Loading All...' : 'Load All'}
              </button>
              <span className="text-sm text-gray-400 ml-2">
                Showing {visibleCount} of {sortedAuctions.length}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                Showing all {sortedAuctions.length} listings
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-4 py-2 bg-warframe-card border border-white/10 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Sort by Price
            {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleAuctions.map((auction, idx) => (
        <div
          key={auction.id}
          className="riven-card-gradient p-5 rounded-2xl border border-white/10 hover:border-warframe-gold/30 transition-all group relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                {auction.owner.avatar ? (
                  <img src={`https://warframe.market/static/assets/${auction.owner.avatar}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white group-hover:text-warframe-gold transition-colors">
                  {auction.owner.ingame_name}
                </p>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${auction.owner.status === 'ingame' ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-[10px] text-gray-500 uppercase">{auction.owner.status}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex flex-col items-end">
                <p className="text-lg font-bold text-warframe-gold">
                  {auction.top_bid || auction.buyout_price || auction.starting_price}
                  <span className="text-xs ml-1 font-normal opacity-70">Plat</span>
                </p>
                {auction.top_bid && (
                  <span className="text-[10px] text-warframe-blue uppercase font-bold">Top Bid</span>
                )}
                {!auction.top_bid && auction.is_direct_sell && (
                  <span className="text-[10px] bg-warframe-gold/20 text-warframe-gold px-1.5 py-0.5 rounded uppercase font-bold">Direct</span>
                )}
                {!auction.top_bid && !auction.is_direct_sell && (
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Starting</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {auction.item.attributes.map(attr => (
              <div key={attr.url_name} className="flex justify-between items-center text-sm">
                <span className="text-gray-400">{getAttrLabel(attr.url_name)}</span>
                <span className={attr.positive ? 'text-warframe-blue' : 'text-red-400'}>
                  {attr.positive ? '+' : ''}{attr.value}%
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[11px] text-gray-500">
            <div className="flex gap-3">
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> {auction.item.re_rolls}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> MR {auction.item.mastery_level}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" /> Rank {auction.item.mod_rank}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(auction.updated).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
      </div>

      {visibleCount < sortedAuctions.length ? (
        <div className="flex justify-center gap-4 pt-8">
          <button
            onClick={() => setVisibleCount(prev => prev + 500)}
            disabled={isLoadingAll}
            className="px-8 py-3 bg-warframe-gold/10 hover:bg-warframe-gold/20 text-warframe-gold border border-warframe-gold/30 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load More ({sortedAuctions.length - visibleCount} remaining)
          </button>
          <button
            onClick={() => setIsLoadingAll(true)}
            disabled={isLoadingAll}
            className="px-8 py-3 bg-warframe-blue/10 hover:bg-warframe-blue/20 text-warframe-blue border border-warframe-blue/30 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingAll ? 'Loading All...' : 'Load All'}
          </button>
        </div>
      ) : null}
    </div>
  );
};
