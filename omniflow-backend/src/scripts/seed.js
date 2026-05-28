import mongoose from 'mongoose';
import config from '../config/index.js';
import User from '../models/user.model.js';
import Board from '../models/board.model.js';
import Task from '../models/task.model.js';

const seed = async () => {
    try {
        await mongoose.connect(config.mongo.uri);
        console.log('✅ Connected to MongoDB for seeding');

        // Clean up previous seed data
        await User.deleteMany({ email: /seed/ });
        await Board.deleteMany({ name: /Seed/ });

        // 1. Create a test user
        const user = await User.create({
            name: 'Vikrant (Seed)',
            email: 'seed@omniflow.dev',
            password: 'Password123!',   // Pre-save hook will hash this
            role: 'admin',
            isVerified: true,
        });
        console.log('✅ User created:', user._id, '| Password hashed:', user.password !== 'Password123!');

        // 2. Create a test board
        const board = await Board.create({
            name: 'Seed Board — Auth System',
            description: 'Testing the schema',
            owner: user._id,
            members: [{ user: user._id, role: 'admin' }],
        });
        console.log('✅ Board created:', board._id, '| Columns:', board.columns);

        // 3. Create test tasks
        const tasks = await Task.insertMany([
            {
                title: 'Set up Mongoose User schema with roles',
                board: board._id,
                column: 'To Do',
                order: 1,
                createdBy: user._id,
                assignees: [user._id],
                priority: 'high',
                estimate: 2,
                aiGenerated: true,
                aiPrompt: 'Build a complete authentication system',
                tags: ['backend', 'database'],
            },
            {
                title: 'Implement POST /auth/register',
                board: board._id,
                column: 'To Do',
                order: 2,
                createdBy: user._id,
                priority: 'high',
                estimate: 1.5,
                aiGenerated: true,
                aiPrompt: 'Build a complete authentication system',
                subtasks: [
                    { title: 'Validate email & password with Zod' },
                    { title: 'Hash password with bcrypt' },
                    { title: 'Save user to MongoDB' },
                ],
            },
        ]);
        console.log(`✅ ${tasks.length} tasks created`);

        // 4. Query and display — verify relationships work
        const fetchedBoard = await Board.findById(board._id).populate('owner', 'name email');
        console.log('✅ Board with populated owner:', fetchedBoard.owner.name);

        const fetchedTasks = await Task.find({ board: board._id, column: 'To Do' })
            .sort({ order: 1 })
            .populate('assignees', 'name');
        console.log('✅ Tasks fetched and sorted:');
        fetchedTasks.forEach((t, i) => {
            console.log(`   ${i + 1}. [${t.priority.toUpperCase()}] ${t.title}`);
            if (t.subtasks.length > 0) {
                console.log(`      └─ ${t.subtasks.length} subtasks | Progress: ${t.subtaskProgress}%`);
            }
        });

        console.log('\n🎉 Seed successful! Schemas are working correctly.\n');
        process.exit(0);

    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    }
};

seed();