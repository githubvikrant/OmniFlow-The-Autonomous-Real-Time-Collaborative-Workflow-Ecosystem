import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';  // Installed on Day 3 — bcryptjs is the pure JS version

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },

        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,           // Creates a unique index automatically
            lowercase: true,        // Normalizes to lowercase before saving
            trim: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email',
            ],
        },

        password: {
            type: String,
            minlength: [8, 'Password must be at least 8 characters'],
            select: false,          // NEVER returned in queries by default
        },

        role: {
            type: String,
            enum: {
                values: ['admin', 'member', 'viewer'],
                message: 'Role must be admin, member, or viewer',
            },
            default: 'member',
        },

        // OAuth fields (Google/GitHub login — Day 3)
        oauthProvider: {
            type: String,
            enum: ['google', 'github', null],
            default: null,
        },
        oauthId: {
            type: String,
            default: null,
        },

        // Email verification (Day 3)
        isVerified: {
            type: Boolean,
            default: false,
        },
        verificationToken: String,

        // Password reset (Day 3)
        passwordResetToken: String,
        passwordResetExpires: Date,

        // Profile
        avatar: {
            type: String,          // Cloudinary URL (Day 9)
            default: null,
        },

        // Track when password was last changed (used to invalidate old JWTs on Day 3)
        passwordChangedAt: Date,

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,          // Adds createdAt and updatedAt automatically
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// email unique index is auto-created by { unique: true } above
// Additional index for OAuth lookups:
userSchema.index({ oauthProvider: 1, oauthId: 1 });

// ─── Pre-save Middleware ──────────────────────────────────────────────────────
// Hash password BEFORE saving to the database (Day 3 will use this)
// userSchema.pre('save', async function (next) {
//     // Only run if the password was actually modified (not on email updates etc.)
//     if (!this.isModified('password')) return next();

//     // Hash with bcrypt using 12 rounds (computationally expensive = harder to brute force)
//     this.password = await bcrypt.hash(this.password, 12);

//     // Record when password changed (used to invalidate old tokens on Day 3)
//     this.passwordChangedAt = Date.now() - 1000; // -1s buffer for JWT timing
//     next();
// });

userSchema.pre('save', async function () {

    // Skip if password wasn't modified
    if (!this.isModified('password')) return;

    // Hash password
    this.password = await bcrypt.hash(this.password, 12);

    // Update password change timestamp
    this.passwordChangedAt = Date.now() - 1000;
});

// ─── Instance Methods ─────────────────────────────────────────────────────────
// Check if the provided password matches the hashed one in the DB
userSchema.methods.comparePassword = async function (candidatePassword) {
    // If user has no password (e.g. registered via OAuth only)
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Check if JWT was issued before the password was changed
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;  // true = password changed after JWT issued
    }
    return false;
};

const User = mongoose.model('User', userSchema);
export default User;