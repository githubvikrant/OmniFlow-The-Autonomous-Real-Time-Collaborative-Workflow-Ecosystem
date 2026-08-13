import catchAsync from '../utils/catchAsync.js';
import User from '../models/user.model.js';
import Board from '../models/board.model.js';
import Task from '../models/task.model.js';
import AppError from '../utils/AppError.js';
import { getOnlineUserIds } from '../sockets/socket.server.js';

// GET /api/v1/admin/stats — Overall ecosystem statistics
export const getEcosystemStats = catchAsync(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const onlineUserIds = getOnlineUserIds();
  const onlineCount = onlineUserIds.length;

  const totalBoards = await Board.countDocuments();
  const totalTasks = await Task.countDocuments();

  // Find all distinct users assigned to at least 1 board
  const boardsWithMembers = await Board.find().select('members owner');
  const userIdsWorkingOnProjects = new Set();

  boardsWithMembers.forEach((board) => {
    if (board.owner) userIdsWorkingOnProjects.add(board.owner.toString());
    if (board.members && Array.isArray(board.members)) {
      board.members.forEach((m) => {
        if (m.user) userIdsWorkingOnProjects.add(m.user.toString());
      });
    }
  });

  const workingOnProjectsCount = userIdsWorkingOnProjects.size;
  const unassignedUsersCount = Math.max(0, totalUsers - workingOnProjectsCount);

  // Role distribution aggregation
  const rolesAggregation = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);
  const roleDistribution = { admin: 0, member: 0, viewer: 0 };
  rolesAggregation.forEach((r) => {
    if (r._id) roleDistribution[r._id] = r.count;
  });

  res.status(200).json({
    status: 'success',
    data: {
      totalUsers,
      workingOnProjectsCount,
      unassignedUsersCount,
      onlineCount,
      totalBoards,
      totalTasks,
      roleDistribution,
    },
  });
});

// GET /api/v1/admin/users — List all users with workloads & online status
export const getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  const onlineUserIds = new Set(getOnlineUserIds());

  const boards = await Board.find().select('name owner members');
  const tasks = await Task.find().select('assignees title board column priority');

  const formattedUsers = users.map((user) => {
    const userIdStr = user._id.toString();
    const userBoards = boards.filter(
      (b) =>
        b.owner?.toString() === userIdStr ||
        b.members?.some((m) => m.user?.toString() === userIdStr)
    );
    const assignedTasks = tasks.filter((t) =>
      t.assignees?.some((a) => a.toString() === userIdStr)
    );

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
      isOnline: onlineUserIds.has(userIdStr),
      createdAt: user.createdAt,
      projectCount: userBoards.length,
      projects: userBoards.map((b) => ({ id: b._id, name: b.name })),
      taskCount: assignedTasks.length,
      tasks: assignedTasks.map((t) => ({
        id: t._id,
        title: t.title,
        column: t.column,
        priority: t.priority,
      })),
    };
  });

  res.status(200).json({
    status: 'success',
    results: formattedUsers.length,
    data: { users: formattedUsers },
  });
});

// PATCH /api/v1/admin/users/:id/status — Deactivate / Blacklist or Reactivate User
export const updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw new AppError('isActive must be a boolean value.', 400);
  }

  if (id === req.user._id.toString()) {
    throw new AppError('You cannot blacklist or deactivate your own admin account.', 400);
  }

  const user = await User.findByIdAndUpdate(
    id,
    { isActive },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  res.status(200).json({
    status: 'success',
    message: `User account ${isActive ? 'reactivated' : 'blacklisted'} successfully.`,
    data: { user },
  });
});

// PATCH /api/v1/admin/users/:id/role — Change User Role (e.g. Promote to Admin)
export const updateUserRole = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['admin', 'member', 'viewer'].includes(role)) {
    throw new AppError('Invalid role. Allowed values: admin, member, viewer.', 400);
  }

  const user = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  res.status(200).json({
    status: 'success',
    message: `User role updated to ${role}.`,
    data: { user },
  });
});

// GET /api/v1/admin/projects — List all projects & progress across ecosystem
export const getAllProjects = catchAsync(async (req, res) => {
  const boards = await Board.find()
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar role')
    .sort({ updatedAt: -1 });

  const tasks = await Task.find().select('board column priority');

  const formattedProjects = boards.map((board) => {
    const boardTasks = tasks.filter(
      (t) => t.board?.toString() === board._id.toString()
    );
    const completedTasks = boardTasks.filter(
      (t) => t.column === 'Done' || t.column === 'Completed'
    ).length;
    const progress =
      boardTasks.length > 0
        ? Math.round((completedTasks / boardTasks.length) * 100)
        : 0;

    return {
      _id: board._id,
      name: board.name,
      description: board.description,
      owner: board.owner,
      members: board.members,
      memberCount: board.members ? board.members.length : 0,
      taskCount: boardTasks.length,
      completedTaskCount: completedTasks,
      progress,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    };
  });

  res.status(200).json({
    status: 'success',
    results: formattedProjects.length,
    data: { projects: formattedProjects },
  });
});
