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
  Divider,
  LinearProgress,
  Link,
  CircularProgress
} from '@mui/material';
import {
  Send,
  MoreVert,
  Delete,
  Edit,
  EmojiEmotions,
  AttachFile,
  Image as ImageIcon,
  InsertDriveFile,
  Download
} from '@mui/icons-material';
import messageService from '../services/message.service';
import { Message, User, Team } from '../types';
import { useAuth } from '../context/AuthContext';

interface MessagesPanelProps {
  channelId: string;
  channelName: string;
  team?: Team | null;
}

const MessagesPanel: React.FC<MessagesPanelProps> = ({ channelId, channelName, team }) => {
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      // If editing a message, update it; otherwise send a new message
      if (editingMessage) {
        handleUpdateMessage();
      } else {
        handleSendMessage();
      }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleFileUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user || !socket) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setError('');

      await messageService.uploadFile(
        channelId,
        file,
        newMessage.trim() || undefined,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // The message is already created by the API and broadcast via Socket.io
      // The server will broadcast it to all users including the sender
      // We'll receive it via the 'new-message' socket event, so we don't need to add it manually
      // This ensures consistency across all clients

      setNewMessage('');
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type === 'image') {
      return <ImageIcon fontSize="small" />;
    }
    return <InsertDriveFile fontSize="small" />;
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to get correct file URL - handles both relative and absolute URLs
  const getFileUrl = (fileUrl: string | undefined, fileName?: string): string => {
    if (!fileUrl && !fileName) return '';
    
    // Get server base URL - use SOCKET_URL if available, otherwise derive from API_URL
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    
    // Use SOCKET_URL as the base (it's the server URL), or derive from API_URL
    let baseUrl = SOCKET_URL || API_URL.replace('/api', '').replace(/\/$/, '');
    
    // Ensure baseUrl doesn't have trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // If fileUrl is already an absolute URL (http/https), extract the path and rebuild with correct baseUrl
    if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
      try {
        const url = new URL(fileUrl);
        const path = url.pathname; // e.g., /uploads/filename-timestamp-hash.ext
        // Rebuild URL with correct baseUrl (fixes port mismatch)
        return `${baseUrl}${path}`;
      } catch {
        // If URL parsing fails, try to extract path manually
        const pathMatch = fileUrl.match(/\/uploads\/[^?]+/);
        if (pathMatch) {
          return `${baseUrl}${pathMatch[0]}`;
        }
        // Last resort: use as-is
        return fileUrl;
      }
    }
    
    // If fileUrl starts with /uploads/, use it directly with baseUrl
    if (fileUrl && fileUrl.startsWith('/uploads/')) {
      return `${baseUrl}${fileUrl}`;
    }
    
    // If fileUrl starts with /uploads (without trailing /), use it directly
    if (fileUrl && fileUrl.startsWith('/uploads')) {
      return `${baseUrl}${fileUrl}`;
    }
    
    // If fileUrl is just a filename (no slashes), assume it's in uploads
    if (fileUrl && !fileUrl.includes('/')) {
      return `${baseUrl}/uploads/${fileUrl}`;
    }
    
    // If we have fileName, use it
    if (fileName) {
      // Extract just the filename if it's a full path
      const justFileName = fileName.split('/').pop() || fileName;
      return `${baseUrl}/uploads/${justFileName}`;
    }
    
    // Fallback: try to extract filename from fileUrl
    if (fileUrl) {
      // If it contains /uploads/, extract the path part
      if (fileUrl.includes('/uploads/')) {
        const path = fileUrl.split('/uploads/')[1];
        return `${baseUrl}/uploads/${path}`;
      }
      // Otherwise, use the last part as filename
      const filename = fileUrl.split('/').pop() || fileUrl;
      return `${baseUrl}/uploads/${filename}`;
    }
    
    return '';
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
    if (!user || !user._id) return false;
    
    // Normalize user._id to string
    const currentUserId = String(user._id);
    
    // Handle populated senderId (object) or string senderId
    if (typeof message.senderId === 'object' && message.senderId) {
      const senderId = (message.senderId as User)._id;
      return String(senderId) === currentUserId;
    }
    
    // Handle string senderId
    return String(message.senderId) === currentUserId;
  };

  const canDeleteMessage = (message: Message): boolean => {
    // Always allow owner to delete their own messages
    if (isOwnMessage(message)) return true;
    
    // Check if user is team owner or admin
    if (!team || !user || !user._id) return false;
    
    try {
      // Check if user is team owner
      let ownerIdStr: string;
      if (team.ownerId && typeof team.ownerId === 'object' && '_id' in team.ownerId) {
        ownerIdStr = String((team.ownerId as any)._id);
      } else if (typeof team.ownerId === 'string') {
        ownerIdStr = team.ownerId;
      } else {
        ownerIdStr = String(team.ownerId);
      }
      
      const userIdStr = String(user._id);
      const isOwner = ownerIdStr === userIdStr;
      
      // Check if user is admin
      const member = team.members.find((m) => {
        const memberIdStr = typeof m.userId === 'object' && m.userId && '_id' in m.userId 
          ? (m.userId as any)._id.toString() 
          : m.userId.toString();
        return memberIdStr === userIdStr;
      });
      const isAdmin = member?.role === 'admin' || member?.role === 'owner';
      
      return isOwner || isAdmin;
    } catch (error) {
      console.error('Error checking delete permission:', error);
      return false;
    }
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
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: (theme) => theme.palette.background.default }}>
      {/* Messages List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: (theme) => theme.palette.background.paper }}>
        {messages.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              mt: 4,
              color: (theme) => theme.palette.text.secondary,
            }}
          >
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
                  flexDirection: isOwnMessage(message) ? 'row-reverse' : 'row',
                }}
              >
                <Avatar
                  src={getSenderAvatar(message)}
                  sx={theme => ({
                    width: 40,
                    height: 40,
                    mr: isOwnMessage(message) ? 0 : 1,
                    ml: isOwnMessage(message) ? 1 : 0,
                    bgcolor: isOwnMessage(message)
                      ? theme.palette.primary.main
                      : theme.palette.secondary.main,
                    color: isOwnMessage(message)
                      ? theme.palette.primary.contrastText
                      : theme.palette.secondary.contrastText,
                    fontWeight: 700,
                  })}
                >
                  {getSenderName(message).charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ maxWidth: '70%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      sx={{
                        mr: 1,
                        color: (theme) =>
                          isOwnMessage(message)
                            ? theme.palette.primary.main
                            : theme.palette.text.primary,
                      }}
                    >
                      {isOwnMessage(message) ? 'You' : getSenderName(message)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ 
                        color: (theme) => theme.palette.text.secondary,
                        opacity: 0.8,
                      }}
                    >
                      {formatTime(message.createdAt)}
                    </Typography>
                  </Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      bgcolor: (theme) =>
                        isOwnMessage(message)
                          ? theme.palette.primary.main
                          : theme.palette.mode === 'dark'
                          ? theme.palette.grey[200]
                          : theme.palette.background.paper,
                      color: (theme) =>
                        isOwnMessage(message)
                          ? theme.palette.primary.contrastText
                          : theme.palette.text.primary,
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: (theme) =>
                          isOwnMessage(message)
                            ? theme.palette.primary.contrastText
                            : theme.palette.text.primary,
                        wordBreak: 'break-word',
                      }}
                    >
                      {message.content}
                    </Typography>

                    {/* File/Image Display */}
                    {message.type === 'image' && message.fileUrl && (() => {
                      const imageUrl = getFileUrl(message.fileUrl, message.fileName);
                      return (
                        <Box
                          sx={{
                            mt: 0,
                            mb: 0,
                            borderRadius: 0,
                            overflow: 'hidden',
                            bgcolor: (theme) =>
                              isOwnMessage(message)
                                ? theme.palette.mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : theme.palette.primary.light
                                : theme.palette.mode === 'dark'
                                ? 'rgba(255, 255, 255, 0.05)'
                                : theme.palette.action.hover,
                          }}
                        >
                          <img
                            src={imageUrl}
                            alt={message.fileName || 'Image'}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '400px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              objectFit: 'contain',
                              display: 'block',
                              background: 'transparent',
                            }}
                            onClick={() =>
                              window.open(getFileUrl(message.fileUrl, message.fileName), '_blank')
                            }
                            onError={(e) => {
                              // Theme colors not used here, just propagation
                              // Fallback logic unchanged
                              const SOCKET_URL =
                                import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
                              const baseUrl = SOCKET_URL.replace(/\/$/, '');
                              if (message.fileUrl && message.fileUrl.startsWith('http')) {
                                const url = new URL(message.fileUrl);
                                const path = url.pathname;
                                const fallbackUrl = `${baseUrl}${path}`;
                                (e.target as HTMLImageElement).src = fallbackUrl;
                              } else if (message.fileUrl && message.fileUrl.startsWith('/uploads/')) {
                                const fallbackUrl = `${baseUrl}${message.fileUrl}`;
                                (e.target as HTMLImageElement).src = fallbackUrl;
                              } else if (message.fileUrl) {
                                const fallbackUrl = `${baseUrl}/uploads/${message.fileUrl}`;
                                (e.target as HTMLImageElement).src = fallbackUrl;
                              } else if (message.fileName) {
                                const fallbackUrl = `${baseUrl}/uploads/${message.fileName}`;
                                (e.target as HTMLImageElement).src = fallbackUrl;
                              }
                            }}
                          />
                          {/* {message.fileName && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                opacity: 0.9,
                                color: (theme) =>
                                  isOwnMessage(message)
                                    ? theme.palette.primary.contrastText
                                    : theme.palette.text.secondary,
                              }}
                            >
                              {message.fileName}
                              {message.fileSize && ` (${formatFileSize(message.fileSize)})`}
                            </Typography>
                          )} */}
                        </Box>
                      );
                    })()}

                    {message.type === 'file' && message.fileUrl && (
                      <Box sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleDownloadFile(getFileUrl(message.fileUrl, message.fileName), message.fileName || 'file')
                          }
                          sx={{
                            color: (theme) =>
                              isOwnMessage(message)
                                ? theme.palette.primary.contrastText
                                : theme.palette.primary.main,
                            bgcolor: 'transparent',
                          }}
                        >
                          {getFileIcon(message.type)}
                        </IconButton>
                        <Box sx={{ flexGrow: 1 }}>
                          <Link
                            href={getFileUrl(message.fileUrl, message.fileName)}
                            onClick={(e) => {
                              e.preventDefault();
                              handleDownloadFile(getFileUrl(message.fileUrl, message.fileName), message.fileName || 'file');
                            }}
                            sx={{
                              color: (theme) =>
                                isOwnMessage(message)
                                  ? theme.palette.primary.contrastText
                                  : theme.palette.primary.main,
                              textDecoration: 'none',
                              '&:hover': {
                                textDecoration: 'underline',
                                color: (theme) =>
                                  isOwnMessage(message)
                                    ? theme.palette.secondary.light
                                    : theme.palette.secondary.main,
                              },
                            }}
                          >
                            {message.fileName || 'File'}
                          </Link>
                          {message.fileSize && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                opacity: 0.9,
                                color: (theme) =>
                                  isOwnMessage(message)
                                    ? theme.palette.primary.contrastText
                                    : theme.palette.text.secondary,
                              }}
                            >
                              {formatFileSize(message.fileSize)}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleDownloadFile(getFileUrl(message.fileUrl, message.fileName), message.fileName || 'file')
                          }
                          sx={{
                            color: (theme) =>
                              isOwnMessage(message)
                                ? theme.palette.primary.contrastText
                                : theme.palette.primary.main,
                            bgcolor: 'transparent',
                          }}
                        >
                          <Download fontSize="small" />
                        </IconButton>
                      </Box>
                    )}

                    {message.reactions && message.reactions.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                        {Object.entries(
                          message.reactions.reduce(
                            (acc: { [key: string]: string[] }, reaction) => {
                              const emoji = reaction.emoji;
                              if (!acc[emoji]) acc[emoji] = [];
                              const userId =
                                typeof reaction.userId === 'object'
                                  ? (reaction.userId as User)._id
                                  : reaction.userId;
                              if (!acc[emoji].includes(userId)) {
                                acc[emoji].push(userId);
                              }
                              return acc;
                            },
                            {},
                          ),
                        ).map(([emoji, userIds]) => (
                          <Chip
                            key={emoji}
                            label={`${emoji} ${userIds.length}`}
                            size="small"
                            onClick={() => handleAddReaction(message._id, emoji)}
                            sx={{
                              cursor: 'pointer',
                              bgcolor: (theme) => theme.palette.action.selected,
                              color: (theme) => theme.palette.text.primary,
                              '&:hover': {
                                bgcolor: (theme) => theme.palette.primary.light,
                              },
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    {(isOwnMessage(message) || canDeleteMessage(message)) && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMessageMenu(e, message)}
                        sx={{
                          color: (theme) => theme.palette.text.secondary,
                          bgcolor: 'transparent',
                          '&:hover': { bgcolor: (theme) => theme.palette.action.hover },
                        }}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleAddReaction(message._id, '👍')}
                      sx={{
                        color: (theme) => theme.palette.success.main,
                        bgcolor: 'transparent',
                        '&:hover': { bgcolor: (theme) => theme.palette.action.hover },
                      }}
                    >
                      <EmojiEmotions fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
            {typingUsers.size > 0 && (
              <Typography
                variant="caption"
                sx={{
                  fontStyle: 'italic',
                  color: (theme) => theme.palette.text.secondary,
                  opacity: 0.9,
                  mt: 1,
                }}
              >
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </Typography>
            )}
          </>
        )}
      </Box>

      {/* Message Input */}
      <Divider sx={{ bgcolor: (theme) => theme.palette.divider }} />
      <Box sx={{ p: 2, bgcolor: (theme) => theme.palette.background.paper }}>
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
              sx={{
                bgcolor: (theme) => theme.palette.background.default,
                '& fieldset': { borderColor: (theme) => theme.palette.divider },
              }}
              InputProps={{
                style: { color: 'inherit' }
              }}
            />
            <IconButton onClick={handleUpdateMessage} color="primary">
              <Send />
            </IconButton>
            <IconButton
              onClick={() => {
                setEditingMessage(null);
                setNewMessage('');
              }}
              color="error"
            >
              <Delete />
            </IconButton>
          </Box>
        ) : (
          <Box>
            {uploading && (
              <Box sx={{ mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{
                    bgcolor: (theme) => theme.palette.action.disabledBackground,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: (theme) => theme.palette.primary.main,
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Uploading... {uploadProgress}%
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
              />
              <IconButton onClick={handleAttachClick} color="primary" disabled={uploading}>
                <AttachFile />
              </IconButton>
              <TextField
                fullWidth
                size="small"
                value={newMessage}
                onChange={handleTyping}
                onKeyPress={handleKeyPress}
                placeholder={`Message #${channelName}`}
                multiline
                maxRows={4}
                disabled={uploading}
              />
              <IconButton 
                onClick={handleSendMessage} 
                color="primary" 
                disabled={!newMessage.trim() || uploading}
              >
                <Send />
              </IconButton>
            </Box>
            {selectedFile && !uploading && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Message Menu */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={handleMenuClose}
      >
        {selectedMessage && (
          <>
            {isOwnMessage(selectedMessage) && (
              <MenuItem onClick={handleEditMessage}>
                <Edit fontSize="small" sx={{ mr: 1 }} />
                <ListItemText>Edit</ListItemText>
              </MenuItem>
            )}
            {(isOwnMessage(selectedMessage) || canDeleteMessage(selectedMessage)) && (
              <MenuItem onClick={handleDeleteMessage}>
                <Delete fontSize="small" sx={{ mr: 1 }} />
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            )}
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