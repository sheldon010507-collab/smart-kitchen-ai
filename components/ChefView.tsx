
import React, { useState } from 'react';
import { InventoryItem, Recipe, MenuItem } from '../types';
import { generateThinkingChefRecipes } from '../services/geminiService';
import { ChefHat, Flame, Clock, Sparkles, Loader2, ArrowRight } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  menu: MenuItem[];
}

const ChefView: React.FC<Props> = ({ inventory, menu }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  // Identify expiring items for context display
  const expiringItems = inventory.filter(i => {
    const days = Math.ceil((new Date(i.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
    return days <= 3;
  }).map(i => i.name);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const generated = await generateThinkingChefRecipes(inventory, menu);
      setRecipes(generated);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 animate-in fade-in duration-500">
      <header className="mb-8 md:mb-16 border-b border-border pb-6 md:pb-8">
        <h2 className="text-2xl md:text-4xl font-bold text-primary mb-2 md:mb-4 tracking-tight">AI Chef</h2>
        <p className="text-base md:text-xl text-secondary font-light">
          Generate UK-style specials using your current stock.
        </p>

        {/* Context Badge */}
        {expiringItems.length > 0 && (
          <div className="mt-3 md:mt-4 inline-flex items-center px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wide rounded border border-amber-100">
            Prioritizing: {expiringItems.slice(0, 3).join(', ')}{expiringItems.length > 3 ? '...' : ''}
          </div>
        )}

        {recipes.length === 0 && !loading && (
          <button
            onClick={handleGenerate}
            className="mt-6 md:mt-8 px-5 md:px-6 py-2.5 md:py-3 bg-primary text-white rounded-lg text-sm font-bold hover:bg-black transition-colors flex items-center shadow-sm"
          >
            <Sparkles className="w-4 md:w-5 h-4 md:h-5 mr-2" />
            Generate Specials
          </button>
        )}
      </header>

      {loading && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
          <p className="text-base font-medium text-secondary">Analyzing inventory & menu style...</p>
        </div>
      )}

      {recipes.length === 0 && !loading && (
        <div className="text-center py-12 text-secondary">
          <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Ready to cook? Click generate to create recipes.</p>
        </div>
      )}

      <div className="space-y-6 md:space-y-12">
        {recipes.map((recipe, idx) => (
          <article key={idx} className="bg-white p-5 md:p-10 rounded-xl border border-border hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-primary tracking-tight">{recipe.title}</h3>
              <span className="text-xs border border-border px-3 py-1 rounded bg-background text-secondary font-bold uppercase tracking-wider self-start">
                {recipe.difficulty}
              </span>
            </div>

            <p className="text-primary text-sm md:text-base mb-6 md:mb-8 leading-relaxed font-light">{recipe.description}</p>

            <div className="flex items-center space-x-4 md:space-x-8 text-xs text-secondary mb-6 md:mb-10 font-mono uppercase tracking-widest font-bold">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1 md:mr-2" />
                {recipe.cookTime}
              </div>
              <div className="flex items-center">
                <Flame className="w-4 h-4 mr-1 md:mr-2" />
                {recipe.calories} kcal
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              <div>
                <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 md:mb-4">Ingredients</h4>
                <ul className="space-y-1.5 md:space-y-2">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm text-primary list-disc list-inside">{ing}</li>
                  ))}
                </ul>
              </div>

              {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 md:mb-4">Missing</h4>
                  <ul className="space-y-1.5 md:space-y-2">
                    {recipe.missingIngredients.map((ing, i) => (
                      <li key={i} className="text-sm text-red-600 list-disc list-inside font-medium">{ing}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Instructions</h4>
              <ol className="space-y-3 list-decimal list-inside text-sm text-primary">
                {recipe.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ChefView;
