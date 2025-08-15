class Player {
    constructor(api) {
        this.api = api;

        // Create and configure the audio element.
        this.audio = new Audio();
        this.audio.crossOrigin = "anonymous";

        // Create our audio system.
        const context = new window.AudioContext();
        const source = context.createMediaElementSource(this.audio);
        const gain = context.createGain();
        /*
        In the Radio        In the renderer
        
            Source ---------------+
              |                   |
            Gain                Analyser
              |                 (renderer)
            Destination
            (speakers)
        */
        source.connect(gain);
        gain.connect(context.destination);

        this.audio_system = {
            context,
            source,
            gain
        }
    }

    setup_ui() {
        // Play or pause the audio when the play/pause button is pressed.
        document.querySelector("#play-btn").onclick = (event) => {
            this.toggle();
        };

        // Update the volume.
        const slider = document.querySelector("#volume-slider");
        this.set_volume(slider.value / slider.max);
        slider.oninput = (event) => {
            const new_volume = event.srcElement.value / event.srcElement.max;
            this.set_volume(new_volume);
        };
        this.audio.oncanplay = (event) => {
            console.log("Can Play");

            this.set_play_btn("icon-play");
        };
    }
    async toggle() {
        console.log("toggle");

        const audio = this.audio;
        const ctx = this.audio_system.context; // Get your AudioContext from the system object

        if (audio.paused) {
            this.set_play_btn("icon-load");
            // If the audio context is suspended, resume it.
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            await audio.play().then(() => {
                this.set_play_btn("icon-pause");
            });
        } else {
            this.set_play_btn("icon-load");
            audio.pause();
            // Suspend the audio context.
            // TODO: Pause the renderer?
            await ctx.suspend();
            this.set_play_btn("icon-play");
        }
    }

    set_play_btn(class_name) {
        // Hide all the buttons.
        for (const icon of document.querySelectorAll("#play-btn >*")) {
            icon.setAttribute("hidden", "");
        }

        // Un-hide the button we want.
        document.querySelector(`#play-btn .${class_name}`).removeAttribute("hidden");
    }

    set_volume(value) {
        // Set the volume of the player.
        this.audio_system.gain.gain.value = value;
    }

    async set_station(shortcode) {
        // Download the list of radio stations if it's not already done.
        if (!this.stations) {
            console.log(`GET: ${this.api}/stations`);
            const resp = await fetch(`${this.api}/stations`);
            this.stations = await resp.json();
        }

        // Find the station with the same shortcode, then find the default mount.
        const station = this.stations.find((itm) => itm.shortcode == shortcode);
        if (!station) {
            throw new Error(`The station '${shortcode}' could not be found.`);
        }
        const mount = station.mounts.find((itm) => itm.is_default);
        if (!station) {
            throw new Error(`The station '${shortcode}' has no audio streams.`);
        }

        this.active_mount = mount;
        this.active_station_id = station.id;
        // Pause the old audio source.
        if (this.audio) {
            this.audio.pause();
        }
        // Update the audio source.
        this.audio.src = mount.url;

        await this.now_playing();
    }

    async now_playing() {
        const station_id = this.active_station_id;

        console.log(`GET: ${this.api}/nowplaying/${station_id}`);
        const data = await fetch(`${this.api}/nowplaying/${station_id}`).then(response => response.json());
        if (data.listeners.unique == 0) {
            document.querySelector("#player #listeners").textContent = "nobody";
        } else {
            document.querySelector("#player #listeners").textContent = data.listeners.unique;
        }

        const self = this;
        const next_check = 2 + data.now_playing.remaining;
        console.log(`Checking now_playing in ${next_check} seconds`);

        this.now_playing_timeout = setTimeout(async function () {
            console.log("Checking now_playing");
            await self.now_playing(station_id);
        }, next_check * 1000);

        await this.set_current_song(data.now_playing.song);
    }

    async set_current_song(song) {
        document.querySelector("#player .track-details>#track-name").textContent = song.title;
        document.querySelector("#player .track-details>#artist-name").textContent = song.artist;

        // Load in a new image.
        document.querySelector("#player .album-art").classList.add("loading");
        const img = document.querySelector("#player .album-art>img");
        img.src = song.art;
        // Update the Media Session's metadata.
        if ("mediaSession" in navigator) {
            // Fetch just the headers of the album art to get the content type.
            const content_type = await fetch(song.art, { method: 'HEAD' })
                .then(resp => resp.headers.get('content-type'));

            // Set the media session's metadata to the current song.
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist,
                album: song.album,
                artwork: [
                    { src: song.art, type: content_type }
                ]
            });
        }
    }
}

export {
    Player
}