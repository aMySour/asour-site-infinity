// express serve dist
import express from 'express';
import path from 'path';

const app = express();
const port = 8000;

app.use(express.static(path.join('dist')));

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});