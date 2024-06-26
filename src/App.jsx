import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import io from "socket.io-client";
import "./App.css";

const socket = io.connect("https://chatvideo-6b5z.onrender.com");

function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setStream(stream);
      if (myVideo.current) {
        myVideo.current.srcObject = stream;
      }
      console.log('Stream obtained:', stream);
    }).catch((error) => {
      console.error('Error accessing media devices:', error);
    });

    socket.on("me", (id) => {
      setMe(id);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  const callUser = (id) => {
    if (stream) {
      console.log('Calling user with ID:', id);
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream
      });
  
      peer.on("error", (err) => {
        console.error('Error with Peer connection:', err);
      });
  
      peer.on("signal", (data) => {
        console.log('Generated signal data:', data);
        socket.emit("callUser", {
          userToCall: id,
          signalData: data,
          from: me,
          name: name
        });
      });
  
      peer.on("stream", (stream) => {
        console.log('Received remote stream:', stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      });
  
      socket.on("callAccepted", (signal) => {
        console.log('Call accepted with signal:', signal);
        setCallAccepted(true);
        peer.signal(signal);
      });
  
      connectionRef.current = peer;
    } else {
      console.error("Stream is not available");
    }
  };
  
  
  

  const answerCall = () => {
    if (stream) {
      console.log('Answering call from:', caller);
      setCallAccepted(true);
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream
      });

      peer.on("signal", (data) => {
        socket.emit("answerCall", { signal: data, to: caller });
      });

      peer.on("stream", (stream) => {
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      });

      peer.on("error", (err) => {
        console.error('Error with Peer connection:', err);
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;
    } else {
      console.error("Stream is not available");
    }
  };

  const leaveCall = () => {
    setCallEnded(true);
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(me);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <>
      <h1 style={{ textAlign: "center", color: "#fff" }}>VIDEOCONFERENCIA</h1>
      <div className="container">
        <div className="video-container">
          <div className="video">
            {stream && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
          </div>
          <div className="video">
            {callAccepted && !callEnded ? (
              <video playsInline ref={userVideo} autoPlay style={{ width: "300px" }} />
            ) : null}
          </div>
        </div>
        <div className="myId">
          <input
            id="filled-basic"
            label="Name"
            variant="filled"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
          <button
            variant="contained"
            color="primary"
            onClick={copyToClipboard}
            style={{ marginBottom: "2rem" }}
          >
            Copy ID
          </button>
          <input
            id="filled-basic"
            label="ID to call"
            variant="filled"
            value={idToCall}
            onChange={(e) => setIdToCall(e.target.value)}
          />
          <div className="call-button">
            {callAccepted && !callEnded ? (
              <button variant="contained" color="secondary" onClick={leaveCall}>
                End Call
              </button>
            ) : (
              <button color="primary" aria-label="call" onClick={() => callUser(idToCall)}>
                phone
              </button>
            )}
          </div>
        </div>
        <div>
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1>{name} is calling...</h1>
              <button variant="contained" color="primary" onClick={answerCall}>
                Answer
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default App;
