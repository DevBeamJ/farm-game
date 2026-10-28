// bump to 10 while testing so crops grow 10x faster. Set back to 1 after.
export const GROWTH_SPEED = 10

export const CROPS = {
  carrot: { label: 'Carrot', emoji: '🥕', color: '#FF6B1A', growthTicks: 60,  stages: 4, trivia: 'Early cultivated carrots were purple, yellow or white. The orange kind we know today was developed in Europe, with Dutch growers popularizing it in the 1600s.' },
  potato: { label: 'Potato', emoji: '🥔', color: '#C8A26B', growthTicks: 90,  stages: 4, trivia: 'Potatoes were first domesticated in the Andes of South America roughly 8,000 years ago, and there are thousands of varieties.' },
  wheat:  { label: 'Wheat',  emoji: '🌾', color: '#E6C84F', growthTicks: 45,  stages: 4, trivia: 'Wheat is one of the first crops humans domesticated, about 10,000 years ago in the Fertile Crescent, and it is still a staple food worldwide.' },
  tomato: { label: 'Tomato', emoji: '🍅', color: '#E03A2F', growthTicks: 120, stages: 4, trivia: 'Botanically, a tomato is a fruit (technically a berry), and the plant comes from western South America.' },
}
