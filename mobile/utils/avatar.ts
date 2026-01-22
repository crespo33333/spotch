// Avatar Categories using RoboHash (Cats) and Placehold.co (Emoji Text)
export type AvatarCategory = 'cats' | 'dogs' | 'critters' | 'birds' | 'fish' | 'flowers';

const EMOJI_SETS: Record<string, string[]> = {
    dogs: ['🐶', '🐕', '🦮', '🐩', '🐕‍🦺', '🐺', '🦊', '🐾', '🌭', '🦴'],
    critters: ['🦔', '🐿️', '🐁', '🐹', '🐇', '🦦', '🦡', '🦇', '🐌', '🐢'],
    birds: ['🐦', '🕊️', '🦅', '🦆', '🦉', '🦜', '🦩', '🐣', '🐔', '🐧'],
    fish: ['🐟', '🐠', '🐡', '🦈', '🐳', '🐬', '🐙', '🦀', '🦞', '🦐'],
    flowers: ['🌸', '🌹', '🌻', '🌺', '🌷', '🪷', '💐', '🍀', '🌿', '🌵'],
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
    if (category === 'cats') {
        const seeds = [];
        for (let i = 1; i <= 16; i++) {
            seeds.push(`kitten_${i}`);
        }
        return seeds;
    }

    // For Emoji Categories
    const emojis = EMOJI_SETS[category] || [];
    return emojis.map((emoji, index) => {
        const color = BACKGROUND_COLORS[index % BACKGROUND_COLORS.length];
        return `emoji:${emoji}:${color}`;
    });
};
