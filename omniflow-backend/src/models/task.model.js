import mongoose from 'mongoose';

// ─── Sub-schema: Comment (embedded in Task) ───────────────────────────────────
const commentSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: [2000, 'Comment cannot exceed 2000 characters'],
        },
        // File attached to the comment (Day 9: Cloudinary)
        attachment: {
            url: String,
            publicId: String,    // Cloudinary public_id (needed to delete the file later)
            fileName: String,
            fileType: String,    // 'image', 'pdf', 'doc', etc.
        },
    },
    { timestamps: true }
);

// ─── Main Task Schema ─────────────────────────────────────────────────────────
const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Task title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },

        description: {
            type: String,
            trim: true,
            maxlength: [5000, 'Description cannot exceed 5000 characters'],
        },

        // Which board this task belongs to
        board: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Board',
            required: true,
            index: true,
        },

        // Which column of the board this task is in (e.g., "In Progress")
        column: {
            type: String,
            required: true,
        },

        // Position within the column (for drag-and-drop ordering)
        // Lower number = higher position in the list
        order: {
            type: Number,
            default: 0,
        },

        // Who created the task
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // Who is responsible for completing the task
        assignees: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],

        priority: {
            type: String,
            enum: {
                values: ['low', 'medium', 'high', 'critical'],
                message: 'Priority must be low, medium, high, or critical',
            },
            default: 'medium',
        },

        status: {
            type: String,
            enum: ['open', 'in_progress', 'in_review', 'blocked', 'done'],
            default: 'open',
        },

        // Due date — used for calendar view and overdue highlighting
        dueDate: {
            type: Date,
            default: null,
        },

        // Time estimate in hours (e.g., 2.5 = 2.5 hours)
        estimate: {
            type: Number,
            min: [0, 'Estimate cannot be negative'],
            default: null,
        },

        // Tags/labels (e.g., ["bug", "frontend", "urgent"])
        tags: {
            type: [String],
            validate: {
                validator: (tags) => tags.length <= 10,
                message: 'A task cannot have more than 10 tags',
            },
        },

        // Files attached to the task (uploaded via Multer/Cloudinary on Day 9)
        attachments: [
            {
                url: String,           // Cloudinary CDN URL
                publicId: String,      // Needed to delete from Cloudinary
                fileName: String,
                fileSize: Number,      // in bytes
                fileType: String,
                uploadedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        // Embedded comments (avoids a separate Comments collection for simple cases)
        comments: [commentSchema],

        // AI metadata — populated on Day 12 when AI generates this task
        aiGenerated: {
            type: Boolean,
            default: false,
        },
        aiPrompt: {
            type: String,    // The original goal text the user typed ("Build auth system")
            default: null,
        },

        // Sub-tasks (checklist items within a task)
        subtasks: [
            {
                title: {
                    type: String,
                    required: true,
                    trim: true,
                },
                isCompleted: {
                    type: Boolean,
                    default: false,
                },
                completedAt: Date,
                assignee: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
            },
        ],

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
// Most common query: "Give me all tasks for this board, in this column, sorted by order"
taskSchema.index({ board: 1, column: 1, order: 1 });

// Find all tasks assigned to a specific user
taskSchema.index({ assignees: 1 });

// Find overdue tasks (tasks with a dueDate in the past that aren't done)
taskSchema.index({ dueDate: 1, status: 1 });

// Find AI-generated tasks on a board (for the AI panel on Day 12)
taskSchema.index({ board: 1, aiGenerated: 1 });

// ─── Virtual: completion percentage ──────────────────────────────────────────
taskSchema.virtual('subtaskProgress').get(function () {
    if (!this.subtasks || this.subtasks.length === 0) return null;
    const done = this.subtasks.filter((s) => s.isCompleted).length;
    return Math.round((done / this.subtasks.length) * 100);  // e.g., 75
});

// ─── Virtual: isOverdue ───────────────────────────────────────────────────────
taskSchema.virtual('isOverdue').get(function () {
    if (!this.dueDate || this.status === 'done') return false;
    return this.dueDate < new Date();
});

const Task = mongoose.model('Task', taskSchema);
export default Task;