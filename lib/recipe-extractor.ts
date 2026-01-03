/**
 * Recipe Extraction Utility
 *
 * Extracts recipe data from URLs using Schema.org/JSON-LD microdata.
 * Supports the Recipe schema: https://schema.org/Recipe
 */

export interface ExtractedRecipe {
  name: string;
  description?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  category?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  imageUrl?: string;
  sourceUrl: string;
  ingredients: Array<{
    name: string;
    quantity?: number;
    unit?: string;
  }>;
  instructions: string[];
  dietaryTags?: string[];
}

/**
 * Parse ISO 8601 duration to minutes (e.g., "PT30M" → 30, "PT1H" → 60, "PT1H30M" → 90)
 */
function parseDuration(duration: string): number {
  if (!duration || typeof duration !== 'string') return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);

  return hours * 60 + minutes;
}

/**
 * Infer difficulty from prep + cook time
 * EASY: < 30 minutes total
 * MEDIUM: 30-90 minutes total
 * HARD: > 90 minutes total
 */
function inferDifficulty(prepTime?: number, cookTime?: number): 'EASY' | 'MEDIUM' | 'HARD' {
  const totalTime = (prepTime || 0) + (cookTime || 0);

  if (totalTime < 30) return 'EASY';
  if (totalTime <= 90) return 'MEDIUM';
  return 'HARD';
}

/**
 * Map common category names to RecipeCategory enum
 */
function mapCategory(category: string | string[]): string | undefined {
  if (!category) return undefined;

  // Handle array (take first value)
  const cat = Array.isArray(category) ? category[0] : category;
  if (!cat || typeof cat !== 'string') return undefined;

  const normalized = cat.toUpperCase().trim();

  // Direct matches
  const categoryMap: Record<string, string> = {
    'BREAKFAST': 'BREAKFAST',
    'LUNCH': 'LUNCH',
    'DINNER': 'DINNER',
    'DESSERT': 'DESSERT',
    'SNACK': 'SNACK',
    'SIDE': 'SIDE',
    'SIDE DISH': 'SIDE',
    'APPETIZER': 'APPETIZER',
    'DRINK': 'DRINK',
    'BEVERAGE': 'DRINK',
  };

  return categoryMap[normalized];
}

/**
 * Extract dietary tags from keywords or description
 */
