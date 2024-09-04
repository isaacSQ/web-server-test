const dgram = require('dgram');

const SERVER_ADDR = '3.10.221.34'
const SERVER_PORT = 22023;

const host = dgram.createSocket('udp4');

const message = Buffer.from('IHOST');

host.send(message, 0, message.length, SERVER_PORT, SERVER_ADDR, (err) => {
    if (err) {
        console.error('UDP send error:', err);
        host.close();
    } else {
        console.log(`Message sent to ${SERVER_ADDR}:${SERVER_PORT}`);
    }
});

host.on('message', (message, remote) => {
    console.log(`${message}`)

    const obj = JSON.parse(message)

    if(obj.MSG == "FH"){
        const resMsg = Buffer.from('HOST')
        const res = `{"MSG":"${resMsg}","CA":"${obj.CA}","CP":${obj.CP}}`
        host.send(res, 0, res.length, SERVER_PORT, SERVER_ADDR)
      }

    
    if(obj.MSG.command == "host_sync"){
        var resMsg = Buffer.from(`{"command":"host_sync_response","host_time":${Date.now()}, "device_time":${obj.MSG.device_time}}`)
        var res = `{"MSG":${resMsg},"CA":"${obj.CA}","CP":${obj.CP}}`

        host.send(res, 0, res.length, SERVER_PORT, SERVER_ADDR)

    }else if(obj.MSG.command == "host_ping_echo"){

        var now = Date.now()

        console.log("host_ping_echo", now)
    }
});
