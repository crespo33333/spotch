// Avatar Categories using RoboHash (Cats) and Placehold.co (Emoji Text)
export type AvatarCategory = 'cats' | 'dogs' | 'tech' | 'space' | 'monsters' | 'flowers';

const CATEGORY_SEEDS: Record<AvatarCategory, string[]> = {
    tech: ['app_avatar_robot', 'avatar_gold_robot', 'avatar_tech_orb_cyan_blue', 'robot_2', 'cyber_1'],
    dogs: ['avatar_cool_shiba', 'avatar_shiba_samurai', 'shiba_2', 'shiba_3'],
    space: ['avatar_space_astronaut', 'avatar_alien_dj', 'space_1', 'space_2'],
    monsters: ['avatar_neon_monster', 'avatar_pixel_dragon', 'avatar_crystal_skull_pink', 'avatar_cute_ghost_glass', 'monster_1'],
    cats: ['kitten_1', 'kitten_2', 'kitten_3', 'kitten_4', 'kitten_5', 'kitten_6'],
    flowers: ['cherry_blossom', 'rose', 'sunflower', 'lotus', 'tulip', 'daisy'],
};

const BACKGROUND_COLORS = ['FF9900', 'FF4785', '00C2FF', '4CAF50', '9C27B0', 'FFEB3B'];

/**
 * Generates an avatar URL based on seed/category.
 * If seed starts with 'http', return it as is.
 * Otherwise, handle RoboHash (kitten) vs Emoji (placehold.co).
 */
export const getCreatureAvatar = (seed: string) => {
    if (seed.startsWith('http')) return seed;

    // Legacy or Kitten
    if (seed.startsWith('kitten_')) {
        return `https://robohash.org/${seed}.png?set=set4&size=200x200`;
    }

    // Attempt to parse 'emoji:🐶:COLOR' -> URL
    if (seed.startsWith('emoji:')) {
        // Return the seed directly to be handled by the UI components
        // This allows we to render native high-res emojis instead of blurry placeholders
        return seed;
    }

    // Fallback
    return `https://robohash.org/${seed}.png?set=set4&size=200x200`;
};


/**
 * Returns avatar options for a specific category
 */
export const getAvatarOptions = (category: AvatarCategory) => {
    return CATEGORY_SEEDS[category] || [];
};
