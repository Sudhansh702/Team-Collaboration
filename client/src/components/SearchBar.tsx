import { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Message as MessageIcon,
  Tag as TagIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import searchService, { SearchResults } from '../services/search.service';
// Date formatting helper
const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

interface SearchBarProps {
  onSelectMessage?: (messageId: string, channelId: string) => void;
  onSelectChannel?: (channelId: string) => void;
  onSelectTeam?: (teamId: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSelectMessage,
  onSelectChannel,
  onSelectTeam
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true); // Keep search bar open by default when rendered

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    try {
      setLoading(true);
      const searchResults = await searchService.search(searchQuery);
      setResults(searchResults);
      setOpen(true);
    } catch (error: any) {
      console.error('Search error:', error);
      setResults({ messages: [], channels: [], teams: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      // Debounce search
      const timeoutId = setTimeout(() => {
        handleSearch(value);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setResults(null);
      setOpen(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setResults(null);
  };

  const formatMessagePreview = (content: string, maxLength: number = 100): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search messages, channels, teams..."
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          endAdornment: loading ? (
            <CircularProgress size={20} />
          ) : query ? (
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          ) : null
        }}
        onFocus={() => {
          if (results) {
            setOpen(true);
          }
        }}
      />

      {open && results && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: '400px',
            overflow: 'auto',
            zIndex: 1000,
            boxShadow: 3
          }}
        >
          {results.messages.length === 0 &&
            results.channels.length === 0 &&
            results.teams.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No results found
              </Typography>
            </Box>
          ) : (
            <List dense>
              {/* Messages */}
              {results.messages.length > 0 && (
                <>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MessageIcon fontSize="small" color="primary" />
                          <Typography variant="subtitle2" fontWeight="bold">
                            Messages ({results.messages.length})
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {results.messages.map((message: any) => (
                    <ListItem
                      key={message._id}
                      button
                      onClick={() => {
                        if (onSelectMessage && message.channelId) {
                          const channelId = typeof message.channelId === 'object'
                            ? message.channelId._id
                            : message.channelId;
                          onSelectMessage(message._id, channelId);
                          handleClose();
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={
                            message.senderId && typeof message.senderId === 'object'
                              ? message.senderId.avatar
                              : ''
                          }
                          sx={{ width: 32, height: 32 }}
                        >
                          {message.senderId && typeof message.senderId === 'object'
                            ? message.senderId.username?.charAt(0).toUpperCase() || 'U'
                            : 'U'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {message.senderId && typeof message.senderId === 'object'
                                ? message.senderId.username || 'Unknown'
                                : 'Unknown'}
                            </Typography>
                            {message.channelId && typeof message.channelId === 'object' && (
                              <Chip
                                label={message.channelId.name || 'Channel'}
                                size="small"
                                variant="outlined"
                              />
                            )}
                            <Typography variant="caption" color="text.secondary">
                              {formatDistanceToNow(new Date(message.createdAt))}
                            </Typography>
                          </Box>
                        }
                        secondary={formatMessagePreview(message.content)}
                      />
                    </ListItem>
                  ))}
                  <Divider />
                </>
              )}

              {/* Channels */}
              {results.channels.length > 0 && (
                <>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TagIcon fontSize="small" color="primary" />
                          <Typography variant="subtitle2" fontWeight="bold">
                            Channels ({results.channels.length})
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {results.channels.map((channel: any) => (
                    <ListItem
                      key={channel._id}
                      button
                      onClick={() => {
                        if (onSelectChannel) {
                          onSelectChannel(channel._id);
                          handleClose();
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          <TagIcon fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={channel.name}
                        secondary={
                          channel.teamId && typeof channel.teamId === 'object'
                            ? `Team: ${channel.teamId.name}`
                            : channel.description || ''
                        }
                      />
                    </ListItem>
                  ))}
                  <Divider />
                </>
              )}

              {/* Teams */}
              {results.teams.length > 0 && (
                <>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <GroupIcon fontSize="small" color="primary" />
                          <Typography variant="subtitle2" fontWeight="bold">
                            Teams ({results.teams.length})
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {results.teams.map((team: any) => (
                    <ListItem
                      key={team._id}
                      button
                      onClick={() => {
                        if (onSelectTeam) {
                          onSelectTeam(team._id);
                          handleClose();
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                          <GroupIcon fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={team.name}
                        secondary={team.description || ''}
                      />
                    </ListItem>
                  ))}
                </>
              )}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default SearchBar;

