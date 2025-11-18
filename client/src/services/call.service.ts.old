import { io, Socket } from 'socket.io-client';

export interface CallOffer {
  from: string;
  offer: RTCSessionDescriptionInit;
}

export interface CallAnswer {
  from: string;
  answer: RTCSessionDescriptionInit;
}

export interface IncomingCall {
  from: string;
  callType: 'audio' | 'video';
  teamId?: string;
}

class CallService {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null; // For 1-on-1 calls
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null; // For 1-on-1 calls
  private callHandlers: Map<string, Function> = new Map();
  private pendingOffer: RTCSessionDescriptionInit | null = null;
  private remoteStreamHandler: ((stream: MediaStream) => void) | null = null;
  
  // Multi-peer meeting support
  private meetingId: string | null = null;
  private currentUserId: string | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map(); // userId -> peerConnection
  private remoteStreams: Map<string, MediaStream> = new Map(); // userId -> remoteStream
  private meetingParticipants: Set<string> = new Set(); // Set of participant userIds
  private meetingRemoteStreamHandler: ((userId: string, stream: MediaStream) => void) | null = null;
  private meetingParticipantHandler: ((participants: string[]) => void) | null = null;

  initializeSocket(socketUrl: string) {
    // Reuse existing socket if connected
    if (this.socket && this.socket.connected) {
      console.log('Reusing existing socket connection');
      return this.socket;
    }

    // If socket exists but not connected, try to reconnect
    if (this.socket && !this.socket.connected) {
      console.log('Socket exists but not connected, disconnecting...');
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('Initializing new socket connection');
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Setup event listeners
    this.socket.on('incoming-call', (data: IncomingCall) => {
      this.emit('incoming-call', data);
    });

    this.socket.on('call-answered', (data: CallAnswer) => {
      this.emit('call-answered', data);
    });

    this.socket.on('call-rejected', (data: { from: string }) => {
      this.emit('call-rejected', data);
    });

    this.socket.on('call-ended', (data: { from: string }) => {
      this.emit('call-ended', data);
    });

    this.socket.on('offer', async (data: CallOffer) => {
      console.log('Offer received in call service socket:', data.from);
      await this.handleOffer(data);
    });

    this.socket.on('answer', async (data: CallAnswer) => {
      await this.handleAnswer(data);
    });

    this.socket.on('ice-candidate', (data: { from: string; candidate: RTCIceCandidateInit }) => {
      if (this.peerConnection && data.candidate) {
        // Check if remote description is set before adding ICE candidate
        // If not set, the browser will queue it automatically, but we log it for debugging
        if (this.peerConnection.remoteDescription) {
          this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(err => {
            console.error('Error adding ICE candidate:', err);
          });
        } else {
          console.log('ICE candidate received but remote description not set yet, queuing...');
          // Browser will queue it automatically, but we can also queue it manually
          this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {
            // If it fails, it's likely because remote description isn't set yet
            // This is OK - the browser will queue it
            console.log('ICE candidate queued (will be added when remote description is set)');
          });
        }
      }
    });

    // Meeting room event handlers
    this.socket.on('meeting-participant-joined', (data: { meetingId: string; userId: string; participants: string[] }) => {
      if (data.meetingId === this.meetingId) {
        this.meetingParticipants = new Set(data.participants);
        if (this.meetingParticipantHandler) {
          this.meetingParticipantHandler(data.participants);
        }
        // If this is a new participant joining, create peer connection
        if (data.userId !== this.currentUserId && !this.peerConnections.has(data.userId)) {
          this.addMeetingParticipant(data.userId);
        }
      }
    });

    this.socket.on('meeting-participant-left', (data: { meetingId: string; userId: string; participants: string[] }) => {
      if (data.meetingId === this.meetingId) {
        this.meetingParticipants = new Set(data.participants);
        if (this.meetingParticipantHandler) {
          this.meetingParticipantHandler(data.participants);
        }
        // Remove participant
        this.removeMeetingParticipant(data.userId);
      }
    });

    this.socket.on('meeting-offer', async (data: { meetingId: string; from: string; to: string; offer: RTCSessionDescriptionInit }) => {
      if (data.meetingId === this.meetingId && data.to === this.currentUserId) {
        await this.handleMeetingOffer(data.from, data.offer);
      }
    });

    this.socket.on('meeting-answer', async (data: { meetingId: string; from: string; to: string; answer: RTCSessionDescriptionInit }) => {
      if (data.meetingId === this.meetingId && data.to === this.currentUserId) {
        await this.handleMeetingAnswer(data.from, data.answer);
      }
    });

    this.socket.on('meeting-ice-candidate', (data: { meetingId: string; from: string; to: string; candidate: RTCIceCandidateInit }) => {
      if (data.meetingId === this.meetingId && data.to === this.currentUserId && data.candidate) {
        const peerConnection = this.peerConnections.get(data.from);
        if (peerConnection) {
          if (peerConnection.remoteDescription) {
            peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(err => {
              console.error('Error adding meeting ICE candidate:', err);
            });
          } else {
            peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {
              console.log('Meeting ICE candidate queued');
            });
          }
        }
      }
    });

