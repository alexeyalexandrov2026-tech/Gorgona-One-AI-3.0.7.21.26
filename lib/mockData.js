export const categories = [
  { id: 1, name: 'Shopping', icon: '🛍️' },
  { id: 2, name: 'Fashion', icon: '👗' },
  { id: 3, name: 'Electronics', icon: '💻' },
  { id: 4, name: 'Beauty', icon: '💄' },
  { id: 5, name: 'Home', icon: '🏡' },
  { id: 6, name: 'Travel', icon: '✈️' },
  { id: 7, name: 'Sports Betting', icon: '🎯' }
];

export const stores = [
  { id: 1, name: 'Amazon', slug: 'amazon-promo-codes', category: 'Shopping', logo: 'A', website: 'https://www.amazon.com?&linkCode=ll2&tag=gorgonaone-20&linkId=22d538165da984949d93c8bcf53f89dc&language=en_US&ref_=as_li_ss_tl', affiliate_link: 'https://www.amazon.com?&linkCode=ll2&tag=gorgonaone-20&linkId=22d538165da984949d93c8bcf53f89dc&language=en_US&ref_=as_li_ss_tl', description: 'Everyday essentials, electronics, and premium savings.', status: 'active' },
  { id: 3, name: 'Target', slug: 'target-coupons', category: 'Shopping', logo: 'T', website: 'https://target.com', affiliate_link: 'https://target.com', description: 'Style, home, and everyday essentials with curated offers.', status: 'active' },
  { id: 4, name: 'Nike', slug: 'nike-coupons', category: 'Fashion', logo: 'N', website: 'https://nike.com', affiliate_link: 'https://nike.com', description: 'Performance wear and athletic staples with seasonal promotions.', status: 'active' },
  { id: 5, name: 'Adidas', slug: 'adidas-coupons', category: 'Fashion', logo: 'AD', website: 'https://adidas.com', affiliate_link: 'https://adidas.com', description: 'Sport-inspired fashion and premium essentials.', status: 'active' },
  { id: 6, name: 'Apple', slug: 'apple-deals', category: 'Electronics', logo: '', website: 'https://apple.com', affiliate_link: 'https://apple.com', description: 'Innovative devices and premium accessories.', status: 'active' },
  { id: 7, name: 'Best Buy', slug: 'best-buy-deals', category: 'Electronics', logo: 'BB', website: 'https://bestbuy.com', affiliate_link: 'https://bestbuy.com', description: 'Top-tier electronics and smart home systems.', status: 'active' },
  { id: 8, name: 'Samsung', slug: 'samsung-deals', category: 'Electronics', logo: 'S', website: 'https://samsung.com', affiliate_link: 'https://samsung.com', description: 'Premium mobile and home technology discounts.', status: 'active' },
  { id: 9, name: 'Sephora', slug: 'sephora-coupons', category: 'Beauty', logo: 'SE', website: 'https://sephora.com', affiliate_link: 'https://sephora.com', description: 'Luxury beauty, skincare, and fragrance offers.', status: 'active' },
  { id: 10, name: 'Ulta', slug: 'ulta-coupons', category: 'Beauty', logo: 'U', website: 'https://ulta.com', affiliate_link: 'https://ulta.com', description: 'Beauty bundles and exclusive rewards deals.', status: 'active' },
  { id: 11, name: 'Home Depot', slug: 'home-depot-deals', category: 'Home', logo: 'HD', website: 'https://homedepot.com', affiliate_link: 'https://homedepot.com', description: 'Home improvement essentials and contractor favorites.', status: 'active' },
  { id: 12, name: 'Lowe\'s', slug: 'lowes-deals', category: 'Home', logo: 'L', website: 'https://lowes.com', affiliate_link: 'https://lowes.com', description: 'Smart renovation deals and premium upgrades.', status: 'active' }
];

export const coupons = [
  { id: 1, store_id: 1, store_name: 'Amazon', code: '', discount: 'Up to 40% off', description: 'Verified seasonal tech and home savings', expiration: '2026-09-30', status: 'verified', clicks: 310, rating: 4.8 },
  { id: 2, store_id: 1, store_name: 'Amazon', code: '', discount: 'Free shipping', description: 'Prime member shipping perks', expiration: '2026-08-15', status: 'verified', clicks: 271, rating: 4.7 },
  { id: 3, store_id: 4, store_name: 'Nike', code: 'GORGONA25', discount: '25% off', description: 'Performance essentials and new arrivals', expiration: '2026-07-30', status: 'verified', clicks: 188, rating: 4.9 },
  { id: 4, store_id: 5, store_name: 'Adidas', code: 'GORGONA20', discount: '20% off', description: 'Lifestyle sneakers and apparel', expiration: '2026-08-10', status: 'verified', clicks: 164, rating: 4.8 },
  { id: 5, store_id: 9, store_name: 'Sephora', code: '', discount: 'Free sample bundle', description: 'Beauty discovery and deluxe perks', expiration: '2026-09-12', status: 'verified', clicks: 142, rating: 4.9 },
  { id: 7, store_id: 6, store_name: 'Apple', code: '', discount: 'Trade-in bonus', description: 'Limited upgrade offers', expiration: '2026-07-25', status: 'verified', clicks: 155, rating: 4.8 },
  { id: 8, store_id: 7, store_name: 'Best Buy', code: '', discount: 'Member pricing', description: 'Premium electronics savings', expiration: '2026-08-28', status: 'verified', clicks: 173, rating: 4.7 },
  { id: 9, store_id: 10, store_name: 'Ulta', code: '', discount: 'Buy 2 get 1 free', description: 'Select skincare and cosmetics', expiration: '2026-08-20', status: 'verified', clicks: 121, rating: 4.6 },
  { id: 10, store_id: 3, store_name: 'Target', code: '', discount: 'Extra 15% off', description: 'App-exclusive household essentials', expiration: '2026-07-18', status: 'verified', clicks: 116, rating: 4.7 },
  { id: 11, store_id: 11, store_name: 'Home Depot', code: '', discount: 'Free delivery', description: 'Bulk order and installation perks', expiration: '2026-09-03', status: 'verified', clicks: 94, rating: 4.5 }
];

