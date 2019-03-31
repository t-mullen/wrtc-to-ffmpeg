const Peer = require('simple-peer')
const socket = new window.WebSocket('ws://localhost:9000')
const gum = require('getusermedia')

gum({audio: true, video: true}, (err, stream) => {
	if (err) throw err

	const peer = new Peer({ initiator: true, stream })
	peer.on('signal', (data) => {
		socket.send(JSON.stringify(data))
	})
	socket.addEventListener('message', (event) => {
		peer.signal(event.data)
	})

	peer.on('stream', stream => {
		const video = document.querySelector('video')
		video.srcObject = stream
	})
})
