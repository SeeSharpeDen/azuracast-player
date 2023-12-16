const Radio = {
    server: "https://cast.wingless.cc",
    sh_id: NaN,
    stations: null,
    station_shortcode: null,
    interval_handle: NaN,

    init() {
        // Download information from the API
        fetch(`${this.server}/api/stations`).then((response) => response.json()).then((stations) => {
            this.stations = stations;

            // This has been moved here from index.html for authentic spaghetti code.
            // Load the last used audio source.
            var last_source = window.localStorage.getItem("last_source")
            if (last_source == null) {
                last_source = "radio.winglessradio"
            }
            pick_source(document.querySelector(`#radio-menu [data-source="${last_source}"]`));
        });
    },

    setStation(station_shortcode) {
        // Clear the old interval.
        if (this.interval_handle != NaN) {
            clearInterval(this.interval_handle);
        }

        // Get the station.
        let station = null;
        this.stations.forEach(stn => {
            if (stn.shortcode == station_shortcode) {
                station = stn;
            }
        });

        // If we have a station, change to it.
        if (station != null) {
            console.info(`Changing to station: ${station.shortcode}`);
            this.station_shortcode = station_shortcode;

            // Player.setSrc(station.listen_url);
            // Immediately download the details about the radio station.
            this.getDetail(station_shortcode);

            // Then every 5 seconds also download the details.
            this.interval_handle = setInterval(() => {
                Radio.getDetail(station_shortcode);
            }, 5000);

            console.log(station.listen_url);
            return station.listen_url;
        } else {
            console.info("Changed to no station.")
        }

        return null;
    },

    // Download the current song details.
    getDetail(shortcode) {
        fetch(`${this.server}/api/live/nowplaying/${shortcode}`).then((response) => response.json()).then((data) => {
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

            // Update our player details.
            let song = data.now_playing.song;
            Player.setDetails(capitalize(song.title), capitalize(song.artist), capitalize(song.album), song.art);
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