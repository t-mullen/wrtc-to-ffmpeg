
const { Buffer } = require('buffer')
const { Readable } = require('stream')

const { StreamInput, StreamOutput } = require('fluent-ffmpeg-multistream')
const chunker = require('stream-chunker')
const {
  RTCAudioSink, RTCAudioSource, RTCVideoSink, RTCVideoSource
} = require('wrtc').nonstandard


exports.input = function input (track, fps) {
  const rs = new Readable()
  rs._read = () => {}
  const input = StreamInput(rs)
  input.kind = track.kind

  if (track.kind === 'video') {
    const sink = new RTCVideoSink(track)

    sink.onframe = ({ frame: {data, height, width} }) => {
      rs.push(Buffer.from(data))

      input.options = getOptions(track.kind, width, height, fps)
      input.height  = height
      input.width   = width

      rs.emit('options')
    }
  } else if (track.kind === 'audio') {
    const sink = new RTCAudioSink(track)
    sink.ondata = (event) => {
      rs.push(Buffer.from(event.samples.buffer))
    }
    input.options = getOptions(track.kind)
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

exports.output = function output ({ kind, width, height, sampleRate }, fps) {
  var ws = null
  var source = null

  if (kind === 'video') {
    ws = chunker(width * height * 1.5)
    source = new RTCVideoSource()

    ws.on('data', (chunk) => {
      source.onFrame({
        width,
        height,
        data: new Uint8ClampedArray(chunk)
      })
    })
  } else if (kind === 'audio') {
    ws = chunker(2 * sampleRate / 100)
    source = new RTCAudioSource()

    ws.on('data', (chunk) => {
      source.onData({
        samples: new Int16Array(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.length)),
        sampleRate
      })
    })
  }

  const output = StreamOutput(ws)
  output.track = source.createTrack()
  output.options = getOptions(kind, width, height, fps)
  output.kind = kind
  output.width = width
  output.height = height

  return new Promise((resolve) => {
    resolve(output)
  })
}

function getOptions (kind, width, height, fps=30) {
  if (kind === 'video') {
    return [
      '-f rawvideo',
      '-c:v rawvideo',
      '-s ' + width + 'x' + height, // TODO
      '-pix_fmt yuv420p',
      `-r ${fps}`
    ]
  } else if (kind === 'audio') {
    return [
      '-f s16le',
      '-ar 48k',
      '-ac 1'
    ]
  }
}
