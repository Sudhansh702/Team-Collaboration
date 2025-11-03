import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Send,
  MoreVert,
  Delete,
  Edit,
  EmojiEmotions
} from '@mui/icons-material';
import messageService from '../services/message.service';
import { Message, User } from '../types';
import { useAuth } from '../context/AuthContext';

interface MessagesPanelProps {
  channelId: string;
  channelName: string;
}

const MessagesPanel: React.FC<MessagesPanelProps> = ({ channelId, channelName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      // Join channel room
      newSocket.emit('join-channel', channelId);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Listen for new messages
    newSocket.on('new-message', (message: Message) => {
      if (message.channelId === channelId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    // Listen for message updates
    newSocket.on('message-updated', (message: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === message._id ? message : m))
      );
    });

    // Listen for message deletions
    newSocket.on('message-deleted', (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== data.messageId));
    });

    // Listen for typing indicators
    newSocket.on('user-typing', (data: { userId: string; username: string }) => {
      if (data.userId !== user?._id) {
        setTypingUsers((prev) => new Set(prev).add(data.username));
      }
    });

    newSocket.on('user-stopped-typing', () => {
      // Remove typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(() => new Set());
      }, 3000);
    });

    // Listen for errors
    newSocket.on('message-error', (data: { error: string }) => {
      setError(data.error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave-channel', channelId);
      newSocket.disconnect();
    };
  }, [channelId, user?._id]);

  useEffect(() => {
    // Load messages
    const loadMessages = async () => {
      try {
        setLoading(true);
        const loadedMessages = await messageService.getChannelMessages(channelId);
        setMessages(loadedMessages);
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    if (channelId) {
      loadMessages();
    }
  }, [channelId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !socket) return;

    try {
      setError('');
      // Send via socket (will be saved to DB by server)
      socket.emit('send-message', {
        channelId,
        senderId: user._id,
        content: newMessage.trim(),
        type: 'text'
      });
      setNewMessage('');
      
      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit('typing-stop', { channelId, userId: user._id });
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!socket || !user) return;

    // Emit typing start
    if (e.target.value.trim()) {
      socket.emit('typing-start', {
        channelId,
        userId: user._id,
        username: user.username || user.email
      });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { channelId, userId: user._id });
      }, 3000);
    } else {
      socket.emit('typing-stop', { channelId, userId: user._id });
    }
  };

  const handleMessageMenu = (event: React.MouseEvent<HTMLElement>, message: Message) => {
    setMessageMenuAnchor(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMenuClose = () => {
    setMessageMenuAnchor(null);
    setSelectedMessage(null);
  };

  const handleEditMessage = () => {
    if (selectedMessage) {
      setEditingMessage(selectedMessage);
      setNewMessage(selectedMessage.content);
      handleMenuClose();
    }
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage || !socket || !user) return;

    try {
      socket.emit('update-message', {
        messageId: editingMessage._id,
        userId: user._id,
        content: newMessage.trim(),
        channelId
      });
      setEditingMessage(null);
      setNewMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to update message');
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage || !socket || !user) return;

    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        socket.emit('delete-message', {
          messageId: selectedMessage._id,
          userId: user._id,
          channelId
        });
        handleMenuClose();
      } catch (err: any) {
        setError(err.message || 'Failed to delete message');
      }
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!socket || !user) return;

    try {
      socket.emit('add-reaction', {
        messageId,
        userId: user._id,
        emoji,
        channelId
      });
    } catch (err: any) {
      setError(err.message || 'Failed to add reaction');
    }
  };

  const getSenderName = (message: Message): string => {
    if (typeof message.senderId === 'object' && message.senderId) {
      return (message.senderId as User).username || (message.senderId as User).email || 'Unknown';
    }
    return 'Unknown';
  };

  const getSenderAvatar = (message: Message): string => {
    if (typeof message.senderId === 'object' && message.senderId) {
      return (message.senderId as User).avatar || '';
    }
    return '';
  };

  const isOwnMessage = (message: Message): boolean => {
    if (!user) return false;
    if (typeof message.senderId === 'object' && message.senderId) {
      return (message.senderId as User)._id === user._id;
    }
    return message.senderId === user._id;
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography>Loading messages...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No messages yet. Start the conversation!
          </Typography>
        ) : (
          <>
            {messages.map((message) => (
              <Box
                key={message._id}
                sx={{
                  display: 'flex',
                  mb: 2,
                  flexDirection: isOwnMessage(message) ? 'row-reverse' : 'row'
                }}
              >
                <Avatar
                  src={getSenderAvatar(message)}
                  sx={{ width: 40, height: 40, mr: isOwnMessage(message) ? 0 : 1, ml: isOwnMessage(message) ? 1 : 0 }}
                >
                  {getSenderName(message).charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ maxWidth: '70%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
                      {isOwnMessage(message) ? 'You' : getSenderName(message)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(message.createdAt)}
                    </Typography>
                  </Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      bgcolor: isOwnMessage(message) ? 'primary.light' : 'grey.100',
                      color: isOwnMessage(message) ? 'white' : 'text.primary',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="body2">{message.content}</Typography>
                    {message.reactions && message.reactions.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                        {Object.entries(
                          message.reactions.reduce((acc: { [key: string]: string[] }, reaction) => {
                            const emoji = reaction.emoji;
                            if (!acc[emoji]) acc[emoji] = [];
                            const userId = typeof reaction.userId === 'object' ? (reaction.userId as User)._id : reaction.userId;
                            if (!acc[emoji].includes(userId)) {
                              acc[emoji].push(userId);
                            }
                            return acc;
                          }, {})
                        ).map(([emoji, userIds]) => (
                          <Chip
                            key={emoji}
                            label={`${emoji} ${userIds.length}`}
                            size="small"
                            onClick={() => handleAddReaction(message._id, emoji)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    {isOwnMessage(message) && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMessageMenu(e, message)}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleAddReaction(message._id, '👍')}
                    >
                      <EmojiEmotions fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
            {typingUsers.size > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </Typography>
            )}
          </>
        )}
      </Box>

      {/* Message Input */}
      <Divider />
      <Box sx={{ p: 2 }}>
        {editingMessage ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Edit message..."
              autoFocus
            />
            <IconButton onClick={handleUpdateMessage} color="primary">
              <Send />
            </IconButton>
            <IconButton onClick={() => { setEditingMessage(null); setNewMessage(''); }} color="error">
              <Delete />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder={`Message #${channelName}`}
              multiline
              maxRows={4}
            />
            <IconButton onClick={handleSendMessage} color="primary" disabled={!newMessage.trim()}>
              <Send />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Message Menu */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={handleMenuClose}
      >
        {selectedMessage && isOwnMessage(selectedMessage) && (
          <>
            <MenuItem onClick={handleEditMessage}>
              <Edit fontSize="small" sx={{ mr: 1 }} />
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDeleteMessage}>
              <Delete fontSize="small" sx={{ mr: 1 }} />
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {error && (
        <Box sx={{ p: 1, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="caption">{error}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default MessagesPanel;

