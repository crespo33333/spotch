/**
 * Generates a random "creature" avatar URL based on a seed string.
 * Uses RoboHash to provide Cats (set4), Monsters (set2), and Robots (set1).
 */
export const getCreatureAvatar = (seed: string) => {
    // Deterministically decide which set to use based on the seed
    // We want a good mix of Cats, Monsters, and Robots

    // Simple hash of the string to get a number
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const setIndex = Math.abs(hash) % 3;
    let set = 'set1'; // Default Robots

    if (setIndex === 1) set = 'set2'; // Monsters
    if (setIndex === 2) set = 'set4'; // Cats

    // Robohash URL
    return `https://robohash.org/${seed}.png?set=${set}&bgset=bg1&size=200x200`;
};

/**
 * Returns a list of ~50 dummy avatars for pre-loading or selection
 */
export const getDummyAvatarSeeds = () => {
    const seeds = [];
    for (let i = 0; i < 50; i++) {
        seeds.push(`creature_${i}`);
    }
    return seeds;
};
