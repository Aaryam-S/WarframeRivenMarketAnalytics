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
    // Warframe.market has a hard limit of 500 results per query.
    // By making multiple concurrent queries with different sorting and buyout policies,
    // we can fetch up to 1,500+ unique listings for popular weapons.
    const queries = [
      'buyout_policy=direct&sort_by=price_asc',
      'buyout_policy=direct&sort_by=price_desc',
      'buyout_policy=auction&sort_by=price_asc',
      'buyout_policy=auction&sort_by=price_desc'
    ];

    try {
      const responses = await Promise.all(
        queries.map(async (query) => {
          try {
            const res = await fetch(`${API_BASE}/auctions/search?type=riven&weapon_url_name=${weaponUrlName}&${query}`);
            if (!res.ok) return [];
            const data: MarketResponse<{ auctions: Auction[] }> = await res.json();
            return data.payload.auctions || [];
          } catch (e) {
            console.warn(`Failed to fetch query ${query}`, e);
            return [];
          }
        })
      );

      // Merge and deduplicate the results
      const uniqueAuctions = new Map<string, Auction>();
      responses.flat().forEach(auction => {
        if (auction && auction.id) {
          uniqueAuctions.set(auction.id, auction);
        }
      });

      return Array.from(uniqueAuctions.values());
    } catch (error) {
      console.error('Failed to fetch auctions:', error);
      throw error;
    }
  }
};
