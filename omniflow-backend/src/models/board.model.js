import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Board name is required'],
            trim: true,
            maxlength: [100, 'Board name cannot exceed 100 characters'],
        },

        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },

        // The user who created and owns this board
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',           // Reference to User model — enables .populate()
            required: true,
        },

        // Team members and their roles on this specific board
        members: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                role: {
                    type: String,
                    enum: ['admin', 'member', 'viewer'],
                    default: 'member',
                },
            },
        ],

        // The columns of the Kanban board (ordered list)
        // e.g., ["To Do", "In Progress", "Review", "Done"]
        columns: {
            type: [String],
            default: ['To Do', 'In Progress', 'Review', 'Done'],
            validate: {
                validator: (cols) => cols.length > 0 && cols.length <= 10,
                message: 'Board must have between 1 and 10 columns',
            },
        },

        // Visual customization
        color: {
            type: String,
            default: '#6366f1',    // Indigo — OmniFlow brand color
            match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code'],
        },

        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Find all boards owned by a user (used on the dashboard)
boardSchema.index({ owner: 1, createdAt: -1 });

// Find boards where a specific user is a member
boardSchema.index({ 'members.user': 1 });

// Find active (non-archived) boards quickly
boardSchema.index({ isArchived: 1 });

// ─── Virtual: member count ────────────────────────────────────────────────────
boardSchema.virtual('memberCount').get(function () {
    return this.members.length + 1; // +1 for the owner
});

const Board = mongoose.model('Board', boardSchema);
export default Board;