export const sportsbooks = [
  { id: 9, name: 'Hard Rock Bet', slug: 'hard-rock-bet', logo: 'HR', description: 'Casino-backed betting platform with a polished user experience.', website: 'https://hardrockbet.com', affiliate_link: 'https://hardrockbet.com', promo_code: '', bonus_offer: 'Offers vary by state and platform', state_availability: 'Available in select states', status: 'active' },
  { id: 1, name: 'DraftKings Sportsbook', slug: 'draftkings', logo: 'DK', description: 'A premium sportsbook experience with wide market coverage and daily promos.', website: 'https://draftkings.com', affiliate_link: 'https://draftkings.com', promo_code: '', bonus_offer: 'Welcome bonus available upon registration', state_availability: 'Available in select states', status: 'active' },
  { id: 2, name: 'FanDuel Sportsbook', slug: 'fanduel', logo: 'FD', description: 'Accessible betting app with strong in-play features and trusted payout options.', website: 'https://fanduel.com', affiliate_link: 'https://fanduel.com', promo_code: '', bonus_offer: 'Bonus offer updated seasonally', state_availability: 'Available in select states', status: 'active' },
  { id: 3, name: 'BetMGM Sportsbook', slug: 'betmgm', logo: 'BM', description: 'Established sportsbook combining casino and sports promotions.', website: 'https://betmgm.com', affiliate_link: 'https://betmgm.com', promo_code: '', bonus_offer: 'Rewards and bonus structure varies by state', state_availability: 'Available in select states', status: 'active' },
  { id: 4, name: 'Caesars Sportsbook', slug: 'caesars', logo: 'CS', description: 'Premium sportsbook with strong brand integration and loyalty benefits.', website: 'https://caesars.com', affiliate_link: 'https://caesars.com', promo_code: '', bonus_offer: 'Promotional offers announced by market', state_availability: 'Available in select states', status: 'active' },
  { id: 5, name: 'Fanatics Sportsbook', slug: 'fanatics', logo: 'FN', description: 'Sportsbook focused on fan engagement and live event experiences.', website: 'https://fanatics.com', affiliate_link: 'https://fanatics.com', promo_code: '', bonus_offer: 'Offer details updated regularly', state_availability: 'Available in select states', status: 'active' },
  { id: 6, name: 'bet365 Sportsbook', slug: 'bet365', logo: '365', description: 'Global sportsbook known for extensive betting markets and live odds.', website: 'https://bet365.com', affiliate_link: 'https://bet365.com', promo_code: '', bonus_offer: 'Promotions vary by jurisdiction', state_availability: 'Available in select states', status: 'active' },
  { id: 7, name: 'BetRivers Sportsbook', slug: 'betrivers', logo: 'BR', description: 'User-friendly sportsbook with a broad range of sports coverage.', website: 'https://betrivers.com', affiliate_link: 'https://betrivers.com', promo_code: '', bonus_offer: 'Bonus terms reviewed regularly', state_availability: 'Available in select states', status: 'active' },
  { id: 8, name: 'ESPN BET', slug: 'espn-bet', logo: 'ES', description: 'Sports media-led sportsbook experience with modern betting tools.', website: 'https://espnbet.com', affiliate_link: 'https://espnbet.com', promo_code: '', bonus_offer: 'New user offers published as available', state_availability: 'Available in select states', status: 'active' },
  { id: 10, name: 'Bally Bet', slug: 'bally-bet', logo: 'BB', description: 'A streamlined sportsbook tailored to simple, mobile-first wagering.', website: 'https://ballybet.com', affiliate_link: 'https://ballybet.com', promo_code: '', bonus_offer: 'Promotions announced upon launch', state_availability: 'Available in select states', status: 'active' }
];

export const analytics = [
  { id: 1, coupon_id: 1, clicks: 310, date: '2026-07-01' },
  { id: 2, coupon_id: 3, clicks: 188, date: '2026-07-01' },
  { id: 3, coupon_id: 5, clicks: 142, date: '2026-07-01' },
  { id: 4, coupon_id: 6, clicks: 129, date: '2026-07-02' },
  { id: 5, coupon_id: 7, clicks: 155, date: '2026-07-02' }
];
