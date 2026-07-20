import { preferenceGroup } from "./factory";

export const culturePreferences = preferenceGroup(
  [
    "Armenian", "Mexican", "Persian", "Filipino", "Indian", "Korean", "Lebanese", "Jewish",
    "Greek", "Italian", "Caribbean", "Japanese", "Chinese", "Vietnamese", "Thai", "Nigerian",
    "Ethiopian", "Brazilian", "Colombian", "Salvadoran", "Guatemalan", "Puerto Rican",
  ],
  { category: "Culture and traditions", description: "A cultural context the planner wants represented thoughtfully.", type: "culture" },
);

export const traditionPreferences = preferenceGroup(
  [
    "Religious ceremony", "Cultural ceremony", "Traditional music", "Traditional dance",
    "Family blessing", "Candle ceremony", "Formal entrance", "Court of honor", "Tea ceremony",
    "Henna ceremony", "Breaking the glass", "Hora dance", "Memorial tribute",
  ],
  { category: "Traditions", description: "A tradition or program moment to account for in the plan.", type: "tradition" },
);

export const foodPreferences = [
  ...preferenceGroup(
    ["Armenian catering", "Mexican catering", "Persian catering", "Italian catering", "Mediterranean catering"],
    { category: "Cuisine", description: "A requested catering specialty.", linkedService: "Catering", type: "food" },
  ),
  ...preferenceGroup(
    ["Halal", "Kosher", "Vegan", "Vegetarian", "Gluten-free", "Dairy-free", "Nut-aware"],
    { category: "Dietary needs", description: "A food requirement vendors should be able to support.", linkedService: "Catering", type: "food" },
  ),
  ...preferenceGroup(
    [
      "Taco cart", "Food truck", "Pizza", "Barbecue", "Buffet", "Plated dinner", "Family style",
      "Formal plated dinner", "Bartending", "Mocktail bar", "Coffee cart", "Ice cream cart",
      "Dessert table", "Cake", "Cupcakes", "Chocolate fountain", "Candy table", "Cotton candy",
      "Popcorn machine", "Snow cone machine",
    ],
    { category: "Food and beverage", description: "A food, beverage, or service style for the event.", linkedService: "Catering", type: "food" },
  ),
].map((item) => ["Dessert table", "Cake", "Cupcakes", "Chocolate fountain", "Candy table"].includes(item.label) ? { ...item, linkedService: "Cake & Desserts" as const } : item.label === "Bartending" ? { ...item, linkedService: "Bartending" as const } : item);
