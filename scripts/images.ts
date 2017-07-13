import  fs = require('fs');
import * as Rx from "rx";
import Observable = Rx.Observable;
const util = require('util');
const spawnSync = require('child_process').spawnSync;
const spawn = require('child_process').spawn;

const INPUT_PATH = 'images/2process/';
const IMAGES_PATH = './images/';
const THUMB_PATH = IMAGES_PATH + "thumbs/";
const FULLS_PATH = IMAGES_PATH + "fulls/";

let lastNumber = calculateLastNumber();

setTimeout(() => convertAllMasters(), 1);


// _____ HELPER FUNCTIONS ______


function convertAllMasters() {
    let files = getFilesSortedByDateOldToNew();
    lastNumber = calculateLastNumber();
    console.log("starting at next number: " + lastNumber + 1);
    
    let allObservables = [];
     files.forEach(file => {
         allObservables.push(processImage(file, ++lastNumber));
     });
    //allObservables.push(processImage(files[1], ++lastNumber));
    Observable.forkJoin(allObservables).subscribe(done => {
        console.log("all done");
    })
}

/**
 * makes a thumbnail file for the file passed along and places it in the right folder.
 * @param file
 * @param numbering
 * @returns {Observable<string>} an observable with the new file path
 */
let makeThumbnail = function (file, numbering: number): Observable<string> {
    const thumbFilePath = `${THUMB_PATH}thumb_${numbering}.jpg`;

    return Observable.create<string>(observer => {
        let spawnParams = [INPUT_PATH+file, "-resize", "900x400+10+10", "-quality", "90", thumbFilePath];
        logConvertCommand(spawnParams);
        spawn("convert", spawnParams).on("exit", () => observer.onNext(thumbFilePath));
    }).share();
};

/**
 * makes a thumbnail file for the file passed along and places it in the right folder.
 * @param file
 * @param numbering
 * @returns {Observable<string>} an observable with the new file path
 */
let makeFull = function (file, numbering: number): Observable<string> {
    const fullSizeFilePath = `${FULLS_PATH}full_${numbering}.jpg`;

    return Observable.create<string>(observer => {
        let spawnParams = [INPUT_PATH+file, "-resize", "1920x1080+10+10", fullSizeFilePath];
        logConvertCommand(spawnParams);
        spawn("convert", spawnParams).on("exit", () => observer.onNext(fullSizeFilePath));
    }).share();
};

let logConvertCommand = function(params: string[]){
    let command = "convert ";
    params.forEach(param => {command += " "+param});
    console.log(command);
};


/**
 * pass the file and the numbering for the newly created file
 * @param file
 * @param numbering
 */
let processImage = function (file, numbering: number): Observable<string[][]> {
    console.log("Processing image " + file);
    let obs1 = makeThumbnail(file, numbering);
    //let obs2 = makeFull(file, numbering);
    //remove master file
    let both = Observable.forkJoin(obs1).share();
    both.subscribe(file => {/*fs.unlinkSync(file)*/
    });
    return both;

};

function calculateLastNumber() {
    let imgCounter = [];
    let images = fs.readdirSync(`${IMAGES_PATH}thumbs/`);
    images.map(img => {
        let matches = /(^[^\.]+)/.exec(img);
        if (matches) return imgCounter.push(matches[1]);
    });
    let highest = 0;
    imgCounter.forEach(count => {
        count = Number(count);
        highest = highest < count ? count : highest;
    });
    return highest;
}


let getFilesSortedByDateOldToNew = function (): string[] {
    let files = fs.readdirSync(INPUT_PATH);
    return files.map(function (fileName) {
        return {
            name: fileName,
            time: fs.statSync(INPUT_PATH + '/' + fileName).mtime.getTime()
        };
    })
        .sort(function (a, b) {
            return a.time - b.time;
        })
        .map(function (v) {
            return v.name;
        });
};