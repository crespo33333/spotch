// Avatar Categories: Animal, Robot, People, Flower, Fish
export type AvatarCategory = 'animal' | 'robot' | 'people' | 'flower' | 'fish';

const CATEGORY_SEEDS: Record<AvatarCategory, string[]> = {
    animal: [
        'kitten_1', 'kitten_2', 'kitten_3', 'kitten_4', 'kitten_5', 'kitten_6', // RoboHash Cats (Set 4)
        'emoji:🐶', 'emoji:🦊', 'emoji:🦁', 'emoji:🐵', 'emoji:🐼', 'emoji:🐨', 'emoji:🐯', 'emoji:🐷' // Emojis
    ],
    robot: [
        'robot_1', 'robot_2', 'robot_3', 'robot_4', 'robot_5', 'robot_6', // RoboHash Robots (Set 1)
        'emoji:🤖', 'emoji:🦾'
    ],
    people: [
        'human_1', 'human_2', 'human_3', 'human_4', 'human_5', 'human_6', // RoboHash Humans (Set 5)
        'emoji:🧑', 'emoji:👩', 'emoji:👨', 'emoji:🧒', 'emoji:👵', 'emoji:👴'
    ],
    flower: [
        'emoji:🌸', 'emoji:🌹', 'emoji:🌻', 'emoji:🌺', 'emoji:🌷', 'emoji:🌼', 'emoji:🏵️', 'emoji:🪷',
        'emoji:💐', 'emoji:🥀'
    ],
    fish: [
        'emoji:🐟', 'emoji:🐠', 'emoji:🐡', 'emoji:🦈', 'emoji:🐋', 'emoji:🐬', 'emoji:🐙', 'emoji:🦑',
        'emoji:🦀', 'emoji:🦞', 'emoji:🦐'
    ]
};

/**
 * Generates an avatar URL based on seed/category.
 * If seed starts with 'http', return it as is.
 * Otherwise, handle RoboHash vs Emoji.
 */
export const getCreatureAvatar = (seed: string) => {
    if (!seed) return `https://robohash.org/default?set=set1`;
    if (seed.startsWith('http')) return seed;

    // Emojis: Return as is (UI handles rendering)
    if (seed.startsWith('emoji:')) {
        return seed;
    }

    // RoboHash Sets Mapping
    // kittens -> set4
    // humans -> set5
    // robots -> set1 (default)
    let set = 'set1';
    if (seed.startsWith('kitten')) set = 'set4';
    if (seed.startsWith('human')) set = 'set5';

    return `https://robohash.org/${seed}.png?set=${set}&size=200x200`;
};


/**
 * Returns avatar options for a specific category
 */
export const getAvatarOptions = (category: AvatarCategory) => {
    return CATEGORY_SEEDS[category] || [];
};
