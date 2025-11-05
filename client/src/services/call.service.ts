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
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callHandlers: Map<string, Function> = new Map();
  private pendingOffer: RTCSessionDescriptionInit | null = null;
  private currentUserId: string | null = null;
  private remoteStreamHandler: ((stream: MediaStream) => void) | null = null;

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
        this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(err => {
          console.error('Error adding ICE candidate:', err);
        });
      }
    });

    return this.socket;
  }

  joinUserRoom(userId: string) {
    this.currentUserId = userId;
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
      console.log('ontrack event fired:', event);
      console.log('Streams:', event.streams.length, 'Track:', event.track.kind, event.track.readyState);
      console.log('Track ID:', event.track.id, 'Track enabled:', event.track.enabled);

      let stream: MediaStream | null = null;

      if (event.streams && event.streams.length > 0) {
        // Use the stream from the event
        stream = event.streams[0];
      } else if (event.track) {
        // Create stream from single track
        stream = new MediaStream([event.track]);
      }

      if (stream) {
        console.log('Processing remote stream with', stream.getTracks().length, 'tracks');
        
        // Handle the stream immediately - don't wait for readyState
        // The video element will handle the track state
        this.handleRemoteStream(stream);

        // Also monitor track state changes
        event.track.onended = () => {
          console.log('Remote track ended:', event.track.kind);
        };

        // Monitor track state
        const checkTrackState = () => {
          if (event.track.readyState === 'live') {
            console.log('Remote track is now live:', event.track.kind);
            // Ensure stream is handled even if it wasn't before
            this.handleRemoteStream(stream!);
          } else if (event.track.readyState === 'ended') {
            console.log('Remote track ended:', event.track.kind);
          } else {
            // Check again after a short interval
            setTimeout(checkTrackState, 100);
          }
        };
        
        // Start checking if track is not live yet
        if (event.track.readyState !== 'live') {
          checkTrackState();
        }
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
    console.log('Handling remote stream:', stream.id, 'Tracks:', stream.getTracks().length);
    
    // Get all tracks from the stream
    const tracks = stream.getTracks();
    console.log('Stream tracks:', tracks.map(t => ({ kind: t.kind, id: t.id, readyState: t.readyState, enabled: t.enabled })));
    
    // If we already have a remote stream, merge tracks
    if (this.remoteStream) {
      // Remove old tracks
      this.remoteStream.getTracks().forEach(track => {
        this.remoteStream!.removeTrack(track);
        track.stop();
      });
      
      // Add new tracks
      tracks.forEach(track => {
        this.remoteStream!.addTrack(track);
      });
    } else {
      // Store remote stream
      this.remoteStream = stream;
    }
    
    // Notify handler if set
    if (this.remoteStreamHandler) {
      console.log('Calling remote stream handler');
      this.remoteStreamHandler(this.remoteStream);
    }
  }

  async initiateCall(from: string, to: string, callType: 'audio' | 'video', teamId?: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    try {


      // Check if we can reuse existing stream
      if (!this.canReuseStream(callType)) {
        // Stop existing stream if any
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
          this.localStream = null;
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
      } else {
        console.log('Reusing existing stream for call');
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

      // Add local tracks to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection) {
            this.peerConnection.addTrack(track, this.localStream!);
          }
        });
      }

      // Create and send offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });
      
      await this.peerConnection.setLocalDescription(offer);

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
        // Stop existing stream if any
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
          this.localStream = null;
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
      } else {
        console.log('Reusing existing stream for call');
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

      // Set remote description FIRST (this is critical for track events)
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerToUse));
      this.pendingOffer = null;

      // Add local tracks AFTER setting remote description
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection) {
            this.peerConnection.addTrack(track, this.localStream!);
          }
        });
      }

      // Check for existing remote tracks (in case tracks were received before handler was set)
      setTimeout(() => {
        if (this.peerConnection) {
          const receivers = this.peerConnection.getReceivers();
          const remoteStream = new MediaStream();
          receivers.forEach(receiver => {
            if (receiver.track) {
              remoteStream.addTrack(receiver.track);
            }
          });
          if (remoteStream.getTracks().length > 0) {
            console.log('Found existing remote tracks, handling stream');
            this.handleRemoteStream(remoteStream);
          }
        }
      }, 100);

      // Create and send answer
      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });
      
      await this.peerConnection.setLocalDescription(answer);

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
      
      // Cleanup on error
      this.cleanup();
      
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
    
    // If we already have a peer connection and stream, handle immediately
    // This handles the case where the user answered before the offer arrived
    if (this.peerConnection && this.localStream && this.peerConnection.signalingState !== 'stable') {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        // Create answer
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        if (this.socket && this.currentUserId) {
          this.socket.emit('answer', {
            from: this.currentUserId,
            to: data.from,
            answer: answer
          });
        }
        
        // Clear pending offer since we handled it
        this.pendingOffer = null;
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    }
    // Otherwise, the offer is stored and will be used when answerCall is called
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
    this.cleanup();
  }

  endCall(from: string, to: string) {
    if (this.socket) {
      this.socket.emit('call-end', { from, to });
    }
    this.cleanup();
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

  cleanup() {
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
    this.cleanup();
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
    
    // Check if all tracks are active
    const allTracksActive = this.localStream.getTracks().every(track => track.readyState === 'live');
    
    if (callType === 'video') {
      return hasVideo && hasAudio && allTracksActive;
    } else {
      return hasAudio && allTracksActive;
    }
  }
}

const callService = new CallService();
export default callService;

