export interface RivenItem {
  id: string;
  url_name: string;
  item_name: string;
  thumb: string;
  icon: string;
  icon_format: string;
  group: string;
  riven_type: string;
}

export interface RivenAttribute {
  id: string;
  url_name: string;
  item_name: string;
  group: string;
  prefix: string | null;
  suffix: string | null;
  positive_is_better: boolean;
  search_only: boolean;
  units: string | null;
  exclusive_to?: string[];
}

export interface Auction {
  id: string;
  visible: boolean;
  note: string;
  buyout_price: number | null;
  starting_price: number;
  top_bid: number | null;
  is_direct_sale: boolean;
  owner: {
    ingame_name: string;
    status: string;
    reputation: number;
    id: string;
    avatar: string;
    last_seen: string;
  };
  item: {
    type: string;
    weapon_url_name: string;
    mod_rank: number;
    re_rolls: number;
    mastery_level: number;
    polarity: string;
    attributes: Array<{
      url_name: string;
      value: number;
      positive: boolean;
    }>;
  };
  created: string;
  updated: string;
}

export interface MarketResponse<T> {
  payload: T;
}
