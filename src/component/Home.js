import React, { useEffect, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import ZoomVideo from "@zoom/videosdk";
import { generateSessionToken } from "./tool";
import { useNavigate } from "react-router-dom";
import BreakoutRoomModal from "./Modal/BreakoutRoomModal";
import ChangeHostModal from "./Modal/ChangeHostModal";

const cellWidth = 144;
const cellHeight = 256;
const CELL_COUNT = 2;
const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 720;

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sdkKey = "PASTE_YOUR_SDK_KEY_HERE";
  const sdkSecret = "PASTE_YOUR_SDK_SECRET_HERE";
   window.participantsMap = new Map();
  window.cellNo = 0;
  window.current_page = 1;
  const [showreakoutRoomModal, setBreakoutRoomModal] = useState(false);
  const [showChangeHostModal, setChangeHostModal] = useState(false);

  const [userArray, setUserArray] = useState([]);

  useEffect(() => {
    window.zmClient = ZoomVideo.createClient();
    window.zmClient.init("en-US", "CDN");
    joinMeeting();

    return () => {
      if (window.zmClient !== null) {
        console.log("======page is being rendered");
        stopCurrentPageVideosAndRemoveCardsFromScreen();
        window.zmClient.off("user-added", userAddListener);
        window.zmClient.off("user-removed", userRemoveListener);
        window.zmClient.off("user-updated",userUpdatedListener);
        window.zmClient.off(
          "peer-video-state-change",
          videoStateChangeListener
        );
        window.zmClient.leave();
        window.zmClient = null;
      }
    };
  }, []);


  function joinMeeting() {
    try {
      const data = location.state;
      const sessionToken = generateSessionToken( {
        sdkKey : sdkKey, sdkSecret : sdkSecret, sessionId : data.session, roleType :  0
      });
      console.log('token', sessionToken)
      window.zmClient
        .join(data.session, sessionToken, data.name, "")
        .then((respose) => {
          console.log("respose======", respose)
          window.mediaStream = window.zmClient.getMediaStream();
          const loadingView = document.getElementById("js-loading-view");
          const videoView = document.getElementById("js-video-view");
          loadingView.classList.toggle("hidden");
          videoView.classList.remove("hidden");
          onMeetingJoined();
          addMeetingEvents();
        })
        .catch((error) => {
          console.log("join error", error);
        });
    } catch (e) {
      console.error("Error joining session", e);
    }
  }

  function onMeetingJoined() {
    window.zmClient.getAllUser().forEach((user) => {
      window.participantsMap.set(user.userId, user);
    });
    const currentUser = window.zmClient.getCurrentUserInfo();
    window.currentUserId = currentUser.userId;
    console.log("currentUser", currentUser);
    window.participantsMap.set(window.currentUserId, currentUser);
    document.getElementById("btn-startmuteunmute").style.display = "none";
    showPage();
  }

  function addMeetingEvents() {
    // Occurs when new participant join the meeting
    window.zmClient.on("user-added", userAddListener);

    // Occurs when the participants leave the meeting
    window.zmClient.on("user-removed", userRemoveListener);

    // Occurs when the properties of the participants updated.
    window.zmClient.on("user-updated",userUpdatedListener);
    // Occurs when other participants start/stop video
    window.zmClient.on("peer-video-state-change", videoStateChangeListener);
    window.zmClient.on("command-channel-message", commandChannelListener);    
    window.zmClient.on('subsession-state-change', onSubsessionStateChange);
    window.zmClient.on('main-session-user-updated', onMainSessionUserChange);
  }

  const userAddListener = useCallback((payload) => {
    console.log(`user-added:`, payload);
    payload.forEach((obj) => {
      const user = Object.assign({}, obj);
      window.participantsMap.set(user.userId, user);
      console.log( "============",window.paginatedItems.length,CELL_COUNT,window.paginatedItems.length < CELL_COUNT);
      if (window.paginatedItems.length < CELL_COUNT) {
        window.paginatedItems.push(user);
        var canvas = document.querySelector("#video-canvas");
        if (window.cellNo >= 0 && window.cellNo <= 2) {
          addUpdateCell(window.mediaStream, canvas,user,window.cellNo * cellWidth,2 * cellHeight );
        } else if (window.cellNo > 2 && window.cellNo <= 5) {
          addUpdateCell(window.mediaStream,canvas,user,(window.cellNo % 3) * cellWidth,cellHeight);
        } else if (window.cellNo > 5 && window.cellNo <= 8) {
          addUpdateCell(window.mediaStream, canvas, user, (window.cellNo % 6) * cellWidth, 0);
        }
        window.cellNo++;
      } else {
        adjustPageNoAndPreviousNextButton(false);
      }
    });
  });

  const videoStateChangeListener = useCallback((payload) => {
    console.log("peer-video-state-change", payload, payload.userId);
    if(window.zmClient===null){
      return
    }
    if (window.participantsMap.has(payload.userId)) {
      const user = window.zmClient.getUser(payload.userId);
      window.participantsMap.set(user.userId, user);
      var index = window.paginatedItems.findIndex((obj) => obj.userId === user.userId);
      if (index !== -1) {
        var canvas = document.querySelector("#video-canvas");
        var obj = window.paginatedItems.at(index);
        obj.bVideoOn = user.bVideoOn;
        addUpdateCell(window.mediaStream, canvas, obj, obj.x, obj.y);
      }
    }
  });

  const userRemoveListener = useCallback((payload) => {
    console.log(`user-removed:`, payload);
    payload.forEach((user) => {
      window.participantsMap.delete(user.userId);
      var index = window.paginatedItems.findIndex((obj) => obj.userId === user.userId);
      if (index !== -1) {
        stopCurrentPageVideosAndRemoveCardsFromScreen();
        showPage();
      } else {
        adjustPageNoAndPreviousNextButton(true);
      }
    });
  });

  const userUpdatedListener = useCallback((payload) => {
    if(window.zmClient===null){
      return
    }
    payload.forEach((obj) => {
      const user = window.zmClient.getUser(obj.userId);
      console.log("user-updated..", obj.userId, user, window.participantsMap.has(obj.userId));
      if (window.participantsMap.has(obj.userId)) {
        window.participantsMap.set(user.userId, user);
      }
    });
  });

  const commandChannelListener = useCallback((payload) => {
    console.log("commandChannelListener..", payload);
    if(window.zmClient===null){
      return
    }
    window.zmClient.getAllUser().forEach((obj) => {
      if(payload.text==='1'){
        if(obj.userId===payload.senderId){
          window.mediaStream.unmuteUserAudioLocally(obj.userId)
        }else{
          window.mediaStream.muteUserAudioLocally(obj.userId)
        }
      }else if(payload.text==='2'){
        window.mediaStream.unmuteUserAudioLocally(obj.userId)
      }
    });
  });

  const onSubsessionStateChange = useCallback((payload) => {
    console.log("onSubsessionStateChange..", payload);
  });

  const onMainSessionUserChange = useCallback((payload) => {
    console.log("onMainSessionUserChange..", window.subsession.getSubsessionList());
  });

  function showPage() {
    let offset = (window.current_page - 1) * CELL_COUNT;
    const values = Array.from(window.participantsMap.values());
    window.paginatedItems = values.slice(offset).slice(0, CELL_COUNT);
    // total_pages = Math.ceil(values.length / per_page_items);
    adjustPageNoAndPreviousNextButton(false);
    console.log(`showPage':`, window.current_page + "  " + window.total_pages);

    var canvas = document.querySelector("#video-canvas");
    window.cellNo = 0;
    window.paginatedItems.forEach((user) => {
      if (window.cellNo >= 0 && window.cellNo <= 2) {
        addUpdateCell(window.mediaStream,canvas,user,window.cellNo * cellWidth,2 * cellHeight);
      } else if (window.cellNo > 2 && window.cellNo <= 5) {
        addUpdateCell(window.mediaStream,canvas,user,(window.cellNo % 3) * cellWidth,cellHeight);
      } else if (window.cellNo > 5 && window.cellNo <= 8) {
        addUpdateCell(window.mediaStream, canvas, user, (window.cellNo % 6) * cellWidth, 0);
      }
      window.cellNo++;
    });
  }

  function adjustPageNoAndPreviousNextButton(adjustCurrentPage) {
    window.total_pages = Math.ceil(window.participantsMap.size / CELL_COUNT);

    if (adjustCurrentPage && window.total_pages >= window.current_page) {
      window.current_page = window.total_pages;
    }

    if (window.total_pages === 1) {
      document.getElementById("btn-previous").style.display = "none";
      document.getElementById("btn-next").style.display = "none";
    } else if (window.current_page === 1) {
      document.getElementById("btn-previous").style.display = "none";
      document.getElementById("btn-next").style.display = "block";
    } else if (window.current_page === window.total_pages) {
      document.getElementById("btn-previous").style.display = "block";
      document.getElementById("btn-next").style.display = "none";
    } else {
      document.getElementById("btn-previous").style.display = "block";
      document.getElementById("btn-next").style.display = "block";
    }
  }

  function addUpdateCell(mediaStream, canvas, user, x, y) {
    console.log(canvas, user, x, y, cellWidth, cellHeight);
    if (user.bVideoOn) {
      mediaStream.renderVideo(canvas, user.userId, cellWidth, cellHeight, x, y, 2);
    } else {
      mediaStream.stopRenderVideo(canvas, user.userId);
    }

    user.x = x;
    user.y = y;
    var rect = canvas.getBoundingClientRect();
    console.log(cellHeight, rect.y, rect.x, y, user)
    if( user.div===undefined || user.div === null){
      var div = document.createElement('div');
      div.id = 'temp';
      div.className = 'border pad';
      div.style.border = '1px solid #FF5733'
      div.style.position = "absolute";
      div.style.left = rect.x + x + 'px';
      div.style.top = rect.top + 'px';
      div.style.height = cellHeight + 'px';
      div.style.width = cellWidth + 'px';
      div.style.zIndex = 10;
      document.body.appendChild(div);
      user.div = div;
    }
  }

  function removeCell(mediaStream, canvas, user, x, y) {
    mediaStream.stopRenderVideo(canvas, user.userId);
  }

  function stopCurrentPageVideosAndRemoveCardsFromScreen() {
    var canvas = document.querySelector("#video-canvas");
    window.paginatedItems.forEach((user) => {
      window.mediaStream.stopRenderVideo(canvas, user.userId);
    });
  }

  function onClickStartAudio(e) {
    window.mediaStream.startAudio();
    document.getElementById("btn-startaudio").style.display = "none";
    document.getElementById("btn-startmuteunmute").style.display = "block";
  }

  function onClickStartVideo(e) {
    const btn = document.getElementById("btn-startvideo");
    var canvas = document.querySelector("#video-canvas");
    if (window.mediaStream.isCapturingVideo()) {
      window.mediaStream.stopVideo().then((result) => {
        const user = window.zmClient.getUser(window.currentUserId);
        window.participantsMap.set(user.userId, user);
        var index = window.paginatedItems.findIndex(
          (obj) => obj.userId === user.userId
        );
        // console.log(index, result)
        if (index !== -1) {
          var obj = window.paginatedItems.at(index);
          obj.bVideoOn = false;
          addUpdateCell(window.mediaStream, canvas, obj, obj.x, obj.y);
        }
        btn.textContent = "Start Video";
      });
    } else {
      window.mediaStream
        .startVideo()
        .then((result) => {
          console.log(result);
          const user = window.zmClient.getUser(window.currentUserId);
          window.participantsMap.set(user.userId, user);
          var index = window.paginatedItems.findIndex(
            (obj) => obj.userId === user.userId
          );
          // console.log(index, result)
          if (index !== -1) {
            var obj = window.paginatedItems.at(index);
            obj.bVideoOn = true;
            addUpdateCell(window.mediaStream, canvas, obj, obj.x, obj.y);
          }
          btn.textContent = "Stop Video";
        })
        .catch((error) => {
          console.log(error);
        });
    }
    let cameras = window.mediaStream.getCameraList();
    console.log(cameras);
    window.mediaStream.switchCamera(cameras[0].deviceId);
  }

  function onClickMuteUnmute(e) {
    const btn = document.getElementById("btn-startmuteunmute");
    if (window.mediaStream.isAudioMuted()) {
      window.mediaStream.unmuteAudio();
      btn.textContent = "Mute Audio";
    } else {
      window.mediaStream.muteAudio();
      btn.textContent = "Unmute Audio";
    }
  }

  function previousPage() {
    if (window.current_page === 1) {
      return;
    }
    stopCurrentPageVideosAndRemoveCardsFromScreen();
    window.current_page = window.current_page - 1;
    showPage();
  }

  function nextPage() {
    if (window.current_page === window.total_pages) {
      return;
    }
    stopCurrentPageVideosAndRemoveCardsFromScreen();
    window.current_page = window.current_page + 1;
    showPage();
  }

  function onClickEndSession() {
    window.zmClient.off("user-added", userAddListener);
    window.zmClient.off("user-removed", userRemoveListener);
    window.zmClient.off("user-updated",userUpdatedListener);
    window.zmClient.off("peer-video-state-change", videoStateChangeListener);
    window.zmClient.leave();
    window.zmClient = null;
    // leaveSession();
    navigate("/");
  }

  function displayBreakoutRoomPopup() {
    const values = []
     window.zmClient.getAllUser().forEach((user) => {
      if(user.isHost===false){
        values.push(user)
      }
    });
    console.log(values);
    // let temp = Array.from(paginatedItems.values());
    // console.log(temp);
    setUserArray(values);
    setBreakoutRoomModal(true);
  }

  function closeBreakoutRoomPopup() {
    setBreakoutRoomModal(false);
  }

  function startBreakoutRoom(user) {
    closeBreakoutRoomPopup();
    console.log(user);
    window.subsession = window.zmClient.getSubsessionClient();
    console.log(window.subsession.getSubsessionList())
    window.subsession.createSubsessions(1, 2).then((subsessionCreateResult) => {
      console.log("subsession created..", user.userId, subsessionCreateResult);
      window.subsession.openSubsessions(subsessionCreateResult).then((subsessionOpenResult) => {
        console.log("subsession opened:-", subsessionOpenResult);
        window.subsession
          .assignUserToSubsession(user.userId, subsessionCreateResult[0].subsessionId)
          .then((assignUserIntoSessionResult) => {
            console.log("user assigned into subsession...", assignUserIntoSessionResult);
            window.subsession.joinSubsession(subsessionCreateResult[0].subsessionId).then(joinResult=>{
              console.log("subsessio joieed...", joinResult, window.zmClient.getAllUser(), window.subsession.getUnassignedUserList());
            //  window.subsession.broadcast('Coach has started a subsession with you')
            })
          })
          .catch((error) => {
            console.log(error);
          });
      });
    });

  }

  function stopBreakoutRoom() {
    window.subsession.closeAllSubsessions();
  }

  function muteAllLocally(){
    window.zmClient.getAllUser().forEach((obj) => {
      console.log('mute==',obj)
      window.mediaStream.muteUserAudioLocally(obj.userId).then(result=>{
        console.log('mute=respose=',result)
      })
    });
  }

  function unMuteAllLocally(){
    window.zmClient.getAllUser().forEach((obj) => {
      console.log('unmute==',obj)
      window.mediaStream.unmuteUserAudioLocally(obj.userId).then(result=>{
        console.log('unmute=respose=',result)
      })
    });
  }

  function displayChangeHostPopup() {
    const values = []
     window.zmClient.getAllUser().forEach((user) => {
      console.log(user)
      if(user.isHost===false){
        values.push(user)
      }
    });
    setUserArray(values);
    setChangeHostModal(true);
  }

  function hideChangeHostPopup() {
    setChangeHostModal(false);
  }

  function changeHost(user){
    hideChangeHostPopup()
    window.zmClient.makeHost(user.userId).then(result=>{
      console.log("host changed successfully", result, user)
    }).catch(err=>{
      console.log("host changed failed....", err)
    })
  }

  function startRecording(){
    const cloudRecording = window.zmClient.getRecordingClient()
    cloudRecording.startCloudRecording().then(result =>{
      console.log('recording started==', result)
    }).catch(error =>{
      console.log('start recording failed ==', error)
    })
  }

  function stopRecording(){
    const cloudRecording = window.zmClient.getRecordingClient()
    cloudRecording.stopCloudRecording().then(result =>{
      console.log('recording stopped==', result)
    }).catch(error =>{
      console.log('stop recording failed ==', error)
    })
  }

function startScreenShare(){

  let cameras = window.mediaStream.getCameraList();
    console.log(cameras);
    
  if(window.mediaStream.isStartShareScreenWithVideoElement()) {
    window.mediaStream.startShareScreen(document.querySelector('#my-screen-share-content-video'),  { secondaryCameraId: cameras[0].deviceId }).then(() => {
      // show HTML Video element in DOM
      document.querySelector('#my-screen-share-content-video').style.display = 'block'
    }).catch((error) => {
        console.log(error)
    })
  } else {
    window.mediaStream.startShareScreen(document.querySelector('#my-screen-share-content-canvas'),  { secondaryCameraId: cameras[0].deviceId }).then(() => {
      // show HTML Canvas element in DOM
      document.querySelector('#my-screen-share-content-canvas').style.display = 'block'
    }).catch((error) => {
        console.log(error)
    })
  }
}

function stopScreenShare(){
  window.mediaStream.stopShareScreen();
}


  const breeakoutRoomModel = showreakoutRoomModal ? (
    <BreakoutRoomModal
      hidePopup={closeBreakoutRoomPopup}
      userArray={userArray}
      startBreakoutRoom={startBreakoutRoom}
    />
  ) : null;

  const changeHostRoomModel = showChangeHostModal ? (
    <ChangeHostModal
      hidePopup={hideChangeHostPopup}
      userArray={userArray}
      changeHost={changeHost}
    />
  ) : null;

  return (
    <div className="container app-root">
      <div id="js-loading-view" className="container loading-view">
        <h1>Joining...</h1>
      </div>
      {breeakoutRoomModel}
      {changeHostRoomModel}
      <div id="js-video-view" className="container video-app hidden">
        <canvas
          id="video-canvas"
          className="video-canvas"
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
        ></canvas>
        <canvas id="visualizer" width="500" height="100"></canvas>

        <video id="my-screen-share-content-video" height="100" width="100"></video>
        <canvas id="my-screen-share-content-canvas" height="100" width="100"></canvas>


        <div className="container meeting-control-layer">
          <button id="btn-startaudio" onClick={onClickStartAudio} type="button">
            Start Audio
          </button>
          <div className="vertical-divider"></div>
          <button id="btn-startvideo" onClick={onClickStartVideo} type="button">
            Start Video
          </button>
          <div className="vertical-divider"></div>
          <button
            id="btn-startmuteunmute"
            onClick={onClickMuteUnmute}
            type="button"
          >
            Mute Audio
          </button>
          <div className="vertical-divider"></div>
          <button id="btn-previous" onClick={previousPage}>
            Previous Page
          </button>
          <div className="vertical-divider"></div>
          <button id="btn-next" onClick={nextPage}>
            Next Page
          </button>
          <div className="vertical-divider"></div>
          <button id="btn-endsession" onClick={onClickEndSession} type="button">
            Leave
          </button>
          <div className="vertical-divider"></div>
          <button id="btn-showpopup" onClick={displayBreakoutRoomPopup} type="button">
            Start Breakout Room
          </button>
          <div className="vertical-divider"></div>
          <button id="btn-stopbreakoutroom" onClick={stopBreakoutRoom} type="button">
            End Breakout Room
          </button>
          {/* <div className="vertical-divider"></div>
          <button id="btn-changeHost" onClick={displayChangeHostPopup} type="button">Switch Host</button> */}

          <div className="vertical-divider"></div>
          <button id="btn-mutealluser" onClick={muteAllLocally} type="button">Mute All</button>

          <div className="vertical-divider"></div>
          <button id="btn-unmutealluser" onClick={unMuteAllLocally} type="button">UnMute All</button>

          <div className="vertical-divider"></div>
          <button id="btn-startRecroding" onClick={startRecording} type="button">Start Recording</button>
        </div>

         <div className="vertical-divider"/>
          {/* <button id="btn-stopRecording" onClick={stopRecording} type="button">Stop Recording</button>
          <div className="vertical-divider"/>
          <button id="btn-startAudioMeter" onClick={startAudioMeter} type="button">Start Audio Meter</button> */}
        
          <div className="vertical-divider"/>
          <button id="btn-startScreenshare" onClick={startScreenShare} type="button">Start Screen Share</button>
          <div className="vertical-divider"/>
          <button id="btn-stopScreenshare" onClick={stopScreenShare} type="button">Stop Screen Share</button>
         </div>
    </div>
  );
};
export default Home;





