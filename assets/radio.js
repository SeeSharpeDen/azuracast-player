let radio_server = "https://server1.wingless.cc:2087";

const Radio = {
    audio: null,
    sh_id: NaN,
    stations: null,
    station_shortcode: null,
    interval_handle: 0,

    init() {
        // Create our audio source.
        this.audio = new Audio();
        this.audio.crossOrigin = "anonymous";

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

        // Download information from the API
        fetch(`${radio_server}/api/stations`).then((response) => response.json()).then((stations) => {
            this.stations = stations;
            // Update the drop down box in the settings and change to the first viable station.
            let select = document.getElementById("radio-select");
            if (stations.length > 0) {
                select.removeChild(select.firstChild);
                stations.forEach(stn => {
                    if (stn.mounts.length > 0) {

                        // Change to the first viable station.
                        if (this.station_shortcode == null) {
                            this.changeStation(stn.shortcode);
                        }

                        // Add the station to the drop down box.
                        const optionNode = document.createElement("option");
                        optionNode.value = stn.shortcode;
                        const textNode = document.createTextNode(stn.name);
                        optionNode.appendChild(textNode);
                        select.appendChild(optionNode);
                    }
                });
            }
        });
    },

    changeStation(station_shortcode) {
        // Only change stations if we need to.
        if (this.station_shortcode == station_shortcode) {
            console.warn("Station has not changed. Not going to change.");
            return;
        }

        // Get the station.
        let station = null;
        this.stations.forEach(stn => {
            if(stn.shortcode == station_shortcode) {
                station = stn;
            }
        });
        console.info(`Changing to station: ${station.shortcode}`);
        this.station_shortcode = station_shortcode;

        // Update the audio and interface.
        this.audio.src = station.listen_url;
        document.querySelector(".controls .play-icon").removeAttribute("hidden");
        document.querySelector(".controls .pause-icon").setAttribute("hidden", "");

        // Clear the old interval.
        clearInterval(this.interval_handle);

        // Immediately download the details about the radio station.
        this.getDetail(station_shortcode);

        
        // Then every 5 seconds also download the details.
        this.interval_handle = setInterval(() => {
            Radio.getDetail(station_shortcode);
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
    },

    // Download the current song details.
    getDetail(shortcode) {
        fetch(`${radio_server}/api/live/nowplaying/${shortcode}`).then((response) => response.json()).then((data) => {

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