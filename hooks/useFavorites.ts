import { useState, useEffect } from "react";
import localforage from "localforage";

export interface FavoriteFolder {
  id: string;
  name: string;
}

const FAVORITES_KEY = "driveFavorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteFolder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadFavorites() {
      const data = await localforage.getItem<FavoriteFolder[]>(FAVORITES_KEY);
      if (data) {
        setFavorites(data);
      }
      setIsLoaded(true);
    }
    loadFavorites();
  }, []);

  const addFavorite = async (folder: FavoriteFolder) => {
    const newFavorites = [...favorites.filter((f) => f.id !== folder.id), folder];
    setFavorites(newFavorites);
    await localforage.setItem(FAVORITES_KEY, newFavorites);
  };

  const removeFavorite = async (folderId: string) => {
    const newFavorites = favorites.filter((f) => f.id !== folderId);
    setFavorites(newFavorites);
    await localforage.setItem(FAVORITES_KEY, newFavorites);
  };

  const isFavorite = (folderId: string) => {
    return favorites.some((f) => f.id === folderId);
  };

  const toggleFavorite = async (folder: FavoriteFolder) => {
    if (isFavorite(folder.id)) {
      await removeFavorite(folder.id);
    } else {
      await addFavorite(folder);
    }
  };

  return { favorites, addFavorite, removeFavorite, toggleFavorite, isFavorite, isLoaded };
}
