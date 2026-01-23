import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'intl-pluralrules';

import en from '../locales/en.json';
import ja from '../locales/ja.json';

const LANGUAGE_KEY = 'spotch_language';

const resources = {
    en: { translation: en },
    ja: { translation: ja },
};

const initI18n = async () => {
    let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

    if (!savedLanguage) {
        let deviceLanguage = 'en';
        try {
            const locales = Localization.getLocales();
            if (locales && locales[0]) {
                deviceLanguage = locales[0].languageCode ?? 'en';
            }
        } catch (e) {
            console.warn('Localization module not found, defaulting to en');
        }

        savedLanguage = deviceLanguage;
    }

    await i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: savedLanguage,
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false,
            },
            react: {
                useSuspense: false,
            },
        });
};

initI18n();

export default i18n;

export const changeLanguage = async (lang: 'en' | 'ja') => {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
};
