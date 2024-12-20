const roomId = "minimal-lib-jitsi-meet-example-room";
const domain = "namaa-booking.codertc.com";

const initOptions = {
  disableAudioLevels: true,
};

const conferenceOptions = {
  p2p: {
    enabled: false,
  },
};

const connectionOptions = {
  serviceUrl: `https://${domain}/http-bind?room=${roomId}`,
  hosts: {
    domain: domain,
    muc: `conference.${domain}`,
    focus: `focus.${domain}`,
  },
  clientNode: "http://jitsi.org/jitsimeet",
};

let connection = null;
let isJoined = false;
let room = null;
window.app = {};

let localTracks = [];
const remoteTracks = {};

// Ensure Jitsi Meet library is loaded
if (typeof JitsiMeetJS === 'undefined') {
  console.error('Jitsi Meet library not loaded. Please check your script inclusion.');
  // Optionally, you can add a fallback or error handling
  document.body.innerHTML = '<div class="error">Failed to load video conferencing library. Please refresh the page.</div>';
}


/**
 * Handles local tracks.
 * @param tracks Array with JitsiTrack objects
 */
function onLocalTracks(tracks) {
  localTracks = tracks;
  for (let i = 0; i < localTracks.length; i++) {
    localTracks[i].addEventListener(
      JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
      (audioLevel) => console.log(`Audio Level local: ${audioLevel}`)
    );
    localTracks[i].addEventListener(
      JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
      () => console.log("local track muted")
    );
    localTracks[i].addEventListener(
      JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
      () => console.log("local track stoped")
    );
    localTracks[i].addEventListener(
      JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
      (deviceId) =>
        console.log(`track audio output device was changed to ${deviceId}`)
    );
    if (localTracks[i].getType() === "video") {
      $(".streams").append(`<video autoplay='1' id='localVideo${i}' />`);
      localTracks[i].attach($(`#localVideo${i}`)[0]);
    } else {
      $(".streams").append(
        `<audio autoplay='1' muted='true' id='localAudio${i}' />`
      );
      localTracks[i].attach($(`#localAudio${i}`)[0]);
    }
    if (isJoined) {
      room.addTrack(localTracks[i]);
    }
  }
}

/**
 * Handles remote tracks
 * @param track JitsiTrack object
 */
function onRemoteTrack(track) {
  console.log("onRemoteTrack");

  if (track.isLocal()) {
    return;
  }
  const participant = track.getParticipantId();

  // Prevent duplicate tracks
  if (remoteTracks[participant]) {
    const existingTrackOfType = remoteTracks[participant].find(
      existingTrack => existingTrack.getType() === track.getType()
    );
    
    if (existingTrackOfType) {
      // Remove existing track of the same type
      const existingElement = document.getElementById(track.getId());
      if (existingElement) {
        existingElement.remove();
      }
      
      // Remove from remoteTracks
      remoteTracks[participant] = remoteTracks[participant].filter(
        t => t !== existingTrackOfType
      );
    }
  }

  if (!remoteTracks[participant]) {
    remoteTracks[participant] = [];
  }
  const idx = remoteTracks[participant].push(track);

  track.addEventListener(
    JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
    (audioLevel) => console.log(`Audio Level remote: ${audioLevel}`)
  );
  track.addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, () =>
    console.log("remote track muted")
  );
  track.addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () =>
    console.log("remote track stoped")
  );
  track.addEventListener(
    JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
    (deviceId) =>
      console.log(`track audio output device was changed to ${deviceId}`)
  );

  if (track.getType() === "video") {
    $(".streams").append(
      `<video autoplay='1' id='${track.getId()}' />`
    );
  } else {
    $(".streams").append(
      `<audio autoplay='1' id='${track.getId()}' />`
    );
  }
  track.attach($(`#${track.getId()}`)[0]);
}

/**
 * That function is executed when the conference is joined
 */
function onConferenceJoined() {
  console.log("conference joined!");
  isJoined = true;
  for (let i = 0; i < localTracks.length; i++) {
    room.addTrack(localTracks[i]);
  }
  initChat();
}

