import React from 'react';
import { Auction, RivenAttribute } from '../types';
import { User, Clock, Shield, Zap, RefreshCw, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface AuctionListProps {
  auctions: Auction[];
  attributes: RivenAttribute[];
}

export const AuctionList: React.FC<AuctionListProps> = ({ auctions, attributes }) => {
  const getAttrLabel = (urlName: string) => {
    const attr = attributes.find(a => a.url_name === urlName);
    if (attr?.item_name) return attr.item_name;
    return urlName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {auctions.map((auction, idx) => (
        <motion.div
          key={auction.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
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
                {!auction.top_bid && auction.is_direct_sale && (
                  <span className="text-[10px] bg-warframe-gold/20 text-warframe-gold px-1.5 py-0.5 rounded uppercase font-bold">Direct</span>
                )}
                {!auction.top_bid && !auction.is_direct_sale && (
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
        </motion.div>
      ))}
    </div>
  );
};
