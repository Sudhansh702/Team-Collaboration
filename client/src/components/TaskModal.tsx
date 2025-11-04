import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Alert
} from '@mui/material';
import {
  Task as TaskIcon,
  Flag
} from '@mui/icons-material';
import taskService from '../services/task.service';
import { Task, Team } from '../types';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  team: Team;
  channelId?: string;
  task?: Task | null; // If provided, edit mode; otherwise, create mode
  onSuccess?: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({
  open,
  onClose,
  team,
  channelId,
  task,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as 'todo' | 'in-progress' | 'completed' | 'cancelled',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assignedTo: [] as string[],
    dueDate: ''
  });

  useEffect(() => {
    if (task) {
      // Edit mode - populate form with task data
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo : [],
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
      });
    } else {
      // Create mode - reset form
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignedTo: [],
        dueDate: ''
      });
    }
    setError('');
  }, [task, open]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (task) {
        // Update existing task
        await taskService.updateTask(task._id, {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          assignedTo: formData.assignedTo,
          dueDate: formData.dueDate || undefined
        });
      } else {
        // Create new task
        await taskService.createTask(
          formData.title,
          team._id,
          formData.description,
          channelId,
          formData.assignedTo,
          formData.priority,
          formData.dueDate || undefined
        );
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      setLoading(true);
      setError('');
      await taskService.deleteTask(task._id);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  // Get team members for assignment
  const teamMembers = team.members || [];
  const memberOptions = teamMembers.map((member) => {
    const userId = typeof member.userId === 'object' && member.userId && '_id' in member.userId
      ? (member.userId as any)._id.toString()
      : member.userId.toString();
    const username = typeof member.userId === 'object' && member.userId && 'username' in member.userId
      ? (member.userId as any).username
      : 'User';
    return { id: userId, username };
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TaskIcon />
          <Typography variant="h6">
            {task ? 'Edit Task' : 'Create Task'}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Title */}
          <TextField
            label="Title"
            required
            fullWidth
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter task title"
          />

          {/* Description */}
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter task description (optional)"
          />

          {/* Status and Priority */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="todo">To Do</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                label="Priority"
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <MenuItem value="low">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Flag sx={{ color: 'success.main' }} />
                    Low
                  </Box>
                </MenuItem>
                <MenuItem value="medium">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Flag sx={{ color: 'warning.main' }} />
                    Medium
                  </Box>
                </MenuItem>
                <MenuItem value="high">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Flag sx={{ color: 'error.main' }} />
                    High
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Assigned To */}
          <FormControl fullWidth>
            <InputLabel>Assign To</InputLabel>
            <Select
              multiple
              value={formData.assignedTo}
              label="Assign To"
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value as string[] })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((userId) => {
                    const member = memberOptions.find(m => m.id === userId);
                    return (
                      <Chip
                        key={userId}
                        label={member?.username || 'User'}
                        size="small"
                      />
                    );
                  })}
                </Box>
              )}
            >
              {memberOptions.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Due Date */}
          <TextField
            label="Due Date"
            type="date"
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Box>
            {task && (
              <Button
                color="error"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
          </Box>
          <Box>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !formData.title.trim()}
            >
              {loading ? 'Saving...' : task ? 'Update' : 'Create'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default TaskModal;

