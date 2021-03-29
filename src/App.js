import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client'
import Video from './components/video'
import Videos from './components/videos'

import Chat from './components/chat'

import Draggable from './components/draggable'

export default function App() {
  // const [localStream, setLocalStream] = useState(null);
  const localStream = useRef(null);
  // const [remoteStream, setRemoteStream] = useState(null);
  const remoteStream = useRef(null);

  // const [remoteStreams, setRemoteStreams] = useState([]);
  const remoteStreams = useRef([]);
  // const [peerConnections, setPeerConnections] = useState({});
  const peerConnections = useRef({});
  const [selectedVideo, setSelectedVideo] = useState(null);

  const [status, setStatus] = useState('Please wait...');
  const [pc_config, setPcConfig] = useState(
    {
      "iceServers": [
        {
          urls : 'stun:stun.l.google.com:19302'
        }
      ]
    }
  );
  const [sdpConstraints, setSdpConstraints] = useState(
    {
      'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': true
      }
    }
  );

  const [messages, setMessages] = useState([]);
  // const [sendChannels, setSendChannels] = useState([]);
  const sendChannels = useRef([]);
  const [disconnected, setDisconnected] = useState(false);

  const serviceIP = 'https://cb07e481c7f2.ngrok.io/webrtcPeer';
  const socket = useRef(null);
  const receiveChannel = useRef(null);

  const getLocalStream = () => {
    // called when getUserMedia() successfully returns - see below
    // getUserMedia() returns a MediaStream object (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
    const success = (stream) => {
      window.localStream = stream
      // this.localVideoref.current.srcObject = stream
      // this.pc.addStream(stream);

      // setLocalStream(stream)
      localStream.current = stream;

      whoisOnline()
    }

    // called when getUserMedia() fails - see below
    const failure = (e) => {
      console.log('getUserMedia Error: ', e)
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    // see the above link for more constraint options
    const constraints = {
      audio: true,
      video: true,
      // video: {
      //   width: 1280,
      //   height: 720
      // },
      // video: {
      //   width: { min: 1280 },
      // }
      options: {
        mirror: true,
      }
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    navigator.mediaDevices.getUserMedia(constraints)
      .then(success)
      .catch(failure)
  }

  const whoisOnline = () => {
    // let all peers know I am joining
    console.log(socket.current.id, 'socket.current.id - -')
    sendToPeer('onlinePeers', null, {local: socket.current.id})
  }

  const sendToPeer = (messageType, payload, socketID) => {
    socket.current.emit(messageType, {
      socketID,
      payload
    })
  }

  const createPeerConnection = (socketID, callback) => {

    try {
      let pc = new RTCPeerConnection(pc_config)

      // add pc to peerConnections object
      const _peerConnections = { ...peerConnections.current, [socketID]: pc }

      peerConnections.current = _peerConnections

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendToPeer('candidate', e.candidate, {
            local: socket.current.id,
            remote: socketID
          })
        }
      }

      pc.oniceconnectionstatechange = (e) => {
        // if (pc.iceConnectionState === 'disconnected') {
        //   const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== socketID)

        //   this.setState({
        //     remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || null,
        //   })
        // }

      }

      pc.ontrack = (e) => {

        let _remoteStream = null
        let _remoteStreams = remoteStreams.current;
        let remoteVideo = {}


        // 1. check if stream already exists in remoteStreams
        const rVideos = remoteStreams.current.filter(stream => stream.id === socketID)

        // 2. if it does exist then add track
        if (rVideos.length) {
          _remoteStream = rVideos[0].stream
          _remoteStream.addTrack(e.track, _remoteStream)

          remoteVideo = {
            ...rVideos[0],
            stream: _remoteStream,
          }
          _remoteStreams = remoteStreams.current.map(_remoteVideo => {
            return _remoteVideo?.id === remoteVideo?.id && remoteVideo || _remoteVideo
          })
        } else {
          // 3. if not, then create new stream and add track
          _remoteStream = new MediaStream()
          _remoteStream.addTrack(e.track, _remoteStream)

          remoteVideo = {
            id: socketID,
            name: socketID,
            stream: _remoteStream,
          }
          _remoteStreams = [...remoteStreams.current, remoteVideo]
        }

        // const remoteVideo = {
        //   id: socketID,
        //   name: socketID,
        //   stream: e.streams[0]
        // }

        // setRemoteStream(prevState => {
        //   const remoteStream2 = remoteStreams.length > 0 ? {} : _remoteStream;
        //
        //   return remoteStream2
        // })
        remoteStream.current = remoteStreams.current.length > 0 ? {} : _remoteStream;
        setSelectedVideo(prevState => {
          let selectedVideo2 = remoteStreams.current.filter(stream => stream.id === prevState.id)

          return selectedVideo2;
        })
        // setRemoteStreams(_remoteStreams);
        remoteStreams.current = _remoteStreams;
      }

      pc.close = () => {
        // alert('GONE')
        console.log("pc closed");
      }

      if (localStream.current) {
        localStream.current.getTracks().forEach(track => {
          pc.addTrack(track, localStream.current)
        })
      }
        // pc.addStream(this.state.localStream)


      // return pc
      callback(pc)

    } catch(e) {
      console.log('Something went wrong! pc not created!!', e)
      // return;
      // callback(null)
    }
  }

  const disconnectSocket = (socketToDisconnect) => {
    sendToPeer('socket-to-disconnect', null, {
      local: socket.current.id,
      remote: socketToDisconnect
    })
  }

  const switchVideo = (_video) => {
    // console.log(_video)
    setSelectedVideo(_video)
  }

  const stopTracks = (stream) => {
    stream.getTracks().forEach(track => track.stop())
  }

  useEffect(() => {
    socket.current = io.connect(
      serviceIP,
      {
        path: '/io/webrtc',
        query: {
          room: window.location.pathname,
        }
      }
    )

    socket.current.on('connection-success', data => {

      getLocalStream()

      // console.log(data.success)
      const status = data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'

      setStatus(status);
      setMessages(data.messages);
    })

    socket.current.on('joined-peers', data => {

      setStatus(data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect');
    })

    // ************************************* //
    // ************************************* //
    socket.current.on('peer-disconnected', (data) => {

      // close peer-connection with this peer
      peerConnections.current[data.socketID].close();

      // get and stop remote audio and video tracks of the disconnected peer
      const rVideo = remoteStreams.current.filter(stream => stream.id === data.socketID)
      rVideo && stopTracks(rVideo[0].stream)

      // filter out the disconnected peer stream
      const _remoteStreams = remoteStreams.current.filter(stream => stream.id !== data.socketID)

      setSelectedVideo(prevState => {
        const selectedVideo = prevState.id === data.socketID && remoteStreams.current.length ? remoteStreams.current[0] : null

        return selectedVideo
      })
      // setRemoteStreams(_remoteStreams);
      remoteStreams.current = _remoteStreams;
      setStatus(data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect');
    })

    socket.current.on('online-peer', socketID => {
      // console.log('connected peers ...', socketID)

      // create and send offer to the peer (data.socketID)
      // 1. Create new pc
      createPeerConnection(socketID, pc => {
        // 2. Create Offer
        if (pc) {

          // Send Channel
          const handleSendChannelStatusChange = (event) => {
            console.log(sendChannels, 'sendChannels- - - -')
            console.log('send channel status: ' + sendChannels.current[0].readyState)
          }

          const sendChannel = pc.createDataChannel('sendChannel')
          sendChannel.onopen = handleSendChannelStatusChange
          sendChannel.onclose = handleSendChannelStatusChange

          // setSendChannels(prevState => {
          //   return [...prevState, sendChannel]
          // })
          sendChannels.current = [...sendChannels.current, sendChannel]

          // Receive Channels
          const handleReceiveMessage = (event) => {
            const message = JSON.parse(event.data)
            // console.log(message)
            setMessages(prevState => {
              return [...prevState, message]
            })
          }

          const handleReceiveChannelStatusChange = (event) => {
            if (receiveChannel.current) {
              console.log("receive channel's status has changed to " + receiveChannel.current.readyState);
            }
          }

          const receiveChannelCallback = (event) => {
            receiveChannel.current = event.channel;
            receiveChannel.current.onmessage = handleReceiveMessage
            receiveChannel.current.onopen = handleReceiveChannelStatusChange
            receiveChannel.current.onclose = handleReceiveChannelStatusChange
          }

          pc.ondatachannel = receiveChannelCallback


          pc.createOffer(sdpConstraints)
            .then(sdp => {
              pc.setLocalDescription(sdp)

              sendToPeer('offer', sdp, {
                local: socket.current.id,
                remote: socketID
              })
            })
        }
      })
    })

    socket.current.on('offer', data => {
      createPeerConnection(data.socketID, pc => {
        console.log(localStream, 'localStream - - -- -')
        pc.addStream(localStream.current)

        // Send Channel
        const handleSendChannelStatusChange = (event) => {
          console.log('send channel status: ' + sendChannels.current[0].readyState)
        }

        const sendChannel = pc.createDataChannel('sendChannel')
        sendChannel.onopen = handleSendChannelStatusChange
        sendChannel.onclose = handleSendChannelStatusChange

        // setSendChannels(prevState => {
        //   return [...prevState, sendChannel]
        // })
        sendChannels.current = [...sendChannels.current, sendChannel]

        // Receive Channels
        const handleReceiveMessage = (event) => {
          const message = JSON.parse(event.data)
          // console.log(message)

          setMessages(prevState => {
            return [...prevState, message]
          })
        }

        const handleReceiveChannelStatusChange = (event) => {
          if (receiveChannel.current) {
            console.log("receive channel's status has changed to " + receiveChannel.current.readyState);
          }
        }

        const receiveChannelCallback = (event) => {
          receiveChannel.current = event.channel
          receiveChannel.current.onmessage = handleReceiveMessage
          receiveChannel.current.onopen = handleReceiveChannelStatusChange
          receiveChannel.current.onclose = handleReceiveChannelStatusChange
        }

        pc.ondatachannel = receiveChannelCallback

        pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
          // 2. Create Answer
          pc.createAnswer(sdpConstraints)
            .then(sdp => {
              pc.setLocalDescription(sdp)

              sendToPeer('answer', sdp, {
                local: socket.current.id,
                remote: data.socketID
              })
            })
        })
      })
    })

    socket.current.on('answer', data => {
      // get remote's peerConnection
      const pc = peerConnections.current[data.socketID]
      // console.log(data.sdp)
      pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(()=>{})
    })

    socket.current.on('candidate', (data) => {
      // get remote's peerConnection
      const pc = peerConnections.current[data.socketID]

      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      }
    })

  }, [])


  if (disconnected) {
    socket.current.close()

    stopTracks(localStream.current)

    remoteStreams.current.forEach(rVideo => stopTracks(rVideo.stream))

    peerConnections.current && Object.values(peerConnections.current).forEach(pc => pc.close())

    return (<div>You have successfully Disconnected</div>)
  }

  const statusText = <div style={{ color: 'yellow', padding: 5 }}>{status}</div>




  return (
    <div>
      <Draggable style={{
        zIndex: 101,
        position: 'absolute',
        right: 0,
        cursor: 'move'
      }}>
        <Video
          videoType='localVideo'
          videoStyles={{
            // zIndex:2,
            // position: 'absolute',
            // right:0,
            width: 200,
            // height: 200,
            // margin: 5,
            // backgroundColor: 'black'
          }}
          frameStyle={{
            width: 200,
            margin: 5,
            borderRadius: 5,
            backgroundColor: 'black',
          }}
          showMuteControls={true}
          // ref={this.localVideoref}
          videoStream={localStream.current}
          autoPlay muted>
        </Video>
      </Draggable>
      {/* <Video
          frameStyle={{
            zIndex: 1,
            position: 'fixed',
            bottom: 0,
            minWidth: '100%', minHeight: '100%',
            backgroundColor: 'black'
          }}
        videoStyles={{
          // zIndex: 1,
          // position: 'fixed',
          // bottom: 0,
          minWidth: '100%',
          minHeight: '100%',
          // backgroundColor: 'black'
        }}
        // ref={ this.remoteVideoref }
        videoStream={this.state.selectedVideo && this.state.selectedVideo.stream}
        // autoPlay
      ></Video> */}
      <br />
      <div style={{
        zIndex: 3,
        position: 'absolute',
        // margin: 10,
        // backgroundColor: '#cdc4ff4f',
        // padding: 10,
        // borderRadius: 5,
      }}>
        <i onClick={(e) => setDisconnected(true)} style={{ cursor: 'pointer', paddingLeft: 15, color: 'red' }} class='material-icons'>highlight_off</i>
        <div style={{
          margin: 10,
          backgroundColor: '#cdc4ff4f',
          padding: 10,
          borderRadius: 5,
        }}>{ statusText }</div>
      </div>
      <div>
        <Videos
          switchVideo={switchVideo}
          remoteStreams={remoteStreams.current}
          // videoStream={this.state.selectedVideo && this.state.selectedVideo.stream}
        ></Videos>
      </div>
      <br />

      <Chat
        user={{
          uid: socket.current && socket.current.id || ''
        }}
        messages={messages}
        sendMessage={(message) => {
          setMessages(prevState => {
            return [...prevState, message]
          })

          sendChannels.current.map(sendChannel => {
            return sendChannel.readyState === 'open' && sendChannel.send(JSON.stringify(message))
          })
          sendToPeer('new-message', JSON.stringify(message), {local: socket.current.id})
        }}
      />

      {/* <div style={{zIndex: 1, position: 'fixed'}} >
          <button onClick={this.createOffer}>Offer</button>
          <button onClick={this.createAnswer}>Answer</button>

          <br />
          <textarea style={{ width: 450, height:40 }} ref={ref => { this.textref = ref }} />
        </div> */}
      {/* <br />
        <button onClick={this.setRemoteDescription}>Set Remote Desc</button>
        <button onClick={this.addCandidate}>Add Candidate</button> */}
    </div>
  )
}
