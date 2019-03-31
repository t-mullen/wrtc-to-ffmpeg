
const { Readable } = require('stream')
const { Buffer } = require('buffer')
const chunker = require('stream-chunker')
const { StreamInput, StreamOutput } = require('fluent-ffmpeg-multistream')
const w2f = {}

w2f.input = function input (track) {
  const rs = new Readable()
  rs._read = () => {}
  const input = StreamInput(rs)
  input.kind = track.kind

  if (track.kind === 'video') {
    const sink = new w2f.wrtc.nonstandard.RTCVideoSink(track)

    sink.onframe = ({ frame }) => {
      rs.push(Buffer.from(frame.data))
      input.options = inputOptions(track.kind, frame.width, frame.height)
      input.width = frame.width
      input.height = frame.height
      rs.emit('options')
    }
  } else if (track.kind === 'audio') {
    const sink = new w2f.wrtc.nonstandard.RTCAudioSink(track)
    sink.ondata = (event) => {
      rs.push(Buffer.from(event.samples.buffer))
    }
    input.options = inputOptions(track.kind)
  }

  return new Promise((resolve) => {
    if (input.options) {
      resolve(input)
    } else {
      rs.once('options', () => {
        resolve(input)
      })
    }
  })
}

function inputOptions (kind, width, height) {
  if (kind === 'video') {
    return [
      '-f rawvideo',
      '-c:v rawvideo',
      '-s ' + width + 'x' + height, // TODO
      '-pix_fmt yuv420p'
    ]
  } else if (kind === 'audio') {
    return [
      '-f s16le',
      '-ar 48k',
      '-ac 1'
    ]
  }
}

w2f.output = function output ({ kind, width, height, sampleRate }) {
  var ws = null
  var source = null

  if (kind === 'video') {
    ws = chunker(width * height * 1.5)
    source = new w2f.wrtc.nonstandard.RTCVideoSource()

    ws.on('data', (chunk) => {
      source.onFrame({
        width,
        height,
        data: new Uint8ClampedArray(chunk)
      })
    })
  } else if (kind === 'audio') {
    ws = chunker(2 * sampleRate / 100)
    source = new w2f.wrtc.nonstandard.RTCAudioSource()

    ws.on('data', (chunk) => {
      source.onData({
        samples: new Int16Array(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.length)),
        sampleRate
      })
    })
  }

  const output = StreamOutput(ws)
  output.track = source.createTrack()
  output.options = outputOptions(kind, width, height)
  output.kind = kind
  output.width = width
  output.height = height

  return new Promise((resolve) => {
    resolve(output)
  })
}

function outputOptions (kind, width, height) {
  if (kind === 'video') {
    return [
      '-f rawvideo',
      '-c:v rawvideo',
      '-s ' + width + 'x' + height, // TODO
      '-pix_fmt yuv420p'
    ]
  } else if (kind === 'audio') {
    return [
      '-f s16le',
      '-ar 48k',
      '-ac 1'
    ]
  }
}

module.exports = (wrtc) => {
  w2f.wrtc = wrtc
  return w2f
}