/**
 *
 * @param id
 */
function onUserLeft(id) {
  console.log("user left");
  
  // Remove tracks from DOM
  if (remoteTracks[id]) {
    remoteTracks[id].forEach(track => {
      const trackElement = document.getElementById(track.getId());
      if (trackElement) {
        trackElement.remove();
      }
    });
    
    // Remove from remoteTracks
    delete remoteTracks[id];
  }
}

function setDisplayName() {
  if (!sessionStorage.getItem("data")) {
    sessionStorage.setItem(
      "data",
      JSON.stringify({
        id: `local-jitsi-12512412`,
        name: "Vladislav",
      })
    );
  }

  // room.setDisplayName(sessionStorage.getItem("data"));

  const parsedStorageData = JSON.parse(sessionStorage.getItem("data"));
  $(".localUserInfoId span").text(parsedStorageData.id);
  $(".localUserInfoName span").text(parsedStorageData.name);
}

/**
 * That function is called when connection is established successfully
 */
function onConnectionSuccess() {
  console.log("connection success");
  room = window.app.room = connection.initJitsiConference(
    roomId,
    conferenceOptions
  );
  
  // Track participant changes
  room.on(JitsiMeetJS.events.conference.PARTICIPANT_JOINED, (participant) => {
    console.log('Participant joined:', participant.getDisplayName());
    updateParticipantsList();
  });

  room.on(JitsiMeetJS.events.conference.PARTICIPANT_LEFT, (participant) => {
    console.log('Participant left:', participant.getDisplayName());
    updateParticipantsList();
  });

  room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
    onConferenceJoined();
    initChat();

    // Check if local user is a moderator
    const isLocalModerator = room.isModerator(room.myUserId());
    console.log('Am I a moderator?', isLocalModerator);

    // Update participants list when conference is joined
    updateParticipantsList();
  });

  room.on(JitsiMeetJS.events.conference.TRACK_ADDED, onRemoteTrack);
  room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
    console.log(`track removed!!!${track}`);
    
    // Remove track from DOM when it's removed
    if (track) {
      const trackElement = document.getElementById(track.getId());
      if (trackElement) {
        trackElement.remove();
      }
    }
  });
  
  // Additional moderator-specific methods
  if (room.isModerator(room.myUserId())) {
    console.log('You have moderator privileges');
    
    // Example: Mute all participants except the local user
    function muteAllOtherParticipants() {
      const participants = room.getParticipants();
      participants.forEach(participant => {
        const participantId = participant.getId();
        if (participantId !== room.myUserId()) {
          room.muteParticipant(participantId);
        }
      });
    }
  }

  console.log("Room join process...");
  room.join();
  room.setReceiverVideoConstraint(720);
}

/**
 * This function is called when the connection fail.
 */
function onConnectionFailed() {
  console.log("Connection Failed!");
}

/**
 * This function is called when the connection fail.
 */
function onDeviceListChanged(devices) {
  console.log("current devices", devices);
}

/**
 * This function is called when we disconnect.
 */
function disconnect() {
  console.log("disconnect!");
  connection.removeEventListener(
    JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
    onConnectionSuccess
  );
  connection.removeEventListener(
    JitsiMeetJS.events.connection.CONNECTION_FAILED,
    onConnectionFailed
  );
  connection.removeEventListener(
    JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
    disconnect
  );
}

/**
 *
 */
function unload() {
  try {
    // Dispose of local tracks
    localTracks.forEach(track => track.dispose());
    localTracks = [];

    // Dispose of remote tracks
    Object.keys(remoteTracks).forEach(participantId => {
      remoteTracks[participantId].forEach(track => track.dispose());
      delete remoteTracks[participantId];
    });

    // Leave room and disconnect
    if (room) {
      room.leave();
    }
    if (connection) {
      connection.disconnect();
    }
  } catch (error) {
    console.error("Error during unload:", error);
  }
}

let isVideo = true;

/**
 *
 */
