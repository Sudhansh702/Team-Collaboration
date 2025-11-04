import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Edit,
  Delete,
  MoreVert,
  Flag,
  Person,
  CalendarToday,
  CheckCircle,
  RadioButtonUnchecked
} from '@mui/icons-material';
import { Task } from '../types';
import { useAuth } from '../context/AuthContext';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  const { user } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  const canEdit = user?._id === task.createdBy || 
    (typeof task.createdBy === 'object' && task.createdBy && '_id' in task.createdBy && 
     (task.createdBy as any)._id === user?._id);

  return (
    <Card
      sx={{
        mb: 1,
        '&:hover': {
          boxShadow: 3,
          cursor: 'pointer'
        },
        borderLeft: `4px solid ${
          task.priority === 'high' ? '#f44336' :
          task.priority === 'medium' ? '#ff9800' :
          '#4caf50'
        }`
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <IconButton
              size="small"
              onClick={() => {
                if (onStatusChange) {
                  const newStatus = task.status === 'completed' ? 'todo' : 'completed';
                  onStatusChange(task._id, newStatus);
                }
              }}
              sx={{ p: 0.5 }}
            >
              {task.status === 'completed' ? (
                <CheckCircle color="success" />
              ) : (
                <RadioButtonUnchecked />
              )}
            </IconButton>
            <Typography
              variant="h6"
              sx={{
                flex: 1,
                textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                opacity: task.status === 'completed' ? 0.7 : 1
              }}
            >
              {task.title}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            <MoreVert />
          </IconButton>
        </Box>

        {task.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1.5, ml: 4 }}
          >
            {task.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', ml: 4 }}>
          {/* Status */}
          <Chip
            label={task.status.replace('-', ' ').toUpperCase()}
            size="small"
            color={getStatusColor(task.status) as any}
          />

          {/* Priority */}
          <Chip
            icon={<Flag />}
            label={task.priority.toUpperCase()}
            size="small"
            color={getPriorityColor(task.priority) as any}
          />

          {/* Due Date */}
          {task.dueDate && (
            <Chip
              icon={<CalendarToday />}
              label={formatDate(task.dueDate)}
              size="small"
              color={isOverdue ? 'error' : 'default'}
              variant={isOverdue ? 'filled' : 'outlined'}
            />
          )}

          {/* Assigned To */}
          {Array.isArray(task.assignedTo) && task.assignedTo.length > 0 && (
            <Tooltip title={task.assignedTo.length > 1 ? `${task.assignedTo.length} assignees` : '1 assignee'}>
              <Chip
                icon={<Person />}
                label={`${task.assignedTo.length} ${task.assignedTo.length === 1 ? 'assignee' : 'assignees'}`}
                size="small"
                variant="outlined"
              />
            </Tooltip>
          )}
        </Box>
      </CardContent>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            onEdit(task);
            setMenuAnchor(null);
          }}
          disabled={!canEdit}
        >
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this task?')) {
              onDelete(task._id);
            }
            setMenuAnchor(null);
          }}
          disabled={!canEdit}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default TaskCard;

