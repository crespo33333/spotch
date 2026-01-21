
import { useState, useEffect } from 'react';
import { Spot } from '../components/MapView';

export interface GeofencingResult {
    nearestSpot: Spot | null;
    distanceToNearest: number; // in km
    isInside: boolean;
}

export function useGeofencing(
    userLocation: { latitude: number; longitude: number } | null,
    spots: Spot[] | undefined
): GeofencingResult {
    const [result, setResult] = useState<GeofencingResult>({
        nearestSpot: null,
        distanceToNearest: Infinity,
        isInside: false,
    });

    useEffect(() => {
        if (!userLocation || !spots || spots.length === 0) {
            setResult({ nearestSpot: null, distanceToNearest: Infinity, isInside: false });
            return;
        }

        let minDist = Infinity;
        let closest: Spot | null = null;

        spots.forEach(spot => {
            const dist = getDistanceFromLatLonInKm(
                userLocation.latitude,
                userLocation.longitude,
                spot.latitude,
                spot.longitude
            );

            if (dist < minDist) {
                minDist = dist;
                closest = spot;
            }
        });

        if (closest) {
            // Check if inside radius (radius is usually in meters in the object, handle conversion)
            // Assuming spot.radius is in meters (defaulting to 100m if undefined, from visualization)
            // But wait, in seed.ts or spot router, did we define radius?
            // Spot interface has radius: number.
            // Let's assume input radius is in METERS.
            // minDist is in KM.
            const radiusInKm = (closest as Spot).radius / 1000;
            const isInside = minDist <= radiusInKm;

            setResult({
                nearestSpot: closest,
                distanceToNearest: minDist,
                isInside
            });
        }
    }, [userLocation, spots]);

    return result;
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