function switchVideo() {
  // eslint-disable-line no-unused-vars
  isVideo = !isVideo;
  if (localTracks[1]) {
    localTracks[1].dispose();
    localTracks.pop();
  }
  JitsiMeetJS.createLocalTracks({
    devices: [isVideo ? "video" : "desktop"],
  })
    .then((tracks) => {
      localTracks.push(tracks[0]);
      localTracks[1].addEventListener(
        JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
        () => console.log("local track muted")
      );
      localTracks[1].addEventListener(
        JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
        () => console.log("local track stoped")
      );
      localTracks[1].attach($("#localVideo1")[0]);
      room.addTrack(localTracks[1]);
    })
    .catch((error) => console.log(error));
}

/**
 *
 * @param selected
 */
function changeAudioOutput(selected) {
  // eslint-disable-line no-unused-vars
  JitsiMeetJS.mediaDevices.setAudioOutputDevice(selected.value);
}

$(window).bind("beforeunload", unload);
$(window).bind("unload", unload);

JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.INFO);

JitsiMeetJS.init(initOptions);

connection = window.app.connection = new JitsiMeetJS.JitsiConnection(
  null,
  null,
  connectionOptions
);

connection.addEventListener(
  JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
  onConnectionSuccess
);
connection.addEventListener(
  JitsiMeetJS.events.connection.CONNECTION_FAILED,
  onConnectionFailed
);
connection.addEventListener(
  JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
  disconnect
);

JitsiMeetJS.mediaDevices.addEventListener(
  JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED,
  onDeviceListChanged
);

connection.connect();

// Retrieve display name and device selections from localStorage
const storedDisplayName = localStorage.getItem('userDisplayName');
const storedRoomId = localStorage.getItem('roomId');
const storedDevices = JSON.parse(localStorage.getItem('selectedDevices') || '{}');

// Clear localStorage after retrieving
localStorage.removeItem('userDisplayName');
localStorage.removeItem('roomId');
localStorage.removeItem('selectedDevices');

// Update conference options with display name
if (storedDisplayName) {
  conferenceOptions.displayName = storedDisplayName;
}

// Update room ID if provided from lobby
if (storedRoomId) {
  roomId = storedRoomId;
}

// Modify local tracks creation to use selected devices
JitsiMeetJS.createLocalTracks({ 
  devices: ["audio", "video"],
  cameraDeviceId: storedDevices.videoInput || undefined,
  micDeviceId: storedDevices.audioInput || undefined
})
  .then(onLocalTracks)
  .catch((error) => {
    console.error('Error creating local tracks:', error);
  });

if (JitsiMeetJS.mediaDevices.isDeviceChangeAvailable("output")) {
  JitsiMeetJS.mediaDevices.enumerateDevices((devices) => {
    const audioOutputDevices = devices.filter((d) => d.kind === "audiooutput");

    if (audioOutputDevices.length > 1) {
      $("#audioOutputSelect").html(
        audioOutputDevices
          .map((d) => `<option value="${d.deviceId}">${d.label}</option>`)
          .join("\n")
      );

      $("#audioOutputSelectWrapper").show();
    }
  });
}

