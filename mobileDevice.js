var net = require("net")

const SERVER_IP = '127.0.0.1'; // Replace with the server's IP if it's on a different machine
const SERVER_PORT = 4040;

// Create a new TCP client
const webClient = new net.Socket();

// Connect to the server

webClient.connect(SERVER_PORT, SERVER_IP, () => {
    console.log('Connected to the TCP server');
    
    // Send a message to the server
    const message = 'CLIENT';
    webClient.write(message);
});

// Listen for data from the server
webClient.on('data', (data) => {
    console.log(`Received from server: ${data}`);
});

// Handle connection closure
webClient.on('close', () => {
    console.log('Connection to server closed');

    //stop the current application
    process.exit();
});

// Handle errors
webClient.on('error', (err) => {
    console.error(`TCP Client error:\n${err.stack}`);

	// if error restart the webClient and the error is not ECONNREFUSED
	if (err.code !== 'ECONNREFUSED') {
	webClient.connect(SERVER_PORT, SERVER_IP, () => {
		console.log('Device message');
	});
}

// on an interval, send a message to the server
});
setInterval(() => {
    const message = 'MOBILE MESSAGE';
    try {
        webClient.write(message);
    }catch(e){
        console.error(e);
    }
}, 8000);