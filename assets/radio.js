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

        // Change the header logo juuuuussssttt for 'ninajs'
        if (station_shortcode == "ninajs") {
            document.querySelector("#stage img.logo").src = "./assets/graphics/tomify.png";
        } else {
            document.querySelector("#stage img.logo").src = "https://cdn.virial.xyz/7r9cmCZm/logofull.png";
        }

        // Get the station.
        let station = null;
        this.stations.forEach(stn => {
            if (stn.shortcode == station_shortcode) {
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
            this.pause();
        } else {
            this.play();
        }
    },

    // Play the music and visualiser.
    play() {
        this.audio.play();

        if (Renderer != null) {
            Renderer.play();
        }
    },

    // Pause the music.
    pause() {
        this.audio.pause();
    },

    // Stop the music.
    stop() {
        this.audio.stop();
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

            let song = data.now_playing.song;

            song.title = capitalize(song.title);
            song.artist = capitalize(song.artist);
            song.album = capitalize(song.album);

            document.querySelector(".album-art img").src = song.art;
            document.querySelector("#track-name").innerText = song.title;
            document.querySelector("#artist-name").innerText = song.artist;

            // Update the Media Session's metadata.
            if ("mediaSession" in navigator) {

                // Get the extension of the song's art.
                let extension = get_url_extension(song.art);
                // Change the extension if it's jpg to jpeg for mime conversion.
                if (extension == "jpg") {
                    extension = "jpeg"
                }

                // Set the metadata.
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: song.title,
                    artist: song.artist,
                    album: song.album,
                    artwork: [
                        {
                            src: song.art,
                            type: `image/${extension}`
                        }
                    ]
                })
            }
        });
    }
};

function capitalize(text) {
    if (typeof text != 'string')
        return;
    // If the first character is capital, just return out.
    if (text.charAt(0) == text.charAt(0).toUpperCase())
        return text;

    // Replace the first character of each word with the capital equivalent.
    // Yoink! Stack Bashing at it's finest. Cheers Nicole 🍻.
    // https://stackoverflow.com/questions/5956942/is-there-a-js-equivalent-to-css-text-transform-capitalize/5957014#5957014
    return text.replace(/\b\w/g, function (m) { return m.toUpperCase(); });
}

// Yoink! Stack Bashing at it's finest. Cheers T.Todua 🍻.
// https://stackoverflow.com/questions/6997262/how-to-pull-url-file-extension-out-of-url-string-using-javascript/47767860#47767860
function get_url_extension(url) {
    return url.split(/[#?]/)[0].split('.').pop().trim();
}


Radio.init();