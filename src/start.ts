import "dotenv/config";

import app from "./app";

app.start()
    .then(() => {
        console.info("serving on", process.env.PORT);
    })
    .catch(e => {
        console.error("Startup Error:", e);
        process.exit(1);
    });
