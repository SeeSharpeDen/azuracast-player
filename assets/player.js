const Player = {
    audio: {
        ctx: null,
        element: null,
        source: null,
        gain: null,
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
        console.log("Initialising Audio.");

        let ctx = new (window.AudioContext || window.webkitAudioContext)();
        let element = new Audio();
        element.crossOrigin = "anonymous";
        let source = ctx.createMediaElementSource(element);
        let gain = ctx.createGain();

        source.connect(gain);
        gain.connect(ctx.destination);

        this.audio = {
            ctx: ctx,
            element: element,
            source: source,
            gain: gain,
        };

        // Setup the controls.
        this.controls.pause_icon = document.querySelector(".controls .play-icon");
        this.controls.play_icon = document.querySelector(".controls .pause-icon");
        this.controls.volume_slider = document.querySelector(".controls #volume-slider");

        // Set the volume of the audio to the value of the slider.
        this.setVolume(this.controls.volume_slider.value / 100);

        // When the audio play event is fired swap the icons around for the play button.
        element.addEventListener("play", () => {
            this.controls.play_icon.setAttribute("hidden", "");
            this.controls.pause_icon.removeAttribute("hidden");
        });
        // When the audio pause event is fired swap the icons around for the play button.
        element.addEventListener("pause", () => {
            this.controls.play_icon.removeAttribute("hidden");
            this.controls.pause_icon.setAttribute("hidden", "");
        });

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

    // Play the music and renderer if one exists.
    play() {
        this.audio.element.play();

        if (Renderer != null) {
            Renderer.play();
        }
    },

    // Pause the music.
    pause() {
        this.audio.element.pause();
    },

    // Stop the music and renderer if one exists.
    stop() {
        this.audio.element.stop();

        if (Renderer != null) {
            Renderer.play();
        }
    },

    // Set the volume of the audio.
    setVolume(value) {
        this.audio.gain.gain.value = value;
    },

    // Set the src of the audio element.
    setSrc(source) {
        this.audio.element.src = source;
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

Player.init();