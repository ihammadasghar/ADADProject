import express from 'express'
import events from "./routes/events.js";
import users from "./routes/users.js";

const app = express()
const port = 3000
app.use(express.json());

// Load the /movies routes
app.use("/events", events);

// Load the /users routes
app.use("/users", users);

// Get some fun 
app.get('/', (req, res) => {
    res.status(418)
        .send('<h1 style="color:red;"><b>I\'m a stylish teapot</b></h1>');
})

app.listen(port, () => {
    console.log(`backend listening on port ${port}`);
})

