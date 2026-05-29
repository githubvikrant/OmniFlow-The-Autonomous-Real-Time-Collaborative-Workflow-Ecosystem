import dotenv from 'dotenv';
dotenv.config();

// Validate required environment variables on startup
// Only the absolute minimum are required — Google OAuth, Redis, etc.
// will be validated on their respective days.
const required = ['PORT', 'MONGO_URI', 'JWT_SECRET'];
for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`❌ Missing required environment variable: ${key}`);
    }
}

const config = {
    port: parseInt(process.env.PORT, 10) || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',

    mongo: {
        uri: process.env.MONGO_URI,
    },

    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    openai: {
        apiKey: process.env.OPENAI_API_KEY,
    },

    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },

    redis: {
        url: process.env.REDIS_URL,
    },

    // ─── Google OAuth (Day 5) ────────────────────────────────────────────────
    // Added in Day 5. Client ID and Secret come from Google Cloud Console.
    // callbackUrl must match exactly what's registered in the Google Console.
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
    },

    // The frontend origin — used when building redirect URLs after OAuth
    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
};

export default config;