// Chat functionality
function initChat() {
    console.log('Initializing chat functionality');
    let currentAttachment = null;

    // Attachment button click handler
    $('#attachmentBtn').on('click', function() {
        $('#attachmentInput').click();
    });

    // Attachment input change handler
    $('#attachmentInput').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            currentAttachment = file;
            
            // Preview attachment
            const reader = new FileReader();
            reader.onload = function(event) {
                const previewHtml = `
                    <div class="chat chat-start">
                        <div class="chat-bubble chat-bubble-info flex flex-col items-start">
                            <span class="font-bold">Attachment Preview:</span>
                            <img src="${event.target.result}" 
                                 class="max-w-[200px] max-h-[200px] rounded-lg mt-2" 
                                 alt="Attachment Preview">
                            <span class="text-xs mt-1">${file.name}</span>
                        </div>
                    </div>
                `;
                $('#chatMessages').append(previewHtml);
                $('#chatMessages').scrollTop($('#chatMessages')[0].scrollHeight);
            };
            reader.readAsDataURL(file);
        }
    });

    // Send chat message
    function sendChatMessage() {
        const messageText = $('#chatInput').val().trim();
        
        if (messageText || currentAttachment) {
            // Prepare message data
            const messageData = {
                type: 'chat',
                text: messageText,
                timestamp: new Date().toISOString(),
                sender: room.myUserId(), // Use Jitsi room's user ID
                attachment: null
            };

            console.log('Preparing to send message:', messageData);

            // If there's an attachment, convert to base64
            if (currentAttachment) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    messageData.attachment = {
                        data: event.target.result,
                        name: currentAttachment.name,
                        type: currentAttachment.type
                    };
                    
                    // Send message through Jitsi room
                    sendJitsiMessage(messageData);
                    
                    // Display local message
                    displayChatMessage(messageData, true);
                    
                    // Clear input and attachment
                    $('#chatInput').val('');
                    currentAttachment = null;
                    $('#attachmentInput').val('');
                };
                reader.readAsDataURL(currentAttachment);
            } else {
                // Send message without attachment
                sendJitsiMessage(messageData);
                displayChatMessage(messageData, true);
                $('#chatInput').val('');
            }
        }
    }

    // Specialized function to send Jitsi message
    function sendJitsiMessage(messageData) {
        try {
            // Convert message to JSON string
            const messageString = JSON.stringify(messageData);
            
            console.log('Sending Jitsi message:', messageString);

            // Use Jitsi Meet's sendPrivateMessage for all participants
            room.sendMessage({
                messageType: 'chat',
                message: messageString
            });

            console.log('Message sent successfully');
        } catch (error) {
            console.error('Error sending Jitsi message:', error);
            alert('Failed to send message. Please check your connection.');
        }
    }

    // Send message on button click
    $('#sendChat').on('click', sendChatMessage);

    // Send message on Enter key
    $('#chatInput').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            sendChatMessage();
        }
    });

    // Handle incoming messages
    room.addListener(JitsiMeetJS.events.conference.MESSAGE_RECEIVED, (message) => {
        console.log('Received message:', message);

        try {
            // Check if message is a chat message
            if (message.messageType === 'chat') {
                // Parse the message
                const parsedMessage = JSON.parse(message.message);
                
                console.log('Parsed chat message:', parsedMessage);
                
                // Display the message
                displayChatMessage(parsedMessage, false);
            }
        } catch (error) {
            console.error('Error parsing received message:', error);
        }
    });

    console.log('Chat initialization complete');
}

// Display chat message with DaisyUI bubbles
function displayChatMessage(message, isSent = false) {
    console.log('Displaying chat message:', message, 'Sent:', isSent);

    const chatMessages = $('#chatMessages');
    
    // Determine chat direction and bubble color
    const chatDirection = isSent ? 'chat-end' : 'chat-start';
    const bubbleColor = isSent ? 'chat-bubble-primary' : 'chat-bubble-secondary';

    // Create message element
    let messageHtml = `
        <div class="chat ${chatDirection}">
            <div class="chat-header">
                ${message.sender || 'Anonymous'}
                <time class="text-xs opacity-50 ml-2">
                    ${new Date(message.timestamp).toLocaleTimeString()}
                </time>
            </div>
    `;

    // Add text message if exists
    if (message.text) {
        messageHtml += `
            <div class="chat-bubble ${bubbleColor}">
                ${message.text}
            </div>
        `;
    }

    // Add attachment if exists
    if (message.attachment) {
        if (message.attachment.type.startsWith('image/')) {
            messageHtml += `
                <div class="chat-bubble ${bubbleColor} flex flex-col items-start">
                    <span class="font-bold mb-2">Attachment:</span>
                    <img src="${message.attachment.data}" 
                         class="max-w-[200px] max-h-[200px] rounded-lg" 
                         alt="Received Attachment">
                    <span class="text-xs mt-1">${message.attachment.name}</span>
                </div>
            `;
        } else {
            messageHtml += `
                <div class="chat-bubble ${bubbleColor} flex flex-col items-start">
                    <span class="font-bold">Attachment:</span>
                    <a href="${message.attachment.data}" 
                       download="${message.attachment.name}" 
                       class="text-blue-500 underline">
                        ${message.attachment.name}
                    </a>
                </div>
            `;
        }
    }

    messageHtml += `</div>`;

    // Append to chat messages
    chatMessages.append(messageHtml);
    
    // Scroll to bottom
    chatMessages.scrollTop(chatMessages[0].scrollHeight);

    console.log('Chat message displayed successfully');
}

