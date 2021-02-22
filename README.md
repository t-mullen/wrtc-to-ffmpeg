# wrtc-to-ffmpeg

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## WORK-IN-PROGRESS - HERE BE DRAGONS

Pipe MediaStreamTracks between [wrtc](https://github.com/node-webrtc/node-webrtc) and [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg). Early development, plenty of issues. Currently only for Unix and Linux.

Allows you to record WebRTC streams, stream media files over WebRTC connections, or route WebRTC streams to RTSP/RTMP/etc.

```javascript
const ffmpeg = require('fluent-ffmpeg')
const wrtc = require('wrtc')
const w2f = require('wrtc-to-ffmpeg')

const input = await w2f.input(track) // audio or video MediaStreamTrack

ffmpeg()
  .input(input.url)             // add our input
  .inputOptions(input.options)  // specify the input options
  .output('./myVideo.mp4')      // save the stream to an mp4
```

You can also pipe FFMPEG output to `MediaStreamTracks`.

```javascript
const videoOutput = await w2f.output({ kind: 'video', width: 480, height: 360 })
const audioOutput = await w2f.output({ kind: 'audio', sampleRate: 48000 })
ffmpeg()
  .input('./myVideo.mp4')
  .output(videoOutput.url)
  .outputOptions(videoOutput.options)
  .output(audioOutput.url)
  .outputOptions(audioOutput.options)

videoOutput.track // do what you want with the new MediaStreamTracks
audioOutput.track
```

## API
### `input = await w2f.input(track)`

Transforms a `MediaStreamTrack` into an input object.

`input.url` is a Unix domain socket path that FFMPEG can use as input.

`input.options` is an object with the minimum FFMPEG options.

### `output = await w2f.output({ kind, width, height, sampleRate })`

Creates an output object with the specified properties.

`output.track` is a `MediaStreamTrack`.

`output.url` is a Unix domain socket path that FFMPEG can use as output.

`output.options` is an object with the minimum FFMPEG options.
