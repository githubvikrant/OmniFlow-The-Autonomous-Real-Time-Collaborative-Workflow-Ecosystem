import mongoose from 'mongoose';
import config from './index.js';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongo.uri, {
            // These options prevent deprecation warnings
            serverSelectionTimeoutMS: 5000,  // Fail fast if MongoDB is unreachable (5s)
            socketTimeoutMS: 45000,          // Close sockets after 45s of inactivity
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Listen for connection events after initial connection
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected.');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

    } catch (error) {
        console.error(`❌ MongoDB Connection Failed: ${error.message}`);
        // Exit process — app cannot run without database
        process.exit(1);
    }
};

export default connectDB;