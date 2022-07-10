import express from "express";
import bootstrapApp from "./bootstrapApp";

const app = express();

app.get("/", (req, res) => {
    res.send("Hello World!");
});

export default bootstrapApp(app, []);
