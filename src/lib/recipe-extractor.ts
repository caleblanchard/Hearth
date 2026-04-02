/**
 * Recipe Extraction Utility
 *
 * Extracts recipe data from URLs using Schema.org/JSON-LD microdata.
 * Supports the Recipe schema: https://schema.org/Recipe
 * Handles HowToSection for both ingredient and instruction grouping.
 */

export interface ExtractedIngredient {
  name: string;
  quantity?: number;
  unit?: string;
}

export interface ExtractedIngredientSection {
  name: string;
  ingredients: ExtractedIngredient[];
}

export interface ExtractedInstructionSection {
  name: string;
  steps: string[];
}

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
  /** Named ingredient groups extracted from the recipe */
  ingredientSections: ExtractedIngredientSection[];
  /** Ingredients not belonging to any named section */
  ungroupedIngredients: ExtractedIngredient[];
  /** Named instruction groups extracted from the recipe */
  instructionSections: ExtractedInstructionSection[];
  /** Steps not belonging to any named section */
  ungroupedSteps: string[];
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
 * Returns true if a raw ingredient string looks like a section header rather
 * than an actual ingredient. Heuristics:
 *  - ends with ":"
 *  - no leading digit/fraction AND short AND title-cased or all-caps
 */
function isIngredientSectionHeader(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.endsWith(':')) return true;
  // Short (≤ 60 chars), no leading quantity, mostly capitalised words
  if (trimmed.length <= 60 && !/^\d/.test(trimmed)) {
    const words = trimmed.split(/\s+/);
    const capitalisedWords = words.filter(w => /^[A-Z]/.test(w));
    return words.length >= 1 && capitalisedWords.length / words.length >= 0.6;
  }
  return false;
}

/**
 * Extract ingredient sections + ungrouped ingredients from Schema.org data.
 *
 * Handles three formats:
 *  1. Array of HowToSection objects (each with name + itemListElement)
 *  2. Flat array of strings — inline section headers detected via heuristic
 *  3. Mixed arrays
 */
function extractIngredientSections(rawIngredients: any[]): {
  ingredientSections: ExtractedIngredientSection[];
  ungroupedIngredients: ExtractedIngredient[];
} {
  const ingredientSections: ExtractedIngredientSection[] = [];
  const ungroupedIngredients: ExtractedIngredient[] = [];

  // Detect if any entry is a HowToSection
  const hasStructuredSections = rawIngredients.some(
    (item: any) => typeof item === 'object' && item['@type'] === 'HowToSection'
  );

  if (hasStructuredSections) {
    for (const item of rawIngredients) {
      if (typeof item === 'object' && item['@type'] === 'HowToSection') {
        const sectionName = item.name || item.itemListElement?.[0]?.name || 'Ingredients';
        const rawItems: any[] = item.itemListElement || item.step || [];
        const ingredients = rawItems
          .map((step: any) => parseIngredientText(typeof step === 'string' ? step : (step.text || step.name || '')))
          .filter(ing => ing.name);
        if (ingredients.length > 0) {
          ingredientSections.push({ name: sectionName.replace(/:$/, '').trim(), ingredients });
        }
      } else {
        // Ungrouped item within a mostly-structured list
        const ing = parseIngredientText(typeof item === 'string' ? item : (item.text || item.name || ''));
        if (ing.name) ungroupedIngredients.push(ing);
      }
    }
    return { ingredientSections, ungroupedIngredients };
  }

  // Flat array — detect inline section headers
  let currentSection: ExtractedIngredientSection | null = null;
  let hasAnySection = false;

  for (const item of rawIngredients) {
    const text = typeof item === 'string' ? item : (item.text || item.name || '');
    if (!text.trim()) continue;

    if (isIngredientSectionHeader(text)) {
      currentSection = { name: text.trim().replace(/:$/, '').trim(), ingredients: [] };
      ingredientSections.push(currentSection);
      hasAnySection = true;
    } else {
      const ing = parseIngredientText(text);
      if (ing.name) {
        if (currentSection) {
          currentSection.ingredients.push(ing);
        } else {
          ungroupedIngredients.push(ing);
        }
      }
    }
  }

  // If no sections found, all ingredients are ungrouped (already in ungroupedIngredients)
  return { ingredientSections, ungroupedIngredients };
}

/**
 * Extract a single HowToStep text value.
 */
function extractStepText(item: any): string {
  if (typeof item === 'string') return item.trim();
  if (item.text) return item.text.trim();
  if (item.name) return item.name.trim();
  return '';
}

/**
 * Extract instruction sections + ungrouped steps from Schema.org data.
 *
 * Handles three formats:
 *  1. Array of HowToSection objects (each with name + itemListElement/step)
 *  2. Flat array of HowToStep objects or strings
 *  3. Single string (split on periods/newlines)
 */
function extractInstructionSections(instructionData: any): {
  instructionSections: ExtractedInstructionSection[];
  ungroupedSteps: string[];
} {
  const instructionSections: ExtractedInstructionSection[] = [];
  const ungroupedSteps: string[] = [];

  if (!instructionData) return { instructionSections, ungroupedSteps };

  if (typeof instructionData === 'string') {
    const steps = instructionData.split(/\.\s+|\n/).map(s => s.trim()).filter(Boolean);
    ungroupedSteps.push(...steps);
    return { instructionSections, ungroupedSteps };
  }

  if (!Array.isArray(instructionData)) return { instructionSections, ungroupedSteps };

  for (const item of instructionData) {
    if (typeof item === 'object' && item['@type'] === 'HowToSection') {
      const sectionName = (item.name || '').replace(/:$/, '').trim() || 'Instructions';
      const rawSteps: any[] = item.itemListElement || item.step || [];
      const steps = rawSteps.map(extractStepText).filter(Boolean);
      if (steps.length > 0) {
        instructionSections.push({ name: sectionName, steps });
      }
    } else {
      const text = extractStepText(item);
      if (text) ungroupedSteps.push(text);
    }
  }

  return { instructionSections, ungroupedSteps };
}

/**
 * Parse a single ingredient string into { name, quantity?, unit? }.
 */
function parseIngredientText(ingredientText: string): ExtractedIngredient {
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
  const jsonLdMatchesIterator = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis);
  const jsonLdMatches = Array.from(jsonLdMatchesIterator);

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
  const rawIngredients = Array.isArray(ingredientsList) ? ingredientsList : [ingredientsList];
  const { ingredientSections, ungroupedIngredients } = extractIngredientSections(rawIngredients);

  // Extract instructions
  const { instructionSections, ungroupedSteps } = extractInstructionSections(recipeData.recipeInstructions);

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
    ingredientSections,
    ungroupedIngredients,
    instructionSections,
    ungroupedSteps,
    dietaryTags: dietaryTags.length > 0 ? dietaryTags : undefined,
  };
}
