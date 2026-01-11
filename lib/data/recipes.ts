import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type Recipe = Database['public']['Tables']['recipes']['Row']
type RecipeInsert = Database['public']['Tables']['recipes']['Insert']
type RecipeUpdate = Database['public']['Tables']['recipes']['Update']
type RecipeRating = Database['public']['Tables']['recipe_ratings']['Row']
type RecipeRatingInsert = Database['public']['Tables']['recipe_ratings']['Insert']
type FavoriteRecipe = Database['public']['Tables']['favorite_recipes']['Row']

/**
 * ============================================
 * RECIPES - CRUD
 * ============================================
 */

/**
 * Get all recipes for a family
 */
export async function getRecipes(
  familyId: string,
  options?: {
    category?: string
    dietaryTags?: string[]
    searchQuery?: string
    sortBy?: 'name' | 'rating' | 'created_at'
    sortOrder?: 'asc' | 'desc'
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from('recipes')
    .select(`
      *,
      ratings:recipe_ratings(rating),
      favorites:favorite_recipes(member_id)
    `)
    .eq('family_id', familyId)

  // Apply filters
  if (options?.category) {
    query = query.eq('category', options.category)
  }

  if (options?.dietaryTags && options.dietaryTags.length > 0) {
    query = query.contains('dietary_tags', options.dietaryTags)
  }

  if (options?.searchQuery) {
    query = query.or(
      `name.ilike.%${options.searchQuery}%,description.ilike.%${options.searchQuery}%`
    )
  }

  // Apply sorting
  const sortBy = options?.sortBy || 'name'
  const sortOrder = options?.sortOrder || 'asc'
  
  if (sortBy === 'name' || sortBy === 'created_at') {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })
  }

  const { data, error } = await query

  if (error) throw error

  // Calculate average rating and add to results
  return (data || []).map(recipe => ({
    ...recipe,
    averageRating: recipe.ratings.length > 0
      ? recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length
      : 0,
    ratingsCount: recipe.ratings.length,
  }))
}

/**
 * Get a single recipe by ID with all details
 */
export async function getRecipe(recipeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ratings:recipe_ratings(
        id,
        rating,
        comment,
        created_at,
        member:family_members(id, name, avatar_url)
      ),
      favorites:favorite_recipes(member_id)
    `)
    .eq('id', recipeId)
    .single()

  if (error) throw error

  // Calculate average rating
  const averageRating = data.ratings.length > 0
    ? data.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / data.ratings.length
    : 0

  return {
    ...data,
    averageRating,
    ratingsCount: data.ratings.length,
  }
}

/**
 * Create a new recipe
 */
export async function createRecipe(recipe: RecipeInsert): Promise<Recipe> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recipes')
    .insert(recipe)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a recipe
 */
export async function updateRecipe(
  recipeId: string,
  updates: RecipeUpdate
): Promise<Recipe> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recipes')
    .update(updates)
    .eq('id', recipeId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(recipeId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId)

  if (error) throw error
}

/**
 * ============================================
 * RECIPE RATINGS
 * ============================================
 */

/**
 * Add or update a rating for a recipe
 */
export async function rateRecipe(
  rating: RecipeRatingInsert
): Promise<RecipeRating> {
  const supabase = await createClient()

  // Check if rating already exists
  const { data: existing } = await supabase
    .from('recipe_ratings')
    .select('id')
    .eq('recipe_id', rating.recipe_id)
    .eq('member_id', rating.member_id)
    .maybeSingle()

  if (existing) {
    // Update existing rating
    const { data, error } = await supabase
      .from('recipe_ratings')
      .update({
        rating: rating.rating,
        comment: rating.comment,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new rating
    const { data, error } = await supabase
      .from('recipe_ratings')
      .insert(rating)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Get ratings for a recipe
 */
export async function getRecipeRatings(recipeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recipe_ratings')
    .select(`
      *,
      member:family_members(id, name, avatar_url)
    `)
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Delete a rating
 */
export async function deleteRecipeRating(ratingId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('recipe_ratings')
    .delete()
    .eq('id', ratingId)

  if (error) throw error
}

/**
 * ============================================
 * FAVORITE RECIPES
 * ============================================
 */

/**
 * Get favorite recipes for a member
 */
export async function getFavoriteRecipes(memberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('favorite_recipes')
    .select(`
      *,
      recipe:recipes(*)
    `)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Add recipe to favorites
 */
export async function addFavoriteRecipe(
  memberId: string,
  recipeId: string
): Promise<FavoriteRecipe> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('favorite_recipes')
    .insert({
      member_id: memberId,
      recipe_id: recipeId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove recipe from favorites
 */
export async function removeFavoriteRecipe(
  memberId: string,
  recipeId: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('favorite_recipes')
    .delete()
    .eq('member_id', memberId)
    .eq('recipe_id', recipeId)

  if (error) throw error
}

/**
 * Check if recipe is favorited by member
 */
export async function isRecipeFavorited(
  memberId: string,
  recipeId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('favorite_recipes')
    .select('id')
    .eq('member_id', memberId)
    .eq('recipe_id', recipeId)
    .maybeSingle()

  if (error) throw error
  return !!data
}

/**
 * ============================================
 * RECIPE UTILITIES
 * ============================================
 */

/**
 * Get popular recipes (most favorited)
 */
export async function getPopularRecipes(familyId: string, limit = 10) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      favorites:favorite_recipes(id),
      ratings:recipe_ratings(rating)
    `)
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(limit * 2) // Get more to filter/sort

  if (error) throw error

  // Sort by favorites count and rating
  return (data || [])
    .map(recipe => ({
      ...recipe,
      favoritesCount: recipe.favorites.length,
      averageRating: recipe.ratings.length > 0
        ? recipe.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / recipe.ratings.length
        : 0,
    }))
    .sort((a, b) => {
      // Sort by favorites first, then by rating
      if (a.favoritesCount !== b.favoritesCount) {
        return b.favoritesCount - a.favoritesCount
      }
      return b.averageRating - a.averageRating
    })
    .slice(0, limit)
}

/**
 * Get recently added recipes
 */
export async function getRecentRecipes(familyId: string, limit = 10) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ratings:recipe_ratings(rating)
    `)
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data || []).map(recipe => ({
    ...recipe,
    averageRating: recipe.ratings.length > 0
      ? recipe.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / recipe.ratings.length
      : 0,
  }))
}

/**
 * Get recipes by category
 */
export async function getRecipesByCategory(familyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recipes')
    .select('id, name, category')
    .eq('family_id', familyId)
    .order('category')
    .order('name')

  if (error) throw error

  // Group by category
  const grouped = (data || []).reduce((acc, recipe) => {
    if (!acc[recipe.category]) {
      acc[recipe.category] = []
    }
    acc[recipe.category].push(recipe)
    return acc
  }, {} as Record<string, typeof data>)

  return grouped
}

/**
 * Search recipes
 */
export async function searchRecipes(
  familyId: string,
  query: string,
  limit = 20
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ratings:recipe_ratings(rating)
    `)
    .eq('family_id', familyId)
    .or(
      `name.ilike.%${query}%,description.ilike.%${query}%,ingredients.cs.{${query}}`
    )
    .limit(limit)

  if (error) throw error

  return (data || []).map(recipe => ({
    ...recipe,
    averageRating: recipe.ratings.length > 0
      ? recipe.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / recipe.ratings.length
      : 0,
  }))
}
