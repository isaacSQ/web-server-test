const net = require('net');

const SERVER_ADDR = '3.10.221.34';
const SERVER_PORT = 2023;

//const message = `{"command":"host_sync","device_time":${Date.now()}}`;
const message = "IHOST"


const client = new net.Socket();
client.connect(SERVER_PORT, SERVER_ADDR, function() {
	console.log('Connected');
	client.write(message);
});

client.on('data', function(data) {
	console.log('Received: ' + data);
	client.destroy(); // kill client after server's response
});

client.on('close', function() {
	console.log('Connection closed');
});
