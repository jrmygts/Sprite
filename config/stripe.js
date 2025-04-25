export const plans = [
  { interval: 'month', priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY },
  { interval: 'year',  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL  }
]; 