// Function to update participants list
function updateParticipantsList() {
  const participantsList = $('#participantsList');
  participantsList.empty();

  // Get all participants in the conference
  const participants = room.getParticipants();

  participants.forEach(participant => {
    // Get participant details
    const participantId = participant.getId();
    const displayName = participant.getDisplayName() || 'Anonymous';
    const isModerator = room.isModerator(participantId);
    const isLocalUser = participantId === room.myUserId();

    // Create participant list item
    const participantItem = $('<div>')
      .addClass('participant-item')
      .addClass(isLocalUser ? 'local-user' : '')
      .addClass(isModerator ? 'moderator' : '');

    const participantInfo = $('<span>')
      .text(`${displayName} ${isModerator ? '(Moderator)' : ''} ${isLocalUser ? '(You)' : ''}`)
      .appendTo(participantItem);

    // Add action buttons for moderators
    if (room.isModerator(room.myUserId())) {
      const muteAudioBtn = $('<button>')
        .addClass('btn btn-sm btn-outline-warning mute-audio')
        .html('<i class="fas fa-microphone-slash"></i>')
        .on('click', () => {
          // Mute a specific participant's audio
          room.muteParticipant(participantId);
        });

      const removeBtn = $('<button>')
        .addClass('btn btn-sm btn-outline-danger remove-participant')
        .html('<i class="fas fa-user-times"></i>')
        .on('click', () => {
          // Remove a participant from the conference
          room.kickParticipant(participantId);
        });

      $('<div>')
        .addClass('participant-actions')
        .append(muteAudioBtn)
        .append(removeBtn)
        .appendTo(participantItem);
    }

    participantsList.append(participantItem);
  });
}

$(document).ready(function() {
  // Clear any existing streams
  $(".streams").empty();

  // Toggle Audio
  $('#toggleAudio').on('click', function() {
    if (localTracks.length > 0) {
      const audioTrack = localTracks.find(track => track.getType() === 'audio');
      if (audioTrack) {
        if (audioTrack.isMuted()) {
          audioTrack.unmute();
          $(this).text('Mute Audio');
        } else {
          audioTrack.mute();
          $(this).text('Unmute Audio');
        }
      }
    }
  });

  // Toggle Video
  $('#toggleVideo').on('click', function() {
    if (localTracks.length > 0) {
      const videoTrack = localTracks.find(track => track.getType() === 'video');
      if (videoTrack) {
        if (videoTrack.isMuted()) {
          videoTrack.unmute();
          $(this).text('Stop Video');
        } else {
          videoTrack.mute();
          $(this).text('Start Video');
        }
      }
    }
  });

  // Share Screen
  $('#shareScreen').on('click', function() {
    if (room) {
      // Check if screen sharing is already in progress
      const existingScreenTrack = localTracks.find(track => track.videoType === 'desktop');
      
      if (existingScreenTrack) {
        // If screen sharing is active, stop it
        existingScreenTrack.dispose();
        localTracks = localTracks.filter(track => track !== existingScreenTrack);
        room.removeTrack(existingScreenTrack);
        $(this).text('Share Screen');
        return;
      }

      // Start screen sharing
      JitsiMeetJS.createLocalTracks({
        devices: ['desktop']
      }).then(tracks => {
        const screenTrack = tracks[0];
        localTracks.push(screenTrack);
        room.addTrack(screenTrack);
        $(this).text('Stop Sharing');
      }).catch(error => {
        console.error('Error sharing screen:', error);
        alert('Screen sharing failed. Please try again.');
      });
    }
  });

  // Hang Up
  $('#hangup').on('click', function() {
    unload();
    location.reload();
  });
});
