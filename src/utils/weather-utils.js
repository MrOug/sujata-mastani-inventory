// Weather utility functions using Open-Meteo API
// Open-Meteo uses data from government meteorological services worldwide including IMD (India Meteorological Department)
// Free, reliable, no API key required!

const DEFAULT_LOCATION = {
    latitude: 18.5204, // Pune, Maharashtra coordinates
    longitude: 73.8567,
    city: 'Pune'
};

/**
 * Get weather code description and icon
 * Based on WMO Weather interpretation codes
 */
const getWeatherInfo = (weatherCode) => {
    const weatherMap = {
        0: { description: 'Clear Sky', main: 'Clear', icon: '01d' },
        1: { description: 'Mainly Clear', main: 'Clear', icon: '01d' },
        2: { description: 'Partly Cloudy', main: 'Clouds', icon: '02d' },
        3: { description: 'Overcast', main: 'Clouds', icon: '03d' },
        45: { description: 'Foggy', main: 'Mist', icon: '50d' },
        48: { description: 'Depositing Rime Fog', main: 'Mist', icon: '50d' },
        51: { description: 'Light Drizzle', main: 'Drizzle', icon: '09d' },
        53: { description: 'Moderate Drizzle', main: 'Drizzle', icon: '09d' },
        55: { description: 'Dense Drizzle', main: 'Drizzle', icon: '09d' },
        61: { description: 'Slight Rain', main: 'Rain', icon: '10d' },
        63: { description: 'Moderate Rain', main: 'Rain', icon: '10d' },
        65: { description: 'Heavy Rain', main: 'Rain', icon: '10d' },
        71: { description: 'Slight Snow', main: 'Snow', icon: '13d' },
        73: { description: 'Moderate Snow', main: 'Snow', icon: '13d' },
        75: { description: 'Heavy Snow', main: 'Snow', icon: '13d' },
        77: { description: 'Snow Grains', main: 'Snow', icon: '13d' },
        80: { description: 'Slight Rain Showers', main: 'Rain', icon: '09d' },
        81: { description: 'Moderate Rain Showers', main: 'Rain', icon: '09d' },
        82: { description: 'Violent Rain Showers', main: 'Rain', icon: '09d' },
        85: { description: 'Slight Snow Showers', main: 'Snow', icon: '13d' },
        86: { description: 'Heavy Snow Showers', main: 'Snow', icon: '13d' },
        95: { description: 'Thunderstorm', main: 'Thunderstorm', icon: '11d' },
        96: { description: 'Thunderstorm with Slight Hail', main: 'Thunderstorm', icon: '11d' },
        99: { description: 'Thunderstorm with Heavy Hail', main: 'Thunderstorm', icon: '11d' },
    };
    
    return weatherMap[weatherCode] || { description: 'Unknown', main: 'Unknown', icon: '02d' };
};

/**
 * Fetch weather forecast for next day using Open-Meteo
 * Free API with no authentication required - uses IMD and other government sources
 */
export const getWeatherForecast = async (location = DEFAULT_LOCATION) => {
    try {
        // Open-Meteo API endpoint - Free and reliable for India
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,windspeed_10m_max,precipitation_sum&timezone=Asia/Kolkata&forecast_days=3`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Weather API request failed');
        }
        
        const data = await response.json();
        
        // Get tomorrow's data (index 1, today is 0)
        const tomorrowIndex = 1;
        const weatherCode = data.daily.weathercode[tomorrowIndex];
        const weatherInfo = getWeatherInfo(weatherCode);
        
        return {
            success: true,
            temp: Math.round(data.daily.temperature_2m_mean[tomorrowIndex]),
            tempMin: Math.round(data.daily.temperature_2m_min[tomorrowIndex]),
            tempMax: Math.round(data.daily.temperature_2m_max[tomorrowIndex]),
            description: weatherInfo.description,
            main: weatherInfo.main,
            icon: weatherInfo.icon,
            humidity: Math.round(data.daily.relative_humidity_2m_mean[tomorrowIndex]),
            windSpeed: data.daily.windspeed_10m_max[tomorrowIndex],
            precipitation: data.daily.precipitation_sum[tomorrowIndex],
            city: location.city || 'Pune',
            source: 'Open-Meteo (IMD & Global Met Services)'
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
                description: 'Weather data temporarily unavailable',
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
 * Get location coordinates for different cities in India
 */
export const INDIAN_CITIES = {
    'Pune': { latitude: 18.5204, longitude: 73.8567, city: 'Pune' },
    'Mumbai': { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai' },
    'Delhi': { latitude: 28.7041, longitude: 77.1025, city: 'Delhi' },
    'Bangalore': { latitude: 12.9716, longitude: 77.5946, city: 'Bangalore' },
    'Hyderabad': { latitude: 17.3850, longitude: 78.4867, city: 'Hyderabad' },
    'Chennai': { latitude: 13.0827, longitude: 80.2707, city: 'Chennai' },
    'Kolkata': { latitude: 22.5726, longitude: 88.3639, city: 'Kolkata' },
    'Ahmedabad': { latitude: 23.0225, longitude: 72.5714, city: 'Ahmedabad' },
    'Surat': { latitude: 21.1702, longitude: 72.8311, city: 'Surat' },
    'Jaipur': { latitude: 26.9124, longitude: 75.7873, city: 'Jaipur' },
};

/**
 * Simple weather forecast without API (fallback)
 */
export const getSimpleWeatherInfo = () => {
    return {
        success: false,
        message: 'Using Open-Meteo for reliable weather data from IMD',
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