    return this.socket;
  }

  joinUserRoom(userId: string) {
    if (this.socket) {
      this.socket.emit('join-user-room', userId);
    }
  }

  leaveUserRoom(userId: string) {
    if (this.socket) {
      this.socket.emit('leave-user-room', userId);
    }
  }

  on(event: string, handler: Function) {
    this.callHandlers.set(event, handler);
  }

  off(event: string) {
    this.callHandlers.delete(event);
  }

  private emit(event: string, data: any) {
    const handler = this.callHandlers.get(event);
    if (handler) {
      handler(data);
    }
  }

  private setupPeerConnectionHandlers(toUserId?: string) {
    if (!this.peerConnection) return;

    // Setup remote stream handler with proper event-driven approach
    this.peerConnection.ontrack = (event: RTCTrackEvent) => {
      console.log('*** ontrack event fired ***');
      console.log('Streams:', event.streams.length, 'Track:', event.track.kind, event.track.readyState);
      console.log('Track ID:', event.track.id, 'Track enabled:', event.track.enabled);
      console.log('Receiver:', event.receiver);

      let stream: MediaStream | null = null;

      if (event.streams && event.streams.length > 0) {
        // Use the stream from the event
        stream = event.streams[0];
        console.log('Using stream from event:', stream.id);
      } else if (event.track) {
        // Create stream from single track
        stream = new MediaStream([event.track]);
        console.log('Created new stream from track:', stream.id);
      }

      if (stream) {
        console.log('Processing remote stream with', stream.getTracks().length, 'tracks');
        console.log('All tracks in stream:', stream.getTracks().map(t => ({ kind: t.kind, id: t.id, readyState: t.readyState, enabled: t.enabled })));
        
        // CRITICAL: Only handle stream if track is live, not ended
        if (event.track.readyState === 'live') {
          console.log('Remote track is LIVE, handling stream immediately');
          this.handleRemoteStream(stream);
        } else if (event.track.readyState === 'ended') {
          console.warn('Remote track already ENDED when received:', event.track.kind);
          // Don't handle ended tracks - wait for new ones
          return;
        } else {
          console.log('Remote track not live yet, waiting...', event.track.readyState);
          // Wait for track to become live
          const checkTrackState = () => {
            if (event.track.readyState === 'live') {
              console.log('Remote track is now live:', event.track.kind);
              this.handleRemoteStream(stream);
            } else if (event.track.readyState === 'ended') {
              console.warn('Remote track ended before becoming live:', event.track.kind);
            } else {
              // Check again after a short interval
              setTimeout(checkTrackState, 100);
            }
          };
          checkTrackState();
        }

        // Monitor track state changes
        event.track.onended = () => {
          console.warn('Remote track ended during call:', event.track.kind);
          // Don't stop the stream, just log it
        };
      } else {
        console.warn('No stream found in ontrack event');
      }
    };

    // Monitor connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('ICE connection state:', state);
      
      if (state === 'failed' || state === 'disconnected') {
        console.warn('ICE connection issue:', state);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('Peer connection state:', state);
      
      if (state === 'failed') {
        this.emit('connection-error', { message: 'Connection failed' });
      }
    };

    // Handle ICE candidates
    if (toUserId) {
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('ice-candidate', {
            to: toUserId,
            candidate: event.candidate
          });
        }
      };
    }
  }

  private handleRemoteStream(stream: MediaStream) {
    console.log('=== handleRemoteStream called ===');
    console.log('Stream ID:', stream.id, 'Tracks:', stream.getTracks().length);
    
    // Get all tracks from the stream
    const tracks = stream.getTracks();
    console.log('Stream tracks:', tracks.map(t => ({ kind: t.kind, id: t.id, readyState: t.readyState, enabled: t.enabled })));
    
    // CRITICAL: Filter out tracks that are not live - NEVER use ended tracks
    const liveTracks = tracks.filter(t => {
      const isLive = t.readyState === 'live';
      if (!isLive) {
        console.warn('Filtering out non-live track:', t.kind, 'readyState:', t.readyState);
      }
      return isLive;
    });
    console.log('Live tracks after filtering:', liveTracks.length);
    
    if (liveTracks.length === 0) {
      console.warn('No LIVE tracks in remote stream, cannot handle stream');
      // Don't wait - if there are no live tracks, we can't use this stream
      // The ontrack event will fire again when new tracks arrive
      return;
    }
    
    // Check if we already have this stream (same track IDs)
    const currentTracks = this.remoteStream?.getTracks() || [];
    const isSameStream = this.remoteStream && 
      currentTracks.length === liveTracks.length &&
      currentTracks.every((track, i) => track.id === liveTracks[i]?.id);
    
    if (isSameStream && this.remoteStream) {
      console.log('Same remote stream already stored, skipping update');
      // Still notify handler in case it needs to refresh
      if (this.remoteStreamHandler) {
        this.remoteStreamHandler(this.remoteStream);
      }
      return;
    }
    
    // Create a new stream with ONLY live tracks
    const validStream = new MediaStream(liveTracks);
    console.log('Created valid stream with', validStream.getTracks().length, 'LIVE tracks');
    
    // If we already have a remote stream, replace it completely
    if (this.remoteStream) {
      // Stop old tracks (but don't stop the tracks themselves - they might be reused)
      this.remoteStream.getTracks().forEach(track => {
        // Only stop if track is not being reused
        if (track.readyState !== 'live') {
          track.stop();
        }
      });
    }
    
    // Store the new remote stream
    this.remoteStream = validStream;
    console.log('Remote stream stored with', this.remoteStream.getTracks().length, 'LIVE tracks');
    
    // Notify handler if set - call it with the valid stream
    if (this.remoteStreamHandler) {
      console.log('*** Calling remote stream handler with', this.remoteStream.getTracks().length, 'LIVE tracks ***');
      // Call handler with current stream
      this.remoteStreamHandler(this.remoteStream);
    } else {
      console.warn('No remote stream handler set!');
    }
  }

  async initiateCall(from: string, to: string, callType: 'audio' | 'video', teamId?: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    try {
      // Check if we can reuse existing stream
      if (!this.canReuseStream(callType)) {
        // Stop existing stream if any (only if we need different type)
        if (this.localStream) {
          // If we need video but only have audio, or vice versa, stop and recreate
          const hasVideo = this.localStream.getVideoTracks().length > 0;
          const needsVideo = callType === 'video';
          
          if (hasVideo !== needsVideo) {
            // Need different type, stop and recreate
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
          } else {
            // Same type but tracks might be stopped, just recreate
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
          }
        }

        // Get user media with constraints
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: callType === 'video' ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } : false
        };

        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Got new media stream, permission granted');
        
        // Re-enable tracks if they were disabled
        this.localStream.getTracks().forEach(track => {
          track.enabled = true;
        });
      } else {
        console.log('Reusing existing stream for call');
        // Re-enable tracks if they were disabled
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => {
            track.enabled = true;
          });
        }
      }

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Setup event handlers BEFORE adding tracks (pass 'to' for ICE candidates)
      this.setupPeerConnectionHandlers(to);

      // Add local tracks to peer connection BEFORE creating offer
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && track.readyState === 'live') {
            this.peerConnection.addTrack(track, this.localStream!);
            console.log('Added local track to peer connection (initiate):', track.kind, track.id, 'enabled:', track.enabled);
          }
        });
      }

      // Create and send offer - make sure we request to receive tracks
      const offerOptions: RTCOfferOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      };
      
      const offer = await this.peerConnection.createOffer(offerOptions);
      console.log('Offer created, checking senders:', this.peerConnection.getSenders().length);
      this.peerConnection.getSenders().forEach((sender, index) => {
        console.log(`Sender ${index}:`, sender.track?.kind, sender.track?.id, 'enabled:', sender.track?.enabled);
      });
      
      await this.peerConnection.setLocalDescription(offer);
      console.log('Local description set, offer created with', this.localStream?.getTracks().length || 0, 'local tracks');
      console.log('Offer SDP:', offer.sdp?.substring(0, 200));

      // Emit call initiation first
      this.socket.emit('call-initiate', { from, to, callType, teamId });

      // Send offer after ensuring local description is set
      this.socket.emit('offer', {
        from,
        to,
        offer: offer
      });
    } catch (error: any) {
      console.error('Error initiating call:', error);
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Camera/microphone permission denied. Please allow access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No camera or microphone found. Please connect a camera/microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Camera/microphone is being used by another application. Please close other apps and try again.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Camera/microphone constraints cannot be satisfied. Please check your device settings.');
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to access camera/microphone. Please check your browser permissions and try again.');
      }
    }
  }

  async answerCall(from: string, to: string, callType: 'audio' | 'video', offer?: RTCSessionDescriptionInit) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    try {
      // Wait for offer if not provided - wait up to 5 seconds
      let offerToUse = offer || this.pendingOffer;
      
      if (!offerToUse) {
        console.log('Waiting for offer to arrive...');
        // Wait for offer to arrive via socket event
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Offer not received within timeout. The caller may have disconnected.'));
          }, 5000); // Wait 5 seconds for offer

          const checkOffer = () => {
            if (this.pendingOffer) {
              offerToUse = this.pendingOffer;
              clearTimeout(timeout);
              this.socket?.off('offer', checkOffer);
              resolve();
            }
          };

          // Create a one-time listener for offer event
          const offerListener = (data: CallOffer) => {
            if (data.from === from) {
              this.pendingOffer = data.offer;
              offerToUse = data.offer;
              clearTimeout(timeout);
              this.socket?.off('offer', offerListener);
              resolve();
            }
          };
          
          // Listen for offer event (this is in addition to the main handler)
          if (this.socket) {
            this.socket.on('offer', offerListener);
          }

          // Check immediately in case offer arrived before we started waiting
          if (this.pendingOffer) {
            offerToUse = this.pendingOffer;
            clearTimeout(timeout);
            if (this.socket) {
              this.socket.off('offer', checkOffer);
            }
            resolve();
          }
        });
      }

      // Check if we can reuse existing stream
      if (!this.canReuseStream(callType)) {
        // Stop existing stream if any (only if we need different type)
        if (this.localStream) {
          // If we need video but only have audio, or vice versa, stop and recreate
          const hasVideo = this.localStream.getVideoTracks().length > 0;
          const needsVideo = callType === 'video';
          
          if (hasVideo !== needsVideo) {
            // Need different type, stop and recreate
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
          } else {
            // Same type but tracks might be stopped, just recreate
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
          }
        }

        // Get user media with constraints
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: callType === 'video' ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } : false
        };

        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Got new media stream, permission granted');
        
        // Re-enable tracks if they were disabled
        this.localStream.getTracks().forEach(track => {
          track.enabled = true;
        });
      } else {
        console.log('Reusing existing stream for call');
        // Re-enable tracks if they were disabled
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => {
            track.enabled = true;
          });
        }
      }

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Setup event handlers FIRST (before anything else)
      this.setupPeerConnectionHandlers(from);

      // Ensure we have the offer
      if (!offerToUse) {
        throw new Error('Offer not received. Cannot answer call.');
      }

      // Add local tracks FIRST (before setting remote description)
      // This ensures tracks are ready when we set remote description
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection && track.readyState === 'live') {
            this.peerConnection.addTrack(track, this.localStream!);
            console.log('Added local track to peer connection:', track.kind, track.id);
          }
        });
      }

      // Set remote description AFTER adding local tracks
      // This is critical for track events to fire properly
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerToUse));
      this.pendingOffer = null;
      console.log('Remote description set, waiting for remote tracks...');

      // Check for existing remote tracks (in case tracks were received before handler was set)
      // Also check periodically for new tracks
      const checkForRemoteTracks = () => {
        if (this.peerConnection) {
          const receivers = this.peerConnection.getReceivers();
          console.log('=== Checking for remote tracks ===');
          console.log('Receivers:', receivers.length);
          
          if (receivers.length > 0) {
            const remoteStream = new MediaStream();
            let hasLiveTracks = false;
            
            receivers.forEach((receiver, index) => {
              const track = receiver.track;
              console.log(`Receiver ${index}:`, track?.kind, track?.id, 'readyState:', track?.readyState);
              
              // CRITICAL: Only add tracks that are LIVE, not ended
              if (track && track.readyState === 'live') {
                console.log('Adding LIVE track to remote stream:', track.kind);
                remoteStream.addTrack(track);
                hasLiveTracks = true;
              } else if (track && track.readyState === 'ended') {
                console.warn(`Receiver ${index} track is ENDED, skipping:`, track.kind);
              } else {
                console.log(`Receiver ${index} track not live yet:`, track?.readyState);
              }
            });
            
            if (hasLiveTracks && remoteStream.getTracks().length > 0) {
              console.log('*** Found existing LIVE remote tracks, handling stream with', remoteStream.getTracks().length, 'tracks ***');
              this.handleRemoteStream(remoteStream);
            } else {
              console.log('Receivers found but no LIVE tracks yet (all ended or not ready)');
            }
          } else {
            console.log('No receivers found yet');
          }
        }
      };
      
      // Check immediately
      checkForRemoteTracks();
      
      // Also check periodically for new tracks (more frequently at first)
      let checkCount = 0;
      const trackCheckInterval = setInterval(() => {
        checkCount++;
        console.log(`Periodic remote track check #${checkCount}`);
        checkForRemoteTracks();
        
        // Stop checking after 15 seconds or if we have a remote stream
        if (checkCount >= 30 || this.remoteStream) {
          clearInterval(trackCheckInterval);
          console.log('Stopped periodic remote track checking');
        }
      }, 500);

      // Create and send answer - make sure we request to receive tracks
      const answerOptions: RTCAnswerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      };
      
      const answer = await this.peerConnection.createAnswer(answerOptions);
      console.log('Answer created, checking senders:', this.peerConnection.getSenders().length);
      this.peerConnection.getSenders().forEach((sender, index) => {
        console.log(`Sender ${index}:`, sender.track?.kind, sender.track?.id, 'enabled:', sender.track?.enabled);
      });
      console.log('Checking receivers:', this.peerConnection.getReceivers().length);
      this.peerConnection.getReceivers().forEach((receiver, index) => {
        console.log(`Receiver ${index}:`, receiver.track?.kind, receiver.track?.id, 'readyState:', receiver.track?.readyState);
      });
      
      await this.peerConnection.setLocalDescription(answer);
      console.log('Local description set, answer created');
      console.log('Answer SDP:', answer.sdp?.substring(0, 200));

      // Send answer via call-answer event
      this.socket.emit('call-answer', {
        from,
        to,
        answer: answer
      });

      // Also send via answer event for WebRTC signaling
      this.socket.emit('answer', {
        from,
        to,
        answer: answer
      });
    } catch (error: any) {
      console.error('Error answering call:', error);
      
      // Cleanup on error but keep stream for reuse
      this.cleanup(true);
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Camera/microphone permission denied. Please allow access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No camera or microphone found. Please connect a camera/microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Camera/microphone is being used by another application. Please close other apps and try again.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Camera/microphone constraints cannot be satisfied. Please check your device settings.');
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to access camera/microphone. Please check your browser permissions and try again.');
      }
    }
  }

  private async handleOffer(data: CallOffer) {
    console.log('Offer received from:', data.from);
    // Store the offer for when answerCall is called
    this.pendingOffer = data.offer;
    console.log('Offer stored as pending, waiting for answerCall to process it');
    
    // DON'T try to handle the offer here - let answerCall handle it
    // This prevents creating multiple peer connections and tracks becoming ended
    // The offer will be used when answerCall is called
  }

  private async handleAnswer(data: CallAnswer) {
    if (!this.peerConnection) {
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  rejectCall(from: string, to: string) {
    if (this.socket) {
      this.socket.emit('call-reject', { from, to });
    }
    // Keep stream for reuse when rejecting (we might not even have stream yet)
    this.cleanup(true);
  }

  endCall(from: string, to: string) {
    if (this.socket) {
      this.socket.emit('call-end', { from, to });
    }
    // Keep stream for reuse when ending call
    this.cleanup(true);
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  setRemoteStreamHandler(handler: (stream: MediaStream) => void) {
    this.remoteStreamHandler = handler;
    
    // If we already have a remote stream, call handler immediately
    if (this.remoteStream) {
      handler(this.remoteStream);
    }
  }

  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  cleanup(keepStream: boolean = true) {
    // Close peer connection (this stops sending tracks)
    if (this.peerConnection) {
      // Disable all sender tracks before closing
      this.peerConnection.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.enabled = false;
        }
      });
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Only stop remote stream tracks (we don't need to keep remote stream)
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => {
        track.stop();
      });
      this.remoteStream = null;
    }
    
    // Only stop local stream if we're explicitly not keeping it for reuse
    if (!keepStream && this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      this.localStream = null;
    } else if (this.localStream && keepStream) {
      // Keep stream alive but disable tracks temporarily
      // This preserves the permission so browser won't ask again
      this.localStream.getTracks().forEach(track => {
        track.enabled = false;
      });
    }
    
    // Clear pending offer
    this.pendingOffer = null;
  }

  // Full cleanup - stops all tracks (use when component unmounts)
  fullCleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => {
        track.stop();
      });
      this.remoteStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Clear pending offer
    this.pendingOffer = null;
  }

  disconnect() {
    // Full cleanup on disconnect (user is leaving)
    this.fullCleanup();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Check if we can reuse existing stream (for same call type)
  canReuseStream(callType: 'audio' | 'video'): boolean {
    if (!this.localStream) return false;
    
    const hasVideo = this.localStream.getVideoTracks().length > 0;
    const hasAudio = this.localStream.getAudioTracks().length > 0;
    
    // Check if all tracks are active (readyState === 'live' means track is active, even if disabled)
    // Disabled tracks are still 'live', they're just not sending data
    const allTracksActive = this.localStream.getTracks().every(track => track.readyState === 'live');
    
    // Check if we have the right type of tracks
    if (callType === 'video') {
      return hasVideo && hasAudio && allTracksActive;
    } else {
      // For audio calls, we only need audio tracks (video tracks are optional)
      return hasAudio && allTracksActive;
    }
  }

  // Multi-peer meeting methods
  async joinMeeting(meetingId: string, userId: string, participants: string[], callType: 'audio' | 'video' = 'video'): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    try {
      this.meetingId = meetingId;
      this.currentUserId = userId;
      this.meetingParticipants = new Set(participants);

      // Get user media
      if (!this.canReuseStream(callType)) {
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
          this.localStream = null;
        }

        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: callType === 'video' ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } : false
        };

        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.localStream.getTracks().forEach(track => {
          track.enabled = true;
        });
      }

      // Join meeting room via socket
      this.socket.emit('join-meeting-room', { meetingId, userId });

      // Create peer connections for existing participants
      for (const participantId of participants) {
        if (participantId !== userId && !this.peerConnections.has(participantId)) {
          await this.setupMeetingPeerConnection(participantId);
        }
      }
    } catch (error: any) {
      console.error('Error joining meeting:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Camera/microphone permission denied. Please allow access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No camera or microphone found. Please connect a camera/microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Camera/microphone is being used by another application. Please close other apps and try again.');
      } else {
        throw new Error(error.message || 'Failed to join meeting');
      }
    }
  }

  leaveMeeting(meetingId: string, userId: string): void {
    if (this.socket) {
      this.socket.emit('leave-meeting-room', { meetingId, userId });
    }

    // Cleanup all peer connections
    this.peerConnections.forEach((peerConnection) => {
      peerConnection.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.enabled = false;
        }
      });
      peerConnection.close();
    });
    this.peerConnections.clear();

    // Cleanup remote streams
    this.remoteStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.remoteStreams.clear();

    // Reset meeting state
    this.meetingId = null;
    this.currentUserId = null;
    this.meetingParticipants.clear();
  }

  private async setupMeetingPeerConnection(otherUserId: string): Promise<void> {
    if (!this.socket || !this.localStream) {
      throw new Error('Socket or local stream not initialized');
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Setup event handlers
    peerConnection.ontrack = (event: RTCTrackEvent) => {
      if (event.streams && event.streams.length > 0) {
        const stream = event.streams[0];
        this.remoteStreams.set(otherUserId, stream);
        if (this.meetingRemoteStreamHandler) {
          this.meetingRemoteStreamHandler(otherUserId, stream);
        }
      } else if (event.track) {
        const stream = new MediaStream([event.track]);
        this.remoteStreams.set(otherUserId, stream);
        if (this.meetingRemoteStreamHandler) {
          this.meetingRemoteStreamHandler(otherUserId, stream);
        }
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.meetingId && this.currentUserId) {
        this.socket.emit('meeting-ice-candidate', {
          meetingId: this.meetingId,
          from: this.currentUserId,
          to: otherUserId,
          candidate: event.candidate
        });
      }
    };

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      if (track.readyState === 'live') {
        peerConnection.addTrack(track, this.localStream!);
      }
    });

    // Create and send offer
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.localStream.getVideoTracks().length > 0
    });
    await peerConnection.setLocalDescription(offer);

    this.peerConnections.set(otherUserId, peerConnection);

    // Send offer
    if (this.socket && this.meetingId && this.currentUserId) {
      this.socket.emit('meeting-offer', {
        meetingId: this.meetingId,
        from: this.currentUserId,
        to: otherUserId,
        offer: offer
      });
    }
  }

  private async handleMeetingOffer(fromUserId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.socket || !this.localStream) {
      throw new Error('Socket or local stream not initialized');
    }

    let peerConnection = this.peerConnections.get(fromUserId);
    
    if (!peerConnection) {
      // Create new peer connection
      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Setup event handlers
      peerConnection.ontrack = (event: RTCTrackEvent) => {
        if (event.streams && event.streams.length > 0) {
          const stream = event.streams[0];
          this.remoteStreams.set(fromUserId, stream);
          if (this.meetingRemoteStreamHandler) {
            this.meetingRemoteStreamHandler(fromUserId, stream);
          }
        } else if (event.track) {
          const stream = new MediaStream([event.track]);
          this.remoteStreams.set(fromUserId, stream);
          if (this.meetingRemoteStreamHandler) {
            this.meetingRemoteStreamHandler(fromUserId, stream);
          }
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket && this.meetingId && this.currentUserId) {
          this.socket.emit('meeting-ice-candidate', {
            meetingId: this.meetingId!,
            from: this.currentUserId!,
            to: fromUserId,
            candidate: event.candidate
          });
        }
      };

      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        if (track.readyState === 'live' && peerConnection) {
          peerConnection.addTrack(track, this.localStream!);
        }
      });

      if (peerConnection) {
        this.peerConnections.set(fromUserId, peerConnection);
      }
    }

    // Set remote description and create answer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.localStream.getVideoTracks().length > 0
    });
    await peerConnection.setLocalDescription(answer);

    // Send answer
    if (this.socket && this.meetingId && this.currentUserId) {
      this.socket.emit('meeting-answer', {
        meetingId: this.meetingId,
        from: this.currentUserId,
        to: fromUserId,
        answer: answer
      });
    }
  }

  private async handleMeetingAnswer(fromUserId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.peerConnections.get(fromUserId);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  private addMeetingParticipant(userId: string): void {
    if (userId !== this.currentUserId && !this.peerConnections.has(userId)) {
      this.setupMeetingPeerConnection(userId).catch(err => {
        console.error('Error adding meeting participant:', err);
      });
    }
  }

  private removeMeetingParticipant(userId: string): void {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.enabled = false;
        }
      });
      peerConnection.close();
      this.peerConnections.delete(userId);
    }

    const stream = this.remoteStreams.get(userId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.remoteStreams.delete(userId);
    }
  }

  // Meeting getters
  getMeetingRemoteStreams(): Map<string, MediaStream> {
    return this.remoteStreams;
  }

  getMeetingParticipants(): string[] {
    return Array.from(this.meetingParticipants);
  }

  setMeetingRemoteStreamHandler(handler: (userId: string, stream: MediaStream) => void): void {
    this.meetingRemoteStreamHandler = handler;
    // Call handler for existing streams
    this.remoteStreams.forEach((stream, userId) => {
      handler(userId, stream);
    });
  }

  setMeetingParticipantHandler(handler: (participants: string[]) => void): void {
    this.meetingParticipantHandler = handler;
    // Call handler with current participants
    if (this.meetingParticipants.size > 0) {
      handler(Array.from(this.meetingParticipants));
    }
  }

  isInMeeting(): boolean {
    return this.meetingId !== null;
  }

  getMeetingId(): string | null {
    return this.meetingId;
  }
}

const callService = new CallService();
export default callService;

