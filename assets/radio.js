const Radio = {
    audio: null,
    sh_id: NaN,

    init() {
        // Create our audio source.
        this.audio = new Audio();
        this.audio.crossOrigin = "anonymous";
        this.audio.src = "https://server1.wingless.cc:2087/listen/winglessradio/radio.mp3";

        // When the audio play event is fired swap the icons around for the play button.
        this.audio.addEventListener("play", () => {
            document.querySelector(".controls .play-icon").setAttribute("hidden", "");
            document.querySelector(".controls .pause-icon").removeAttribute("hidden");
        });
        // When the audio pause event is fired swap the icons around for the play button.
        this.audio.addEventListener("pause", () => {
            document.querySelector(".controls .play-icon").removeAttribute("hidden");
            document.querySelector(".controls .pause-icon").setAttribute("hidden", "");
        });

        // Set the volume of the audio to the value of the slider.
        this.audio.volume = document.getElementById("volume-slider").value / 100

        // Immediately download the details about the radio station.
        this.getDetail();
        // Every 5 seconds also download the details.
        setInterval(() => {
            Radio.getDetail();
        }, 5000);
    },

    // Toggle between pause and play.
    toggle() {
        if (!this.audio.paused) {
            this.audio.pause();
        } else {
            this.audio.play();
            if (Renderer != null) {
                Renderer.play();
            }
        }
    },

    // Set the volume.
    setVolume(value) {
        // Change the volume of the audio source.
        this.audio.volume = value;

        // Apply a volume scale to the visualiser.
        if (this.Renderer != null && this.Renderer.visualiser != null) {
            this.Renderer.visualiser = value;
        }
    },

    // Download the current song details.
    getDetail() {
        fetch("https://server1.wingless.cc:2087/api/live/nowplaying/winglessradio").then((response) => response.json()).then((data) => {

            // Update the live listener counter.
            if (data.listeners.current == 0) {
                document.querySelector("#listeners").innerText = "nobody";
            } else if (data.listeners.current == 1) {
                document.querySelector("#listeners").innerText = `${data.listeners.current} person`;
            } else {
                document.querySelector("#listeners").innerText = `${data.listeners.current} people`;
            }

            // Don't bother updating anything else if nothing has changed.
            if (data.now_playing.sh_id == Radio.sh_id) {
                return;
            }

            // Keep track of this to know when something different is being played.
            Radio.sh_id = data.now_playing.sh_id;

            document.querySelector(".album-art img").src = data.now_playing.song.art;
            document.querySelector("#track-name").innerText = data.now_playing.song.title;
            document.querySelector("#artist-name").innerText = data.now_playing.song.artist;
        });
    }
};

Radio.init();