import { MarketResponse, RivenItem, RivenAttribute, Auction } from "../types";

const API_BASE = "/api/wm";

export const warframeMarketService = {
  async getRivenItems(): Promise<RivenItem[]> {
    const response = await fetch(`${API_BASE}/riven/items`);
    const data: MarketResponse<{ items: RivenItem[] }> = await response.json();
    return data.payload.items;
  },

  async getRivenAttributes(): Promise<RivenAttribute[]> {
    const response = await fetch(`${API_BASE}/riven/attributes`);
    const data: MarketResponse<{ attributes: RivenAttribute[] }> = await response.json();
    return data.payload.attributes;
  },

  async searchAuctions(weaponUrlName: string): Promise<Auction[]> {
    const response = await fetch(`${API_BASE}/auctions/search?type=riven&weapon_url_name=${weaponUrlName}`);
    const data: MarketResponse<{ auctions: Auction[] }> = await response.json();
    return data.payload.auctions;
  }
};
