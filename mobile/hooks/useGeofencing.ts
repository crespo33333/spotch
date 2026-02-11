
import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Spot } from '../components/MapView';

export interface GeofencingResult {
    nearestSpot: Spot | null;
    availableSpots: Spot[];
    distanceToNearest: number; // in km
    isInside: boolean;
    ignoreSpot?: (id: string) => void;
}

export function useGeofencing(
    userLocation: { latitude: number; longitude: number } | null,
    spots: Spot[] | undefined
): GeofencingResult {
    const [result, setResult] = useState<GeofencingResult>({
        nearestSpot: null,
        availableSpots: [],
        distanceToNearest: Infinity,
        isInside: false,
    });
    const [ignoredSpotIds, setIgnoredSpotIds] = useState<string[]>([]);

    useEffect(() => {
        if (!userLocation || !spots || spots.length === 0) {
            setResult({ nearestSpot: null, availableSpots: [], distanceToNearest: Infinity, isInside: false });
            return;
        }

        let minDist = Infinity;
        let closest: Spot | null = null;
        let insideSpots: Spot[] = [];

        spots.forEach(spot => {
            const dist = getDistanceFromLatLonInKm(
                userLocation.latitude,
                userLocation.longitude,
                spot.latitude,
                spot.longitude
            );

            // Check if inside
            if (dist <= (spot.radius / 1000)) {
                insideSpots.push(spot);
            }

            if (dist < minDist) {
                minDist = dist;
                closest = spot;
            }
        });

        if (closest) {
            const radiusInKm = (closest as Spot).radius / 1000;
            const isInside = minDist <= radiusInKm;

            // Trigger Notification if newly entered AND not ignored
            // Also if previously ignored but now OUTSIDE, remove from ignore list (re-entry allowed)
            const isIgnored = ignoredSpotIds.includes((closest as Spot).id);

            if (!isInside && isIgnored) {
                // Left the spot, so remove from ignore list to allow re-entry notification
                setIgnoredSpotIds(prev => prev.filter(id => id !== (closest as Spot).id));
            }

            if (isInside && !result.isInside && closest && !isIgnored) {
                // Notifications disabled to prevent crash
                console.log("Found spot:", (closest as Spot).name);
            }

            setResult({
                nearestSpot: closest,
                availableSpots: insideSpots,
                distanceToNearest: minDist,
                isInside: insideSpots.length > 0 && !isIgnored // If current closest is ignored, technically we aren't "inside" for the primary flow? 
                // But if insideSpots has valid spots we should show them.
                // Let's rely on availableSpots length for UI logic.
            });
        }
    }, [userLocation, spots, ignoredSpotIds]);

    const ignoreSpot = (spotId: string) => {
        setIgnoredSpotIds(prev => [...prev, spotId]);
        // Also force isInside to false immediately in result if it matches
        if (result.nearestSpot?.id === spotId) {
            setResult(prev => ({ ...prev, isInside: false }));
        }
    };

    return { ...result, ignoreSpot };
}

// Haversine Formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}
