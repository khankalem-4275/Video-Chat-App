import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const app = express();
const server = createServer(app);
const io = new Server(server);

const allUsers = {};
const __dirname = dirname(fileURLToPath(import.meta.url));

// exposing public directory to outside world
app.use(express.static("public"));

// handle the incoming HTTP request
app.get("/", (req, res) => {
  console.log("GET Request /");
  res.sendFile(join(__dirname + "/app/index.html"));
});

// handle socket connections
io.on("connection", (socket) => {
    console.log(
        `Someone connected to socket server and socket id is ${socket.id}`
    );
    socket.on("join-user" , username => {
        console.log(`${username} joined socket connection`);
        allUsers[username] = {username , id : socket.id};
        // inform everyone that someone joined
        io.emit("joined" , allUsers);
    });

    socket.on("offer" , ({from , to , offer}) => {
        console.log({from , to , offer});
        io.to(allUsers[to].id).emit("offer" , {from , to ,offer});
    });

    socket.on("answer" , async ({from , to , answer}) => {
        io.to(allUsers[from].id).emit("answer" , {from , to,answer});
    });

    socket.on("ice-candidate" , candidate => {
        console.log({ candidate });
        // broadcast to other peers
        socket.broadcast.emit("ice-candidate" , candidate);
    });

    socket.on("end-call" , ({from , to}) => {
        io.to(allUsers[to].id).emit("end-call" , {from ,to});
    });

    socket.on("call-ended" , (caller) => {
        const[from , to] = caller;
        io.to(allUsers[from].id).emit("call-ended" , caller);
        io.to(allUsers[to].id).emit("call-ended" , caller);
    });

});

server.listen(9000, () => {
  console.log(`Server listening at port 9000`);
});