function extractDietaryTags(keywords?: string | string[], description?: string): string[] {
  const tags: Set<string> = new Set();
  const text = [
    ...(Array.isArray(keywords) ? keywords : keywords ? [keywords] : []),
    description || ''
  ].join(' ').toLowerCase();

  const tagMap: Record<string, string> = {
    'vegetarian': 'VEGETARIAN',
    'vegan': 'VEGAN',
    'gluten-free': 'GLUTEN_FREE',
    'gluten free': 'GLUTEN_FREE',
    'dairy-free': 'DAIRY_FREE',
    'dairy free': 'DAIRY_FREE',
    'nut-free': 'NUT_FREE',
    'nut free': 'NUT_FREE',
    'egg-free': 'EGG_FREE',
    'egg free': 'EGG_FREE',
    'soy-free': 'SOY_FREE',
    'soy free': 'SOY_FREE',
    'low-carb': 'LOW_CARB',
    'low carb': 'LOW_CARB',
    'keto': 'KETO',
    'paleo': 'PALEO',
  };

  for (const [keyword, tag] of Object.entries(tagMap)) {
    if (text.includes(keyword)) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
}

/**
 * Normalize ingredient text to extract quantity and unit
 */
function parseIngredient(ingredientText: string): { name: string; quantity?: number; unit?: string } {
  if (!ingredientText || typeof ingredientText !== 'string') {
    return { name: '' };
  }

  // Common unit patterns (cups, tbsp, tsp, oz, lb, g, kg, ml, l)
  const unitPattern = /^([\d./]+)\s*(cup|cups|tablespoon|tablespoons|tbsp|teaspoon|teaspoons|tsp|ounce|ounces|oz|pound|pounds|lb|lbs|gram|grams|g|kilogram|kilograms|kg|milliliter|milliliters|ml|liter|liters|l)\s+(.+)$/i;

  const match = ingredientText.trim().match(unitPattern);

  if (match) {
    const quantityStr = match[1];
    const unit = match[2];
    const name = match[3];

    // Parse fraction (e.g., "1/2" or "1 1/2")
    let quantity: number | undefined;
    if (quantityStr.includes('/')) {
      const parts = quantityStr.split(/\s+/);
      let total = 0;
      for (const part of parts) {
        if (part.includes('/')) {
          const [num, denom] = part.split('/').map(Number);
          total += num / denom;
        } else {
          total += parseFloat(part);
        }
      }
      quantity = total;
    } else {
      quantity = parseFloat(quantityStr);
    }

    return {
      name: name.trim(),
      quantity: isNaN(quantity) ? undefined : quantity,
      unit: unit.toLowerCase(),
    };
  }

  // No quantity/unit found, return whole text as name
  return { name: ingredientText.trim() };
}

/**
 * Extract recipe data from a URL using Schema.org/JSON-LD microdata
 */
export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipe> {
  // Fetch the HTML content
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const html = await response.text();

  // Find all JSON-LD script tags
  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis);

  let recipeData: any = null;

  for (const match of jsonLdMatches) {
    try {
      const json = JSON.parse(match[1]);

      // Handle @graph arrays (some sites use this structure)
      const items = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json];

      for (const item of items) {
        if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
          recipeData = item;
          break;
        }
      }

      if (recipeData) break;
    } catch (e) {
      // Skip invalid JSON
      continue;
    }
  }

  if (!recipeData) {
    throw new Error('No recipe data found');
  }

  // Extract and normalize data
  const name = recipeData.name || '';
  if (!name) {
    throw new Error('Recipe name is required');
  }

  const description = recipeData.description || undefined;

  // Parse durations
  const prepTimeMinutes = recipeData.prepTime ? parseDuration(recipeData.prepTime) : undefined;
  const cookTimeMinutes = recipeData.cookTime || recipeData.totalTime
    ? parseDuration(recipeData.cookTime || recipeData.totalTime)
    : undefined;

  // Parse servings (can be string like "4 servings" or number)
  let servings: number | undefined;
  if (recipeData.recipeYield) {
    const yieldStr = String(recipeData.recipeYield);
    const yieldMatch = yieldStr.match(/(\d+)/);
    servings = yieldMatch ? parseInt(yieldMatch[1], 10) : undefined;
  }

  // Extract ingredients
  const ingredientsList = recipeData.recipeIngredient || [];
  const ingredients = (Array.isArray(ingredientsList) ? ingredientsList : [ingredientsList])
    .map(parseIngredient)
    .filter(ing => ing.name);

  // Extract instructions
  const instructionData = recipeData.recipeInstructions || [];
  let instructions: string[] = [];

  if (Array.isArray(instructionData)) {
    instructions = instructionData.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item.text) return item.text;
      if (item['@type'] === 'HowToStep' && item.text) return item.text;
      return '';
    }).filter((text: string) => text.trim());
  } else if (typeof instructionData === 'string') {
    // Split by periods or newlines if it's a single string
    instructions = instructionData.split(/\.\s+|\n/).filter((s: string) => s.trim());
  }

  // Get image URL
  const imageData = recipeData.image;
  let imageUrl: string | undefined;
  if (typeof imageData === 'string') {
    imageUrl = imageData;
  } else if (Array.isArray(imageData)) {
    imageUrl = imageData[0];
  } else if (imageData?.url) {
    imageUrl = imageData.url;
  }

  // Extract category
  const recipeCategory = recipeData.recipeCategory || recipeData.recipeCuisine;
  const category = mapCategory(recipeCategory);

  // Infer difficulty
  const difficulty = inferDifficulty(prepTimeMinutes, cookTimeMinutes);

  // Extract dietary tags
  const dietaryTags = extractDietaryTags(
    recipeData.keywords || recipeData.suitableForDiet,
    description
  );

  return {
    name,
    description,
    prepTimeMinutes,
    cookTimeMinutes,
    servings,
    category,
    difficulty,
    imageUrl,
    sourceUrl: url,
    ingredients,
    instructions,
    dietaryTags: dietaryTags.length > 0 ? dietaryTags : undefined,
  };
}
