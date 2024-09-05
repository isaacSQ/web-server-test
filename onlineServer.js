var net = require("net")

let TCP_PORT = 4040

let HOST_IP
let HOST_PORT
let HOST_SOCKET

let clients = {}

const tcpServer = net.createServer((socket) => {
  console.log("TCP client connected:", socket.remoteAddress, socket.remotePort)

  socket.on("data", (data) => {
    if (data == "IHOST") {
      console.log("HOST SET")
      HOST_IP = socket.remoteAddress
      HOST_PORT = socket.remotePort
      HOST_SOCKET = socket
      return
    }

    if (data == "CLIENT") {
      //if host is not set, don't add the client and kick it
      if (HOST_IP == null) {
        console.log("NO HOST SET, KICKING CLIENT")
        socket.destroy()
        return
      }
      console.log("CLIENT ADDED")
      clients[socket.remoteAddress] = socket
      return
    }

    // if the message is not from the host, send it to the host
    if (
      HOST_IP != null &&
      (socket.remoteAddress != HOST_IP || socket.remotePort != HOST_PORT)
    ) {
      try {
        console.log("SENDING :'" + data + "' TO HOST")
        HOST_SOCKET.write(data)
      } catch (e) {
        // host must be dead, clear the host
        console.log("HOST DEAD, CLEARING")
        kickAndClearServers()
      }
      return
    }

    // if data contains sm.Json
    if (`${data}`.includes("sm.json(")) {
      try {
        const commands = `${data}`
          .split("sm.json(")
          .filter((command) => command.trim())

        const objects = commands.map((command) => {
          const jsonString = command.slice(0, -1)

          if (jsonString == undefined) {
            return
          }

          let convertedJson = JSON.parse(jsonString)

          convertedJson.MSG = Buffer.from(convertedJson.MSG, "base64").toString(
            "utf-8"
          )

     

          clients[convertedJson.CA].write(convertedJson.MSG)

          return convertedJson
        })

        console.log(objects)
      } catch (err) {
        console.error(err)
      }
    }
  })

  socket.on("end", () => {
    console.log("TCP client disconnected")
    // if the host disconnects, clear the host and kick everyone else
    if (socket.remoteAddress == HOST_IP && socket.remotePort == HOST_PORT) {
      kickAndClearServers()
    } else {
      delete clients[socket.remoteAddress]
    }
  })

  function kickAndClearServers() {
    console.log("HOST DISCONNECTED, CLEARING")
    HOST_IP = null
    HOST_PORT = null
    HOST_SOCKET = null
    for (const client in clients) {
      clients[client].destroy()
    }
    clients = {}
  }

  socket.on("error", (err) => {
    console.error(`TCP Server error:\n${err.stack}`)
  })
})

tcpServer.listen(TCP_PORT, () => {
  console.log(`TCP Server listening on port ${TCP_PORT}`)
})