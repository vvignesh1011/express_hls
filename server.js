const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
const cors = require('cors')

const app = express();
app.use(cors())
app.use(express.static(path.join(__dirname, 'videos')))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    let videos = fs.readdirSync('videos/output')
    res.render('index', { videos: videos.map(val => ({ url: 'play?url=' + 'output/' + val + '/' + val + '-360p.m3u8', name: val })) });
});

app.get('/play', (req, res) => {
    const url = req.query.url
    console.log({ url })

    res.render('player', { url })
});

const videoUpload = multer({
    storage: multer.diskStorage({
        destination: 'videos/raw/',
        filename: (req, file, cb) => {
            cb(null, file.originalname)
        }
    })
});



app.get('/upload', (req, res) => {
    res.render('upload')
})


app.post('/upload', videoUpload.single('file'), (req, res) => {
    console.log(req.file)
    // const filePath = path.join(__dirname, 'videos', 'raw', 'One Piece Episode 1000 [720p][English Dub].mkv');
    let file = req.file
    const filePath = file.path
    const outputName = req.body.fileName
    const outputPath = path.join(__dirname, 'videos', 'output', outputName); // Output directory for processed videos


    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    const resolutions = [
        { width: 640, height: 360, bitrate: '800k' },
    ];


    const ffmpegCommand = Ffmpeg(fs.ReadStream(filePath))
        .setFfmpegPath(ffmpegInstaller.path)

    resolutions.forEach(res => {
        const outputFilePath = path.join(outputPath, `${outputName}-${res.height}p.m3u8`);
        ffmpegCommand
            .outputOptions([
                `-vf scale=w=${res.width}:h=${res.height}:force_original_aspect_ratio=decrease`,
                `-b:v ${res.bitrate}`,
                '-maxrate ' + (parseInt(res.bitrate) * 1.5) + 'k',
                '-bufsize ' + (parseInt(res.bitrate) * 2) + 'k',
                '-hls_time 10',
                '-hls_playlist_type vod',
                '-hls_segment_filename', path.join(outputPath, `${outputName}-${res.height}p_%03d.ts`)
            ])
            .output(outputFilePath);
    });
    ffmpegCommand
        .on('end', () => {
            res.send(`Videos processed successfully! Outputs: ${resolutions.map(res => `<a href="${res.outputFile}">${path.basename(res.outputFile)}</a>`).join(', ')}`);
        })
        .on('error', (err) => {
            console.error(`Error: ${err.message}`);
            res.status(500).send('Error processing video');
        })
        .run();



});


app.listen(3000, () => console.log('Server runs on port 3000'));
