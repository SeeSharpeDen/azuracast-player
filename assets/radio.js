const Radio = {
    server: "https://cast.wingless.cc",
    sh_id: NaN,
    stations: null,
    station_shortcode: null,
    interval_handle: 0,

    init() {
        // Download information from the API
        fetch(`${this.server}/api/stations`).then((response) => response.json()).then((stations) => {
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
            if (stn.shortcode == station_shortcode) {
                station = stn;
            }
        });
        console.info(`Changing to station: ${station.shortcode}`);
        this.station_shortcode = station_shortcode;

        Player.setSrc(station.listen_url);

        // Clear the old interval.
        clearInterval(this.interval_handle);
        // Immediately download the details about the radio station.
        this.getDetail(station_shortcode);

        // Then every 5 seconds also download the details.
        this.interval_handle = setInterval(() => {
            Radio.getDetail(station_shortcode);
        }, 5000);
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
Radio.init();

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