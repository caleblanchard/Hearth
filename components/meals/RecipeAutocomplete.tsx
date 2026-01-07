'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Recipe {
  id: string;
  name: string;
  imageUrl: string | null;
  category: string | null;
  dietaryTags: string[];
  score: number;
}

interface RecipeAutocompleteProps {
  value: string;
  onChange: (value: string, recipe?: Recipe) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function RecipeAutocomplete({
  value,
  onChange,
  placeholder = 'Search recipes or type dish name...',
  className = '',
  autoFocus = false,
  disabled = false,
}: RecipeAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Sync with parent value
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setRecipes([]);
      setShowDropdown(false);
      return;
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/meals/recipes/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setRecipes(data.recipes);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Error searching recipes:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setSelectedIndex(-1);
    onChange(newValue); // Update parent with text
  };

  const handleSelect = (recipe: Recipe) => {
    setSearchQuery(recipe.name);
    onChange(recipe.name, recipe);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || recipes.length === 0) {
      if (e.key === 'Enter') {
        // Submit custom text
        setShowDropdown(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < recipes.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(recipes[selectedIndex]);
        } else {
          // Submit custom text
          setShowDropdown(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  };

  const highlightMatch = (text: string, query: string) => {
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          className={`w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-ember-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        />
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      {showDropdown && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {isLoading && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          )}

          {!isLoading && recipes.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No recipes found. Press Enter to use &quot;{searchQuery}&quot; as custom dish.
            </div>
          )}

          {!isLoading &&
            recipes.map((recipe, index) => (
              <button
                key={recipe.id}
                onClick={() => handleSelect(recipe)}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  index === selectedIndex
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : ''
                }`}
              >
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-xs">No img</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {highlightMatch(recipe.name, searchQuery)}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {recipe.category && (
                      <span className="text-xs px-2 py-0.5 rounded bg-info/10 text-info">
                        {recipe.category}
                      </span>
                    )}
                    {recipe.dietaryTags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
