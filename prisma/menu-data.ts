// The weekly menu. `days` = weekdays the dish is served (MON…SUN).
const REGULAR = "MON,TUE,THU,FRI";

export const weeklyMenu = [
  { name: "Fried Rice with Fish", emoji: "🍛", days: REGULAR, imageUrl: "/menu/fried-rice-fish.jpg" },
  { name: "Fried Rice with Chicken", emoji: "🍛", days: REGULAR, imageUrl: "/menu/fried-rice-chicken.jpg" },
  { name: "Waakye with Fish", emoji: "🍚", days: REGULAR, imageUrl: "/menu/waakye.jpg" },
  { name: "Waakye with Chicken", emoji: "🍚", days: REGULAR, imageUrl: "/menu/waakye.jpg" },
  { name: "Jollof Rice with Fish", emoji: "🍛", days: REGULAR, imageUrl: "/menu/jollof-fish.jpg" },
  { name: "Jollof Rice with Chicken", emoji: "🍛", days: REGULAR, imageUrl: "/menu/jollof-chicken.jpg" },
  { name: "Rice Ball with Chicken", emoji: "🍙", days: REGULAR, imageUrl: "/menu/rice-ball.jpg" },
  { name: "Rice Ball with Beef", emoji: "🍙", days: REGULAR, imageUrl: "/menu/rice-ball.jpg" },
  { name: "Konkonte with Beef", emoji: "🥘", days: REGULAR, imageUrl: "/menu/konkonte.jpg" },
  { name: "Konkonte with Chicken", emoji: "🥘", days: REGULAR, imageUrl: "/menu/konkonte.jpg" },
  { name: "Banku with Tilapia", emoji: "🐟", days: REGULAR, imageUrl: "/menu/banku-tilapia.jpg" },
  { name: "Banku with Okro", emoji: "🍲", days: REGULAR, imageUrl: "/menu/banku-okro.jpg" },
  // Wednesday is kenkey day
  { name: "Kenkey with Fish", emoji: "🌽", days: "WED", imageUrl: "/menu/kenkey.jpg" },
].map((item) => ({ ...item, category: "Mains" }));
