import fs from 'fs';
import path from 'path';

let before = performance.now();

// clear dist
fs.rmdirSync(path.join('dist'), { recursive: true });
// make dist
fs.mkdirSync(path.join('dist'));

// copy everything from src/static to dist
function copyFolderRecursiveSync(source: string, target: string) {
    let files: string[] = [];
    // check if folder needs to be created or integrated
    const targetFolder = target;
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }
    // copy
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        files.forEach(function (file) {
            const curSource = path.join(source, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, path.join(targetFolder, path.basename(curSource)));
            }
            else if (fs.lstatSync(curSource).isSymbolicLink()) {
                const symlinkFull = fs.readlinkSync(curSource);
                fs.symlinkSync(symlinkFull, path.join(targetFolder, path.basename(curSource)));
            }
            else {
                fs.copyFileSync(curSource, path.join(targetFolder, path.basename(curSource)));
            }
        });
    }
}

copyFolderRecursiveSync(path.join('src', 'static'), 'dist');

const layout = fs.readFileSync(path.join('src', 'layout.html'), 'utf8');

// get everything in ../pages
const pages = fs.readdirSync(path.join('src', 'pages'));

// for each page, get content, and write to dist
for (let page of pages) {
    let content = fs.readFileSync(path.join('src', 'pages', page), 'utf8');
    // everything between <head> and </head>
    let head = content.match(/<head>([\s\S]*)<\/head>/)[1].trim();
    // remove head from content
    content = content.replace(/<head>[\s\S]*<\/head>/, '').trim();
    let pageName = page.split('.')[0];
    let html = layout.replace('{{content}}', content).replace('{{head}}', head);
    if (pageName === 'index') {
        // write dist/index.html
        fs.writeFileSync(path.join('dist', 'index.html'), html);
        continue;
    }
    // make dist/pageName
    fs.mkdirSync(path.join('dist', pageName));
    // write dist/pageName/index.html
    fs.writeFileSync(path.join('dist', pageName, 'index.html'), html);
}

// all typescript files in src turned into js files in dist with bun.build
await Bun.build({
    entrypoints: ['src/index.ts'],
    outdir: 'dist',
});

console.log('Built in ' + Math.floor(performance.now() - before) + 'ms');