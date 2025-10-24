// Weather utility functions using OpenWeatherMap API

const WEATHER_API_KEY = ''; // Users can add their own API key from openweathermap.org
const DEFAULT_CITY = 'Pune'; // Default city for Sujata Mastani
const DEFAULT_COUNTRY = 'IN';

/**
 * Fetch weather forecast for next day
 * Free tier OpenWeatherMap API provides 5-day forecast
 */
export const getWeatherForecast = async (city = DEFAULT_CITY, country = DEFAULT_COUNTRY) => {
    // If no API key, return mock data
    if (!WEATHER_API_KEY) {
        return {
            success: false,
            error: 'Weather API key not configured',
            mockData: {
                temp: 28,
                tempMin: 24,
                tempMax: 32,
                description: 'Partly Cloudy',
                humidity: 65,
                icon: '02d'
            }
        };
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city},${country}&units=metric&appid=${WEATHER_API_KEY}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Weather API request failed');
        }
        
        const data = await response.json();
        
        // Get tomorrow's forecast (first forecast after 24 hours)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0); // Noon tomorrow
        
        // Find the closest forecast to noon tomorrow
        const tomorrowTimestamp = tomorrow.getTime() / 1000;
        let closestForecast = data.list[0];
        let minDiff = Math.abs(data.list[0].dt - tomorrowTimestamp);
        
        for (const forecast of data.list) {
            const diff = Math.abs(forecast.dt - tomorrowTimestamp);
            if (diff < minDiff) {
                minDiff = diff;
                closestForecast = forecast;
            }
        }
        
        return {
            success: true,
            temp: Math.round(closestForecast.main.temp),
            tempMin: Math.round(closestForecast.main.temp_min),
            tempMax: Math.round(closestForecast.main.temp_max),
            description: closestForecast.weather[0].description,
            main: closestForecast.weather[0].main,
            icon: closestForecast.weather[0].icon,
            humidity: closestForecast.main.humidity,
            windSpeed: closestForecast.wind.speed,
            city: data.city.name
        };
    } catch (error) {
        console.error('Weather fetch error:', error);
        return {
            success: false,
            error: error.message,
            mockData: {
                temp: 28,
                tempMin: 24,
                tempMax: 32,
                description: 'Weather data unavailable',
                humidity: 65,
                icon: '02d'
            }
        };
    }
};

/**
 * Get weather icon emoji based on weather condition
 */
export const getWeatherEmoji = (iconCode) => {
    const iconMap = {
        '01d': '☀️', // clear sky day
        '01n': '🌙', // clear sky night
        '02d': '⛅', // few clouds day
        '02n': '☁️', // few clouds night
        '03d': '☁️', // scattered clouds
        '03n': '☁️',
        '04d': '☁️', // broken clouds
        '04n': '☁️',
        '09d': '🌧️', // shower rain
        '09n': '🌧️',
        '10d': '🌦️', // rain day
        '10n': '🌧️', // rain night
        '11d': '⛈️', // thunderstorm
        '11n': '⛈️',
        '13d': '❄️', // snow
        '13n': '❄️',
        '50d': '🌫️', // mist
        '50n': '🌫️'
    };
    
    return iconMap[iconCode] || '🌤️';
};

/**
 * Get weather recommendation for ice cream business
 */
export const getBusinessRecommendation = (weather) => {
    if (!weather.success && !weather.mockData) {
        return { message: 'Weather data unavailable', color: 'gray' };
    }
    
    const temp = weather.temp || weather.mockData?.temp || 28;
    const main = weather.main || weather.mockData?.main || 'Clear';
    
    if (temp >= 35) {
        return { 
            message: '🔥 Very Hot! Expect high ice cream demand', 
            color: 'red',
            impact: 'high'
        };
    } else if (temp >= 30) {
        return { 
            message: '☀️ Hot weather! Good sales expected', 
            color: 'orange',
            impact: 'medium-high'
        };
    } else if (temp >= 25) {
        return { 
            message: '🌤️ Pleasant weather, normal demand', 
            color: 'green',
            impact: 'normal'
        };
    } else if (temp >= 20) {
        return { 
            message: '😊 Comfortable, moderate demand', 
            color: 'blue',
            impact: 'medium'
        };
    } else {
        return { 
            message: '❄️ Cool weather, lower demand possible', 
            color: 'blue',
            impact: 'low'
        };
    }
    
    if (main === 'Rain' || main === 'Thunderstorm') {
        return { 
            message: '🌧️ Rain expected! Demand may be lower', 
            color: 'blue',
            impact: 'low'
        };
    }
};

/**
 * Simple weather forecast without API (fallback)
 */
export const getSimpleWeatherInfo = () => {
    return {
        success: false,
        message: 'Configure OpenWeatherMap API key for real-time weather',
        mockData: {
            temp: 28,
            tempMin: 24,
            tempMax: 32,
            description: 'Typical Pune Weather',
            humidity: 60,
            icon: '02d'
        }
    };
};

