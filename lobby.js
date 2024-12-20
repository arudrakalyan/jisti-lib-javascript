$(document).ready(function() {
    let localStream = null;
    let audioDevices = [];
    let videoDevices = [];
    let selectedAudioDevice = null;
    let selectedVideoDevice = null;
    let isAudioMuted = false;
    let isVideoMuted = false;

    // Theme Toggle
    $('.theme-controller').on('change', function() {
        document.documentElement.setAttribute('data-theme', 
            this.checked ? 'dark' : 'light'
        );
        localStorage.setItem('theme', this.checked ? 'dark' : 'light');
    });

    // Initialize device selection dropdown
    function initDeviceDropdown() {
        const audioSelect = $('#audioInput');
        const videoSelect = $('#videoInput');

        // Populate audio devices
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                audioDevices = devices.filter(device => device.kind === 'audioinput');
                videoDevices = devices.filter(device => device.kind === 'videoinput');

                // Clear previous options
                audioSelect.find('option:not(:first)').remove();
                videoSelect.find('option:not(:first)').remove();

                // Populate audio device dropdown
                audioDevices.forEach((device, index) => {
                    const option = $('<option>')
                        .val(device.deviceId)
                        .text(device.label || `Microphone ${index + 1}`);
                    audioSelect.append(option);
                });

                // Populate video device dropdown
                videoDevices.forEach((device, index) => {
                    const option = $('<option>')
                        .val(device.deviceId)
                        .text(device.label || `Camera ${index + 1}`);
                    videoSelect.append(option);
                });
            })
            .catch(error => {
                console.error('Error enumerating devices:', error);
            });

        // Apply devices button handler
        $('#applyDevices').on('click', function() {
            selectedAudioDevice = audioSelect.val();
            selectedVideoDevice = videoSelect.val();
            
            // Update local preview with selected devices
            initLocalStream();

            // Close dropdown
            $('.dropdown').removeClass('dropdown-open');
        });
    }

    // Initialize local video stream
    function initLocalStream() {
        const videoPreview = $('#localVideoPreview')[0];
        
        // Stop previous stream if exists
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        // Constraints for media stream
        const constraints = {
            audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
            video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                localStream = stream;
                videoPreview.srcObject = stream;
                
                // Mute tracks based on current state
                stream.getAudioTracks().forEach(track => {
                    track.enabled = !isAudioMuted;
                });
                stream.getVideoTracks().forEach(track => {
                    track.enabled = !isVideoMuted;
                });
            })
            .catch(error => {
                console.error('Error accessing media devices:', error);
                
                // Show error toast
                const toast = $('<div class="toast toast-top toast-center"><div class="alert alert-error"><span>Could not access camera or microphone</span></div></div>');
                $('body').append(toast);
                setTimeout(() => toast.remove(), 3000);
            });
    }

    // Toggle audio mute
    $('#toggleAudio').on('click', function() {
        if (!localStream) return;

        isAudioMuted = !isAudioMuted;
        const audioTracks = localStream.getAudioTracks();
        
        audioTracks.forEach(track => {
            track.enabled = !isAudioMuted;
        });

        // Update button UI
        $(this).find('i').toggleClass('fa-microphone fa-microphone-slash');
    });

    // Toggle video mute
    $('#toggleVideo').on('click', function() {
        if (!localStream) return;

        isVideoMuted = !isVideoMuted;
        const videoTracks = localStream.getVideoTracks();
        
        videoTracks.forEach(track => {
            track.enabled = !isVideoMuted;
        });

        // Update button UI
        $(this).find('i').toggleClass('fa-video fa-video-slash');
    });

    // Generate and display meeting URL
    function generateMeetingUrl() {
        const roomId = Math.random().toString(36).substring(2, 10);
        const baseUrl = window.location.origin + window.location.pathname.replace('lobby.html', 'index.html');
        const meetingUrl = `${baseUrl}?room=${roomId}`;
        
        $('#meetingUrl').val(meetingUrl);
        
        // Store room ID in localStorage
        localStorage.setItem('meetingRoomId', roomId);
    }

    // Copy meeting URL
    $('#copyUrlBtn').on('click', function() {
        const meetingUrlInput = $('#meetingUrl');
        meetingUrlInput.select();
        document.execCommand('copy');
        
        // Show toast notification
        const toast = $('<div class="toast toast-top toast-center"><div class="alert alert-success"><span>URL Copied!</span></div></div>');
        $('body').append(toast);
        
        // Remove toast after 2 seconds
        setTimeout(() => {
            toast.remove();
        }, 2000);
    });

    // Join meeting button
    $('#joinMeetingBtn').on('click', function() {
        const displayName = $('#displayName').val().trim();
        
        if (!displayName) {
            // Show error toast
            const toast = $('<div class="toast toast-top toast-center"><div class="alert alert-error"><span>Please enter your name</span></div></div>');
            $('body').append(toast);
            setTimeout(() => toast.remove(), 2000);
            return;
        }

        // Store display name in localStorage
        localStorage.setItem('displayName', displayName);

        // Store device selections
        if (selectedAudioDevice) {
            localStorage.setItem('selectedAudioDevice', selectedAudioDevice);
        }
        if (selectedVideoDevice) {
            localStorage.setItem('selectedVideoDevice', selectedVideoDevice);
        }

        // Redirect to main meeting page
        window.location.href = `index.html?room=${localStorage.getItem('meetingRoomId')}`;
    });

    // Initialize on page load
    function init() {
        initDeviceDropdown();
        generateMeetingUrl();
        initLocalStream();

        // Restore previously selected devices if available
        const savedAudioDevice = localStorage.getItem('selectedAudioDevice');
        const savedVideoDevice = localStorage.getItem('selectedVideoDevice');

        if (savedAudioDevice) {
            selectedAudioDevice = savedAudioDevice;
            $('#audioInput').val(savedAudioDevice);
        }
        if (savedVideoDevice) {
            selectedVideoDevice = savedVideoDevice;
            $('#videoInput').val(savedVideoDevice);
        }

        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            $('.theme-controller').prop('checked', savedTheme === 'dark');
        }
    }

    // Call initialization
    init();
});
