import { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Menu,
  Typography,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle,
  Delete,
  Message,
  Task,
  Event,
  Group,
  AlternateEmail
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import notificationService from '../services/notification.service';
import { Notification } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'message' | 'task' | 'meeting' | 'team_invite' | 'mention'>('all');

  const open = Boolean(anchorEl);

  useEffect(() => {
    if (!user) return;

    // Initialize Socket.io connection
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('accessToken')
      }
    });

    newSocket.on('connect', () => {
      console.log('Notification center connected to Socket.io');
      // Join user's notification room
      newSocket.emit('join-notifications', user._id);
    });

    // Listen for new notifications
    newSocket.on('new-notification', (notification: Notification) => {
      console.log('New notification received:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Listen for notification updates
    newSocket.on('notification-updated', (notification: Notification) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? notification : n))
      );
      if (notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });

    // Socket is stored in closure, no need to set state

    // Load notifications
    loadNotifications();
    loadUnreadCount();

    return () => {
      newSocket.emit('leave-notifications', user._id);
      newSocket.disconnect();
    };
  }, [user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(50);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    loadNotifications();
    loadUnreadCount();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const updated = await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? updated : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      // Update unread count if deleted notification was unread
      const deleted = notifications.find((n) => n._id === notificationId);
      if (deleted && !deleted.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification._id);
    
    // Navigate based on notification type
    if (notification.type === 'message' && notification.relatedId) {
      // Navigate to message/channel
      // You might need to fetch channelId from relatedId
    } else if (notification.type === 'task' && notification.relatedId) {
      // Navigate to task
    } else if (notification.type === 'meeting' && notification.relatedId) {
      // Navigate to meeting
    } else if (notification.type === 'team_invite' && notification.relatedId) {
      // Navigate to team
      navigate(`/workspace/${notification.relatedId}`);
    }
    
    handleClose();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return <Message fontSize="small" />;
      case 'task':
        return <Task fontSize="small" />;
      case 'meeting':
        return <Event fontSize="small" />;
      case 'team_invite':
        return <Group fontSize="small" />;
      case 'mention':
        return <AlternateEmail fontSize="small" />;
      default:
        return <NotificationsIcon fontSize="small" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return 'primary';
      case 'task':
        return 'warning';
      case 'meeting':
        return 'info';
      case 'team_invite':
        return 'success';
      case 'mention':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleClick}
          aria-label="notifications"
          aria-controls={open ? 'notification-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          sx={{
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon sx={{ color: 'text.primary' }} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        id="notification-menu"
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            mt: 1
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Notifications</Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllAsRead}>
                Mark all as read
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
            {(['all', 'message', 'task', 'meeting', 'team_invite', 'mention'] as const).map((type) => (
              <Chip
                key={type}
                label={type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                size="small"
                onClick={() => setFilter(type)}
                color={filter === type ? 'primary' : 'default'}
                variant={filter === type ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>
        <Divider />
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredNotifications.map((notification, index) => (
                <Box key={notification._id}>
                  <ListItem
                    sx={{
                      bgcolor: notification.read ? 'transparent' : 'action.hover',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.selected'
                      }
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: `${getNotificationColor(notification.type)}.main`,
                          width: 40,
                          height: 40
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" fontWeight={notification.read ? 'normal' : 'bold'}>
                            {notification.title}
                          </Typography>
                          {!notification.read && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'primary.main'
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                      }
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification._id);
                        }}
                        disabled={notification.read}
                      >
                        <CheckCircle fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification._id);
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>
                  {index < filteredNotifications.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </Box>
      </Menu>
    </>
  );
};

export default NotificationCenter;

