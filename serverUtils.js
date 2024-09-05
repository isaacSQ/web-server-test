// Define the server's IP address and port
const SERVER_IP = '127.0.0.1'; // Replace with the server's IP if it's on a different machine
const SERVER_PORT = 4040;

// Create a new TCP client
const webClient = new net.Socket();

// Connect to the server
webClient.connect(SERVER_PORT, SERVER_IP, () => {
    console.log('Connected to the TCP server');
    
    // Send a message to the server
    const message = 'IHOST';
    webClient.write(message);
});

// Listen for data from the server
webClient.on('data', (data) => {
    console.log(`This message was from the client: ${data}`);
});

// Handle connection closure
webClient.on('close', () => {
    console.log('Connection to server closed');
});

// Handle errors
webClient.on('error', (err) => {
    console.error(`TCP Client error:\n${err.stack}`);

	// if error restart the webClient and the error is not ECONNREFUSED
	if (err.code !== 'ECONNREFUSED') {
	webClient.connect(SERVER_PORT, SERVER_IP, () => {
		console.log('Connected to the TCP server');
		
		// Send a message to the server
		const message = 'IHOST';
		webClient.write(message);
	});
}
});

function createFakeTeamServer(unid){
	exports.clients[unid] = {
		socket: webClient,
		server: exports.getClientServerObject('127.0.0.1'),
	  }
}

createFakeTeamServer('pookie');


// to be put in send to one

// convert the output into base64
let bufferOutput = Buffer.from(output).toString('base64')
const jsonString = 'sm.json({"MSG":"'+bufferOutput+'","CA":"83.44.4.18","CP":"4040"})';

console.log(jsonString, 'oooot')
exports.clients['pookie'].socket.write(jsonString);

//