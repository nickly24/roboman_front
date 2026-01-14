// Утилиты для работы с API ответами

/**
 * Извлекает массив из ответа API
 * Бэкенд может возвращать либо {items: [...]}, либо массив напрямую
 */
export const extractItems = (responseData) => {
  if (!responseData) return [];
  
  if (Array.isArray(responseData)) {
    return responseData;
  }
  
  if (responseData.items && Array.isArray(responseData.items)) {
    return responseData.items;
  }
  
  return [];
};

/**
 * Извлекает данные из успешного ответа API
 */
export const extractData = (response) => {
  if (!response || !response.data) return null;
  
  if (response.data.ok) {
    return response.data.data;
  }
  
  return null;
};
