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
  private callHandlers: Map<string, Function> = new Map();
  private pendingOffer: RTCSessionDescriptionInit | null = null;
  private currentUserId: string | null = null;

  initializeSocket(socketUrl: string) {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
    }

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
      await this.handleOffer(data);
    });

    this.socket.on('answer', async (data: CallAnswer) => {
      await this.handleAnswer(data);
    });

    this.socket.on('ice-candidate', (data: { from: string; candidate: RTCIceCandidateInit }) => {
      if (this.peerConnection && data.candidate) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
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

  async initiateCall(from: string, to: string, callType: 'audio' | 'video', teamId?: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    try {
      // Check if we can reuse existing stream (only if same call type and tracks are active)
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

      // Add local tracks to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection) {
            this.peerConnection.addTrack(track, this.localStream!);
          }
        });
      }

      // Setup remote stream handler BEFORE creating offer
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event);
        if (event.streams && event.streams[0]) {
          const handler = this.callHandlers.get('remote-stream');
          if (handler) {
            handler(event.streams[0]);
          }
        } else if (event.track) {
          // Fallback: create stream from track
          const stream = new MediaStream([event.track]);
          const handler = this.callHandlers.get('remote-stream');
          if (handler) {
            handler(stream);
          }
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('ice-candidate', {
            to,
            candidate: event.candidate
          });
        }
      };

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Emit call initiation first
      this.socket.emit('call-initiate', { from, to, callType, teamId });

      // Send offer after a small delay to ensure the recipient is ready
      setTimeout(() => {
        if (this.socket && this.peerConnection) {
          this.socket.emit('offer', {
            from,
            to,
            offer: offer
          });
        }
      }, 100);
    } catch (error: any) {
      console.error('Error initiating call:', error);
      
      // Provide more specific error messages
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
      // Check if we can reuse existing stream (only if same call type and tracks are active)
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

      // Setup remote stream handler BEFORE creating answer
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote track (answer):', event);
        if (event.streams && event.streams[0]) {
          const handler = this.callHandlers.get('remote-stream');
          if (handler) {
            handler(event.streams[0]);
          }
        } else if (event.track) {
          // Fallback: create stream from track
          const stream = new MediaStream([event.track]);
          const handler = this.callHandlers.get('remote-stream');
          if (handler) {
            handler(stream);
          }
        }
      };

      // Add local tracks to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection) {
            this.peerConnection.addTrack(track, this.localStream!);
          }
        });
      }

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('ice-candidate', {
            from,
            to,
            candidate: event.candidate
          });
        }
      };

      // Check for pending offer or use provided offer
      const offerToUse = offer || this.pendingOffer;

      if (!offerToUse) {
        // Wait a bit for the offer to arrive
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (this.pendingOffer) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));
          this.pendingOffer = null;
        } else {
          throw new Error('Offer not received. Cannot answer call.');
        }
      } else {
        // Set remote description (the offer from the caller)
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerToUse));
        // Clear pending offer
        this.pendingOffer = null;
      }

      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
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
      
      // Provide more specific error messages
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
    // Always store the offer first (for incoming calls)
    this.pendingOffer = data.offer;
    
    // If we have a peer connection already, handle the offer immediately
    if (this.peerConnection && this.localStream) {
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
    // If no peer connection, the offer is stored and will be used when answerCall is called
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

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  setRemoteStreamHandler(handler: (stream: MediaStream) => void) {
    // Store handler for later use
    this.callHandlers.set('remote-stream', handler);
    
    // If peer connection already exists, set up handler
    if (this.peerConnection) {
      this.peerConnection.ontrack = (event) => {
        console.log('Remote track in handler:', event);
        if (event.streams && event.streams[0]) {
          handler(event.streams[0]);
        } else if (event.track) {
          // Fallback: create stream from track
          const stream = new MediaStream([event.track]);
          handler(stream);
        }
      };
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

