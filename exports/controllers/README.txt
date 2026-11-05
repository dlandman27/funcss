Controllers: turbones (NES), n64, snes, gba.
Each folder contains its HTML, CSS, JavaScript and image assets.
Serve this folder with a local web server, for example: python3 -m http.server 8000
Then open http://localhost:8000/gba/ (or snes/, n64/, turbones/).
The JavaScript emits input events ready to connect to your emulator; no emulator core or games are included.
