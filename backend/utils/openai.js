import OpenAI from 'openai';
import { supabase } from '../config/supabase.js';

// Функция для получения API ключа из Supabase
const getOpenAIKey = async () => {
  try {
    console.log('Получаем API ключ OpenAI из Supabase...');
    const { data, error } = await supabase
      .from('secrets')
      .select('value')
      .eq('name', 'OPENAI_API_KEY')
      .single();

    if (error) {
      console.error('Ошибка при получении API ключа:', error);
      throw new Error('Не удалось получить API ключ OpenAI');
    }
    
    if (!data || !data.value) {
      console.error('API ключ не найден в базе данных');
      throw new Error('API ключ OpenAI не найден');
    }

    return data.value;
  } catch (error) {
    console.error('Ошибка при получении API ключа:', error);
    throw error;
  }
};

// Инициализация OpenAI с ключом из Supabase
let openai = null;
export const initOpenAI = async () => {
  try {
    if (!openai) {
      const apiKey = await getOpenAIKey();
      openai = new OpenAI({ apiKey });
    }
    return openai;
  } catch (error) {
    console.error('Ошибка при инициализации OpenAI:', error);
    throw error;
  }
};