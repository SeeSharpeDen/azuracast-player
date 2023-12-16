const Player = {
    audio: {
        ctx: null,
        element: null,
        source: null,
        gain: null,
        init_mic_pipeline() {
            if (this.ctx == null) {
                this.ctx = new window.AudioContext({
                    latencyHint: 'interactive'
                });
            }
            // Remove the element source and gain nodes.
            this.element = null;
            if (this.source != null) {
                this.source.disconnect();
                this.source = null;
            }


            if (this.gain != null) {
                this.gain.disconnect();
                this.gain = null;
            }

            // Add our microphone nodes.
            return navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    latency: 0.02
                }
            }).then((stream) => {
                this.source = this.ctx.createMediaStreamSource(stream);

                if (Renderer.analyser == null) {
                    Renderer.init_audio(this.ctx);
                }
                this.source.connect(Renderer.analyser);
            }).catch((err) => {
                console.error(`Can't get Microphone. Reason: ${err}`);
            });
        },
        init_element_pipeline(src_url) {
            if (this.ctx == null) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            // Remove the stream source node.
            if (this.source != null) {
                this.source.disconnect();
                this.source = null;
            }

            this.element = new Audio();
            this.element.crossOrigin = "anonymous";
            this.source = this.ctx.createMediaElementSource(this.element);
            this.gain = this.ctx.createGain();

            this.source.connect(this.gain);
            this.gain.connect(this.ctx.destination);

            this.element.src = src_url;

            if (Renderer.analyser == null) {
                Renderer.init_audio(this.ctx);
            }
            this.source.connect(Renderer.analyser);
        },
    },
    controls: {
        pause_icon: null,
        play_icon: null,
        volume_slider: null,
    },
    details: {
        title: null,
        artist: null,
        album: null,
        album_art: null,
    },

    init() {
        // Setup the controls.
        this.controls.pause_icon = document.querySelector(".controls .icon-pause");
        this.controls.play_icon = document.querySelector(".controls .icon-play");
        this.controls.volume_slider = document.querySelector(".controls #volume-slider");

        // Set the volume of the audio to the value of the slider.
        this.setVolume(this.controls.volume_slider.value / 100);

        // Setup the details.
        this.details.album_art = document.querySelector(".album-art img");
        this.details.title = document.querySelector("#track-name");
        this.details.artist = document.querySelector("#artist-name");


        // Setup the media session events.
        if ("mediaSession" in navigator) {
            navigator.mediaSession.setActionHandler("play", () => {
                this.play();
            })
            navigator.mediaSession.setActionHandler("pause", () => {
                this.pause();
            })
            navigator.mediaSession.setActionHandler("stop", () => {
                this.stop();
            })
        }
    },
    // Toggle between pause and play.
    toggle() {
        if (!this.audio.element.paused) {
            this.pause();
        } else {
            this.play();
        }
    },

    // Play the music
    play() {
        if (this.audio.element != null) {
            this.audio.element.play();

            this.controls.play_icon.setAttribute("hidden", "");
            this.controls.pause_icon.removeAttribute("hidden");
        }
    },

    // Pause the music.
    pause() {
        if (this.audio.element != null) {
            this.audio.element.pause();

            this.controls.play_icon.removeAttribute("hidden");
            this.controls.pause_icon.setAttribute("hidden", "");
        }
    },

    // Stop the music
    stop() {
        if (this.audio.element != null) {
            this.audio.element.stop();

            this.controls.play_icon.removeAttribute("hidden");
            this.controls.pause_icon.setAttribute("hidden", "");
        }
    },

    // Set the volume of the audio.
    setVolume(value) {
        if (this.audio.gain != null) {
            this.audio.gain.gain.value = value;
        }
    },
    setSource(source) {
        // If the source is a radio, use that.
        if (source.startsWith("radio.")) {
            let src_url = Radio.setStation(source.substr(6));
            this.audio.init_element_pipeline(src_url);
            return;
        } else {
            // Clear the radio (and stop hitting the API)
            Radio.setStation(null);
        }

        if (source == "mic") {
            this.audio.init_mic_pipeline();
            return;
        }
    },

    // Set the track details of the player and mediaSession.
    setDetails(title, artist, album, art_url) {
        this.details.album_art.src = art_url;
        this.details.title.innerText = title;
        this.details.artist.innerText = artist;
        // document.querySelector("#album-name").innerText = album;

        // Update the Media Session's metadata.
        if ("mediaSession" in navigator) {

            // Get the extension of the song's art.
            let extension = get_url_extension(art_url);
            // Change the extension if it's jpg to jpeg for mime conversion.
            if (extension == "jpg") {
                extension = "jpeg"
            }

            // Set the metadata.
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: artist,
                album: album,
                artwork: [
                    {
                        src: art_url,
                        type: `image/${extension}`
                    }
                ]
            })
        }
    }
}